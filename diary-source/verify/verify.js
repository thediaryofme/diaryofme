const verifyMessage = document.getElementById("verify-message");
const verifySignatureInput = document.getElementById("verify-signature");
const verifyHeading = document.getElementById("verify-heading");
const verifySubmit = document.getElementById("verify-submit");
const verifyUpload = document.querySelector(".verify-upload");
const verifyUploadLabel = document.querySelector(".verify-upload-label");
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function inflateRawBytes(input) {
  var client = await initCoreClient();
  return client.inflateRaw({ inputBytes: input });
}

async function decodeQrPayload(param) {
  var decoded = base64UrlToBytes(param);
  if (decoded.length > 0 && decoded[0] === QR_COMPRESS_PREFIX) {
    var compressed = decoded.subarray(1);
    var decompressed = await inflateRawBytes(compressed);
    decoded.fill(0);
    return decompressed;
  }
  return decoded;
}

const VERIFY_PUBLIC_KEY_URL = "./public.tkey";
const DEFAULT_HEADING = "is it me?";
const MATCH_HEADING = "yes i signed this!";
const NO_MATCH_HEADING = "i didn't sign that";
const INTERNAL_ERROR_MESSAGE = "something's not right.";
const SIG_FILE_WARNING = "please upload a valid .tsig file";
const ERROR_RESET_DELAY_MS = 10000;
let verifySignatureBytes = null;
let verifyPublicKeyBytes = null;
let verifyProofPublicKeyBytes = null;
let verifyLengthsPromise = null;
let verifyPendingHeading = "";

const { set: setHeading } = makeHeadingController(verifyHeading, DEFAULT_HEADING);

function resetVerificationUi() {
  setHeading(DEFAULT_HEADING);
}

function rememberPendingHeading(message = "") {
  verifyPendingHeading = message;
}

function getSelectedFile() {
  if (!verifySignatureInput || !verifySignatureInput.files || verifySignatureInput.files.length === 0) {
    return null;
  }

  return verifySignatureInput.files[0];
}

function isSigFile(file) {
  return Boolean(
    file &&
    typeof file.name === "string" &&
    file.name.toLowerCase().endsWith(PROOF_FILE_EXTENSION)
  );
}

let verifyPublicKeyPromise = null;

async function fetchPublicKey() {
  if (verifyPublicKeyBytes) {
    return verifyPublicKeyBytes;
  }

  if (!VERIFY_PUBLIC_KEY_URL) {
    return null;
  }

  if (!verifyPublicKeyPromise) {
    verifyPublicKeyPromise = fetch(VERIFY_PUBLIC_KEY_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch public key.");
        }
        return response.arrayBuffer();
      })
      .then((buffer) => {
        const rawBytes = new Uint8Array(buffer);
        verifyPublicKeyBytes = parseTkeyBytes(rawBytes);
        return verifyPublicKeyBytes;
      })
      .catch((error) => {
        verifyPublicKeyPromise = null;
        throw error;
      });
  }

  return verifyPublicKeyPromise;
}

async function getVerifyLengths() {
  if (verifyLengthsPromise) {
    return verifyLengthsPromise;
  }

  verifyLengthsPromise = initCoreClient()
    .then((client) => client.getUovLengths())
    .then((lengths) => ({
      publicKeyLength: lengths.publicKeyLength,
      signatureLength: lengths.signatureLength
    }))
    .catch((error) => {
      verifyLengthsPromise = null;
      throw error;
    });

  return verifyLengthsPromise;
}
function openVerifyResultPage(outcome, { navigate = false } = {}) {
  const message = verifyMessage ? verifyMessage.value : "";
  const resultPageUrl = new URL("./result/", window.location.href);

  try {
    sessionStorage.setItem("verify-result-ts", Date.now().toString());
    sessionStorage.setItem("verify-result-outcome", outcome);
    sessionStorage.setItem("verify-result-message", message);
  } catch (_) {}

  if (navigate) {
    window.location.href = resultPageUrl.toString();
  } else {
    window.open(resultPageUrl.toString(), "_blank");
  }
}

async function verifyCurrentState({ userInitiated = false, navigate = false } = {}) {
  if (!verifyMessage || !verifySignatureBytes || !verifyProofPublicKeyBytes) {
    if (userInitiated) {
      setHeading(verifyPendingHeading || SIG_FILE_WARNING, { resetAfterMs: ERROR_RESET_DELAY_MS });
    } else {
      resetVerificationUi();
    }
    return;
  }

  const publicKeyBytes = await fetchPublicKey();

  if (!publicKeyBytes) {
    setHeading(INTERNAL_ERROR_MESSAGE, { resetAfterMs: ERROR_RESET_DELAY_MS });
    return;
  }

  const message = verifyMessage.value;

  if (message.length === 0) {
    setHeading(INTERNAL_ERROR_MESSAGE, { resetAfterMs: ERROR_RESET_DELAY_MS });
    return;
  }

  function handleResult(outcome) {
    if (userInitiated) {
      openVerifyResultPage(outcome, { navigate });
    } else {
      setHeading(outcome === "match" ? MATCH_HEADING : NO_MATCH_HEADING);
    }
  }

  try {
    const { publicKeyLength, signatureLength } = await getVerifyLengths();

    if (publicKeyBytes.length !== publicKeyLength) {
      throw new Error("Configured public key length is invalid.");
    }

    const proofOmitsPublicKey = verifyProofPublicKeyBytes.length === 0;
    if (!proofOmitsPublicKey) {
      if (verifyProofPublicKeyBytes.length !== publicKeyLength) {
        handleResult("no-match");
        return;
      }

      if (!bytesMatch(verifyProofPublicKeyBytes, publicKeyBytes)) {
        handleResult("no-match");
        return;
      }
    }

    if (verifySignatureBytes.length !== signatureLength) {
      handleResult("no-match");
      return;
    }

    const messageBytes = encoder.encode(message);
    const signatureContextBytes = getSignatureContextBytes();

    try {
      const result = await verifySignatureWithContext(
        publicKeyBytes,
        messageBytes,
        verifySignatureBytes,
        signatureContextBytes
      );

      if (result === 1) {
        handleResult("match");
      } else {
        handleResult("no-match");
      }
    } finally {
      messageBytes.fill(0);
      signatureContextBytes.fill(0);
    }
  } catch (error) {
    console.error(error);
    setHeading(INTERNAL_ERROR_MESSAGE, { resetAfterMs: ERROR_RESET_DELAY_MS });
  }
}

if (verifyUpload && verifySignatureInput && verifyUploadLabel) {
  const defaultLabel = verifyUploadLabel.textContent.trim();
  let isPreparingPicker = false;

  function clearSelectedProof() {
    if (verifySignatureBytes) {
      verifySignatureBytes.fill(0);
      verifySignatureBytes = null;
    }

    if (verifyProofPublicKeyBytes) {
      verifyProofPublicKeyBytes.fill(0);
      verifyProofPublicKeyBytes = null;
    }

    rememberPendingHeading();
    verifyMessage.value = "";
    autoResizeTextArea(verifyMessage);
    verifyUploadLabel.textContent = defaultLabel;
    verifyUpload.classList.remove("has-file");
    resetVerificationUi();
  }

  function preparePickerSelection() {
    if (isPreparingPicker) {
      return;
    }

    isPreparingPicker = true;
    clearSelectedProof();

    requestAnimationFrame(() => {
      isPreparingPicker = false;
    });
  }

  verifySignatureInput.addEventListener("click", () => {
    preparePickerSelection();
  });

  verifySignatureInput.addEventListener("change", async () => {
    const file = getSelectedFile();

    if (!file) {
      clearSelectedProof();
      return;
    }

    if (!isSigFile(file)) {
      verifySignatureBytes = null;
      rememberPendingHeading(SIG_FILE_WARNING);
      verifyMessage.value = "";
      autoResizeTextArea(verifyMessage);
      verifyUploadLabel.textContent = file.name;
      verifyUpload.classList.add("has-file");
      resetVerificationUi();
      return;
    }

    verifyUploadLabel.textContent = file.name;
    verifyUpload.classList.add("has-file");

    try {
      const proof = await parseSignatureFile(file);
      verifyProofPublicKeyBytes = proof.publicKeyBytes;
      verifySignatureBytes = proof.signatureBytes;
      rememberPendingHeading();
      verifyMessage.value = proof.message;
      autoResizeTextArea(verifyMessage);
      resetVerificationUi();
    } catch (error) {
      console.error(error);
      if (verifySignatureBytes) {
        verifySignatureBytes.fill(0);
        verifySignatureBytes = null;
      }
      if (verifyProofPublicKeyBytes) {
        verifyProofPublicKeyBytes.fill(0);
        verifyProofPublicKeyBytes = null;
      }
      rememberPendingHeading(SIG_FILE_WARNING);
      verifyMessage.value = "";
      autoResizeTextArea(verifyMessage);
      verifyUploadLabel.textContent = file.name;
      verifyUpload.classList.add("has-file");
      resetVerificationUi();
    }
  });

  attachFileDropTarget(verifySignatureInput, verifyUpload, { onBeforeDrop: preparePickerSelection });
}

if (verifySignatureInput && verifySignatureInput.files && verifySignatureInput.files.length > 0) {
  verifySignatureInput.dispatchEvent(new Event("change"));
}

if (verifyMessage) {
  verifyMessage.addEventListener("input", () => {
    autoResizeTextArea(verifyMessage);
    resetVerificationUi();
  });

  autoResizeTextArea(verifyMessage);
}

if (verifySubmit) {
  verifySubmit.addEventListener("click", () => {
    verifyCurrentState({ userInitiated: true });
  });
}

async function loadProofFromUrl() {
  const param = window.location.hash.slice(1);

  if (!param) {
    return;
  }

  let rawBytes = null;

  try {
    rawBytes = await decodeQrPayload(param);
    const proof = parseProofBytes(rawBytes);

    verifyProofPublicKeyBytes = proof.publicKeyBytes;
    verifySignatureBytes = proof.signatureBytes;
    rememberPendingHeading();

    if (verifyMessage) {
      verifyMessage.value = proof.message;
      autoResizeTextArea(verifyMessage);
    }

    if (verifyUpload && verifyUploadLabel) {
      verifyUpload.classList.add("has-file");
      verifyUploadLabel.textContent = "from QR code";
    }

    await verifyCurrentState({ userInitiated: true, navigate: true });
  } catch (error) {
    console.error("Failed to load proof from URL:", error);
    setHeading(INTERNAL_ERROR_MESSAGE, { resetAfterMs: ERROR_RESET_DELAY_MS });
  } finally {
    if (rawBytes) {
      rawBytes.fill(0);
    }
  }
}

loadProofFromUrl();
