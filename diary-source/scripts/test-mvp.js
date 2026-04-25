#!/usr/bin/env node
'use strict';

const path = require('path');
const fs   = require('fs');

const createModule = require(path.join(__dirname, '..', 'assets', 'core', 'core.js'));
const wasmBinary   = fs.readFileSync(path.join(__dirname, '..', 'assets', 'core', 'core.wasm'));

// <-<-�<-<-� Helpers <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
const enc = new TextDecoder();
let M;
let passed = 0;
let failed = 0;

function ok(label, condition) {
  if (condition) { console.log(`  <-�� ${label}`); passed++; }
  else           { console.error(`  <-�� ${label}`); failed++; }
}

function hexOf(bytes) { return Buffer.from(bytes).toString('hex'); }

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function alloc(bytes) {
  const ptr = M._malloc(bytes.length || 1);
  if (bytes.length > 0) M.HEAPU8.set(bytes, ptr);
  return ptr;
}

function wipe(ptr, len) {
  if (!ptr) return;
  if (len > 0) M.HEAPU8.fill(0, ptr, ptr + len);
  M._free(ptr);
}

// <-<-�<-<-� Leak detector <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
// Monkey-patches M._malloc / M._free to track JS-side live allocations.
// C-internal allocations go through the raw WASM table entry, not this proxy,
// so we only see allocations made explicitly in JS <-�<- which is exactly what we
// need to verify the result-pointer free discipline.
function installLeakDetector() {
  const live = new Map();
  const origMalloc = M._malloc.bind(M);
  const origFree   = M._free.bind(M);

  M._malloc = (size) => {
    const ptr = origMalloc(size);
    if (ptr !== 0) live.set(ptr, size);
    return ptr;
  };
  M._free = (ptr) => {
    if (ptr !== 0) live.delete(ptr);
    return origFree(ptr);
  };

  return {
    liveCount: () => live.size,
    reset:     () => live.clear(),
    dump:      () => [...live.entries()].map(([p, s]) => `ptr=${p} size=${s}`).join(', '),
    uninstall: () => { M._malloc = origMalloc; M._free = origFree; live.clear(); }
  };
}

// Runs fn(), then asserts no JS-side allocation is still live.
function checkLeak(label, fn) {
  const detector = installLeakDetector();
  fn();
  const count = detector.liveCount();
  if (count !== 0) console.error(`    leaked: ${detector.dump()}`);
  ok(`no leak: ${label}`, count === 0);
  detector.uninstall();
}

// Scans all of WASM linear memory for an exact byte-sequence match.
// Returns the byte offset of the first match, or -1 if not found.
// A non-(-1) result means the secret bytes were NOT erased from the heap.
function scanHeap(needle) {
  if (needle.length === 0) return -1;
  const heap = M.HEAPU8;
  outer: for (let i = 0; i <= heap.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (heap[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

// Zeroes ALL occurrences of needle in WASM linear memory.
// Used to scrub precomputation artifacts before running the system-under-test.
function scrubHeap(needle) {
  if (needle.length === 0) return 0;
  const heap = M.HEAPU8;
  let count = 0;
  outer: for (let i = 0; i <= heap.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (heap[i + j] !== needle[j]) continue outer;
    }
    heap.fill(0, i, i + needle.length);
    count++;
  }
  return count;
}

// <-<-�<-<-� Test vectors <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
const te            = new TextEncoder();
const PASSWORD      = te.encode('hunter2');
const PASSWORD_SALT = te.encode('signing tools v1');       // 16 bytes
const SIGN_PREFIX   = te.encode('diary signature seed v1');
const MESSAGE       = te.encode('hello world');
const FILENAME      = te.encode('hello.txt');
const CONTENT       = te.encode('this is the file content!');
const DERIVE_PREFIX = te.encode('encrypt v1');
const EXTRA_SEED    = te.encode('extra seed bytes!!!!');   // 20 bytes
const OPSLIMIT      = 2;
const MEMLIMIT      = 128 * 1024 * 1024;
const CPK_LEN       = 66576;
const SIG_LEN       = 96;

// <-<-�<-<-� Main <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
async function run() {
  M = await createModule({ wasmBinary: new Uint8Array(wasmBinary) });
  const rc = M._module_init();
  if (rc < 0) throw new Error(`module_init failed (rc=${rc})`);

  console.log('\n<-<-�<-<-� Functional tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�');

  // 1. BLAKE3 known-answer test (empty input)
  {
    const inPtr  = M._malloc(1);
    const outPtr = M._malloc(32);
    M._blake3_hash(inPtr, 0, outPtr, 32);
    const digest = hexOf(M.HEAPU8.slice(outPtr, outPtr + 32));
    wipe(inPtr, 0);
    wipe(outPtr, 32);
    ok('blake3("") = af1349...', digest === 'af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262');
  }

  // 2-4. pipeline_sign
  let cpk, sig;
  {
    const pwPtr  = alloc(PASSWORD);
    const msgPtr = alloc(MESSAGE);
    const psPtr  = alloc(PASSWORD_SALT);
    const spPtr  = alloc(SIGN_PREFIX);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_sign(
      pwPtr, PASSWORD.length,
      msgPtr, MESSAGE.length,
      0, 0,
      psPtr, PASSWORD_SALT.length,
      spPtr, SIGN_PREFIX.length,
      0, 0,
      OPSLIMIT, MEMLIMIT,
      olPtr
    );

    ok('pipeline_sign succeeded', resultPtr !== 0);

    if (resultPtr !== 0) {
      const outLen = M.HEAPU32[olPtr >>> 2];
      ok(`pipeline_sign outLen = ${CPK_LEN + SIG_LEN}`, outLen === CPK_LEN + SIG_LEN);
      const raw = M.HEAPU8.slice(resultPtr, resultPtr + outLen);
      cpk = raw.slice(0, CPK_LEN);
      sig = raw.slice(CPK_LEN);
      M._free(resultPtr);
    }

    wipe(pwPtr, PASSWORD.length);
    wipe(msgPtr, MESSAGE.length);
    wipe(psPtr, PASSWORD_SALT.length);
    wipe(spPtr, SIGN_PREFIX.length);
    wipe(olPtr, 4);
  }

  // 5. pipeline_verify: correct signature <-<-<- 1
  {
    const sigPtr = alloc(sig);
    const cpkPtr = alloc(cpk);
    const msgPtr = alloc(MESSAGE);
    const result = M._pipeline_verify(sigPtr, sig.length, cpkPtr, cpk.length, msgPtr, MESSAGE.length, 0, 0);
    ok('pipeline_verify correct sig <-<-<- 1', result === 1);
    wipe(sigPtr, sig.length);
    wipe(cpkPtr, cpk.length);
    wipe(msgPtr, MESSAGE.length);
  }

  // 6. pipeline_verify: wrong message <-<-<- 0
  {
    const wrongMsg = te.encode('wrong message!!');
    const sigPtr = alloc(sig);
    const cpkPtr = alloc(cpk);
    const msgPtr = alloc(wrongMsg);
    const result = M._pipeline_verify(sigPtr, sig.length, cpkPtr, cpk.length, msgPtr, wrongMsg.length, 0, 0);
    ok('pipeline_verify wrong msg <-<-<- 0', result === 0);
    wipe(sigPtr, sig.length);
    wipe(cpkPtr, cpk.length);
    wipe(msgPtr, wrongMsg.length);
  }

  // 7. Determinism: same inputs <-<-<- identical CPK + sig
  {
    const pwPtr  = alloc(PASSWORD);
    const msgPtr = alloc(MESSAGE);
    const psPtr  = alloc(PASSWORD_SALT);
    const spPtr  = alloc(SIGN_PREFIX);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_sign(
      pwPtr, PASSWORD.length,
      msgPtr, MESSAGE.length,
      0, 0,
      psPtr, PASSWORD_SALT.length,
      spPtr, SIGN_PREFIX.length,
      0, 0,
      OPSLIMIT, MEMLIMIT,
      olPtr
    );

    let det = false;
    if (resultPtr !== 0) {
      const outLen = M.HEAPU32[olPtr >>> 2];
      const raw2   = M.HEAPU8.slice(resultPtr, resultPtr + outLen);
      M._free(resultPtr);
      det = bytesEqual(raw2.slice(0, CPK_LEN), cpk) && bytesEqual(raw2.slice(CPK_LEN), sig);
    }

    ok('pipeline_sign is deterministic', det);
    wipe(pwPtr, PASSWORD.length);
    wipe(msgPtr, MESSAGE.length);
    wipe(psPtr, PASSWORD_SALT.length);
    wipe(spPtr, SIGN_PREFIX.length);
    wipe(olPtr, 4);
  }

  // 8-11. pipeline_encrypt + pipeline_decrypt
  let sivBytes;
  {
    const pwPtr  = alloc(PASSWORD);
    const fnPtr  = alloc(FILENAME);
    const ctPtr  = alloc(CONTENT);
    const dpPtr  = alloc(DERIVE_PREFIX);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_encrypt(
      pwPtr, PASSWORD.length,
      fnPtr, FILENAME.length,
      ctPtr, CONTENT.length,
      0, 0,
      dpPtr, DERIVE_PREFIX.length,
      OPSLIMIT, MEMLIMIT,
      olPtr
    );

    ok('pipeline_encrypt succeeded', resultPtr !== 0);

    if (resultPtr !== 0) {
      const outLen = M.HEAPU32[olPtr >>> 2];
      ok(`pipeline_encrypt sivLen = ${outLen}`, outLen > 0);
      sivBytes = M.HEAPU8.slice(resultPtr, resultPtr + outLen);
      M._free(resultPtr);
    }

    wipe(pwPtr, PASSWORD.length);
    wipe(fnPtr, FILENAME.length);
    wipe(ctPtr, CONTENT.length);
    wipe(dpPtr, DERIVE_PREFIX.length);
    wipe(olPtr, 4);
  }

  {
    const pwPtr  = alloc(PASSWORD);
    const sivPtr = alloc(sivBytes);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_decrypt(
      pwPtr, PASSWORD.length,
      sivPtr, sivBytes.length,
      olPtr
    );

    ok('pipeline_decrypt succeeded', resultPtr !== 0);

    if (resultPtr !== 0) {
      const outLen = M.HEAPU32[olPtr >>> 2];
      const raw    = M.HEAPU8.slice(resultPtr, resultPtr + outLen);
      M._free(resultPtr);
      const fnLen          = raw[0] | (raw[1] << 8) | (raw[2] << 16) | (raw[3] << 24);
      const decodedFilename = enc.decode(raw.slice(4, 4 + fnLen));
      const decodedContent  = raw.slice(4 + fnLen);
      ok('pipeline_decrypt filename = "hello.txt"', decodedFilename === 'hello.txt');
      ok(`pipeline_decrypt content matches (${CONTENT.length} bytes)`, bytesEqual(decodedContent, CONTENT));
    }

    wipe(pwPtr, PASSWORD.length);
    wipe(sivPtr, sivBytes.length);
    wipe(olPtr, 4);
  }

  // 12. pipeline_decrypt: wrong password <-<-<- 0
  {
    const wrongPw = te.encode('wrong-password!!');
    const pwPtr   = alloc(wrongPw);
    const sivPtr  = alloc(sivBytes);
    const olPtr   = M._malloc(4);

    const resultPtr = M._pipeline_decrypt(
      pwPtr, wrongPw.length,
      sivPtr, sivBytes.length,
      olPtr
    );

    ok('pipeline_decrypt wrong password <-<-<- 0', resultPtr === 0);
    wipe(pwPtr, wrongPw.length);
    wipe(sivPtr, sivBytes.length);
    wipe(olPtr, 4);
    if (resultPtr !== 0) M._free(resultPtr);
  }

  // 13. Extra seed encrypt/decrypt round-trip
  {
    const pwPtr  = alloc(PASSWORD);
    const fnPtr  = alloc(FILENAME);
    const ctPtr  = alloc(CONTENT);
    const esPtr  = alloc(EXTRA_SEED);
    const dpPtr  = alloc(DERIVE_PREFIX);
    const olPtr  = M._malloc(4);

    const encPtr = M._pipeline_encrypt(
      pwPtr, PASSWORD.length,
      fnPtr, FILENAME.length,
      ctPtr, CONTENT.length,
      esPtr, EXTRA_SEED.length,
      dpPtr, DERIVE_PREFIX.length,
      OPSLIMIT, MEMLIMIT,
      olPtr
    );

    let esOk = false;
    if (encPtr !== 0) {
      const sivLen = M.HEAPU32[olPtr >>> 2];
      const sivEs  = M.HEAPU8.slice(encPtr, encPtr + sivLen);
      M._free(encPtr);

      const pw2Ptr   = alloc(PASSWORD);
      const siv2Ptr  = alloc(sivEs);
      const ol2Ptr   = M._malloc(4);

      const decPtr = M._pipeline_decrypt(
        pw2Ptr, PASSWORD.length,
        siv2Ptr, sivEs.length,
        ol2Ptr
      );

      if (decPtr !== 0) {
        const outLen = M.HEAPU32[ol2Ptr >>> 2];
        const raw    = M.HEAPU8.slice(decPtr, decPtr + outLen);
        M._free(decPtr);
        const fnLen = raw[0] | (raw[1] << 8) | (raw[2] << 16) | (raw[3] << 24);
        esOk = bytesEqual(raw.slice(4 + fnLen), CONTENT);
      }

      wipe(pw2Ptr, PASSWORD.length);
      wipe(siv2Ptr, sivEs.length);
      wipe(ol2Ptr, 4);
    }

    ok('pipeline_encrypt/decrypt with extra seed round-trips', esOk);
    wipe(pwPtr, PASSWORD.length);
    wipe(fnPtr, FILENAME.length);
    wipe(ctPtr, CONTENT.length);
    wipe(esPtr, EXTRA_SEED.length);
    wipe(dpPtr, DERIVE_PREFIX.length);
    wipe(olPtr, 4);
  }

  // <-<-�<-<-� McEliece pipeline tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
  console.log('\n<-<-�<-<-� McEliece pipeline tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�');

  const MCELIECE_PK_LEN = 261120;
  const MCELIECE_SK_LEN = 6492;
  const MC_DERIVE_PREFIX = te.encode('diary message lock v1');
  const MC_MESSAGE = te.encode('secret message for McEliece test');
  const MC_FILENAME = te.encode('message');

  // 14. pipeline_mceliece_keygen
  {
    const kgSalt = te.encode('test-salt-16-byt');  // 16 bytes
    const pwPtr  = alloc(PASSWORD);
    const saltPtr = alloc(kgSalt);
    const pkPtr  = M._malloc(MCELIECE_PK_LEN);
    const skPtr  = M._malloc(MCELIECE_SK_LEN);

    const rc = M._pipeline_mceliece_keygen(
      pwPtr, PASSWORD.length,
      saltPtr, kgSalt.length,
      OPSLIMIT, MEMLIMIT,
      pkPtr, skPtr
    );

    ok('mceliece_keygen succeeded (rc=1)', rc === 1);

    // Check PK is non-zero
    const pkSlice = M.HEAPU8.slice(pkPtr, pkPtr + 32);
    const allZero = pkSlice.every(b => b === 0);
    ok('mceliece_keygen pk is non-zero', !allZero);

    // Determinism: same inputs <-<-<- same pk
    const pk1 = M.HEAPU8.slice(pkPtr, pkPtr + MCELIECE_PK_LEN);
    wipe(pwPtr, PASSWORD.length);
    wipe(saltPtr, kgSalt.length);
    wipe(skPtr, MCELIECE_SK_LEN);
    wipe(pkPtr, MCELIECE_PK_LEN);

    const pwPtr2  = alloc(PASSWORD);
    const saltPtr2 = alloc(kgSalt);
    const pkPtr2  = M._malloc(MCELIECE_PK_LEN);
    const skPtr2  = M._malloc(MCELIECE_SK_LEN);

    M._pipeline_mceliece_keygen(
      pwPtr2, PASSWORD.length,
      saltPtr2, kgSalt.length,
      OPSLIMIT, MEMLIMIT,
      pkPtr2, skPtr2
    );

    const pk2 = M.HEAPU8.slice(pkPtr2, pkPtr2 + MCELIECE_PK_LEN);
    ok('mceliece_keygen is deterministic', bytesEqual(pk1, pk2));

    wipe(pwPtr2, PASSWORD.length);
    wipe(saltPtr2, kgSalt.length);
    wipe(skPtr2, MCELIECE_SK_LEN);
    wipe(pkPtr2, MCELIECE_PK_LEN);
  }

  // <-<-�<-<-� pk_encrypt_compact / sk_decrypt_compact pipeline tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
  console.log('\n<-<-�<-<-� pk_encrypt_compact / sk_decrypt_compact pipeline tests <-<-�<-<-�');

  const WHISPER_KG_SALT  = te.encode('whisper tools v1');     // 16 bytes <-�<- matches whisper.js
  const WHISPER_PW       = te.encode('text');
  const WHISPER_SEED_PFX = te.encode('whisper pk encrypt v1');
  const WHISPER_CONTENT  = te.encode('hello from pk encrypt');
  const WHISPER_FILENAME = te.encode('message');

  let pkEncSivBytes;
  let whisperSk;

  // 15-16. keygen("text", "whisper tools v1") then pk_encrypt_compact to that pk
  {
    const pkBuf   = M._malloc(MCELIECE_PK_LEN);
    const skBuf   = M._malloc(MCELIECE_SK_LEN);
    const pwPtr   = alloc(WHISPER_PW);
    const saltPtr = alloc(WHISPER_KG_SALT);

    M._pipeline_mceliece_keygen(
      pwPtr, WHISPER_PW.length,
      saltPtr, WHISPER_KG_SALT.length,
      OPSLIMIT, MEMLIMIT,
      pkBuf, skBuf
    );

    wipe(pwPtr, WHISPER_PW.length);
    wipe(saltPtr, WHISPER_KG_SALT.length);

    const whisperPk = M.HEAPU8.slice(pkBuf, pkBuf + MCELIECE_PK_LEN);
    whisperSk = M.HEAPU8.slice(skBuf, skBuf + MCELIECE_SK_LEN);
    wipe(pkBuf, MCELIECE_PK_LEN);
    wipe(skBuf, MCELIECE_SK_LEN);

    // Derive encap seed: BLAKE3("whisper pk encrypt v1" || \0 || content) <-�<- matches message.js
    const seedInput = new Uint8Array(WHISPER_SEED_PFX.length + 1 + WHISPER_CONTENT.length);
    seedInput.set(WHISPER_SEED_PFX, 0);
    seedInput[WHISPER_SEED_PFX.length] = 0;
    seedInput.set(WHISPER_CONTENT, WHISPER_SEED_PFX.length + 1);
    const siPtr = alloc(seedInput);
    const soPtr = M._malloc(32);
    M._blake3_hash(siPtr, seedInput.length, soPtr, 32);
    const encapSeed = M.HEAPU8.slice(soPtr, soPtr + 32);
    wipe(siPtr, seedInput.length);
    wipe(soPtr, 32);

    const pkPtr  = alloc(whisperPk);
    const fnPtr  = alloc(WHISPER_FILENAME);
    const ctPtr  = alloc(WHISPER_CONTENT);
    const esPtr  = alloc(encapSeed);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_mceliece_pk_encrypt_compact(
      pkPtr, whisperPk.length,
      fnPtr, WHISPER_FILENAME.length,
      ctPtr, WHISPER_CONTENT.length,
      esPtr, encapSeed.length,
      olPtr
    );

    ok('pk_encrypt_compact succeeded', resultPtr !== 0);

    if (resultPtr !== 0) {
      const outLen = M.HEAPU32[olPtr >>> 2];
      ok('pk_encrypt_compact outLen > 0', outLen > 0);
      pkEncSivBytes = M.HEAPU8.slice(resultPtr, resultPtr + outLen);
      M._free(resultPtr);
    }

    wipe(pkPtr, whisperPk.length);
    wipe(fnPtr, WHISPER_FILENAME.length);
    wipe(ctPtr, WHISPER_CONTENT.length);
    wipe(esPtr, encapSeed.length);
    wipe(olPtr, 4);
  }

  // 17-18. sk_decrypt_compact round-trip
  if (pkEncSivBytes && whisperSk) {
    const skPtr  = alloc(whisperSk);
    const sivPtr = alloc(pkEncSivBytes);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_mceliece_sk_decrypt_compact(
      skPtr, whisperSk.length,
      sivPtr, pkEncSivBytes.length,
      olPtr
    );

    ok('sk_decrypt_compact succeeded', resultPtr !== 0);

    if (resultPtr !== 0) {
      const outLen = M.HEAPU32[olPtr >>> 2];
      const raw    = M.HEAPU8.slice(resultPtr, resultPtr + outLen);
      M._free(resultPtr);
      const fnLen          = raw[0] | (raw[1] << 8) | (raw[2] << 16) | (raw[3] << 24);
      const decodedContent = raw.slice(4 + fnLen);
      ok('sk_decrypt_compact content matches', bytesEqual(decodedContent, WHISPER_CONTENT));
    }

    wipe(skPtr, whisperSk.length);
    wipe(sivPtr, pkEncSivBytes.length);
    wipe(olPtr, 4);
  }

  // 19. sk_decrypt_compact with wrong SK <-<-<- 0
  if (pkEncSivBytes) {
    const wrongSk = new Uint8Array(MCELIECE_SK_LEN).fill(0xAB);
    const skPtr   = alloc(wrongSk);
    const sivPtr  = alloc(pkEncSivBytes);
    const olPtr   = M._malloc(4);

    const resultPtr = M._pipeline_mceliece_sk_decrypt_compact(
      skPtr, wrongSk.length,
      sivPtr, pkEncSivBytes.length,
      olPtr
    );

    ok('sk_decrypt_compact wrong sk <-<-<- 0', resultPtr === 0);
    if (resultPtr !== 0) M._free(resultPtr);

    wipe(skPtr, wrongSk.length);
    wipe(sivPtr, pkEncSivBytes.length);
    wipe(olPtr, 4);
  }

  // 20. Compact tag check: pk_encrypt_compact starts with 0x01
  if (pkEncSivBytes) {
    ok('pk_encrypt_compact tag = 0x01', pkEncSivBytes[0] === 0x01);
  }

  // <-<-�<-<-� Compact pipeline tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
  console.log('\n<-<-�<-<-� Compact pipeline tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�');

  // 26. pipeline_mceliece_encrypt_compact round-trip
  let mcCompactSivBytes;
  {
    // Derive 32-byte seed (same as tools.js compact path)
    const seedInput = new Uint8Array(MC_DERIVE_PREFIX.length + 1 + PASSWORD.length);
    seedInput.set(MC_DERIVE_PREFIX, 0);
    seedInput[MC_DERIVE_PREFIX.length] = 0;
    seedInput.set(PASSWORD, MC_DERIVE_PREFIX.length + 1);
    const siPtr = alloc(seedInput);
    const soPtr = M._malloc(32);
    M._blake3_hash(siPtr, seedInput.length, soPtr, 32);
    const derivedSeed = M.HEAPU8.slice(soPtr, soPtr + 32);
    wipe(siPtr, seedInput.length);
    wipe(soPtr, 32);

    const pwPtr  = alloc(PASSWORD);
    const fnPtr  = alloc(MC_FILENAME);
    const ctPtr  = alloc(MC_MESSAGE);
    const esPtr  = alloc(derivedSeed);
    const dpPtr  = alloc(MC_DERIVE_PREFIX);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_mceliece_encrypt_compact(
      pwPtr, PASSWORD.length,
      fnPtr, MC_FILENAME.length,
      ctPtr, MC_MESSAGE.length,
      esPtr, derivedSeed.length,
      dpPtr, MC_DERIVE_PREFIX.length,
      olPtr
    );

    ok('compact encrypt succeeded', resultPtr !== 0);

    if (resultPtr !== 0) {
      const outLen = M.HEAPU32[olPtr >>> 2];
      ok(`compact encrypt outLen > 0`, outLen > 0);
      mcCompactSivBytes = M.HEAPU8.slice(resultPtr, resultPtr + outLen);
      M._free(resultPtr);
      ok('compact encrypt tag = 0x02', mcCompactSivBytes[0] === 0x02);
    }

    wipe(pwPtr, PASSWORD.length);
    wipe(fnPtr, MC_FILENAME.length);
    wipe(ctPtr, MC_MESSAGE.length);
    wipe(esPtr, derivedSeed.length);
    wipe(dpPtr, MC_DERIVE_PREFIX.length);
    wipe(olPtr, 4);
  }

  // 27. pipeline_mceliece_decrypt_compact round-trip
  if (mcCompactSivBytes) {
    const pwPtr  = alloc(PASSWORD);
    const sivPtr = alloc(mcCompactSivBytes);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_mceliece_decrypt_compact(
      pwPtr, PASSWORD.length,
      sivPtr, mcCompactSivBytes.length,
      olPtr
    );

    ok('compact decrypt succeeded', resultPtr !== 0);

    if (resultPtr !== 0) {
      const outLen = M.HEAPU32[olPtr >>> 2];
      const raw    = M.HEAPU8.slice(resultPtr, resultPtr + outLen);
      M._free(resultPtr);
      const fnLen          = raw[0] | (raw[1] << 8) | (raw[2] << 16) | (raw[3] << 24);
      const decodedFilename = enc.decode(raw.slice(4, 4 + fnLen));
      const decodedContent  = raw.slice(4 + fnLen);
      ok('compact decrypt filename = "message"', decodedFilename === 'message');
      ok('compact decrypt content matches', bytesEqual(decodedContent, MC_MESSAGE));
    }

    wipe(pwPtr, PASSWORD.length);
    wipe(sivPtr, mcCompactSivBytes.length);
    wipe(olPtr, 4);
  }

  // 28. pipeline_mceliece_decrypt_compact wrong password <-<-<- 0
  if (mcCompactSivBytes) {
    const wrongPw = te.encode('wrong-password!!');
    const pwPtr   = alloc(wrongPw);
    const sivPtr  = alloc(mcCompactSivBytes);
    const olPtr   = M._malloc(4);

    const resultPtr = M._pipeline_mceliece_decrypt_compact(
      pwPtr, wrongPw.length,
      sivPtr, mcCompactSivBytes.length,
      olPtr
    );

    ok('compact decrypt wrong password <-<-<- 0', resultPtr === 0);
    if (resultPtr !== 0) M._free(resultPtr);

    wipe(pwPtr, wrongPw.length);
    wipe(sivPtr, mcCompactSivBytes.length);
    wipe(olPtr, 4);
  }

  // 29. pk_encrypt_compact / sk_decrypt_compact round-trip
  let pkCompactSivBytes;
  {
    // Reuse whisper keygen results
    const pkBuf   = M._malloc(MCELIECE_PK_LEN);
    const skBuf   = M._malloc(MCELIECE_SK_LEN);
    const pwPtr   = alloc(WHISPER_PW);
    const saltPtr = alloc(WHISPER_KG_SALT);

    M._pipeline_mceliece_keygen(
      pwPtr, WHISPER_PW.length,
      saltPtr, WHISPER_KG_SALT.length,
      OPSLIMIT, MEMLIMIT,
      pkBuf, skBuf
    );

    wipe(pwPtr, WHISPER_PW.length);
    wipe(saltPtr, WHISPER_KG_SALT.length);

    const compactPk = M.HEAPU8.slice(pkBuf, pkBuf + MCELIECE_PK_LEN);
    const compactSk = M.HEAPU8.slice(skBuf, skBuf + MCELIECE_SK_LEN);
    wipe(pkBuf, MCELIECE_PK_LEN);
    wipe(skBuf, MCELIECE_SK_LEN);

    // Derive encap seed
    const seedInput = new Uint8Array(WHISPER_SEED_PFX.length + 1 + WHISPER_CONTENT.length);
    seedInput.set(WHISPER_SEED_PFX, 0);
    seedInput[WHISPER_SEED_PFX.length] = 0;
    seedInput.set(WHISPER_CONTENT, WHISPER_SEED_PFX.length + 1);
    const siPtr = alloc(seedInput);
    const soPtr = M._malloc(32);
    M._blake3_hash(siPtr, seedInput.length, soPtr, 32);
    const encapSeed = M.HEAPU8.slice(soPtr, soPtr + 32);
    wipe(siPtr, seedInput.length);
    wipe(soPtr, 32);

    const pkPtr  = alloc(compactPk);
    const fnPtr  = alloc(WHISPER_FILENAME);
    const ctPtr  = alloc(WHISPER_CONTENT);
    const esPtr  = alloc(encapSeed);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_mceliece_pk_encrypt_compact(
      pkPtr, compactPk.length,
      fnPtr, WHISPER_FILENAME.length,
      ctPtr, WHISPER_CONTENT.length,
      esPtr, encapSeed.length,
      olPtr
    );

    ok('compact pk_encrypt succeeded', resultPtr !== 0);

    if (resultPtr !== 0) {
      const outLen = M.HEAPU32[olPtr >>> 2];
      ok('compact pk_encrypt outLen > 0', outLen > 0);
      pkCompactSivBytes = M.HEAPU8.slice(resultPtr, resultPtr + outLen);
      M._free(resultPtr);
      ok('compact pk_encrypt tag = 0x01', pkCompactSivBytes[0] === 0x01);
    }

    wipe(pkPtr, compactPk.length);
    wipe(fnPtr, WHISPER_FILENAME.length);
    wipe(ctPtr, WHISPER_CONTENT.length);
    wipe(esPtr, encapSeed.length);
    wipe(olPtr, 4);

    // Decrypt
    if (pkCompactSivBytes) {
      const skPtr  = alloc(compactSk);
      const sivPtr = alloc(pkCompactSivBytes);
      const olPtr2 = M._malloc(4);

      const resultPtr2 = M._pipeline_mceliece_sk_decrypt_compact(
        skPtr, compactSk.length,
        sivPtr, pkCompactSivBytes.length,
        olPtr2
      );

      ok('compact sk_decrypt succeeded', resultPtr2 !== 0);

      if (resultPtr2 !== 0) {
        const outLen = M.HEAPU32[olPtr2 >>> 2];
        const raw    = M.HEAPU8.slice(resultPtr2, resultPtr2 + outLen);
        M._free(resultPtr2);
        const fnLen          = raw[0] | (raw[1] << 8) | (raw[2] << 16) | (raw[3] << 24);
        const decodedContent = raw.slice(4 + fnLen);
        ok('compact sk_decrypt content matches', bytesEqual(decodedContent, WHISPER_CONTENT));
      }

      wipe(skPtr, compactSk.length);
      wipe(sivPtr, pkCompactSivBytes.length);
      wipe(olPtr2, 4);
    }
  }

  // <-<-�<-<-� Key zeroing (wipe) tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
  // Verify that the compiled WASM zeroes private key material after every
  // pipeline call. Strategy: pre-derive the expected private key bytes using
  // the raw low-level exports (_argon2id_hash + _mceliece_keygen / _uov_keygen),
  // zero those WASM allocations via wipe(), run the higher-level pipeline, then
  // immediately scan all of HEAPU8 for those bytes. WASM linear memory covers
  // both C heap and stack, so this catches local-variable keys too (provided
  // nothing has overwritten the region since the call returned).
  console.log('\n<-<-�<-<-� Key zeroing (wipe) tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�');

  // W1. McEliece SK (6492 bytes) wiped inside pipeline_mceliece_decrypt_compact.
  // At 6492 bytes the false-positive probability is negligible.
  if (mcCompactSivBytes) {
    // Extract kg_salt from compact packet: tag(1) | kg_salt[16] | kem_ct[96] | siv_ct
    const kgSalt = mcCompactSivBytes.slice(1, 17);

    // Derive the expected SK independently (same password + kg_salt).
    const kgSaltPtr = alloc(kgSalt);
    const pwPtr0    = alloc(PASSWORD);
    const seedPtr   = M._malloc(32);
    M._argon2id_hash(seedPtr, 32, pwPtr0, PASSWORD.length, kgSaltPtr, OPSLIMIT, 0, MEMLIMIT);
    wipe(pwPtr0, PASSWORD.length);
    wipe(kgSaltPtr, kgSalt.length);

    const pkPtr = M._malloc(MCELIECE_PK_LEN);
    const skPtr = M._malloc(MCELIECE_SK_LEN);
    M._mceliece_keygen(seedPtr, 32, pkPtr, skPtr);
    wipe(seedPtr, 32);
    wipe(pkPtr, MCELIECE_PK_LEN);
    const skBytes = M.HEAPU8.slice(skPtr, skPtr + MCELIECE_SK_LEN); // JS copy
    wipe(skPtr, MCELIECE_SK_LEN); // zero our WASM copy before pipeline runs

    // Run the pipeline <-�<- the SK is derived internally, used, then must be wiped.
    const pwPtr1   = alloc(PASSWORD);
    const sivPtr1  = alloc(mcCompactSivBytes);
    const olPtr1   = M._malloc(4);
    const resultW1 = M._pipeline_mceliece_decrypt_compact(
      pwPtr1, PASSWORD.length,
      sivPtr1, mcCompactSivBytes.length,
      olPtr1
    );
    if (resultW1 !== 0) M._free(resultW1);
    wipe(pwPtr1, PASSWORD.length);
    wipe(sivPtr1, mcCompactSivBytes.length);
    wipe(olPtr1, 4);

    // Scan immediately <-�<- before any further allocation might recycle the region.
    const foundW1 = scanHeap(skBytes);
    if (foundW1 !== -1) console.error(`    SK found at HEAPU8[0x${foundW1.toString(16)}]`);
    ok('McEliece SK wiped inside pipeline_mceliece_decrypt_compact', foundW1 === -1);
  }

  // W2. UOV CSK (32 bytes) wiped inside pipeline_sign.
  // Strategy: precompute the expected CSK, scrub ALL copies from HEAPU8,
  // verify the scrub is clean, then run the pipeline and scan.
  {
    // Derive the expected CSK: argon2id(password, password_salt) <-<-<- seed <-<-<- uov_keygen.
    const pwPtr2   = alloc(PASSWORD);
    const psPtr2   = alloc(PASSWORD_SALT);
    const seedPtr2 = M._malloc(32);
    M._argon2id_hash(seedPtr2, 32, pwPtr2, PASSWORD.length, psPtr2, OPSLIMIT, 0, MEMLIMIT);
    wipe(pwPtr2, PASSWORD.length);
    wipe(psPtr2, PASSWORD_SALT.length);

    const cpkPtr2 = M._malloc(CPK_LEN);
    const cskPtr2 = M._malloc(32);
    M._uov_keygen(seedPtr2, 32, cpkPtr2, cskPtr2);
    wipe(seedPtr2, 32);
    wipe(cpkPtr2, CPK_LEN);
    const cskBytes = M.HEAPU8.slice(cskPtr2, cskPtr2 + 32); // JS copy
    wipe(cskPtr2, 32);

    // Scrub all precomputation artifacts from WASM memory.
    const scrubbed2 = scrubHeap(cskBytes);
    ok(`W2 scrub: removed ${scrubbed2} precomputation CSK copies`, scanHeap(cskBytes) === -1);

    // Run pipeline_sign <-�<- CSK is derived internally, used for signing, then wiped.
    const pwPtr3   = alloc(PASSWORD);
    const msgPtr3  = alloc(MESSAGE);
    const psPtr3   = alloc(PASSWORD_SALT);
    const spPtr3   = alloc(SIGN_PREFIX);
    const olPtr3   = M._malloc(4);
    const resultW2 = M._pipeline_sign(
      pwPtr3, PASSWORD.length,
      msgPtr3, MESSAGE.length,
      0, 0,
      psPtr3, PASSWORD_SALT.length,
      spPtr3, SIGN_PREFIX.length,
      0, 0,
      OPSLIMIT, MEMLIMIT,
      olPtr3
    );
    if (resultW2 !== 0) M._free(resultW2);
    wipe(pwPtr3, PASSWORD.length);
    wipe(msgPtr3, MESSAGE.length);
    wipe(psPtr3, PASSWORD_SALT.length);
    wipe(spPtr3, SIGN_PREFIX.length);
    wipe(olPtr3, 4);

    const foundW2 = scanHeap(cskBytes);
    if (foundW2 !== -1) console.error(`    CSK found at HEAPU8[0x${foundW2.toString(16)}]`);
    ok('UOV CSK wiped inside pipeline_sign', foundW2 === -1);
  }

  // W3. XChaCha key (32 bytes) wiped inside pipeline_decrypt.
  // Same scrub-based strategy: precompute, scrub, verify clean, run, scan.
  {
    const lockerSalt = sivBytes.slice(26, 42);

    const pwPtrW3   = alloc(PASSWORD);
    const saltPtrW3 = alloc(lockerSalt);
    const keyPtrW3  = M._malloc(32);
    M._argon2id_hash(keyPtrW3, 32, pwPtrW3, PASSWORD.length, saltPtrW3, OPSLIMIT, 0, MEMLIMIT);
    wipe(pwPtrW3, PASSWORD.length);
    wipe(saltPtrW3, lockerSalt.length);
    const xchaKeyBytes = M.HEAPU8.slice(keyPtrW3, keyPtrW3 + 32);
    wipe(keyPtrW3, 32);

    // Scrub all precomputation artifacts from WASM memory.
    const scrubbed3 = scrubHeap(xchaKeyBytes);
    ok(`W3 scrub: removed ${scrubbed3} precomputation key copies`, scanHeap(xchaKeyBytes) === -1);

    const pwPtrW3b  = alloc(PASSWORD);
    const sivPtrW3  = alloc(sivBytes);
    const olPtrW3   = M._malloc(4);
    const resultW3  = M._pipeline_decrypt(pwPtrW3b, PASSWORD.length, sivPtrW3, sivBytes.length, olPtrW3);
    if (resultW3 !== 0) M._free(resultW3);
    wipe(pwPtrW3b, PASSWORD.length);
    wipe(sivPtrW3, sivBytes.length);
    wipe(olPtrW3, 4);

    const foundW3 = scanHeap(xchaKeyBytes);
    if (foundW3 !== -1) console.error(`    key found at HEAPU8[0x${foundW3.toString(16)}]`);
    ok('XChaCha key wiped inside pipeline_decrypt', foundW3 === -1);
  }

  // <-<-�<-<-� Leak detection tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
  // We patch M._malloc / M._free so only JS-side allocations are tracked.
  // C-internal allocations go through the raw WASM table and bypass the patch,
  // so we're specifically verifying that our JS code frees everything it allocs
  // <-�<- including the result pointer returned by each pipeline function.
  console.log('\n<-<-�<-<-� Leak detection tests <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�');

  // pipeline_sign <-�<- success path
  checkLeak('pipeline_sign (success path)', () => {
    const pwPtr  = alloc(PASSWORD);
    const msgPtr = alloc(MESSAGE);
    const psPtr  = alloc(PASSWORD_SALT);
    const spPtr  = alloc(SIGN_PREFIX);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_sign(
      pwPtr, PASSWORD.length,
      msgPtr, MESSAGE.length,
      0, 0,
      psPtr, PASSWORD_SALT.length,
      spPtr, SIGN_PREFIX.length,
      0, 0,
      OPSLIMIT, MEMLIMIT,
      olPtr
    );

    if (resultPtr !== 0) {
      M.HEAPU8.slice(resultPtr, resultPtr + M.HEAPU32[olPtr >>> 2]);
      M._free(resultPtr);
    }
    wipe(pwPtr, PASSWORD.length);
    wipe(msgPtr, MESSAGE.length);
    wipe(psPtr, PASSWORD_SALT.length);
    wipe(spPtr, SIGN_PREFIX.length);
    wipe(olPtr, 4);
  });

  // pipeline_encrypt <-�<- success path
  checkLeak('pipeline_encrypt (success path)', () => {
    const pwPtr  = alloc(PASSWORD);
    const fnPtr  = alloc(FILENAME);
    const ctPtr  = alloc(CONTENT);
    const dpPtr  = alloc(DERIVE_PREFIX);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_encrypt(
      pwPtr, PASSWORD.length,
      fnPtr, FILENAME.length,
      ctPtr, CONTENT.length,
      0, 0,
      dpPtr, DERIVE_PREFIX.length,
      OPSLIMIT, MEMLIMIT,
      olPtr
    );

    if (resultPtr !== 0) {
      M.HEAPU8.slice(resultPtr, resultPtr + M.HEAPU32[olPtr >>> 2]);
      M._free(resultPtr);
    }
    wipe(pwPtr, PASSWORD.length);
    wipe(fnPtr, FILENAME.length);
    wipe(ctPtr, CONTENT.length);
    wipe(dpPtr, DERIVE_PREFIX.length);
    wipe(olPtr, 4);
  });

  // pipeline_decrypt <-�<- success path
  checkLeak('pipeline_decrypt (success path)', () => {
    const pwPtr  = alloc(PASSWORD);
    const sivPtr = alloc(sivBytes);
    const olPtr  = M._malloc(4);

    const resultPtr = M._pipeline_decrypt(
      pwPtr, PASSWORD.length,
      sivPtr, sivBytes.length,
      olPtr
    );

    if (resultPtr !== 0) {
      M.HEAPU8.slice(resultPtr, resultPtr + M.HEAPU32[olPtr >>> 2]);
      M._free(resultPtr);
    }
    wipe(pwPtr, PASSWORD.length);
    wipe(sivPtr, sivBytes.length);
    wipe(olPtr, 4);
  });

  // pipeline_decrypt <-�<- failure path (wrong password <-<-<- resultPtr = 0, nothing to free)
  checkLeak('pipeline_decrypt (wrong password, failure path)', () => {
    const wrongPw = te.encode('totally-wrong-pw');
    const pwPtr   = alloc(wrongPw);
    const sivPtr  = alloc(sivBytes);
    const olPtr   = M._malloc(4);

    const resultPtr = M._pipeline_decrypt(
      pwPtr, wrongPw.length,
      sivPtr, sivBytes.length,
      olPtr
    );

    if (resultPtr !== 0) M._free(resultPtr); // safety net <-�<- should not be needed
    wipe(pwPtr, wrongPw.length);
    wipe(sivPtr, sivBytes.length);
    wipe(olPtr, 4);
  });

  // <-<-�<-<-� Summary <-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�
  const total = passed + failed;
  console.log('\n<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�<-<-�');
  if (failed === 0) {
    console.log(`ALL ${total} tests passed`);
  } else {
    console.error(`${failed} / ${total} tests FAILED`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
});
