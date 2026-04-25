"use strict";

const whisperHeading = document.getElementById("whisper-heading");
const whisperPrompt = document.getElementById("whisper-prompt");
const whisperPassword = document.getElementById("whisper-password");
const whisperSubmit = document.getElementById("whisper-submit");
const whisperMessageBox = document.getElementById("whisper-message-box");

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const DEFAULT_HEADING = "open message";
const SUCCESS_HEADING = "message opened!";
const WRONG_PASSWORD_HEADING = "wrong password.";
const ERROR_HEADING = "something went wrong.";
const ERROR_RESET_DELAY_MS = 10000;
let payloadBytes = null;
let unlockInProgress = false;

const { set: setHeading } = makeHeadingController(whisperHeading, DEFAULT_HEADING);

function extractPayloadFromHash() {
  const hash = window.location.hash;

  if (!hash || hash.length < 2) {
    return null;
  }

  const raw = hash.slice(1);

  try {
    return base64UrlToBytes(raw);
  } catch (_) {
    return null;
  }
}

async function handleUnlock() {
  if (unlockInProgress || !whisperPassword || !payloadBytes) {
    return;
  }

  const password = whisperPassword.value;

  if (password.length === 0) {
    setHeading(DEFAULT_HEADING);
    return;
  }

  unlockInProgress = true;
  whisperSubmit.disabled = true;
  whisperPassword.disabled = true;

  let passwordBytes = null;
  let secretKeyBytes = null;
  let restoredFileBytes = null;

  try {
    passwordBytes = encoder.encode(password);

    // Compact wire format: tag byte at index 0
    // 0x01 = PK pipeline, 0x02 = password pipeline
    const tag = payloadBytes[0];

    const client = await initCoreClient();
    let decrypted;

    if (tag === 0x01) {
      const keygenResult = await client.pipelineMcelieceKeygen({
        passwordBytes,
        saltBytes: WHISPER_KG_SALT.slice(),
        opslimit: LOCKER_OPSLIMIT,
        memlimit: LOCKER_MEMLIMIT
      });
      secretKeyBytes = keygenResult.secretKeyBytes;
      decrypted = await client.pipelineMcelieceSkDecryptCompact({
        skBytes: secretKeyBytes,
        sivBytes: payloadBytes
      });
    } else if (tag === 0x02) {
      decrypted = await client.pipelineMcelieceDecryptCompact({
        passwordBytes,
        sivBytes: payloadBytes
      });
    } else {
      throw new Error("Unknown format tag: 0x" + tag.toString(16));
    }

    restoredFileBytes = decrypted.fileBytes;
    const plaintext = decoder.decode(restoredFileBytes);

    if (whisperMessageBox) {
      whisperMessageBox.textContent = plaintext;
      whisperMessageBox.hidden = false;
    }

    if (whisperPrompt) {
      whisperPrompt.hidden = true;
      whisperPrompt.style.display = "none";
    }

    document.body.dataset.outcome = "match";
    setHeading(SUCCESS_HEADING);
  } catch (error) {
    console.error(error);

    const heading = error.message === "Decryption failed"
      ? WRONG_PASSWORD_HEADING
      : ERROR_HEADING;

    setHeading(heading, { resetAfterMs: ERROR_RESET_DELAY_MS });
  } finally {
    zeroBytes(passwordBytes);
    zeroBytes(secretKeyBytes);
    zeroBytes(restoredFileBytes);

    whisperPassword.value = "";
    whisperPassword.disabled = false;
    whisperSubmit.disabled = false;
    unlockInProgress = false;
    disposeCoreClient();
  }
}

function init() {
  payloadBytes = extractPayloadFromHash();

  if (payloadBytes) {
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (_) {}
  }

  if (!payloadBytes) {
    window.location.replace("../");
    return;
  }

  if (whisperSubmit) {
    whisperSubmit.addEventListener("click", function () {
      void handleUnlock();
    });
  }

  if (whisperPassword) {
    whisperPassword.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleUnlock();
      }
    });
  }

  window.addEventListener("pagehide", function () {
    if (payloadBytes) {
      zeroBytes(payloadBytes);
      payloadBytes = null;
    }
  });
}

init();
