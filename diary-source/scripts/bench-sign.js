#!/usr/bin/env node
'use strict';

const path = require('path');
const fs   = require('fs');

async function main() {
  const createModule = require('./wasm-glue.js');
  const wasmBinary = fs.readFileSync(path.join(__dirname, 'assets', 'core', 'core.wasm'));
  const M = await createModule({ wasmBinary: new Uint8Array(wasmBinary) });
  M._module_init();

  const enc = new TextEncoder();
  const PASSWORD        = enc.encode('test-password-12');
  const PASSWORD_SALT   = enc.encode('signing tools v1');          // 16 bytes — matches tools.js
  const SIGN_PREFIX     = enc.encode('diary signature seed v1'); // 25 bytes — matches tools.js
  const MESSAGE         = enc.encode('Hello, benchmark!');
  const OPSLIMIT        = 2;
  const MEMLIMIT        = 128 * 1024 * 1024;

  const CPK_LEN = M._uov_cpk_bytes(); // 66576
  const CSK_LEN = M._uov_csk_bytes(); // 32
  const SIG_LEN = M._uov_sig_bytes(); // 96

  function alloc(bytes) {
    const ptr = M._malloc(bytes.length || 1);
    if (bytes.length > 0) M.HEAPU8.set(bytes, ptr);
    return ptr;
  }
  function wipe(ptr, len) {
    if (ptr && len > 0) M.HEAPU8.fill(0, ptr, ptr + len);
    M._free(ptr);
  }

  // ── 1. pipeline_sign  (full round-trip, opslimit=2) ─────────────────────
  console.log('\n▸ pipeline_sign  opslimit=2, memlimit=128 MiB');
  const N1 = 3;
  const t1 = [];
  for (let i = 0; i < N1; i++) {
    const pwPtr  = alloc(PASSWORD);
    const msgPtr = alloc(MESSAGE);
    const psPtr  = alloc(PASSWORD_SALT);
    const spPtr  = alloc(SIGN_PREFIX);
    const olPtr  = M._malloc(4);

    const t0 = performance.now();
    const out = M._pipeline_sign(
      pwPtr, PASSWORD.length,
      msgPtr, MESSAGE.length,
      0, 0,                       // extraSeed  — null/0
      psPtr, PASSWORD_SALT.length,
      spPtr, SIGN_PREFIX.length,
      0, 0,                       // context    — null/0
      OPSLIMIT, MEMLIMIT,
      olPtr
    );
    const ms = performance.now() - t0;
    t1.push(ms);

    if (out === 0) { console.error(`  run ${i + 1}: FAILED`); continue; }
    const outLen = M.HEAPU32[olPtr >>> 2];
    console.log(`  run ${i + 1}: ${ms.toFixed(0)} ms  (outLen=${outLen})`);

    M._free(out); // C allocated the result buffer
    wipe(pwPtr,  PASSWORD.length);
    wipe(msgPtr, MESSAGE.length);
    wipe(psPtr,  PASSWORD_SALT.length);
    wipe(spPtr,  SIGN_PREFIX.length);
    wipe(olPtr,  4);
  }
  console.log(`  avg: ${(t1.reduce((a, b) => a + b) / N1).toFixed(0)} ms`);

  // ── 2. UOV only: keygen + sign (2 expansions — old pipeline) ────────────
  console.log('\n▸ uov_keygen + uov_sign  (2 × key expansion — old JS pipeline)');
  const SEED = new Uint8Array(32).fill(0x42);
  const SSEED = new Uint8Array(32).fill(0x7a);
  const N2 = 5;
  const t2 = [];
  for (let i = 0; i < N2; i++) {
    const seedPtr  = alloc(SEED);
    const cpkPtr   = M._malloc(CPK_LEN);
    const cskPtr   = M._malloc(CSK_LEN);
    const ssPtr    = alloc(SSEED);
    const msgPtr   = alloc(MESSAGE);
    const sigPtr   = M._malloc(SIG_LEN);

    const t0 = performance.now();
    M._uov_keygen(seedPtr, SEED.length, cpkPtr, cskPtr);
    M._uov_sign(cskPtr, CSK_LEN, msgPtr, MESSAGE.length, ssPtr, SSEED.length, sigPtr, SIG_LEN);
    const ms = performance.now() - t0;
    t2.push(ms);

    wipe(seedPtr, SEED.length);
    wipe(cpkPtr,  CPK_LEN);
    wipe(cskPtr,  CSK_LEN);
    wipe(ssPtr,   SSEED.length);
    wipe(msgPtr,  MESSAGE.length);
    wipe(sigPtr,  SIG_LEN);
  }
  const avg2 = t2.reduce((a, b) => a + b) / N2;
  console.log(`  ${t2.map(t => t.toFixed(0) + 'ms').join('  ')}  avg=${avg2.toFixed(0)} ms`);

  // ── 3. UOV only: sign alone (1 expansion — new combined pipeline) ────────
  console.log('\n▸ uov_sign only           (1 × key expansion — new pipeline_sign)');
  const t3 = [];
  for (let i = 0; i < N2; i++) {
    const cskPtr  = alloc(SEED);   // CSK seed = same 32 bytes
    const ssPtr   = alloc(SSEED);
    const msgPtr  = alloc(MESSAGE);
    const sigPtr  = M._malloc(SIG_LEN);

    const t0 = performance.now();
    M._uov_sign(cskPtr, CSK_LEN, msgPtr, MESSAGE.length, ssPtr, SSEED.length, sigPtr, SIG_LEN);
    const ms = performance.now() - t0;
    t3.push(ms);

    wipe(cskPtr, CSK_LEN);
    wipe(ssPtr,  SSEED.length);
    wipe(msgPtr, MESSAGE.length);
    wipe(sigPtr, SIG_LEN);
  }
  const avg3 = t3.reduce((a, b) => a + b) / N2;
  console.log(`  ${t3.map(t => t.toFixed(0) + 'ms').join('  ')}  avg=${avg3.toFixed(0)} ms`);

  console.log(`\n  keygen+sign / sign ratio: ${(avg2 / avg3).toFixed(2)}×  (expected ≈ 2.0×)`);
  console.log(`  UOV saving vs old pipeline: ~${((1 - avg3 / avg2) * 100).toFixed(0)}% of UOV time saved\n`);
}

main().catch(console.error);
