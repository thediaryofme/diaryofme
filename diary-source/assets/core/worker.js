const UOV_CSK_LEN = 32;
const UOV_CPK_LEN = 66576;
const UOV_SIG_LEN = 96;
const UOV_KEYGEN_SEED_RECOMMENDED = 32;
const UOV_SIGNING_SEED_RECOMMENDED = 32;
const BLAKE3_DEFAULT_LEN = 32;
const XCHACHA_KEY_BYTES = 32;
const XCHACHA_NONCE_BYTES = 24;
const XCHACHA_MAC_BYTES = 16;
const XCHACHA_SIV_OVERHEAD = XCHACHA_NONCE_BYTES + XCHACHA_MAC_BYTES;
const ARGON2_SALT_BYTES = 16;
const MCELIECE_PK_BYTES = 261120;
const MCELIECE_SK_BYTES = 6492;


let sodium = null;


function asUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  return new Uint8Array(0);
}

function concatBytes(byteArrays) {
  const totalLength = byteArrays.reduce((sum, bytes) => sum + bytes.length, 0);
  const joined = new Uint8Array(totalLength);
  let offset = 0;

  for (const bytes of byteArrays) {
    joined.set(bytes, offset);
    offset += bytes.length;
  }

  return joined;
}

function allocAndWrite(bytes) {
  const ptr = sodium._malloc(bytes.length || 1);
  if (bytes.length > 0) {
    sodium.HEAPU8.set(bytes, ptr);
  }
  return ptr;
}

function secureFree(ptr, length) {
  if (!ptr) return;
  if (Number.isInteger(length) && length > 0) {
    sodium.HEAPU8.fill(0, ptr, ptr + length);
  }
  sodium._free(ptr);
}


async function handleInit(vendorBaseUrl) {
  if (sodium) return;

  const moduleUrl = `${vendorBaseUrl}core.js`;
  importScripts(moduleUrl);
  const createModule = Module;

  if (typeof createModule !== "function") {
    throw new Error("core module factory is not available");
  }

  sodium = await createModule({
    locateFile(path) {
      return `${vendorBaseUrl}${path}`;
    }
  });

  const rc = sodium._module_init();
  if (rc < 0) {
    throw new Error(`module_init failed (rc=${rc})`);
  }
}


function handleGetUovLengths() {
  return {
    publicKeyLength: UOV_CPK_LEN,
    privateKeyLength: UOV_CSK_LEN,
    signatureLength: UOV_SIG_LEN,
    signingSeedLength: UOV_SIGNING_SEED_RECOMMENDED,
    keygenSeedLength: UOV_KEYGEN_SEED_RECOMMENDED,
    blake3HashLength: BLAKE3_DEFAULT_LEN
  };
}

function handleBlake3Hash(payload) {
  const inputBytes = asUint8Array(payload.inputBytes);
  const outputLength = Number(payload.outputLength) || BLAKE3_DEFAULT_LEN;

  const inPtr = allocAndWrite(inputBytes);
  const outPtr = sodium._malloc(outputLength);

  try {
    sodium._blake3_hash(inPtr, inputBytes.length, outPtr, outputLength);
    return sodium.HEAPU8.slice(outPtr, outPtr + outputLength);
  } finally {
    secureFree(inPtr, inputBytes.length);
    secureFree(outPtr, outputLength);
  }
}

// =========================================================================
//  Pipeline handlers — single WASM calls for full crypto operations
// =========================================================================

function handlePipelineEncrypt(payload) {
  const passwordBytes = asUint8Array(payload.passwordBytes);
  const filenameBytes = asUint8Array(payload.filenameBytes);
  const contentBytes = asUint8Array(payload.contentBytes);
  const extraSeedBytes = payload.extraSeedBytes ? asUint8Array(payload.extraSeedBytes) : new Uint8Array(0);
  const derivePrefixBytes = asUint8Array(payload.derivePrefixBytes);
  const opslimit = Number(payload.opslimit) || 1;
  const memlimit = Number(payload.memlimit) || (128 * 1024 * 1024);

  const pwPtr = allocAndWrite(passwordBytes);
  const fnPtr = allocAndWrite(filenameBytes);
  const ctPtr = allocAndWrite(contentBytes);
  const esPtr = extraSeedBytes.length > 0 ? allocAndWrite(extraSeedBytes) : 0;
  const dpPtr = allocAndWrite(derivePrefixBytes);
  const outLenPtr = sodium._malloc(4);

  try {
    const resultPtr = sodium._pipeline_encrypt(
      pwPtr, passwordBytes.length,
      fnPtr, filenameBytes.length,
      ctPtr, contentBytes.length,
      esPtr, extraSeedBytes.length,
      dpPtr, derivePrefixBytes.length,
      opslimit, memlimit,
      outLenPtr
    );

    if (resultPtr === 0) {
      throw new Error("pipeline_encrypt failed");
    }

    const outLen = sodium.HEAPU32[outLenPtr >>> 2];
    const result = sodium.HEAPU8.slice(resultPtr, resultPtr + outLen);
    sodium._free(resultPtr);
    return result;
  } finally {
    secureFree(pwPtr, passwordBytes.length);
    secureFree(fnPtr, filenameBytes.length);
    secureFree(ctPtr, contentBytes.length);
    if (esPtr) secureFree(esPtr, extraSeedBytes.length);
    secureFree(dpPtr, derivePrefixBytes.length);
    secureFree(outLenPtr, 4);
    passwordBytes.fill(0);
    contentBytes.fill(0);
  }
}

function handlePipelineDecrypt(payload) {
  const passwordBytes = asUint8Array(payload.passwordBytes);
  const sivBytes = asUint8Array(payload.sivBytes);

  const pwPtr = allocAndWrite(passwordBytes);
  const sivPtr = allocAndWrite(sivBytes);
  const outLenPtr = sodium._malloc(4);

  try {
    const resultPtr = sodium._pipeline_decrypt(
      pwPtr, passwordBytes.length,
      sivPtr, sivBytes.length,
      outLenPtr
    );

    if (resultPtr === 0) {
      throw new Error("Decryption failed");
    }

    const outLen = sodium.HEAPU32[outLenPtr >>> 2];
    const rawResult = sodium.HEAPU8.slice(resultPtr, resultPtr + outLen);
    sodium._free(resultPtr);

    // Parse: filename_len(4 LE) + filename + content
    const fnLen = rawResult[0] | (rawResult[1] << 8) | (rawResult[2] << 16) | (rawResult[3] << 24);
    const filenameBytes = rawResult.slice(4, 4 + fnLen);
    const fileBytes = rawResult.slice(4 + fnLen);

    return { filenameBytes, fileBytes };
  } finally {
    secureFree(pwPtr, passwordBytes.length);
    secureFree(sivPtr, sivBytes.length);
    secureFree(outLenPtr, 4);
    passwordBytes.fill(0);
  }
}

function handlePipelineSign(payload) {
  const passwordBytes = asUint8Array(payload.passwordBytes);
  const messageBytes = asUint8Array(payload.messageBytes);
  const extraSeedBytes = payload.extraSeedBytes ? asUint8Array(payload.extraSeedBytes) : new Uint8Array(0);
  const passwordSaltBytes = asUint8Array(payload.passwordSaltBytes);
  const signingSeedPrefixBytes = asUint8Array(payload.signingSeedPrefixBytes);
  const contextBytes = payload.contextBytes ? asUint8Array(payload.contextBytes) : new Uint8Array(0);
  const opslimit = Number(payload.passwordOpslimit) || 2;
  const memlimit = Number(payload.passwordMemlimit) || (128 * 1024 * 1024);

  const pwPtr = allocAndWrite(passwordBytes);
  const msgPtr = allocAndWrite(messageBytes);
  const esPtr = extraSeedBytes.length > 0 ? allocAndWrite(extraSeedBytes) : 0;
  const psPtr = allocAndWrite(passwordSaltBytes);
  const spPtr = allocAndWrite(signingSeedPrefixBytes);
  const cxPtr = contextBytes.length > 0 ? allocAndWrite(contextBytes) : 0;
  const outLenPtr = sodium._malloc(4);

  try {
    const resultPtr = sodium._pipeline_sign(
      pwPtr, passwordBytes.length,
      msgPtr, messageBytes.length,
      esPtr, extraSeedBytes.length,
      psPtr, passwordSaltBytes.length,
      spPtr, signingSeedPrefixBytes.length,
      cxPtr, contextBytes.length,
      opslimit, memlimit,
      outLenPtr
    );

    if (resultPtr === 0) {
      throw new Error("pipeline_sign failed");
    }

    const outLen = sodium.HEAPU32[outLenPtr >>> 2];
    const rawResult = sodium.HEAPU8.slice(resultPtr, resultPtr + outLen);
    sodium._free(resultPtr);

    const publicKeyBytes = rawResult.slice(0, UOV_CPK_LEN);
    const signatureBytes = rawResult.slice(UOV_CPK_LEN, UOV_CPK_LEN + UOV_SIG_LEN);

    return { publicKeyBytes, signatureBytes };
  } finally {
    secureFree(pwPtr, passwordBytes.length);
    secureFree(msgPtr, messageBytes.length);
    if (esPtr) secureFree(esPtr, extraSeedBytes.length);
    secureFree(psPtr, passwordSaltBytes.length);
    secureFree(spPtr, signingSeedPrefixBytes.length);
    if (cxPtr) secureFree(cxPtr, contextBytes.length);
    secureFree(outLenPtr, 4);
    passwordBytes.fill(0);
    messageBytes.fill(0);
    if (extraSeedBytes.length > 0) extraSeedBytes.fill(0);
    signingSeedPrefixBytes.fill(0);
  }
}

function handlePipelineVerify(payload) {
  const signatureBytes = asUint8Array(payload.signatureBytes);
  const publicKeyBytes = asUint8Array(payload.publicKeyBytes);
  const messageBytes = asUint8Array(payload.messageBytes);
  const contextBytes = payload.contextBytes ? asUint8Array(payload.contextBytes) : new Uint8Array(0);

  const sigPtr = allocAndWrite(signatureBytes);
  const cpkPtr = allocAndWrite(publicKeyBytes);
  const msgPtr = allocAndWrite(messageBytes);
  const cxPtr = contextBytes.length > 0 ? allocAndWrite(contextBytes) : 0;

  try {
    return sodium._pipeline_verify(
      sigPtr, signatureBytes.length,
      cpkPtr, publicKeyBytes.length,
      msgPtr, messageBytes.length,
      cxPtr, contextBytes.length
    );
  } finally {
    secureFree(sigPtr, signatureBytes.length);
    secureFree(cpkPtr, UOV_CPK_LEN);
    secureFree(msgPtr, messageBytes.length);
    if (cxPtr) secureFree(cxPtr, contextBytes.length);
  }
}


// =========================================================================
//  McEliece pipeline handlers
// =========================================================================

function handlePipelineMcelieceKeygen(payload) {
  const passwordBytes = asUint8Array(payload.passwordBytes);
  const saltBytes = asUint8Array(payload.saltBytes);
  const opslimit = Number(payload.opslimit) || 1;
  const memlimit = Number(payload.memlimit) || (128 * 1024 * 1024);

  const pwPtr = allocAndWrite(passwordBytes);
  const saltPtr = allocAndWrite(saltBytes);
  const pkPtr = sodium._malloc(MCELIECE_PK_BYTES);
  const skPtr = sodium._malloc(MCELIECE_SK_BYTES);

  try {
    const rc = sodium._pipeline_mceliece_keygen(
      pwPtr, passwordBytes.length,
      saltPtr, saltBytes.length,
      opslimit, memlimit,
      pkPtr, skPtr
    );

    if (rc !== 1) {
      throw new Error("pipeline_mceliece_keygen failed");
    }

    const publicKeyBytes = sodium.HEAPU8.slice(pkPtr, pkPtr + MCELIECE_PK_BYTES);
    const secretKeyBytes = sodium.HEAPU8.slice(skPtr, skPtr + MCELIECE_SK_BYTES);
    return { publicKeyBytes, secretKeyBytes };
  } finally {
    secureFree(pwPtr, passwordBytes.length);
    secureFree(saltPtr, saltBytes.length);
    secureFree(skPtr, MCELIECE_SK_BYTES);
    secureFree(pkPtr, MCELIECE_PK_BYTES);
    passwordBytes.fill(0);
  }
}

function handlePipelineMceliecePkEncryptCompact(payload) {
  const pkBytes = asUint8Array(payload.pkBytes);
  const filenameBytes = asUint8Array(payload.filenameBytes);
  const contentBytes = asUint8Array(payload.contentBytes);
  const encapSeedBytes = asUint8Array(payload.encapSeedBytes);

  const pkPtr = allocAndWrite(pkBytes);
  const fnPtr = allocAndWrite(filenameBytes);
  const ctPtr = allocAndWrite(contentBytes);
  const esPtr = allocAndWrite(encapSeedBytes);
  const outLenPtr = sodium._malloc(4);

  try {
    const resultPtr = sodium._pipeline_mceliece_pk_encrypt_compact(
      pkPtr, pkBytes.length,
      fnPtr, filenameBytes.length,
      ctPtr, contentBytes.length,
      esPtr, encapSeedBytes.length,
      outLenPtr
    );

    if (resultPtr === 0) {
      throw new Error("pipeline_mceliece_pk_encrypt_compact failed");
    }

    const outLen = sodium.HEAPU32[outLenPtr >>> 2];
    const result = sodium.HEAPU8.slice(resultPtr, resultPtr + outLen);
    sodium._free(resultPtr);
    return result;
  } finally {
    secureFree(pkPtr, pkBytes.length);
    secureFree(fnPtr, filenameBytes.length);
    secureFree(ctPtr, contentBytes.length);
    secureFree(esPtr, encapSeedBytes.length);
    secureFree(outLenPtr, 4);
    contentBytes.fill(0);
  }
}

function handlePipelineMcelieceSkDecryptCompact(payload) {
  const skBytes = asUint8Array(payload.skBytes);
  const sivBytes = asUint8Array(payload.sivBytes);

  const skPtr = allocAndWrite(skBytes);
  const sivPtr = allocAndWrite(sivBytes);
  const outLenPtr = sodium._malloc(4);

  try {
    const resultPtr = sodium._pipeline_mceliece_sk_decrypt_compact(
      skPtr, skBytes.length,
      sivPtr, sivBytes.length,
      outLenPtr
    );

    if (resultPtr === 0) {
      throw new Error("Decryption failed");
    }

    const outLen = sodium.HEAPU32[outLenPtr >>> 2];
    const rawResult = sodium.HEAPU8.slice(resultPtr, resultPtr + outLen);
    sodium._free(resultPtr);

    const fnLen = rawResult[0] | (rawResult[1] << 8) | (rawResult[2] << 16) | (rawResult[3] << 24);
    const filenameBytes = rawResult.slice(4, 4 + fnLen);
    const fileBytes = rawResult.slice(4 + fnLen);

    return { filenameBytes, fileBytes };
  } finally {
    secureFree(skPtr, skBytes.length);
    secureFree(sivPtr, sivBytes.length);
    secureFree(outLenPtr, 4);
    skBytes.fill(0);
  }
}

function handlePipelineMcelieceEncryptCompact(payload) {
  const passwordBytes = asUint8Array(payload.passwordBytes);
  const filenameBytes = asUint8Array(payload.filenameBytes);
  const contentBytes = asUint8Array(payload.contentBytes);
  const extraSeedBytes = asUint8Array(payload.extraSeedBytes);
  const derivePrefixBytes = asUint8Array(payload.derivePrefixBytes);

  const pwPtr = allocAndWrite(passwordBytes);
  const fnPtr = allocAndWrite(filenameBytes);
  const ctPtr = allocAndWrite(contentBytes);
  const esPtr = allocAndWrite(extraSeedBytes);
  const dpPtr = allocAndWrite(derivePrefixBytes);
  const outLenPtr = sodium._malloc(4);

  try {
    const resultPtr = sodium._pipeline_mceliece_encrypt_compact(
      pwPtr, passwordBytes.length,
      fnPtr, filenameBytes.length,
      ctPtr, contentBytes.length,
      esPtr, extraSeedBytes.length,
      dpPtr, derivePrefixBytes.length,
      outLenPtr
    );

    if (resultPtr === 0) {
      throw new Error("pipeline_mceliece_encrypt_compact failed");
    }

    const outLen = sodium.HEAPU32[outLenPtr >>> 2];
    const result = sodium.HEAPU8.slice(resultPtr, resultPtr + outLen);
    sodium._free(resultPtr);
    return result;
  } finally {
    secureFree(pwPtr, passwordBytes.length);
    secureFree(fnPtr, filenameBytes.length);
    secureFree(ctPtr, contentBytes.length);
    secureFree(esPtr, extraSeedBytes.length);
    secureFree(dpPtr, derivePrefixBytes.length);
    secureFree(outLenPtr, 4);
    passwordBytes.fill(0);
    contentBytes.fill(0);
  }
}

function handlePipelineMcelieceDecryptCompact(payload) {
  const passwordBytes = asUint8Array(payload.passwordBytes);
  const sivBytes = asUint8Array(payload.sivBytes);

  const pwPtr = allocAndWrite(passwordBytes);
  const sivPtr = allocAndWrite(sivBytes);
  const outLenPtr = sodium._malloc(4);

  try {
    const resultPtr = sodium._pipeline_mceliece_decrypt_compact(
      pwPtr, passwordBytes.length,
      sivPtr, sivBytes.length,
      outLenPtr
    );

    if (resultPtr === 0) {
      throw new Error("Decryption failed");
    }

    const outLen = sodium.HEAPU32[outLenPtr >>> 2];
    const rawResult = sodium.HEAPU8.slice(resultPtr, resultPtr + outLen);
    sodium._free(resultPtr);

    const fnLen = rawResult[0] | (rawResult[1] << 8) | (rawResult[2] << 16) | (rawResult[3] << 24);
    const filenameBytes = rawResult.slice(4, 4 + fnLen);
    const fileBytes = rawResult.slice(4 + fnLen);

    return { filenameBytes, fileBytes };
  } finally {
    secureFree(pwPtr, passwordBytes.length);
    secureFree(sivPtr, sivBytes.length);
    secureFree(outLenPtr, 4);
    passwordBytes.fill(0);
  }
}

function handleDeflateRaw(payload) {
  const inputBytes = asUint8Array(payload.inputBytes);
  const bound = sodium._deflate_bound(inputBytes.length);
  const inPtr = allocAndWrite(inputBytes);
  const outPtr = sodium._malloc(bound);
  const outLenPtr = sodium._malloc(4);
  sodium.HEAPU32[outLenPtr >>> 2] = bound;

  try {
    const rc = sodium._deflate_raw(outPtr, outLenPtr, inPtr, inputBytes.length);
    if (rc !== 0) {
      throw new Error("deflate_raw failed (rc=" + rc + ")");
    }
    const outLen = sodium.HEAPU32[outLenPtr >>> 2];
    return sodium.HEAPU8.slice(outPtr, outPtr + outLen);
  } finally {
    sodium._free(inPtr);
    sodium._free(outPtr);
    sodium._free(outLenPtr);
  }
}

function handleInflateRaw(payload) {
  const inputBytes = asUint8Array(payload.inputBytes);
  const maxOutput = Number(payload.maxOutputLength) || (inputBytes.length * 16);
  const inPtr = allocAndWrite(inputBytes);
  let outSize = Math.max(maxOutput, 4096);
  let outPtr = 0;
  let outLenPtr = sodium._malloc(4);
  let rc = -1;

  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      outPtr = sodium._malloc(outSize);
      sodium.HEAPU32[outLenPtr >>> 2] = outSize;
      rc = sodium._inflate_raw(outPtr, outLenPtr, inPtr, inputBytes.length);
      if (rc === 0) break;
      sodium._free(outPtr);
      outPtr = 0;
      outSize *= 4;
    }
    if (rc !== 0) {
      throw new Error("inflate_raw failed (rc=" + rc + ")");
    }
    const outLen = sodium.HEAPU32[outLenPtr >>> 2];
    return sodium.HEAPU8.slice(outPtr, outPtr + outLen);
  } finally {
    sodium._free(inPtr);
    if (outPtr) sodium._free(outPtr);
    sodium._free(outLenPtr);
  }
}

const ACTIONS = {
  init: async (payload) => { await handleInit(payload.vendorBaseUrl); return true; },
  getUovLengths: () => handleGetUovLengths(),
  uovSignFromPassword: (payload) => handlePipelineSign(payload),
  uovVerify: (payload) => handlePipelineVerify(payload),
  blake3Hash: (payload) => handleBlake3Hash(payload),
  pipelineEncrypt: (payload) => handlePipelineEncrypt(payload),
  pipelineDecrypt: (payload) => handlePipelineDecrypt(payload),
  pipelineSign: (payload) => handlePipelineSign(payload),
  pipelineVerify: (payload) => handlePipelineVerify(payload),
  deflateRaw: (payload) => handleDeflateRaw(payload),
  inflateRaw: (payload) => handleInflateRaw(payload),
  pipelineMcelieceKeygen: (payload) => handlePipelineMcelieceKeygen(payload),
  pipelineMceliecePkEncryptCompact: (payload) => handlePipelineMceliecePkEncryptCompact(payload),
  pipelineMcelieceSkDecryptCompact: (payload) => handlePipelineMcelieceSkDecryptCompact(payload),
  pipelineMcelieceEncryptCompact: (payload) => handlePipelineMcelieceEncryptCompact(payload),
  pipelineMcelieceDecryptCompact: (payload) => handlePipelineMcelieceDecryptCompact(payload)
};

self.addEventListener("message", async (event) => {
  const { id, action, payload } = event.data;

  try {
    const handler = ACTIONS[action];
    if (!handler) {
      throw new Error(`Unknown action: ${action}`);
    }
    const result = await handler(payload || {});
    self.postMessage({ id, ok: true, result }, getTransferables(result));
  } catch (error) {
    self.postMessage({ id, ok: false, error: error.message || String(error) });
  }
});

function getTransferables(result) {
  const transferables = [];

  if (result instanceof Uint8Array) {
    transferables.push(result.buffer);
    return transferables;
  }

  if (result && typeof result === "object") {
    for (const value of Object.values(result)) {
      if (value instanceof Uint8Array) {
        transferables.push(value.buffer);
      }
    }
  }

  return transferables;
}
