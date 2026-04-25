const qrImg = document.getElementById("qr-canvas");
const downloadLink = document.getElementById("qr-download");
const copyLinkButton = document.getElementById("qr-copy-link");
if (copyLinkButton) copyLinkButton.textContent = navigator.share ? "share link" : "copy link";
const qrHeading = document.getElementById("qr-heading");
const DEFAULT_HEADING = "export";
const SHARE_SUCCESS_HEADING = "link shared.";
const COPY_SUCCESS_HEADING = "link copied.";
const COPY_ERROR_HEADING = "oops. . . link failed to copy.";
const SUCCESS_RESET_DELAY_MS = 10000;
const ERROR_RESET_DELAY_MS = 10000;
let qrDataUrl = null;
let qrVerifyUrl = null;

const { set: setHeading } = makeHeadingController(qrHeading, DEFAULT_HEADING);

function renderError() {
  if (qrImg) {
    qrImg.hidden = true;
  }
}

function showQr(dataUrl) {
  if (!qrImg || !dataUrl) {
    return;
  }

  qrDataUrl = dataUrl;
  qrImg.src = dataUrl;
  qrImg.hidden = false;

  if (downloadLink) {
    downloadLink.href = dataUrl;
    downloadLink.hidden = false;
  }

  if (copyLinkButton) {
    copyLinkButton.hidden = false;
  }

  if (qrHeading) {
    qrHeading.hidden = false;
  }
}

function renderQr(payload) {
  if (!qrImg || typeof qrcode !== "function") {
    renderError();
    return;
  }

  qrDataUrl = buildQrDataUrl(payload, QR_LEVELS);

  if (!qrDataUrl) {
    console.error("QR render failed: payload too large");
    renderError();
    return;
  }

  showQr(qrDataUrl);
}

function init() {
  const rawHash = window.location.hash.slice(1);
  let decodedHash = "";
  try { decodedHash = decodeURIComponent(rawHash); } catch (_) { decodedHash = rawHash; }
  const isWhisperUrl = /^https?:\/\//i.test(decodedHash);
  const wParam = isWhisperUrl ? decodedHash : null;
  const dParam = isWhisperUrl ? null : rawHash;

  // Try sessionStorage qr-link first (set by message page for whisper URLs)
  let storedLink = null;
  try {
    storedLink = sessionStorage.getItem("qr-link") || null;
    sessionStorage.removeItem("qr-link");
  } catch (_) {}

  if (wParam) {
    // Whisper mode: hash contains the full whisper URL (encoded)
    qrVerifyUrl = wParam;

    if (window.__qrPrerendered) {
      showQr(window.__qrPrerendered);
      return;
    }

    renderQr(qrVerifyUrl);
    return;
  }

  if (!dParam) {
    renderError();
    return;
  }

  if (window.__qrPrerendered) {
    // Use stored link if available (from whisper flow via sessionStorage)
    if (storedLink) {
      qrVerifyUrl = storedLink;
    }
    showQr(window.__qrPrerendered);
    return;
  }

  const verifyUrl = new URL("../../verify/", window.location.href);
  verifyUrl.hash = dParam;
  qrVerifyUrl = storedLink || verifyUrl.toString();
  renderQr(qrVerifyUrl);
}

if (copyLinkButton) {
  copyLinkButton.addEventListener("click", async function () {
    if (!qrVerifyUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({ url: qrVerifyUrl });
        setHeading(SHARE_SUCCESS_HEADING, { resetAfterMs: SUCCESS_RESET_DELAY_MS });
        return;
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await copyTextToClipboard(qrVerifyUrl);
      setHeading(COPY_SUCCESS_HEADING, { resetAfterMs: SUCCESS_RESET_DELAY_MS });
    } catch (_) {
      setHeading(COPY_ERROR_HEADING, { resetAfterMs: ERROR_RESET_DELAY_MS });
    }
  });
}

init();
