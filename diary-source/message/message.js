const messageHeading = document.getElementById("message-heading");
const messageCopyButton = document.getElementById("message-copy");
const messageOpenButton = document.getElementById("message-open");
const DEFAULT_HEADING = "email";
const COPY_SUCCESS_HEADING = "email copied.";
const COPY_ERROR_MESSAGE = "oops. . . address failed to copy.";
const SUCCESS_RESET_DELAY_MS = 10000;
const ERROR_RESET_DELAY_MS = 10000;

const { set: setHeading } = makeHeadingController(messageHeading, DEFAULT_HEADING);

function getAddress() {
  return "mylofiself" + "@" + "gmail.com";
}

function getMailtoHref() {
  return "mailto:" + getAddress();
}

async function copyMessageAddress() {
  if (!messageCopyButton) {
    return;
  }

  messageCopyButton.disabled = true;

  try {
    await copyTextToClipboard(getAddress());
    setHeading(COPY_SUCCESS_HEADING);
  } catch (error) {
    console.error(error);
    setHeading(COPY_ERROR_MESSAGE);
  } finally {
    messageCopyButton.disabled = false;
  }
}

function openMessageAddress() {
  if (!messageOpenButton) {
    return;
  }

  window.location.href = getMailtoHref();
}

if (messageOpenButton) {
  messageOpenButton.addEventListener("click", () => {
    openMessageAddress();
  });
}

if (messageCopyButton) {
  messageCopyButton.addEventListener("click", () => {
    void copyMessageAddress();
  });
}


// ── hide message ──────────────────────────────────────

const encoder = new TextEncoder();

const hideMsgHeading = document.getElementById("hide-msg-heading");
const hideMsgText = document.getElementById("hide-msg-text");
const hideMsgSubmit = document.getElementById("hide-msg-submit");
const hideMsgQr = document.getElementById("hide-msg-qr");
const hideMsgCopyLink = document.getElementById("hide-msg-copy-link");
if (hideMsgCopyLink) hideMsgCopyLink.textContent = navigator.share ? "share link" : "copy link";

const HIDE_DEFAULT_HEADING = "hide message";
const HIDE_LOCKED_HEADING = "message hidden! send me the link.";
const HIDE_ERROR_HEADING = "couldn't hide the message.";
const HIDE_MSG_REQUIRED_HEADING = "enter a message first.";
const HIDE_LINK_SHARED_HEADING = "link shared!";
const HIDE_LINK_COPIED_HEADING = "link copied!";
const HIDE_LINK_COPY_ERROR_HEADING = "couldn't copy the link.";
const HIDE_QR_TOO_LONG_HEADING = "message is too long for QR code.";
const HIDE_QR_ERROR_HEADING = "couldn't build QR.";
const HIDE_RESET_DELAY_MS = 10000;
const HIDE_ERROR_RESET_DELAY_MS = 10000;
const WHISPER_BASE_URL = new URL("../whisper/", window.location.href).toString();
const WHISPER_KEY_URL = new URL("../whisper/public.mkey", window.location.href).toString();
const WHISPER_SEED_PREFIX = encoder.encode("whisper pk encrypt v1");

let latestWhisperUrl = "";
let whisperPkBytes = null;
let whisperPkPromise = null;

const hideHeadingController = (typeof makeHeadingController === "function")
  ? makeHeadingController(hideMsgHeading, HIDE_DEFAULT_HEADING)
  : null;

function setHideHeading(message, options) {
  if (hideHeadingController) {
    hideHeadingController.set(message, options);
  } else if (hideMsgHeading) {
    hideMsgHeading.textContent = message;
  }
}

function resetHideAction() {
  latestWhisperUrl = "";

  if (hideMsgQr) {
    hideMsgQr.hidden = true;
  }

  if (hideMsgCopyLink) {
    hideMsgCopyLink.hidden = true;
  }
}

function setHideReady(whisperUrl) {
  latestWhisperUrl = whisperUrl;

  if (hideMsgQr) {
    hideMsgQr.hidden = false;
  }

  if (hideMsgCopyLink) {
    hideMsgCopyLink.hidden = false;
  }
}

function fetchWhisperKey() {
  if (whisperPkBytes) {
    return Promise.resolve(whisperPkBytes);
  }

  if (whisperPkPromise) {
    return whisperPkPromise;
  }

  whisperPkPromise = fetch(WHISPER_KEY_URL)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to fetch whisper key.");
      }
      return response.arrayBuffer();
    })
    .then(function (buffer) {
      whisperPkBytes = parseMkeyBytes(new Uint8Array(buffer));
      return whisperPkBytes;
    })
    .catch(function (error) {
      whisperPkPromise = null;
      throw error;
    });

  return whisperPkPromise;
}

async function handleHideMessage() {
  if (!hideMsgText || !hideMsgSubmit) {
    return;
  }

  const message = hideMsgText.value;

  if (message.length === 0) {
    setHideHeading(HIDE_MSG_REQUIRED_HEADING);
    return;
  }

  hideMsgSubmit.disabled = true;
  resetHideAction();

  let pkBytes = null;
  let filenameBytes = null;
  let contentBytes = null;
  let encapSeedBytes = null;
  let packageBytes = null;

  try {
    pkBytes = await fetchWhisperKey();
    filenameBytes = encoder.encode("message");
    contentBytes = encoder.encode(message);

    const client = await initCoreClient();
    encapSeedBytes = await client.blake3Hash({
      inputBytes: concatBytes([WHISPER_SEED_PREFIX, encoder.encode("\0"), contentBytes]),
      outputLength: 32
    });

    packageBytes = await client.pipelineMceliecePkEncryptCompact({
      pkBytes,
      filenameBytes,
      contentBytes,
      encapSeedBytes
    });

    const base64Payload = bytesToBase64Url(packageBytes);
    const whisperUrl = WHISPER_BASE_URL + "#" + base64Payload;
    if (hideMsgText) {
      hideMsgText.value = "";
      autoResizeTextArea(hideMsgText);
    }
    setHideReady(whisperUrl);
    setHideHeading(HIDE_LOCKED_HEADING);
  } catch (error) {
    console.error(error);
    resetHideAction();
    setHideHeading(HIDE_ERROR_HEADING);
  } finally {
    zeroBytes(filenameBytes);
    zeroBytes(contentBytes);
    zeroBytes(encapSeedBytes);
    zeroBytes(packageBytes);

    hideMsgSubmit.disabled = false;
    disposeCoreClient();
  }
}

async function handleHideMsgCopyLink() {
  if (!latestWhisperUrl) {
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({ url: latestWhisperUrl });
      setHideHeading(HIDE_LINK_SHARED_HEADING);
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
    }
  }

  try {
    await copyTextToClipboard(latestWhisperUrl);
    setHideHeading(HIDE_LINK_COPIED_HEADING);
  } catch (_) {
    setHideHeading(HIDE_LINK_COPY_ERROR_HEADING);
  }
}

async function handleHideMsgQr() {
  if (!latestWhisperUrl) {
    return;
  }

  const urlByteLength = new TextEncoder().encode(latestWhisperUrl).length;

  if (urlByteLength > QR_MAX_BYTES) {
    setHideHeading(HIDE_QR_TOO_LONG_HEADING);
    return;
  }

  try {
    await loadQrCode();
    const qrImageUrl = buildQrDataUrl(latestWhisperUrl, QR_LEVELS);

    if (!qrImageUrl) {
      setHideHeading(HIDE_QR_TOO_LONG_HEADING);
      return;
    }

    try {
      sessionStorage.setItem("qr-ts", Date.now().toString());
      sessionStorage.setItem("qr-image", qrImageUrl);
      sessionStorage.setItem("qr-link", latestWhisperUrl);
    } catch (_) {}

    const qrPageUrl = new URL("../tools/qr/", window.location.href);
    qrPageUrl.hash = encodeURIComponent(latestWhisperUrl);
    window.open(qrPageUrl.toString(), "_blank", "noopener,noreferrer");
  } catch (_) {
    setHideHeading(HIDE_QR_ERROR_HEADING);
  }
}

if (hideMsgSubmit) {
  hideMsgSubmit.addEventListener("click", function () {
    void handleHideMessage();
  });
}

if (hideMsgQr) {
  hideMsgQr.addEventListener("click", function () {
    void handleHideMsgQr();
  });
}

if (hideMsgCopyLink) {
  hideMsgCopyLink.addEventListener("click", function () {
    void handleHideMsgCopyLink();
  });
}

if (hideMsgText) {
  hideMsgText.addEventListener("input", function () {
    autoResizeTextArea(hideMsgText);
    setHideHeading(HIDE_DEFAULT_HEADING);
    if (latestWhisperUrl) {
      resetHideAction();
    }
  });
}

window.addEventListener("pagehide", function () {
  resetHideAction();
});
