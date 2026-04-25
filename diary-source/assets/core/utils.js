"use strict";

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

function zeroBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    return;
  }

  try {
    bytes.fill(0);
  } catch (_) {}
}

function bytesMatch(sourceBytes, expectedBytes, sourceOffset = 0) {
  if (sourceOffset < 0 || sourceOffset + expectedBytes.length > sourceBytes.length) {
    return false;
  }

  for (let index = 0; index < expectedBytes.length; index += 1) {
    if (sourceBytes[sourceOffset + index] !== expectedBytes[index]) {
      return false;
    }
  }

  return true;
}

function readUint32LE(source, offset, label) {
  if (offset < 0 || offset + 4 > source.length) {
    throw new Error(label ? `Truncated while reading ${label}` : "Data is truncated.");
  }

  return (
    source[offset] |
    (source[offset + 1] << 8) |
    (source[offset + 2] << 16) |
    (source[offset + 3] << 24)
  ) >>> 0;
}

function writeUint16LE(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

const _encoder = new TextEncoder();
const _diarySignatureContextBytes = _encoder.encode("diary signed text v1");

function getSignatureContextBytes() {
  return _diarySignatureContextBytes.slice();
}

const _diaryCoreClientState = { promise: null };

function getCryptoClient() {
  if (window.diaryCoreClient && typeof window.diaryCoreClient.init === "function") {
    return window.diaryCoreClient;
  }

  throw new Error("Crypto worker client is not available");
}

function initCoreClient() {
  if (_diaryCoreClientState.promise) {
    return _diaryCoreClientState.promise;
  }

  _diaryCoreClientState.promise = (async () => {
    const client = getCryptoClient();
    const vendorBaseUrl = new URL("../assets/core/", window.location.href).toString();
    await client.init(vendorBaseUrl);
    return client;
  })().catch((error) => {
    _diaryCoreClientState.promise = null;
    throw error;
  });

  return _diaryCoreClientState.promise;
}

function resetCoreClientPromise() {
  _diaryCoreClientState.promise = null;
}

async function disposeCoreClient(message = "Crypto worker was reset.") {
  const client = window.diaryCoreClient;
  resetCoreClientPromise();

  if (client && typeof client.destroy === "function") {
    client.destroy(message);
  }
}



const PROOF_MAGIC_BYTES = new Uint8Array([0x89, 0x4d, 0x57, 0x53, 0x49, 0x47, 0x02, 0x00]);
const PROOF_HEADER_LENGTH = PROOF_MAGIC_BYTES.length + 12;

function parseProofBytes(rawBytes) {
  if (rawBytes.length < PROOF_HEADER_LENGTH) {
    throw new Error("Proof header is truncated.");
  }

  if (!bytesMatch(rawBytes, PROOF_MAGIC_BYTES)) {
    throw new Error("Proof header is invalid.");
  }

  const publicKeyLength = readUint32LE(rawBytes, PROOF_MAGIC_BYTES.length);
  const messageLength = readUint32LE(rawBytes, PROOF_MAGIC_BYTES.length + 4);
  const signatureLength = readUint32LE(rawBytes, PROOF_MAGIC_BYTES.length + 8);
  const publicKeyStart = PROOF_HEADER_LENGTH;
  const publicKeyEnd = publicKeyStart + publicKeyLength;
  const messageStart = publicKeyEnd;
  const messageEnd = messageStart + messageLength;
  const signatureStart = messageEnd;
  const expectedFileLength = signatureStart + signatureLength;

  if (expectedFileLength !== rawBytes.length) {
    throw new Error("Proof payload is truncated.");
  }

  const _decoder = new TextDecoder();

  return {
    publicKeyBytes: rawBytes.slice(publicKeyStart, publicKeyEnd),
    message: _decoder.decode(rawBytes.subarray(messageStart, messageEnd)),
    signatureBytes: rawBytes.slice(signatureStart, expectedFileLength)
  };
}

function buildProofFile(message, publicKeyBytes, signatureBytes) {
  const messageBytes = _encoder.encode(message);
  const headerBytes = new Uint8Array(PROOF_HEADER_LENGTH);
  const proofBytes = new Uint8Array(
    PROOF_HEADER_LENGTH + publicKeyBytes.length + messageBytes.length + signatureBytes.length
  );

  if (
    publicKeyBytes.length > 0xffffffff ||
    messageBytes.length > 0xffffffff ||
    signatureBytes.length > 0xffffffff
  ) {
    throw new Error("Proof payload is too large.");
  }

  headerBytes.set(PROOF_MAGIC_BYTES, 0);
  writeUint32LE(headerBytes, PROOF_MAGIC_BYTES.length, publicKeyBytes.length);
  writeUint32LE(headerBytes, PROOF_MAGIC_BYTES.length + 4, messageBytes.length);
  writeUint32LE(headerBytes, PROOF_MAGIC_BYTES.length + 8, signatureBytes.length);
  proofBytes.set(headerBytes, 0);
  proofBytes.set(publicKeyBytes, PROOF_HEADER_LENGTH);
  proofBytes.set(messageBytes, PROOF_HEADER_LENGTH + publicKeyBytes.length);
  proofBytes.set(
    signatureBytes,
    PROOF_HEADER_LENGTH + publicKeyBytes.length + messageBytes.length
  );

  messageBytes.fill(0);
  headerBytes.fill(0);

  return proofBytes;
}

async function parseSignatureFile(file) {
  const rawBytes = new Uint8Array(await file.arrayBuffer());

  try {
    return parseProofBytes(rawBytes);
  } finally {
    rawBytes.fill(0);
  }
}

async function verifySignatureWithContext(publicKeyBytes, messageBytes, signatureBytes, contextBytes) {
  const client = await initCoreClient();

  return client.uovVerify({
    publicKeyBytes,
    messageBytes,
    signatureBytes,
    contextBytes
  });
}


const TKEY_MAGIC_BYTES = new Uint8Array([0x89, 0x4d, 0x59, 0x4b, 0x45, 0x59, 0x01, 0x00]);
const TKEY_HEADER_LENGTH = TKEY_MAGIC_BYTES.length;

function parseTkeyBytes(rawBytes) {
  if (rawBytes.length <= TKEY_HEADER_LENGTH) {
    throw new Error("Key file is too short.");
  }

  if (!bytesMatch(rawBytes, TKEY_MAGIC_BYTES)) {
    throw new Error("Key file header is invalid.");
  }

  return rawBytes.slice(TKEY_HEADER_LENGTH);
}

function buildTkeyBytes(publicKeyBytes) {
  const result = new Uint8Array(TKEY_HEADER_LENGTH + publicKeyBytes.length);
  result.set(TKEY_MAGIC_BYTES, 0);
  result.set(publicKeyBytes, TKEY_HEADER_LENGTH);
  return result;
}


const MKEY_MAGIC_BYTES = new Uint8Array([0x89, 0x4d, 0x43, 0x4b, 0x45, 0x59, 0x01, 0x00]);
const MKEY_HEADER_LENGTH = MKEY_MAGIC_BYTES.length;

function parseMkeyBytes(rawBytes) {
  if (rawBytes.length <= MKEY_HEADER_LENGTH) {
    throw new Error("Key file is too short.");
  }

  if (!bytesMatch(rawBytes, MKEY_MAGIC_BYTES)) {
    throw new Error("Key file header is invalid.");
  }

  return rawBytes.slice(MKEY_HEADER_LENGTH);
}

function buildMkeyBytes(publicKeyBytes) {
  const result = new Uint8Array(MKEY_HEADER_LENGTH + publicKeyBytes.length);
  result.set(MKEY_MAGIC_BYTES, 0);
  result.set(publicKeyBytes, MKEY_HEADER_LENGTH);
  return result;
}


const LOCKER_OPSLIMIT = 2;
const LOCKER_MEMLIMIT = 128 * 1024 * 1024;

const PROOF_FILE_EXTENSION = ".tsig";
const QR_COMPRESS_PREFIX = 0x01;
const WHISPER_KG_SALT = _encoder.encode("whisper tools v1");

function base64UrlToBytes(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;

  if (pad) {
    base64 += "=".repeat(4 - pad);
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = "";

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
