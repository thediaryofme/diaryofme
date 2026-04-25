const toolsMessage = document.getElementById("tools-message");
const toolsPrivateKey = document.getElementById("tools-private-key");
const toolsSigningSeed = document.getElementById("tools-signing-seed");
const toolsSubmit = document.getElementById("tools-submit");
const toolsQrSubmit = document.getElementById("tools-qr-submit");
const toolsPubkeySubmit = document.getElementById("tools-pubkey-submit");
const toolsHeading = document.getElementById("tools-heading");
const toolsEncryptHeading = document.getElementById("tools-encrypt-heading");
const toolsEncryptUpload = document.getElementById("tools-encrypt-upload");
const toolsEncryptInput = document.getElementById("tools-encrypt-file");
const toolsEncryptFolderInput = document.getElementById("tools-encrypt-folder");
const toolsEncryptLabel = document.getElementById("tools-encrypt-label");
const toolsEncryptPassword = document.getElementById("tools-encrypt-password");
const toolsEncryptSeed = document.getElementById("tools-encrypt-seed");
const toolsEncryptSubmit = document.getElementById("tools-encrypt-submit");
const toolsDecryptHeading = document.getElementById("tools-decrypt-heading");
const toolsDecryptUpload = document.getElementById("tools-decrypt-upload");
const toolsDecryptInput = document.getElementById("tools-decrypt-file");
const toolsDecryptLabel = document.getElementById("tools-decrypt-label");
const toolsDecryptPassword = document.getElementById("tools-decrypt-password");
const toolsDecryptSubmit = document.getElementById("tools-decrypt-submit");
const toolsCompressHeading = document.getElementById("tools-compress-heading");
const toolsCompressUpload = document.getElementById("tools-compress-upload");
const toolsCompressInput = document.getElementById("tools-compress-files");
const toolsCompressLabel = document.getElementById("tools-compress-label");
const toolsCompressSubmit = document.getElementById("tools-compress-submit");
const toolsHashHeading = document.getElementById("tools-hash-heading");
const toolsHashUpload = document.getElementById("tools-hash-upload");
const toolsHashInput = document.getElementById("tools-hash-file");
const toolsHashLabel = document.getElementById("tools-hash-label");
const toolsHashOutput = document.getElementById("tools-hash-output");
const toolsHashSubmit = document.getElementById("tools-hash-submit");
const toolsHashCopy = document.getElementById("tools-hash-copy");
const toolsVerifyHeading = document.getElementById("tools-verify-heading");
const toolsVerifyMessage = document.getElementById("tools-verify-message");
const toolsVerifySignatureUpload = document.getElementById("tools-verify-signature-upload");
const toolsVerifySignatureInput = document.getElementById("tools-verify-signature");
const toolsVerifySignatureLabel = document.getElementById("tools-verify-signature-label");
const toolsVerifyKeyUpload = document.getElementById("tools-verify-key-upload");
const toolsVerifyKeyInput = document.getElementById("tools-verify-key");
const toolsVerifyKeyLabel = document.getElementById("tools-verify-key-label");
const toolsVerifySubmit = document.getElementById("tools-verify-submit");
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const DEFAULT_FILENAME = `signature${PROOF_FILE_EXTENSION}`;
const DEFAULT_HEADING = "sign a message";
const SUCCESS_HEADING = "signing complete!";
const INTERNAL_ERROR_MESSAGE = "oops! something went wrong.";
const ERROR_RESET_DELAY_MS = 10000;
const PASSWORD_OPSLIMIT = 2;
const PASSWORD_MEMLIMIT = 128 * 1024 * 1024;
const PASSWORD_SALT = encoder.encode("signing tools v1");
const SIGNING_SEED_PREFIX = encoder.encode("diary signature seed v1");
const ENCRYPT_DERIVE_PREFIX = encoder.encode("diary encrypt derive v1");
const FILE_ACTION_RESET_DELAY_MS = 10000;
const ENCRYPT_DEFAULT_HEADING = "lock a file";
const DECRYPT_DEFAULT_HEADING = "unlock a file";
const ENCRYPT_SUCCESS_HEADING = "locking complete!";
const DECRYPT_SUCCESS_HEADING = "unlocking complete!";
const FILE_PASSWORD_REQUIRED_HEADING = "enter a password first.";
const ENCRYPT_ERROR_HEADING = "couldn't lock the file.";
const DECRYPT_ERROR_HEADING = "couldn't unlock the file.";
const DECRYPT_WRONG_PASSWORD_HEADING = "wrong password.";
const UNSUPPORTED_FILE_HEADING = "that file isn't supported.";
const FILE_REQUIRED_HEADING = "upload a file first.";
const HASH_DEFAULT_HEADING = "hash a file";
const HASH_SUCCESS_HEADING = "hashing complete!";
const HASH_ERROR_HEADING = "couldn't hash the file.";
const HASH_UPLOAD_DEFAULT_LABEL = "upload file to hash";
const VERIFY_TOOLS_DEFAULT_HEADING = "check a signature";
const VERIFY_TOOLS_MATCH_HEADING = "signature checks out!";
const VERIFY_TOOLS_NO_MATCH_HEADING = "signature didn't check out";
const VERIFY_TOOLS_ERROR_HEADING = "couldn't verify that signature.";
const VERIFY_TOOLS_SIGNATURE_REQUIRED_HEADING = "upload a signature first.";
const VERIFY_TOOLS_INVALID_SIGNATURE_HEADING = "please upload a .tsig file";
const VERIFY_TOOLS_SIGNATURE_UPLOAD_DEFAULT_LABEL = "upload signature";
const VERIFY_TOOLS_INVALID_KEY_HEADING = "invalid key file.";
const VERIFY_TOOLS_KEY_UPLOAD_DEFAULT_LABEL = "key (optional)";
const VERIFY_TOOLS_SITE_KEY_URL = "../verify/public.tkey";
const SIGN_MESSAGE_REQUIRED_HEADING = "enter a message first.";
const SIGN_SUBMIT_DEFAULT_LABEL = "sign message";
const SIGN_QR_LABEL = "QR";
const SIGN_QR_SUCCESS_HEADING = "qr ready.";
const SIGN_QR_ERROR_HEADING = "couldn't build qr for that signature.";
const SIGN_QR_TOO_LONG_HEADING = "sorry... your message is too long.";
const ENCRYPT_UPLOAD_DEFAULT_LABEL = "upload files to lock";
const DECRYPT_UPLOAD_DEFAULT_LABEL = "upload file to unlock";
const COMPRESS_DEFAULT_HEADING = "compress files";
const COMPRESS_SUCCESS_HEADING = "zip ready!";
const COMPRESS_ERROR_HEADING = "couldn't build the zip.";
const COMPRESS_UPLOAD_DEFAULT_LABEL = "upload files to compress";
const LOCK_MSG_DEFAULT_HEADING = "lock a message";
const LOCK_MSG_SUCCESS_HEADING = "message locked!";
const LOCK_MSG_ERROR_HEADING = "couldn't lock that message.";
const UNLOCK_MSG_DEFAULT_HEADING = "unlock a message";
const UNLOCK_MSG_SUCCESS_HEADING = "message unlocked!";
const UNLOCK_MSG_ERROR_HEADING = "couldn't unlock that message.";
const UNLOCK_MSG_WRONG_PASSWORD_HEADING = "wrong password for this message.";
const LOCK_MSG_MESSAGE_REQUIRED_HEADING = "enter a message first.";
const MCELIECE_DERIVE_PREFIX = encoder.encode("diary message lock v1");
const MKEY_FILE_EXTENSION = ".mkey";

const toolsLockMsgHeading = document.getElementById("tools-lock-msg-heading");
const toolsLockMsgText = document.getElementById("tools-lock-msg-text");
const toolsLockMsgPassword = document.getElementById("tools-lock-msg-password");
const toolsLockMsgSeed = document.getElementById("tools-lock-msg-seed");
const toolsLockMsgSubmit = document.getElementById("tools-lock-msg-submit");
const toolsLockMsgKeySubmit = document.getElementById("tools-lock-msg-key-submit");
const toolsUnlockMsgHeading = document.getElementById("tools-unlock-msg-heading");
const toolsUnlockMsgText = document.getElementById("tools-unlock-msg-text");
const toolsUnlockMsgPassword = document.getElementById("tools-unlock-msg-password");

const toolsUnlockMsgSubmit = document.getElementById("tools-unlock-msg-submit");

let toolsLatestMkeyBytes = null;

let signLengthsPromise = null;
let keygenLengthsPromise = null;
const panelHeadingResetIds = new WeakMap();
const toolsEncryptFileList = document.getElementById("tools-encrypt-file-list");
let encryptManagedFiles = [];

let toolsVerifySignatureBytes = null;
let toolsVerifyPublicKeyBytes = null;
let toolsVerifyUploadedKeyBytes = null;
let toolsVerifyUploadedKeyState = "empty";
let toolsVerifySiteKeyBytes = null;
let toolsVerifySiteKeyPromise = null;
let toolsVerifySignatureState = "empty";
let toolsLatestQrPayload = "";
let toolsLatestPublicKeyBytes = null;

const { set: setHeading } = makeHeadingController(toolsHeading, DEFAULT_HEADING);

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function deflateRawBytes(input) {
  var client = await initCoreClient();
  return client.deflateRaw({ inputBytes: input });
}

async function buildSignatureQrPayload(message, signatureBytes) {
  const compactProofBytes = buildProofFile(message, new Uint8Array(0), signatureBytes);
  const rawBase64 = bytesToBase64Url(compactProofBytes);

  var compressed = null;
  var compressedPayload = null;
  var compressedBase64 = null;

  try {
    compressed = await deflateRawBytes(compactProofBytes);
    compressedPayload = new Uint8Array(1 + compressed.length);
    compressedPayload[0] = QR_COMPRESS_PREFIX;
    compressedPayload.set(compressed, 1);
    compressedBase64 = bytesToBase64Url(compressedPayload);
  } catch (e) {
    compressedBase64 = null;
  }

  compactProofBytes.fill(0);

  var payloadBase64Url = (compressedBase64 && compressedBase64.length < rawBase64.length)
    ? compressedBase64
    : rawBase64;

  const verifyUrl = new URL("../verify/", window.location.href);
  verifyUrl.hash = payloadBase64Url;
  return verifyUrl.toString();
}

function setTextValue(input, value) {
  if (!(input instanceof HTMLTextAreaElement) && !(input instanceof HTMLInputElement)) {
    return;
  }

  input.value = value;

  if (input instanceof HTMLTextAreaElement) {
    autoResizeTextArea(input);
  }
}

function downloadBytes(bytes, filename, mimeType = "application/octet-stream") {
  const blob = new Blob([bytes], { type: mimeType });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 0);
}

function resetPublicKeyAction() {
  if (toolsLatestPublicKeyBytes) {
    toolsLatestPublicKeyBytes.fill(0);
    toolsLatestPublicKeyBytes = null;
  }

  if (toolsPubkeySubmit) {
    toolsPubkeySubmit.hidden = true;
  }
}

function setPublicKeyReady(bytes) {
  resetPublicKeyAction();
  toolsLatestPublicKeyBytes = bytes;

  if (toolsPubkeySubmit) {
    toolsPubkeySubmit.hidden = false;
  }
}

function resetQrAction() {
  toolsLatestQrPayload = "";
  resetPublicKeyAction();

  if (toolsQrSubmit) {
    toolsQrSubmit.hidden = true;
    toolsQrSubmit.disabled = false;
    toolsQrSubmit.textContent = SIGN_QR_LABEL;
  }
}

function setQrActionReady(payload) {
  toolsLatestQrPayload = payload;

  if (toolsQrSubmit) {
    toolsQrSubmit.hidden = false;
    toolsQrSubmit.disabled = false;
    toolsQrSubmit.textContent = SIGN_QR_LABEL;
  }
}

async function openSignatureQrPage() {
  if (!toolsLatestQrPayload) {
    return;
  }

  let dParam = "";

  try {
    dParam = new URL(toolsLatestQrPayload).hash.slice(1);
  } catch (_) {
    return;
  }

  if (!dParam) {
    return;
  }

  const qrPageUrl = new URL("./qr/", window.location.href);
  qrPageUrl.hash = dParam;

  const payloadByteLength = new TextEncoder().encode(qrPageUrl.toString()).length;
  if (payloadByteLength > QR_MAX_BYTES) {
    setHeading(SIGN_QR_TOO_LONG_HEADING, { resetAfterMs: ERROR_RESET_DELAY_MS });
    return;
  }

  try {
    await loadQrCode();
    const qrImageUrl = buildQrDataUrl(qrPageUrl.toString(), QR_LEVELS);
    sessionStorage.setItem("qr-ts", Date.now().toString());
    sessionStorage.setItem("qr-image", qrImageUrl || "");
  } catch (_) {}

  window.open(qrPageUrl.toString(), "_blank", "noopener,noreferrer");
}

function clearPanelHeadingReset(heading) {
  const timeoutId = panelHeadingResetIds.get(heading) || 0;

  if (!timeoutId) {
    return;
  }

  window.clearTimeout(timeoutId);
  panelHeadingResetIds.delete(heading);
}

function setPanelHeading(heading, defaultMessage, message = defaultMessage, { resetAfterMs = 0 } = {}) {
  if (!heading) {
    return;
  }

  clearPanelHeadingReset(heading);
  heading.textContent = message;

  if (message === defaultMessage || !Number.isFinite(resetAfterMs) || resetAfterMs <= 0) {
    return;
  }

  const timeoutId = window.setTimeout(() => {
    panelHeadingResetIds.delete(heading);
    heading.textContent = defaultMessage;
  }, resetAfterMs);

  panelHeadingResetIds.set(heading, timeoutId);
}

function setUploadLabel(upload, label, message, hasFile) {
  if (label) {
    label.textContent = message;
  }

  if (upload) {
    upload.classList.toggle("has-file", Boolean(hasFile));
  }
}

function resetUploadLabel(upload, label, defaultMessage) {
  setUploadLabel(upload, label, defaultMessage, false);
}

function getEncryptItemDisplayName(file) {
  const relativePath = file && typeof file.webkitRelativePath === "string" && file.webkitRelativePath.length > 0
    ? file.webkitRelativePath
    : file && typeof file.name === "string"
      ? file.name
      : "file";

  return normalizeZipEntryName(relativePath);
}

function renderEncryptFileList() {
  if (!toolsEncryptFileList) {
    return;
  }

  toolsEncryptFileList.innerHTML = "";

  if (encryptManagedFiles.length === 0) {
    toolsEncryptFileList.hidden = true;
    resetUploadLabel(toolsEncryptUpload, toolsEncryptLabel, ENCRYPT_UPLOAD_DEFAULT_LABEL);
    setPanelHeading(toolsEncryptHeading, ENCRYPT_DEFAULT_HEADING);
    return;
  }

  for (let index = 0; index < encryptManagedFiles.length; index += 1) {
    const file = encryptManagedFiles[index];
    const displayName = getEncryptItemDisplayName(file);
    const item = document.createElement("li");
    item.className = "encrypt-file-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "encrypt-file-name";
    nameSpan.textContent = displayName;
    nameSpan.title = displayName;

    const removeBtn = document.createElement("button");
    removeBtn.className = "encrypt-file-remove";
    removeBtn.type = "button";
    removeBtn.textContent = "x";
    removeBtn.setAttribute("aria-label", `remove ${displayName}`);
    removeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      encryptManagedFiles.splice(index, 1);
      renderEncryptFileList();
    });

    item.append(nameSpan, removeBtn);
    toolsEncryptFileList.append(item);
  }

  toolsEncryptFileList.hidden = false;
  setUploadLabel(toolsEncryptUpload, toolsEncryptLabel, ENCRYPT_UPLOAD_DEFAULT_LABEL, true);
  setPanelHeading(toolsEncryptHeading, ENCRYPT_DEFAULT_HEADING);
}

function addEncryptFiles(newFiles) {
  for (const file of newFiles) {
    if (file instanceof File) {
      encryptManagedFiles.push(file);
    }
  }

  renderEncryptFileList();
}

function clearEncryptFiles() {
  encryptManagedFiles = [];
  renderEncryptFileList();
}

function syncSelectedFileLabel(input, upload, label, defaultLabel, heading, defaultHeading) {
  if (!input || !input.files || input.files.length === 0) {
    resetUploadLabel(upload, label, defaultLabel);
    setPanelHeading(heading, defaultHeading);
    return;
  }

  const file = input.files[0];
  setUploadLabel(upload, label, file.name || defaultLabel, true);
  setPanelHeading(heading, defaultHeading);
}

function readFileBytes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function buildCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;

    for (let round = 0; round < 8; round += 1) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }

    table[index] = crc >>> 0;
  }

  return table;
}

const ZIP_CRC32_TABLE = buildCrc32Table();

function crc32Bytes(bytes) {
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc = ZIP_CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function toZipDosDateTime(sourceDate) {
  const date = sourceDate instanceof Date ? sourceDate : new Date();
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    dosTime: (hours << 11) | (minutes << 5) | seconds,
    dosDate: ((year - 1980) << 9) | (month << 5) | day
  };
}

function normalizeZipEntryName(name) {
  const normalized = (typeof name === "string" ? name : "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();

  if (normalized.length > 0) {
    return normalized;
  }

  return "file";
}

function ensureUniqueZipEntryName(name, usedNames) {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  const splitIndex = name.lastIndexOf(".");
  const hasExtension = splitIndex > 0 && splitIndex < name.length - 1;
  const baseName = hasExtension ? name.slice(0, splitIndex) : name;
  const extension = hasExtension ? name.slice(splitIndex) : "";

  let suffix = 2;

  while (true) {
    const candidate = `${baseName} (${suffix})${extension}`;

    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }

    suffix += 1;
  }
}

async function buildStoredZipFromFiles(files) {
  const entries = [];
  const usedNames = new Set();

  for (const file of files) {
    if (!(file instanceof File)) {
      continue;
    }

    const rawName = file.webkitRelativePath || file.name || "file";
    const normalizedName = normalizeZipEntryName(rawName);
    const entryName = ensureUniqueZipEntryName(normalizedName, usedNames);
    const fileBytes = await readFileBytes(file);
    entries.push({
      name: entryName,
      bytes: fileBytes,
      modifiedAt: file.lastModified ? new Date(file.lastModified) : new Date()
    });
  }

  if (entries.length === 0) {
    throw new Error("No files selected");
  }

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  try {
    for (const entry of entries) {
      const fileNameBytes = encoder.encode(entry.name);
      const fileBytes = entry.bytes;
      const { dosTime, dosDate } = toZipDosDateTime(entry.modifiedAt);
      const crc32 = crc32Bytes(fileBytes);

      const localHeader = new Uint8Array(30 + fileNameBytes.length);
      writeUint32LE(localHeader, 0, ZIP_LOCAL_FILE_HEADER_SIGNATURE);
      writeUint16LE(localHeader, 4, 20);
      writeUint16LE(localHeader, 6, 0);
      writeUint16LE(localHeader, 8, 0);
      writeUint16LE(localHeader, 10, dosTime);
      writeUint16LE(localHeader, 12, dosDate);
      writeUint32LE(localHeader, 14, crc32);
      writeUint32LE(localHeader, 18, fileBytes.length);
      writeUint32LE(localHeader, 22, fileBytes.length);
      writeUint16LE(localHeader, 26, fileNameBytes.length);
      writeUint16LE(localHeader, 28, 0);
      localHeader.set(fileNameBytes, 30);

      const centralHeader = new Uint8Array(46 + fileNameBytes.length);
      writeUint32LE(centralHeader, 0, ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE);
      writeUint16LE(centralHeader, 4, 20);
      writeUint16LE(centralHeader, 6, 20);
      writeUint16LE(centralHeader, 8, 0);
      writeUint16LE(centralHeader, 10, 0);
      writeUint16LE(centralHeader, 12, dosTime);
      writeUint16LE(centralHeader, 14, dosDate);
      writeUint32LE(centralHeader, 16, crc32);
      writeUint32LE(centralHeader, 20, fileBytes.length);
      writeUint32LE(centralHeader, 24, fileBytes.length);
      writeUint16LE(centralHeader, 28, fileNameBytes.length);
      writeUint16LE(centralHeader, 30, 0);
      writeUint16LE(centralHeader, 32, 0);
      writeUint16LE(centralHeader, 34, 0);
      writeUint16LE(centralHeader, 36, 0);
      writeUint32LE(centralHeader, 38, 0);
      writeUint32LE(centralHeader, 42, localOffset);
      centralHeader.set(fileNameBytes, 46);

      localParts.push(localHeader, fileBytes);
      centralParts.push(centralHeader);
      localOffset += localHeader.length + fileBytes.length;
    }

    const localBytes = concatBytes(localParts);
    const centralBytes = concatBytes(centralParts);
    const endRecord = new Uint8Array(22);

    writeUint32LE(endRecord, 0, ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE);
    writeUint16LE(endRecord, 4, 0);
    writeUint16LE(endRecord, 6, 0);
    writeUint16LE(endRecord, 8, entries.length);
    writeUint16LE(endRecord, 10, entries.length);
    writeUint32LE(endRecord, 12, centralBytes.length);
    writeUint32LE(endRecord, 16, localBytes.length);
    writeUint16LE(endRecord, 20, 0);

    return concatBytes([localBytes, centralBytes, endRecord]);
  } finally {
    for (const entry of entries) {
      zeroBytes(entry.bytes);
    }
  }
}

function getCompressLabelText(input) {
  if (!input || !input.files || input.files.length === 0) {
    return COMPRESS_UPLOAD_DEFAULT_LABEL;
  }

  if (input.files.length === 1) {
    return input.files[0].name || COMPRESS_UPLOAD_DEFAULT_LABEL;
  }

  return `${input.files.length} files selected`;
}

function syncCompressSelectionLabel() {
  if (!toolsCompressInput) {
    return;
  }

  const hasFiles = Boolean(toolsCompressInput.files && toolsCompressInput.files.length > 0);
  setUploadLabel(
    toolsCompressUpload,
    toolsCompressLabel,
    getCompressLabelText(toolsCompressInput),
    hasFiles
  );
  setPanelHeading(toolsCompressHeading, COMPRESS_DEFAULT_HEADING);
}

async function handleCompressFilesUpload() {
  if (!toolsCompressInput || !toolsCompressSubmit) {
    throw new Error("Compress UI is missing");
  }

  const selectedFiles = Array.from(toolsCompressInput.files || []);

  if (selectedFiles.length === 0) {
    setPanelHeading(toolsCompressHeading, COMPRESS_DEFAULT_HEADING, FILE_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }

  toolsCompressInput.disabled = true;
  toolsCompressSubmit.disabled = true;

  let zipBytes = null;

  try {
    zipBytes = await buildStoredZipFromFiles(selectedFiles);
    downloadBytes(zipBytes, "files.zip", "application/zip");
    setPanelHeading(toolsCompressHeading, COMPRESS_DEFAULT_HEADING, COMPRESS_SUCCESS_HEADING, {
      resetAfterMs: FILE_ACTION_RESET_DELAY_MS
    });
  } catch (error) {
    console.error(error);
    setPanelHeading(toolsCompressHeading, COMPRESS_DEFAULT_HEADING, COMPRESS_ERROR_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
  } finally {
    zeroBytes(zipBytes);
    toolsCompressInput.disabled = false;
    toolsCompressSubmit.disabled = false;
  }
}
function getPasswordValue(input) {
  return input ? input.value : "";
}

function getHashDownloadName(fileName) {
  const trimmedName = typeof fileName === "string" ? fileName.trim() : "";

  if (trimmedName.length === 0) {
    return "file.blake3.txt";
  }

  return `${trimmedName}.blake3.txt`;
}

function sanitizeDownloadBaseName(fileName, fallbackName) {
  const rawName = typeof fileName === "string" ? fileName.trim() : "";

  if (rawName.length === 0) {
    return fallbackName;
  }

  const withoutControls = rawName.replace(/[\u0000-\u001f\u007f]/g, "");
  const safeName = withoutControls
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "");

  if (safeName.length === 0) {
    return fallbackName;
  }

  const MAX_FILENAME_CHARS = 120;

  if (safeName.length > MAX_FILENAME_CHARS) {
    return safeName.slice(0, MAX_FILENAME_CHARS).trim();
  }

  return safeName;
}

function getEncryptedDownloadName(fileName) {
  const trimmedName = sanitizeDownloadBaseName(fileName, "locked");

  if (trimmedName.length === 0) {
    return "locked.siv";
  }

  const firstDotIndex = trimmedName.indexOf(".");

  if (firstDotIndex > 0) {
    return `${trimmedName.slice(0, firstDotIndex)}.siv`;
  }

  if (trimmedName.endsWith(".")) {
    return `${trimmedName.slice(0, -1) || "locked"}.siv`;
  }

  return `${trimmedName}.siv`;
}

function getRestoredFilename(storedFilenameBytes, fallbackName) {
  const storedName = decoder.decode(storedFilenameBytes).trim();

  if (storedName.length > 0) {
    return storedName;
  }

  return fallbackName || "unlocked-file";
}

function isZipArchiveBytes(bytes) {
  return (
    bytes instanceof Uint8Array &&
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

function readUint16LE(source, offset) {
  return source[offset] | (source[offset + 1] << 8);
}

function parseStoredZipEntries(zipBytes) {
  if (!isZipArchiveBytes(zipBytes)) {
    return null;
  }

  const entries = [];
  let offset = 0;

  while (offset + 30 <= zipBytes.length) {
    const sig = readUint32LE(zipBytes, offset, "zip local header");

    if (sig !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
      break;
    }

    const fileNameLen = readUint16LE(zipBytes, offset + 26);
    const extraLen = readUint16LE(zipBytes, offset + 28);
    const compressedSize = readUint32LE(zipBytes, offset + 18, "zip compressed size");
    const headerEnd = offset + 30 + fileNameLen + extraLen;

    if (headerEnd + compressedSize > zipBytes.length) {
      break;
    }

    const nameBytes = zipBytes.subarray(offset + 30, offset + 30 + fileNameLen);
    const name = new TextDecoder().decode(nameBytes);
    const data = zipBytes.slice(headerEnd, headerEnd + compressedSize);

    entries.push({ name, data });
    offset = headerEnd + compressedSize;
  }

  return entries;
}

async function getSignLengths() {
  if (signLengthsPromise) {
    return signLengthsPromise;
  }

  signLengthsPromise = initCoreClient()
    .then((client) => client.getUovLengths())
    .then((lengths) => ({
      publicKeyLength: lengths.publicKeyLength,
      privateKeyLength: lengths.privateKeyLength,
      signatureLength: lengths.signatureLength,
      blake3HashLength: lengths.blake3HashLength
    }))
    .catch((error) => {
      signLengthsPromise = null;
      throw error;
    });

  return signLengthsPromise;
}

async function getKeygenLengths() {
  if (keygenLengthsPromise) {
    return keygenLengthsPromise;
  }

  keygenLengthsPromise = initCoreClient()
    .then((client) => client.getUovLengths())
    .then((lengths) => ({
      publicKeyLength: lengths.publicKeyLength,
      privateKeyLength: lengths.privateKeyLength
    }))
    .catch((error) => {
      keygenLengthsPromise = null;
      throw error;
    });

  return keygenLengthsPromise;
}

async function deriveBytesWithBlake3(inputBytes, outputLength) {
  const client = await initCoreClient();

  return client.blake3Hash({
    inputBytes,
    outputLength
  });
}

async function buildSignatureProof() {
  if (!toolsMessage || !toolsPrivateKey || !toolsSubmit) {
    throw new Error("Tools UI is missing");
  }

  const message = toolsMessage.value;

  if (message.length === 0) {
    resetQrAction();
    setHeading(SIGN_MESSAGE_REQUIRED_HEADING, { resetAfterMs: ERROR_RESET_DELAY_MS });
    return;
  }

  if (toolsPrivateKey.value.length === 0) {
    resetQrAction();
    setHeading(FILE_PASSWORD_REQUIRED_HEADING, { resetAfterMs: ERROR_RESET_DELAY_MS });
    return;
  }

  resetQrAction();

  toolsSubmit.disabled = true;

  let passwordBytes = null;
  let publicKeyBytes = null;
  let messageBytes = null;
  let extraSeedBytes = null;
  let signatureContextBytes = null;
  let signatureBytes = null;
  let proofBytes = null;

  try {
    const [
      { privateKeyLength, signatureLength },
      keygenConfig
    ] = await Promise.all([getSignLengths(), getKeygenLengths()]);

    if (privateKeyLength !== keygenConfig.privateKeyLength) {
      throw new Error("Keygen/sign modules disagree on private key length.");
    }

    passwordBytes = encoder.encode(toolsPrivateKey.value);
    messageBytes = encoder.encode(message);
    extraSeedBytes = encoder.encode(toolsSigningSeed ? toolsSigningSeed.value : "");
    signatureContextBytes = getSignatureContextBytes();
    const client = await initCoreClient();
    const signingResult = await client.uovSignFromPassword({
      passwordBytes,
      messageBytes,
      extraSeedBytes,
      contextBytes: signatureContextBytes,
      passwordSaltBytes: PASSWORD_SALT.slice(),
      signingSeedPrefixBytes: SIGNING_SEED_PREFIX.slice(),
      passwordOpslimit: PASSWORD_OPSLIMIT,
      passwordMemlimit: PASSWORD_MEMLIMIT
    });
    publicKeyBytes = signingResult.publicKeyBytes;
    signatureBytes = signingResult.signatureBytes;

    if (!(publicKeyBytes instanceof Uint8Array) || publicKeyBytes.length !== keygenConfig.publicKeyLength) {
      throw new Error("Signing returned an invalid public key.");
    }

    if (!(signatureBytes instanceof Uint8Array) || signatureBytes.length !== signatureLength) {
      throw new Error("Signing failed.");
    }

    proofBytes = buildProofFile(message, publicKeyBytes, signatureBytes);
    downloadBytes(proofBytes, DEFAULT_FILENAME);
    setPublicKeyReady(publicKeyBytes.slice());
    setHeading(SUCCESS_HEADING);
    setQrActionReady(await buildSignatureQrPayload(message, signatureBytes));
  } catch (error) {
    console.error(error);
    resetQrAction();
    setHeading(INTERNAL_ERROR_MESSAGE, { resetAfterMs: ERROR_RESET_DELAY_MS });
  } finally {
    zeroBytes(passwordBytes);

    if (publicKeyBytes) {
      publicKeyBytes.fill(0);
    }

    if (messageBytes) {
      messageBytes.fill(0);
    }

    if (extraSeedBytes) {
      extraSeedBytes.fill(0);
    }

    if (signatureContextBytes) {
      signatureContextBytes.fill(0);
    }

    if (signatureBytes) {
      signatureBytes.fill(0);
    }

    if (proofBytes) {
      proofBytes.fill(0);
    }

    if (toolsPrivateKey) {
      toolsPrivateKey.value = "";
    }

    disposeCoreClient();
    toolsSubmit.disabled = false;
  }
}

async function handleEncryptUpload() {
  if (encryptManagedFiles.length === 0) {
    setPanelHeading(toolsEncryptHeading, ENCRYPT_DEFAULT_HEADING, FILE_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }

  const selectedFiles = encryptManagedFiles.slice();
  const password = getPasswordValue(toolsEncryptPassword);

  if (password.length === 0) {
    setPanelHeading(toolsEncryptHeading, ENCRYPT_DEFAULT_HEADING, FILE_PASSWORD_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }

  const passwordBytes = encoder.encode(password);
  let fileBytes = null;
  let filenameBytes = null;
  let extraSeedBytes = null;
  let packageBytes = null;
  let encryptSourceName = "locked";

  if (toolsEncryptInput) {
    toolsEncryptInput.disabled = true;
  }
  if (toolsEncryptPassword) {
    toolsEncryptPassword.disabled = true;
  }
  if (toolsEncryptSubmit) {
    toolsEncryptSubmit.disabled = true;
  }
  try {
    const loadedFileBytes = await buildStoredZipFromFiles(selectedFiles);

    fileBytes = loadedFileBytes;
    encryptSourceName = "locked.zip";
    filenameBytes = encoder.encode(encryptSourceName);
    extraSeedBytes = encoder.encode(toolsEncryptSeed ? toolsEncryptSeed.value : "");
    const client = await initCoreClient();
    packageBytes = await client.pipelineEncrypt({
      passwordBytes,
      filenameBytes,
      contentBytes: fileBytes,
      extraSeedBytes,
      derivePrefixBytes: ENCRYPT_DERIVE_PREFIX,
      opslimit: LOCKER_OPSLIMIT,
      memlimit: LOCKER_MEMLIMIT
    });

    downloadBytes(packageBytes, getEncryptedDownloadName(encryptSourceName));
    setPanelHeading(toolsEncryptHeading, ENCRYPT_DEFAULT_HEADING, ENCRYPT_SUCCESS_HEADING, {
      resetAfterMs: FILE_ACTION_RESET_DELAY_MS
    });
  } catch (error) {
    console.error(error);
    setPanelHeading(toolsEncryptHeading, ENCRYPT_DEFAULT_HEADING, ENCRYPT_ERROR_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
  } finally {
    zeroBytes(passwordBytes);
    zeroBytes(fileBytes);
    zeroBytes(filenameBytes);
    zeroBytes(extraSeedBytes);
    zeroBytes(packageBytes);
    if (toolsEncryptPassword) {
      toolsEncryptPassword.value = "";
    }
    if (toolsEncryptSeed) {
      toolsEncryptSeed.value = "";
    }
    if (toolsEncryptInput) {
      toolsEncryptInput.disabled = false;
    }
    if (toolsEncryptPassword) {
      toolsEncryptPassword.disabled = false;
    }
    if (toolsEncryptSubmit) {
      toolsEncryptSubmit.disabled = false;
    }

    clearEncryptFiles();
    disposeCoreClient();
  }
}

async function handleDecryptUpload() {
  if (!toolsDecryptInput || !toolsDecryptInput.files || toolsDecryptInput.files.length === 0) {
    setPanelHeading(toolsDecryptHeading, DECRYPT_DEFAULT_HEADING, FILE_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }

  const file = toolsDecryptInput.files[0];
  const password = getPasswordValue(toolsDecryptPassword);

  setUploadLabel(toolsDecryptUpload, toolsDecryptLabel, file.name || DECRYPT_UPLOAD_DEFAULT_LABEL, true);

  if (password.length === 0) {
    setPanelHeading(toolsDecryptHeading, DECRYPT_DEFAULT_HEADING, FILE_PASSWORD_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }

  const passwordBytes = encoder.encode(password);
  let fileBytes = null;
  let restoredFilenameBytes = null;
  let restoredFileBytes = null;

  toolsDecryptInput.disabled = true;
  if (toolsDecryptPassword) {
    toolsDecryptPassword.disabled = true;
  }
  if (toolsDecryptSubmit) {
    toolsDecryptSubmit.disabled = true;
  }
  try {
    const loadedFileBytes = await readFileBytes(file);

    fileBytes = loadedFileBytes;
    const client = await initCoreClient();
    const decrypted = await client.pipelineDecrypt({
      passwordBytes,
      sivBytes: fileBytes
    });
    restoredFilenameBytes = decrypted.filenameBytes;
    restoredFileBytes = decrypted.fileBytes;

    const restoredFilename = getRestoredFilename(restoredFilenameBytes, file.name);
    const normalizedRestoredFilename =
      isZipArchiveBytes(restoredFileBytes) && !restoredFilename.toLowerCase().endsWith(".zip")
        ? `${restoredFilename}.zip`
        : restoredFilename;

    downloadBytes(restoredFileBytes, normalizedRestoredFilename);
    setPanelHeading(toolsDecryptHeading, DECRYPT_DEFAULT_HEADING, DECRYPT_SUCCESS_HEADING, {
      resetAfterMs: FILE_ACTION_RESET_DELAY_MS
    });
  } catch (error) {
    console.error(error);

    const headingMessage =
      error.message === "Decryption failed"
        ? DECRYPT_WRONG_PASSWORD_HEADING
        : error.message === "Invalid encrypted file"
          ? UNSUPPORTED_FILE_HEADING
          : DECRYPT_ERROR_HEADING;

    setPanelHeading(toolsDecryptHeading, DECRYPT_DEFAULT_HEADING, headingMessage, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
  } finally {
    zeroBytes(passwordBytes);
    zeroBytes(fileBytes);
    zeroBytes(restoredFilenameBytes);
    zeroBytes(restoredFileBytes);

    if (toolsDecryptPassword) {
      toolsDecryptPassword.value = "";
    }

    toolsDecryptInput.disabled = false;
    if (toolsDecryptPassword) {
      toolsDecryptPassword.disabled = false;
    }
    if (toolsDecryptSubmit) {
      toolsDecryptSubmit.disabled = false;
    }

    disposeCoreClient();
  }
}

async function handleHashUpload() {
  if (!toolsHashInput || !toolsHashSubmit) {
    throw new Error("Hash UI is missing");
  }

  if (!toolsHashInput.files || toolsHashInput.files.length === 0) {
    setPanelHeading(toolsHashHeading, HASH_DEFAULT_HEADING, FILE_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }
  const selectedFiles = Array.from(toolsHashInput.files || []);
  const file = selectedFiles[0];
  let fileBytes = null;
  let hashBytes = null;

  setUploadLabel(
    toolsHashUpload,
    toolsHashLabel,
    selectedFiles.length > 1 ? `${selectedFiles.length} files selected` : (file.name || HASH_UPLOAD_DEFAULT_LABEL),
    true
  );
  toolsHashInput.disabled = true;
  toolsHashSubmit.disabled = true;

  try {
    const [{ blake3HashLength }, loadedFileBytes] = await Promise.all([
      getSignLengths(),
      selectedFiles.length > 1 ? buildStoredZipFromFiles(selectedFiles) : readFileBytes(file)
    ]);

    fileBytes = loadedFileBytes;
    hashBytes = await deriveBytesWithBlake3(fileBytes, blake3HashLength);

    const hashText = bytesToHex(hashBytes);
    setTextValue(toolsHashOutput, hashText);
    if (toolsHashCopy) {
      toolsHashCopy.hidden = false;
    }
    setPanelHeading(toolsHashHeading, HASH_DEFAULT_HEADING, HASH_SUCCESS_HEADING, {
      resetAfterMs: FILE_ACTION_RESET_DELAY_MS
    });
  } catch (error) {
    console.error(error);
    if (toolsHashCopy) {
      toolsHashCopy.hidden = true;
    }
    setPanelHeading(toolsHashHeading, HASH_DEFAULT_HEADING, HASH_ERROR_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
  } finally {
    zeroBytes(fileBytes);
    zeroBytes(hashBytes);
    toolsHashInput.disabled = false;
    toolsHashSubmit.disabled = false;
  }
}

async function handleVerifySignatureSelection() {
  if (!toolsVerifySignatureInput) {
    return;
  }

  if (toolsVerifySignatureBytes) {
    zeroBytes(toolsVerifySignatureBytes);
    toolsVerifySignatureBytes = null;
  }

  if (toolsVerifyPublicKeyBytes) {
    zeroBytes(toolsVerifyPublicKeyBytes);
    toolsVerifyPublicKeyBytes = null;
  }

  toolsVerifySignatureState = "empty";
  setPanelHeading(toolsVerifyHeading, VERIFY_TOOLS_DEFAULT_HEADING);
  setTextValue(toolsVerifyMessage, "");

  if (!toolsVerifySignatureInput.files || toolsVerifySignatureInput.files.length === 0) {
    resetUploadLabel(
      toolsVerifySignatureUpload,
      toolsVerifySignatureLabel,
      VERIFY_TOOLS_SIGNATURE_UPLOAD_DEFAULT_LABEL
    );
    return;
  }

  const file = toolsVerifySignatureInput.files[0];
  setUploadLabel(
    toolsVerifySignatureUpload,
    toolsVerifySignatureLabel,
    file.name || VERIFY_TOOLS_SIGNATURE_UPLOAD_DEFAULT_LABEL,
    true
  );

  try {
    const proof = await parseSignatureFile(file);
    toolsVerifyPublicKeyBytes = proof.publicKeyBytes;
    toolsVerifySignatureBytes = proof.signatureBytes;
    toolsVerifySignatureState = "valid";
    setTextValue(toolsVerifyMessage, proof.message);
  } catch (error) {
    console.error(error);
    toolsVerifySignatureState = "invalid";
  }
}

async function fetchToolsVerifySiteKey() {
  if (toolsVerifySiteKeyBytes) {
    return toolsVerifySiteKeyBytes;
  }

  if (!toolsVerifySiteKeyPromise) {
    toolsVerifySiteKeyPromise = fetch(VERIFY_TOOLS_SITE_KEY_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch site public key.");
        }

        return response.arrayBuffer();
      })
      .then((buffer) => {
        const bytes = new Uint8Array(buffer);
        try {
          toolsVerifySiteKeyBytes = parseTkeyBytes(bytes);
          return toolsVerifySiteKeyBytes;
        } finally {
          zeroBytes(bytes);
        }
      })
      .catch((error) => {
        toolsVerifySiteKeyPromise = null;
        throw error;
      });
  }

  return toolsVerifySiteKeyPromise;
}

function clearToolsVerifyUploadedKey() {
  if (toolsVerifyUploadedKeyBytes) {
    zeroBytes(toolsVerifyUploadedKeyBytes);
    toolsVerifyUploadedKeyBytes = null;
  }

  toolsVerifyUploadedKeyState = "empty";
  resetUploadLabel(
    toolsVerifyKeyUpload,
    toolsVerifyKeyLabel,
    VERIFY_TOOLS_KEY_UPLOAD_DEFAULT_LABEL
  );
}

async function handleVerifyKeySelection() {
  clearToolsVerifyUploadedKey();
  setPanelHeading(toolsVerifyHeading, VERIFY_TOOLS_DEFAULT_HEADING);

  if (!toolsVerifyKeyInput || !toolsVerifyKeyInput.files || toolsVerifyKeyInput.files.length === 0) {
    return;
  }

  const file = toolsVerifyKeyInput.files[0];
  let keyFileBytes = null;

  setUploadLabel(
    toolsVerifyKeyUpload,
    toolsVerifyKeyLabel,
    file.name || VERIFY_TOOLS_KEY_UPLOAD_DEFAULT_LABEL,
    true
  );

  try {
    keyFileBytes = await readFileBytes(file);
    toolsVerifyUploadedKeyBytes = parseTkeyBytes(keyFileBytes);
    toolsVerifyUploadedKeyState = "valid";
  } catch (error) {
    console.error(error);
    toolsVerifyUploadedKeyState = "invalid";
    if (toolsVerifyUploadedKeyBytes) {
      zeroBytes(toolsVerifyUploadedKeyBytes);
      toolsVerifyUploadedKeyBytes = null;
    }
    setPanelHeading(
      toolsVerifyHeading,
      VERIFY_TOOLS_DEFAULT_HEADING,
      VERIFY_TOOLS_INVALID_KEY_HEADING,
      { resetAfterMs: ERROR_RESET_DELAY_MS }
    );
  } finally {
    zeroBytes(keyFileBytes);
  }
}

async function handleVerifySignatureUpload() {
  if (!toolsVerifySignatureInput || !toolsVerifySubmit) {
    throw new Error("Verify UI is missing");
  }

  if (toolsVerifySignatureState === "empty") {
    setPanelHeading(
      toolsVerifyHeading,
      VERIFY_TOOLS_DEFAULT_HEADING,
      VERIFY_TOOLS_SIGNATURE_REQUIRED_HEADING,
      { resetAfterMs: ERROR_RESET_DELAY_MS }
    );
    return;
  }

  if (toolsVerifySignatureState !== "valid" || !(toolsVerifySignatureBytes instanceof Uint8Array)) {
    setPanelHeading(
      toolsVerifyHeading,
      VERIFY_TOOLS_DEFAULT_HEADING,
      VERIFY_TOOLS_INVALID_SIGNATURE_HEADING,
      { resetAfterMs: ERROR_RESET_DELAY_MS }
    );
    return;
  }

  if (toolsVerifyUploadedKeyState === "invalid") {
    setPanelHeading(
      toolsVerifyHeading,
      VERIFY_TOOLS_DEFAULT_HEADING,
      VERIFY_TOOLS_INVALID_KEY_HEADING,
      { resetAfterMs: ERROR_RESET_DELAY_MS }
    );
    return;
  }

  const messageBytes = encoder.encode(toolsVerifyMessage ? toolsVerifyMessage.value : "");
  let signatureContextBytes = null;

  toolsVerifySignatureInput.disabled = true;
  if (toolsVerifyKeyInput) {
    toolsVerifyKeyInput.disabled = true;
  }
  toolsVerifySubmit.disabled = true;

  try {
    const { publicKeyLength, signatureLength } = await getSignLengths();
    const verifyPublicKeyBytes = toolsVerifyUploadedKeyBytes || await fetchToolsVerifySiteKey();

    if (!(verifyPublicKeyBytes instanceof Uint8Array) || verifyPublicKeyBytes.length !== publicKeyLength) {
      throw new Error("Public key length is invalid.");
    }

    if (toolsVerifyPublicKeyBytes instanceof Uint8Array && toolsVerifyPublicKeyBytes.length > 0) {
      if (toolsVerifyPublicKeyBytes.length !== publicKeyLength) {
        setPanelHeading(toolsVerifyHeading, VERIFY_TOOLS_DEFAULT_HEADING, VERIFY_TOOLS_NO_MATCH_HEADING);
        return;
      }

      if (!bytesMatch(toolsVerifyPublicKeyBytes, verifyPublicKeyBytes)) {
        setPanelHeading(toolsVerifyHeading, VERIFY_TOOLS_DEFAULT_HEADING, VERIFY_TOOLS_NO_MATCH_HEADING);
        return;
      }
    }

    if (toolsVerifySignatureBytes.length !== signatureLength) {
      setPanelHeading(toolsVerifyHeading, VERIFY_TOOLS_DEFAULT_HEADING, VERIFY_TOOLS_NO_MATCH_HEADING);
      return;
    }

    signatureContextBytes = getSignatureContextBytes();

    const result = await verifySignatureWithContext(
      verifyPublicKeyBytes,
      messageBytes,
      toolsVerifySignatureBytes,
      signatureContextBytes
    );

    setPanelHeading(
      toolsVerifyHeading,
      VERIFY_TOOLS_DEFAULT_HEADING,
      result === 1 ? VERIFY_TOOLS_MATCH_HEADING : VERIFY_TOOLS_NO_MATCH_HEADING
    );
  } catch (error) {
    console.error(error);
    setPanelHeading(toolsVerifyHeading, VERIFY_TOOLS_DEFAULT_HEADING, VERIFY_TOOLS_ERROR_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
  } finally {
    zeroBytes(messageBytes);
    zeroBytes(signatureContextBytes);
    toolsVerifySignatureInput.disabled = false;
    if (toolsVerifyKeyInput) {
      toolsVerifyKeyInput.disabled = false;
    }
    toolsVerifySubmit.disabled = false;
  }
}

// =========================================================================
//  McEliece message lock / unlock
// =========================================================================

function resetMkeyAction() {
  if (toolsLatestMkeyBytes) {
    toolsLatestMkeyBytes.fill(0);
    toolsLatestMkeyBytes = null;
  }

  if (toolsLockMsgKeySubmit) {
    toolsLockMsgKeySubmit.hidden = true;
  }
}

function setMkeyReady(publicKeyBytes) {
  resetMkeyAction();
  toolsLatestMkeyBytes = publicKeyBytes;

  if (toolsLockMsgKeySubmit) {
    toolsLockMsgKeySubmit.hidden = false;
  }
}

async function handleLockMessage() {
  if (!toolsLockMsgText || !toolsLockMsgSubmit) {
    return;
  }

  const message = toolsLockMsgText.value;

  if (message.length === 0) {
    setPanelHeading(toolsLockMsgHeading, LOCK_MSG_DEFAULT_HEADING, LOCK_MSG_MESSAGE_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }

  const password = getPasswordValue(toolsLockMsgPassword);

  if (password.length === 0) {
    setPanelHeading(toolsLockMsgHeading, LOCK_MSG_DEFAULT_HEADING, FILE_PASSWORD_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }

  resetMkeyAction();
  toolsLockMsgSubmit.disabled = true;
  if (toolsLockMsgPassword) toolsLockMsgPassword.disabled = true;
  if (toolsLockMsgSeed) toolsLockMsgSeed.disabled = true;

  let passwordBytes = null;
  let filenameBytes = null;
  let contentBytes = null;
  let extraSeedBytes = null;
  let packageBytes = null;
  let keygenPasswordBytes = null;
  let publicKeyBytes = null;

  try {
    passwordBytes = encoder.encode(password);
    filenameBytes = encoder.encode("message");
    contentBytes = encoder.encode(message);

    const userSeed = toolsLockMsgSeed ? toolsLockMsgSeed.value : "";
    if (userSeed.length > 0) {
      const client0 = await initCoreClient();
      extraSeedBytes = await client0.blake3Hash({
        inputBytes: encoder.encode(userSeed),
        outputLength: 32
      });
    } else {
      const client0 = await initCoreClient();
      extraSeedBytes = await client0.blake3Hash({
        inputBytes: concatBytes([MCELIECE_DERIVE_PREFIX, encoder.encode("\0"), passwordBytes]),
        outputLength: 32
      });
    }

    const client = await initCoreClient();
    packageBytes = await client.pipelineMcelieceEncryptCompact({
      passwordBytes,
      filenameBytes,
      contentBytes,
      extraSeedBytes,
      derivePrefixBytes: MCELIECE_DERIVE_PREFIX.slice()
    });

    const base64Payload = bytesToBase64Url(packageBytes);
    setTextValue(toolsLockMsgText, base64Payload);
    setPanelHeading(toolsLockMsgHeading, LOCK_MSG_DEFAULT_HEADING, LOCK_MSG_SUCCESS_HEADING, {
      resetAfterMs: FILE_ACTION_RESET_DELAY_MS
    });

    keygenPasswordBytes = encoder.encode(password);
    const keygenResult = await client.pipelineMcelieceKeygen({
      passwordBytes: keygenPasswordBytes,
      saltBytes: WHISPER_KG_SALT.slice(),
      opslimit: LOCKER_OPSLIMIT,
      memlimit: LOCKER_MEMLIMIT
    });

    publicKeyBytes = keygenResult.publicKeyBytes;
    setMkeyReady(publicKeyBytes.slice());
  } catch (error) {
    console.error(error);
    resetMkeyAction();
    setPanelHeading(toolsLockMsgHeading, LOCK_MSG_DEFAULT_HEADING, LOCK_MSG_ERROR_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
  } finally {
    zeroBytes(passwordBytes);
    zeroBytes(filenameBytes);
    zeroBytes(contentBytes);
    zeroBytes(extraSeedBytes);
    zeroBytes(packageBytes);
    zeroBytes(keygenPasswordBytes);
    zeroBytes(publicKeyBytes);

    if (toolsLockMsgPassword) {
      toolsLockMsgPassword.value = "";
      toolsLockMsgPassword.disabled = false;
    }
    if (toolsLockMsgSeed) {
      toolsLockMsgSeed.value = "";
      toolsLockMsgSeed.disabled = false;
    }

    toolsLockMsgSubmit.disabled = false;
    disposeCoreClient();
  }
}

async function handleUnlockMessage() {
  if (!toolsUnlockMsgText || !toolsUnlockMsgSubmit) {
    return;
  }

  const ciphertext = toolsUnlockMsgText.value.trim();

  if (ciphertext.length === 0) {
    setPanelHeading(toolsUnlockMsgHeading, UNLOCK_MSG_DEFAULT_HEADING, LOCK_MSG_MESSAGE_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }

  const password = getPasswordValue(toolsUnlockMsgPassword);

  if (password.length === 0) {
    setPanelHeading(toolsUnlockMsgHeading, UNLOCK_MSG_DEFAULT_HEADING, FILE_PASSWORD_REQUIRED_HEADING, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
    return;
  }

  toolsUnlockMsgSubmit.disabled = true;
  if (toolsUnlockMsgPassword) toolsUnlockMsgPassword.disabled = true;


  let passwordBytes = null;
  let sivBytes = null;
  let secretKeyBytes = null;
  let restoredFileBytes = null;

  try {
    sivBytes = base64UrlToBytes(ciphertext);
    passwordBytes = encoder.encode(password);

    // Compact wire format: tag byte at index 0
    // 0x01 = PK pipeline, 0x02 = password pipeline
    const tag = sivBytes[0];

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
        sivBytes
      });
    } else if (tag === 0x02) {
      decrypted = await client.pipelineMcelieceDecryptCompact({
        passwordBytes,
        sivBytes
      });
    } else {
      throw new Error("Unknown format tag: 0x" + tag.toString(16));
    }

    restoredFileBytes = decrypted.fileBytes;
    const plaintext = decoder.decode(restoredFileBytes);
    setTextValue(toolsUnlockMsgText, plaintext);

    setPanelHeading(toolsUnlockMsgHeading, UNLOCK_MSG_DEFAULT_HEADING, UNLOCK_MSG_SUCCESS_HEADING, {
      resetAfterMs: FILE_ACTION_RESET_DELAY_MS
    });
  } catch (error) {
    console.error(error);
    const headingMessage = error.message === "Decryption failed"
      ? UNLOCK_MSG_WRONG_PASSWORD_HEADING
      : UNLOCK_MSG_ERROR_HEADING;

    setPanelHeading(toolsUnlockMsgHeading, UNLOCK_MSG_DEFAULT_HEADING, headingMessage, {
      resetAfterMs: ERROR_RESET_DELAY_MS
    });
  } finally {
    zeroBytes(passwordBytes);
    zeroBytes(sivBytes);
    zeroBytes(secretKeyBytes);
    zeroBytes(restoredFileBytes);

    if (toolsUnlockMsgPassword) {
      toolsUnlockMsgPassword.value = "";
      toolsUnlockMsgPassword.disabled = false;
    }
    toolsUnlockMsgSubmit.disabled = false;
    disposeCoreClient();
  }
}

function handleMkeyDownload() {
  if (!toolsLatestMkeyBytes) {
    return;
  }

  const mkeyFile = buildMkeyBytes(toolsLatestMkeyBytes);
  downloadBytes(mkeyFile, "public" + MKEY_FILE_EXTENSION);
}

if (toolsMessage) {
  toolsMessage.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      buildSignatureProof();
    }
  });

  toolsMessage.addEventListener("input", () => {
    resetQrAction();
    autoResizeTextArea(toolsMessage);
    setHeading();
  });

  autoResizeTextArea(toolsMessage);
}

if (toolsPrivateKey) {
  toolsPrivateKey.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      buildSignatureProof();
    }
  });

  toolsPrivateKey.addEventListener("input", () => {
    resetQrAction();
    setHeading();
  });
}

if (toolsSigningSeed) {
  toolsSigningSeed.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      buildSignatureProof();
    }
  });

  toolsSigningSeed.addEventListener("input", () => {
    resetQrAction();
    setHeading();
  });
}

if (toolsSubmit) {
  toolsSubmit.addEventListener("click", () => {
    buildSignatureProof();
  });
}

if (toolsQrSubmit) {
  toolsQrSubmit.addEventListener("click", () => {
    openSignatureQrPage();
  });
}

if (toolsPubkeySubmit) {
  toolsPubkeySubmit.addEventListener("click", () => {
    if (!toolsLatestPublicKeyBytes) {
      return;
    }

    const tkeyBytes = buildTkeyBytes(toolsLatestPublicKeyBytes);
    downloadBytes(tkeyBytes, "public.tkey");
  });
}

if (toolsEncryptPassword) {
  toolsEncryptPassword.addEventListener("input", () => {
    setPanelHeading(toolsEncryptHeading, ENCRYPT_DEFAULT_HEADING);
  });

  toolsEncryptPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleEncryptUpload();
    }
  });
}

if (toolsDecryptPassword) {
  toolsDecryptPassword.addEventListener("input", () => {
    setPanelHeading(toolsDecryptHeading, DECRYPT_DEFAULT_HEADING);
  });

  toolsDecryptPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleDecryptUpload();
    }
  });
}

if (toolsHashOutput) {
  autoResizeTextArea(toolsHashOutput);
}

if (toolsVerifyMessage) {
  autoResizeTextArea(toolsVerifyMessage);
}

if (toolsHashInput) {
  toolsHashInput.addEventListener("change", () => {
    setTextValue(toolsHashOutput, "");

    const files = toolsHashInput.files || [];
    const hasFiles = files.length > 0;
    const labelMessage = !hasFiles
      ? HASH_UPLOAD_DEFAULT_LABEL
      : files.length === 1
        ? (files[0].name || HASH_UPLOAD_DEFAULT_LABEL)
        : `${files.length} files selected`;

    setUploadLabel(toolsHashUpload, toolsHashLabel, labelMessage, hasFiles);
    setPanelHeading(toolsHashHeading, HASH_DEFAULT_HEADING);
  });

  attachFileDropTarget(toolsHashInput, toolsHashUpload, { allowMultiple: true });

  if (toolsHashInput.files && toolsHashInput.files.length > 0) {
    const files = toolsHashInput.files;
    const labelMessage = files.length === 1
      ? (files[0].name || HASH_UPLOAD_DEFAULT_LABEL)
      : `${files.length} files selected`;
    setUploadLabel(toolsHashUpload, toolsHashLabel, labelMessage, true);
  }
}

if (toolsEncryptInput) {
  toolsEncryptInput.addEventListener("change", () => {
    if (!toolsEncryptInput.files || toolsEncryptInput.files.length === 0) {
      return;
    }

    addEncryptFiles(Array.from(toolsEncryptInput.files));
    toolsEncryptInput.value = "";
  });

  attachFileDropTarget(toolsEncryptInput, toolsEncryptUpload, { allowMultiple: true });
}

if (toolsEncryptFolderInput) {
  toolsEncryptFolderInput.addEventListener("change", () => {
    if (!toolsEncryptFolderInput.files || toolsEncryptFolderInput.files.length === 0) {
      return;
    }

    addEncryptFiles(Array.from(toolsEncryptFolderInput.files));
    toolsEncryptFolderInput.value = "";
  });
}

if (toolsDecryptInput) {
  toolsDecryptInput.addEventListener("change", () => {
    syncSelectedFileLabel(
      toolsDecryptInput,
      toolsDecryptUpload,
      toolsDecryptLabel,
      DECRYPT_UPLOAD_DEFAULT_LABEL,
      toolsDecryptHeading,
      DECRYPT_DEFAULT_HEADING
    );
  });

  attachFileDropTarget(toolsDecryptInput, toolsDecryptUpload);
}

if (toolsCompressInput) {
  toolsCompressInput.addEventListener("change", () => {
    syncCompressSelectionLabel();
  });

  attachFileDropTarget(toolsCompressInput, toolsCompressUpload, { allowMultiple: true });
}

if (toolsVerifySignatureInput) {
  toolsVerifySignatureInput.addEventListener("change", () => {
    void handleVerifySignatureSelection();
  });

  attachFileDropTarget(toolsVerifySignatureInput, toolsVerifySignatureUpload);

  if (toolsVerifySignatureInput.files && toolsVerifySignatureInput.files.length > 0) {
    void handleVerifySignatureSelection();
  }
}

if (toolsVerifyKeyInput) {
  toolsVerifyKeyInput.addEventListener("change", () => {
    void handleVerifyKeySelection();
  });

  attachFileDropTarget(toolsVerifyKeyInput, toolsVerifyKeyUpload);

  if (toolsVerifyKeyInput.files && toolsVerifyKeyInput.files.length > 0) {
    void handleVerifyKeySelection();
  }
}

if (toolsHashSubmit) {
  toolsHashSubmit.addEventListener("click", () => {
    void handleHashUpload();
  });
}

if (toolsHashCopy) {
  attachPressListeners(toolsHashCopy);
  toolsHashCopy.addEventListener("click", () => {
    const text = toolsHashOutput ? toolsHashOutput.value : "";
    if (!text) return;
    toolsHashCopy.disabled = true;
    copyTextToClipboard(text)
      .then(() => {
        setPanelHeading(toolsHashHeading, HASH_DEFAULT_HEADING, "hash copied!", {
          resetAfterMs: FILE_ACTION_RESET_DELAY_MS
        });
      })
      .catch(() => {
        setPanelHeading(toolsHashHeading, HASH_DEFAULT_HEADING, HASH_ERROR_HEADING, {
          resetAfterMs: ERROR_RESET_DELAY_MS
        });
      })
      .finally(() => {
        toolsHashCopy.disabled = false;
      });
  });
}

if (toolsEncryptSubmit) {
  toolsEncryptSubmit.addEventListener("click", () => {
    void handleEncryptUpload();
  });
}

if (toolsDecryptSubmit) {
  toolsDecryptSubmit.addEventListener("click", () => {
    void handleDecryptUpload();
  });
}

if (toolsCompressSubmit) {
  toolsCompressSubmit.addEventListener("click", () => {
    void handleCompressFilesUpload();
  });
}

if (toolsVerifySubmit) {
  toolsVerifySubmit.addEventListener("click", () => {
    void handleVerifySignatureUpload();
  });
}

renderEncryptFileList();
syncCompressSelectionLabel();

if (toolsLockMsgText) {
  autoResizeTextArea(toolsLockMsgText);
}

if (toolsUnlockMsgText) {
  autoResizeTextArea(toolsUnlockMsgText);
}

if (toolsLockMsgPassword) {
  toolsLockMsgPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleLockMessage();
    }
  });
}

if (toolsLockMsgSeed) {
  toolsLockMsgSeed.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleLockMessage();
    }
  });
}

if (toolsLockMsgSubmit) {
  toolsLockMsgSubmit.addEventListener("click", () => {
    void handleLockMessage();
  });
}

if (toolsLockMsgKeySubmit) {
  attachPressListeners(toolsLockMsgKeySubmit);
  toolsLockMsgKeySubmit.addEventListener("click", () => {
    handleMkeyDownload();
  });
}

if (toolsUnlockMsgPassword) {
  toolsUnlockMsgPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleUnlockMessage();
    }
  });
}

if (toolsUnlockMsgSubmit) {
  toolsUnlockMsgSubmit.addEventListener("click", () => {
    void handleUnlockMessage();
  });
}
