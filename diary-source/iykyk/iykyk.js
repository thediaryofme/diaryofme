const promptText = document.getElementById("prompt-text");
const gateForm = document.getElementById("gate-form");
const codeInput = document.getElementById("code-input");

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PAYLOAD_URL = "./contents/index.siv";
const LOCKER_VIRTUAL_PATH = "./contents/site/";

let payloadPackage = null;
let bootstrapPromise = null;
let unlockInProgress = false;
let promptResetTimer = null;
let onlineHandler = null;
let offlineHandler = null;
let pageHideHandler = null;
const DEFAULT_PROMPT = "what's the code?";
const GENERIC_ERROR_PROMPT = "oops. . . something's not right.";
const INCORRECT_PROMPT = "sorry. . . that's not it.";
const OFFLINE_PROMPT = "you are offline.";
const INCORRECT_PROMPT_RESET_DELAY_MS = 10000;

function getInitializationPrompt(error) {
  return GENERIC_ERROR_PROMPT;
}

function getInitializationLogMessage(error) {
  const details = [];

  if (window.location.protocol === "file:") {
    details.push("Open this via http://localhost, not file://.");
  }

  if (error && error.message) {
    details.push(error.message);
  }

  if (details.length === 0) {
    return "Unknown initialization error.";
  }

  return details.join(" ");
}

function clearPromptResetTimer() {
  if (promptResetTimer !== null) {
    window.clearTimeout(promptResetTimer);
    promptResetTimer = null;
  }
}

function setPrompt(message, state) {
  clearPromptResetTimer();
  promptText.textContent = message;
  gateForm.dataset.state = state;
}

function setTemporaryPrompt(message, state, durationMs, resetMessage, resetState) {
  setPrompt(message, state);

  promptResetTimer = window.setTimeout(() => {
    promptResetTimer = null;
    setPrompt(resetMessage, resetState);
  }, durationMs);
}

function appendLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.info(`[${timestamp}] ${message}`);
}

function setBusy(isBusy) {
  codeInput.disabled = isBusy;
}

async function loadPayloadPackage() {
  const payloadURL = new URL(PAYLOAD_URL, window.location.href);

  const response = await fetch(payloadURL.toString());
  if (!response.ok) {
    throw new Error(`Failed to load encrypted payload (${response.status})`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function bootstrapResources() {
  if (payloadPackage) {
    return Promise.resolve();
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const loadedPayload = await loadPayloadPackage();
    payloadPackage = loadedPayload;
    appendLog("Encrypted payload package loaded.");
  })();

  bootstrapPromise
    .then(() => {
      bootstrapPromise = null;
    })
    .catch(() => {
      bootstrapPromise = null;
    });

  return bootstrapPromise;
}

function isZipBytes(bytes) {
  return (
    bytes instanceof Uint8Array &&
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

function readZipUint16LE(source, offset) {
  return source[offset] | (source[offset + 1] << 8);
}

function readZipUint32LE(source, offset) {
  return (
    source[offset] |
    (source[offset + 1] << 8) |
    (source[offset + 2] << 16) |
    (source[offset + 3] << 24)
  ) >>> 0;
}

function extractAllFromZip(zipBytes) {
  const files = new Map();
  let offset = 0;

  while (offset + 30 <= zipBytes.length) {
    const sig = readZipUint32LE(zipBytes, offset);

    if (sig !== 0x04034b50) {
      break;
    }

    const fileNameLen = readZipUint16LE(zipBytes, offset + 26);
    const extraLen = readZipUint16LE(zipBytes, offset + 28);
    const compressedSize = readZipUint32LE(zipBytes, offset + 18);
    const headerEnd = offset + 30 + fileNameLen + extraLen;

    if (headerEnd + compressedSize > zipBytes.length) {
      break;
    }

    const nameBytes = zipBytes.subarray(offset + 30, offset + 30 + fileNameLen);
    const name = decoder.decode(nameBytes);

    if (!name.endsWith("/")) {
      files.set(name, zipBytes.slice(headerEnd, headerEnd + compressedSize));
    }

    offset = headerEnd + compressedSize;
  }

  return files;
}

async function decryptPayload(passcodeBytes, sivBytes) {
  const client = await initCoreClient();
  const result = await client.pipelineDecrypt({ passwordBytes: passcodeBytes, sivBytes });
  const fileBytes = result.fileBytes;

  if (isZipBytes(fileBytes)) {
    return extractAllFromZip(fileBytes);
  }

  const files = new Map();
  files.set("index.html", new Uint8Array(fileBytes));
  return files;
}

async function storeFilesInServiceWorker(files) {
  const registration = await navigator.serviceWorker.ready;
  const sw = registration.active;
  if (!sw) {
    throw new Error("No active service worker.");
  }

  const fileEntries = [];
  const transferList = [];

  for (const [name, data] of files) {
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    fileEntries.push({ name, data: buf });
    transferList.push(buf);
  }

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => reject(new Error("SW did not respond.")), 5000);

    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      if (event.data && event.data.type === "locker-ready") {
        resolve();
      } else {
        reject(new Error("Unexpected SW response."));
      }
    };

    sw.postMessage(
      { type: "locker-store", files: fileEntries },
      [channel.port2, ...transferList]
    );
  });
}

function getTopLevelFolder(files) {
  for (const name of files.keys()) {
    const slash = name.indexOf("/");
    if (slash > 0) {
      return name.slice(0, slash + 1);
    }
  }
  return "";
}

async function renderUnlockedPayload(files) {
  await storeFilesInServiceWorker(files);
  const folder = getTopLevelFolder(files);
  window.location.replace(new URL(LOCKER_VIRTUAL_PATH + folder, window.location.href).toString());
}

function clearPayloadPackage() {
  if (!payloadPackage) {
    return;
  }

  try {
    zeroBytes(payloadPackage);
  } catch (_) {}

  payloadPackage = null;
}

function teardownGateEventHandlers() {
  if (gateForm) {
    gateForm.removeEventListener("submit", handleUnlock);
  }

  if (onlineHandler) {
    window.removeEventListener("online", onlineHandler);
    onlineHandler = null;
  }

  if (offlineHandler) {
    window.removeEventListener("offline", offlineHandler);
    offlineHandler = null;
  }

  if (pageHideHandler) {
    window.removeEventListener("pagehide", pageHideHandler);
    pageHideHandler = null;
  }
}

async function handleUnlock(event) {
  event.preventDefault();

  if (unlockInProgress) {
    return;
  }

  const passcode = codeInput.value;
  if (!passcode) {
    setPrompt(DEFAULT_PROMPT, "error");
    return;
  }

  unlockInProgress = true;
  codeInput.value = "";
  setBusy(true);

  const passcodeBytes = encoder.encode(passcode);

  try {
    await bootstrapResources();

    appendLog("Attempting unlock.");

    let files;
    try {
      files = await decryptPayload(passcodeBytes, payloadPackage);
    } catch (decryptError) {
      if (decryptError.message === "Decryption failed") {
        setTemporaryPrompt(
          INCORRECT_PROMPT,
          "error",
          INCORRECT_PROMPT_RESET_DELAY_MS,
          DEFAULT_PROMPT,
          "ready"
        );
        appendLog("Unlock failed: invalid passcode.");
        return;
      }
      throw decryptError;
    }

    clearPayloadPackage();
    teardownGateEventHandlers();
    disposeCoreClient();

    appendLog("Unlock succeeded.");
    await renderUnlockedPayload(files);
  } catch (error) {
    if (!payloadPackage) {
      setPrompt(getInitializationPrompt(error), "error");
      appendLog(`Initialization failed: ${getInitializationLogMessage(error)}`);
      return;
    }

    setPrompt(GENERIC_ERROR_PROMPT, "error");
    appendLog(`Unlock failed: ${error.message}`);
  } finally {
    zeroBytes(passcodeBytes);
    disposeCoreClient();
    unlockInProgress = false;
    setBusy(false);
  }
}

function init() {
  setPrompt(DEFAULT_PROMPT, "ready");
  gateForm.addEventListener("submit", handleUnlock);

  onlineHandler = () => {
    if (gateForm.dataset.state === "offline") {
      setPrompt(DEFAULT_PROMPT, "ready");
    }
    appendLog("Network connection restored.");
    void bootstrapResources().catch(() => {});
  };

  offlineHandler = () => {
    if (!payloadPackage) {
      setPrompt(OFFLINE_PROMPT, "offline");
    }
    appendLog("Network connection lost.");
  };

  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);

  pageHideHandler = () => {
    clearPayloadPackage();
    disposeCoreClient();
  };
  window.addEventListener("pagehide", pageHideHandler);

  void bootstrapResources().catch((error) => {
    if (!navigator.onLine) {
      setPrompt(OFFLINE_PROMPT, "offline");
    } else {
      setPrompt(getInitializationPrompt(error), "error");
    }
    appendLog(`Initialization failed: ${getInitializationLogMessage(error)}`);
  });
}

init();
