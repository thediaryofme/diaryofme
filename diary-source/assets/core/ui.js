"use strict";

const TEXTAREA_MAX_LINES = 3;
const QR_CELL_SIZE = 8;
const QR_MARGIN = 24;

function getThemeColor(name, fallback) {
  const root = document.documentElement;
  if (!root) {
    return fallback;
  }

  const value = window.getComputedStyle(root).getPropertyValue(name).trim();
  return value || fallback;
}

function autoResizeTextArea(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement)) {
    return;
  }

  const styles = window.getComputedStyle(textarea);
  const fontSize = Number.parseFloat(styles.fontSize) || 16;
  const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize * 1.35;
  const borderHeight =
    (Number.parseFloat(styles.borderTopWidth) || 0) +
    (Number.parseFloat(styles.borderBottomWidth) || 0);
  const paddingHeight =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0);
  const configuredMinLines = Number.parseFloat(textarea.dataset.minLines || "1");
  const minLines = Number.isFinite(configuredMinLines) && configuredMinLines > 0
    ? configuredMinLines
    : 1;
  const minHeight = lineHeight * minLines + paddingHeight + borderHeight;
  const maxHeight = lineHeight * TEXTAREA_MAX_LINES + paddingHeight + borderHeight;

  textarea.style.height = "auto";
  textarea.style.overflowY = "hidden";

  const contentHeight = Math.max(textarea.scrollHeight + borderHeight, minHeight);
  const nextHeight = Math.min(contentHeight, maxHeight);
  const isScrollable = contentHeight > maxHeight;

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = isScrollable ? "auto" : "hidden";
}

function buildQrDataUrl(payload, levels) {
  if (typeof qrcode !== "function") {
    return null;
  }

  let qr = null;

  for (const level of levels) {
    try {
      qr = qrcode(0, level);
      qr.addData(payload, "Byte");
      qr.make();
      break;
    } catch (_) {
      qr = null;
      if (level === levels[levels.length - 1]) {
        return null;
      }
    }
  }

  if (!qr) {
    return null;
  }

  const moduleCount = qr.getModuleCount();
  const size = moduleCount * QR_CELL_SIZE + QR_MARGIN * 2;

  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;

  const ctx = offscreen.getContext("2d");
  const qrBackground = getThemeColor("--highlighter", "#fdf5d3");
  const qrForeground = getThemeColor("--pen", "#39271d");

  ctx.fillStyle = qrBackground;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = qrForeground;
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(
          QR_MARGIN + col * QR_CELL_SIZE,
          QR_MARGIN + row * QR_CELL_SIZE,
          QR_CELL_SIZE,
          QR_CELL_SIZE
        );
      }
    }
  }

  return offscreen.toDataURL("image/png");
}

function makeHeadingController(element, defaultText) {
  let timeoutId = 0;
  function clear() {
    if (!timeoutId) return;
    window.clearTimeout(timeoutId);
    timeoutId = 0;
  }
  function set(message = defaultText, { resetAfterMs = 0 } = {}) {
    clear();
    if (!element) return;
    element.textContent = message;
    if (message === defaultText || !Number.isFinite(resetAfterMs) || resetAfterMs <= 0) return;
    timeoutId = window.setTimeout(() => { timeoutId = 0; set(); }, resetAfterMs);
  }
  return { set, clear };
}

function attachPressListeners(element) {
  if (!(element instanceof Element)) return;
  const press = () => element.classList.add("is-pressed");
  const release = () => element.classList.remove("is-pressed");
  element.addEventListener("pointerdown", press);
  element.addEventListener("pointerup", release);
  element.addEventListener("pointerleave", release);
  element.addEventListener("pointercancel", release);
}

document.querySelectorAll(".verify-submit, .message-open-button, .message-copy-button").forEach(attachPressListeners);


function dragEventHasFiles(event) {
  if (!event || !event.dataTransfer) {
    return false;
  }

  return Array.from(event.dataTransfer.types || []).includes("Files");
}

function setInputFiles(input, files) {
  if (!(input instanceof HTMLInputElement) || !files || files.length === 0) {
    return false;
  }

  if (typeof DataTransfer !== "function") {
    return false;
  }

  const transfer = new DataTransfer();

  for (const file of files) {
    if (file instanceof File) {
      transfer.items.add(file);
    }
  }

  if (transfer.files.length === 0) {
    return false;
  }

  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

const QR_MAX_BYTES = 2953;
const QR_LEVELS = ["L"];

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  helper.style.pointerEvents = "none";
  document.body.append(helper);
  helper.select();
  helper.setSelectionRange(0, helper.value.length);

  try {
    if (!document.execCommand("copy")) {
      throw new Error("copy command failed");
    }
  } finally {
    helper.remove();
  }
}

let _qrcodeLoadPromise = null;

function loadQrCode() {
  if (typeof qrcode === "function") {
    return Promise.resolve();
  }

  if (_qrcodeLoadPromise) {
    return _qrcodeLoadPromise;
  }

  _qrcodeLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("../assets/core/qrcode.js", window.location.href).toString();
    script.onload = resolve;
    script.onerror = () => {
      _qrcodeLoadPromise = null;
      reject(new Error("Failed to load qrcode.js"));
    };
    document.head.appendChild(script);
  });

  return _qrcodeLoadPromise;
}

function readDirectoryEntries(reader) {
  return new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });
}

function readFileFromEntry(entry) {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function readAllEntriesFromDirectory(directoryEntry) {
  const files = [];
  const reader = directoryEntry.createReader();

  while (true) {
    const batch = await readDirectoryEntries(reader);

    if (batch.length === 0) {
      break;
    }

    for (const entry of batch) {
      if (entry.isFile) {
        const file = await readFileFromEntry(entry);
        const pathName = entry.fullPath.replace(/^\//, "");
        files.push(new File([file], pathName, {
          type: file.type,
          lastModified: file.lastModified
        }));
      } else if (entry.isDirectory) {
        const subFiles = await readAllEntriesFromDirectory(entry);
        files.push(...subFiles);
      }
    }
  }

  return files;
}

function collectDropEntries(items) {
  const entries = [];

  for (const item of items) {
    if (item.kind !== "file") {
      continue;
    }

    const entry = typeof item.webkitGetAsEntry === "function"
      ? item.webkitGetAsEntry()
      : null;

    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

async function resolveFilesFromEntries(entries) {
  const files = [];

  for (const entry of entries) {
    if (entry.isFile) {
      files.push(await readFileFromEntry(entry));
    } else if (entry.isDirectory) {
      files.push(...(await readAllEntriesFromDirectory(entry)));
    }
  }

  return files;
}

function attachFileDropTarget(input, upload, { allowMultiple = false, onBeforeDrop = null } = {}) {
  if (!(input instanceof HTMLInputElement) || !(upload instanceof HTMLElement)) {
    return;
  }

  let dragDepth = 0;

  function clearDragState() {
    dragDepth = 0;
    upload.classList.remove("is-drag-over");
  }

  upload.addEventListener("dragenter", (event) => {
    if (!dragEventHasFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepth += 1;
    upload.classList.add("is-drag-over");
  });

  upload.addEventListener("dragover", (event) => {
    if (!dragEventHasFiles(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    upload.classList.add("is-drag-over");
  });

  upload.addEventListener("dragleave", (event) => {
    if (!dragEventHasFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepth = Math.max(dragDepth - 1, 0);

    if (dragDepth === 0) {
      upload.classList.remove("is-drag-over");
    }
  });

  upload.addEventListener("drop", async (event) => {
    if (!dragEventHasFiles(event)) {
      return;
    }

    event.preventDefault();
    const items = event.dataTransfer.items;
    clearDragState();

    if (onBeforeDrop) {
      onBeforeDrop();
    }

    if (allowMultiple && items && items.length > 0) {
      const entries = collectDropEntries(items);

      if (entries.length > 0) {
        const files = await resolveFilesFromEntries(entries);

        if (files.length > 0) {
          setInputFiles(input, files);
          return;
        }
      }
    }

    const droppedFiles = Array.from(event.dataTransfer.files || []);

    if (droppedFiles.length === 0) {
      return;
    }

    setInputFiles(input, allowMultiple ? droppedFiles : [droppedFiles[0]]);
  });
}
