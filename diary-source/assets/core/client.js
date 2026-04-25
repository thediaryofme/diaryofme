"use strict";

(function () {
  let worker = null;
  let nextId = 1;
  const pending = new Map();
  let initPromise = null;

  function destroyWorker(reason) {
    const ref = worker;
    worker = null;
    initPromise = null;

    if (ref) {
      ref.terminate();
    }

    if (reason) {
      for (const [, entry] of pending) {
        entry.reject(new Error(reason));
      }
    }

    pending.clear();
  }

  function ensureUint8Array(value) {
    if (value instanceof Uint8Array) {
      return value.byteOffset === 0 && value.byteLength === value.buffer.byteLength
        ? value
        : new Uint8Array(value);
    }

    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return new Uint8Array(value);
    }

    return value;
  }

  function preparePayload(value) {
    if (value instanceof Uint8Array || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return ensureUint8Array(value);
    }

    if (Array.isArray(value)) {
      return value.map(preparePayload);
    }

    if (value && typeof value === "object") {
      const prepared = {};

      for (const [key, inner] of Object.entries(value)) {
        prepared[key] = preparePayload(inner);
      }

      return prepared;
    }

    return value;
  }

  function sendAction(action, payload) {
    if (!worker) {
      return Promise.reject(new Error("Crypto worker is not initialized. Call init() first."));
    }

    const id = nextId++;
    const prepared = preparePayload(payload);

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });

      try {
        worker.postMessage({ id, action, payload: prepared });
      } catch (error) {
        pending.delete(id);
        reject(error);
      }
    });
  }

  function coerceResult(value) {
    if (value instanceof Uint8Array) {
      return value;
    }

    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }

    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }

    return value;
  }

  const client = Object.freeze({
    init: function (vendorBaseUrl) {
      if (initPromise) {
        return initPromise;
      }

      initPromise = (async () => {
        const workerUrl = new URL("worker.js", vendorBaseUrl).toString();
        worker = new Worker(workerUrl);

        worker.addEventListener("message", (event) => {
          const { id, ok, result, error } = event.data;
          const entry = pending.get(id);

          if (!entry) {
            return;
          }

          pending.delete(id);

          if (ok) {
            entry.resolve(result);
          } else {
            entry.reject(new Error(error));
          }
        });

        worker.addEventListener("error", (event) => {
          destroyWorker(event.message || "Worker error");
        });

        await sendAction("init", { vendorBaseUrl });
      })().catch((error) => {
        destroyWorker();
        throw error;
      });

      return initPromise;
    },

    destroy: function (reason = "Crypto worker was reset.") {
      destroyWorker(reason);
    },

    getUovLengths: () => sendAction("getUovLengths"),

    uovSignFromPassword: ({
      passwordBytes, messageBytes, extraSeedBytes, contextBytes,
      passwordSaltBytes, signingSeedPrefixBytes, passwordOpslimit, passwordMemlimit
    }) => sendAction("uovSignFromPassword", {
      passwordBytes, messageBytes, extraSeedBytes, contextBytes,
      passwordSaltBytes, signingSeedPrefixBytes, passwordOpslimit, passwordMemlimit
    }).then((result) => ({
      publicKeyBytes: coerceResult(result.publicKeyBytes),
      signatureBytes: coerceResult(result.signatureBytes)
    })),

    uovVerify: ({
      publicKeyBytes, messageBytes, signatureBytes, contextBytes
    }) => sendAction("uovVerify", {
      publicKeyBytes, messageBytes, signatureBytes, contextBytes
    }),

    blake3Hash: ({ inputBytes, outputLength }) =>
      sendAction("blake3Hash", { inputBytes, outputLength })
        .then(coerceResult),

    pipelineEncrypt: ({
      passwordBytes, filenameBytes, contentBytes, extraSeedBytes,
      derivePrefixBytes, opslimit, memlimit
    }) => sendAction("pipelineEncrypt", {
      passwordBytes, filenameBytes, contentBytes, extraSeedBytes,
      derivePrefixBytes, opslimit, memlimit
    }).then(coerceResult),

    pipelineDecrypt: ({ passwordBytes, sivBytes }) =>
      sendAction("pipelineDecrypt", { passwordBytes, sivBytes })
        .then((result) => ({
          filenameBytes: coerceResult(result.filenameBytes),
          fileBytes: coerceResult(result.fileBytes)
        })),

    pipelineMcelieceKeygen: ({ passwordBytes, saltBytes, opslimit, memlimit }) =>
      sendAction("pipelineMcelieceKeygen", { passwordBytes, saltBytes, opslimit, memlimit })
        .then((result) => ({
          publicKeyBytes: coerceResult(result.publicKeyBytes),
          secretKeyBytes: coerceResult(result.secretKeyBytes)
        })),

    pipelineMceliecePkEncryptCompact: ({ pkBytes, filenameBytes, contentBytes, encapSeedBytes }) =>
      sendAction("pipelineMceliecePkEncryptCompact", { pkBytes, filenameBytes, contentBytes, encapSeedBytes })
        .then(coerceResult),

    pipelineMcelieceSkDecryptCompact: ({ skBytes, sivBytes }) =>
      sendAction("pipelineMcelieceSkDecryptCompact", { skBytes, sivBytes })
        .then((result) => ({
          filenameBytes: coerceResult(result.filenameBytes),
          fileBytes: coerceResult(result.fileBytes)
        })),

    pipelineMcelieceEncryptCompact: ({
      passwordBytes, filenameBytes, contentBytes, extraSeedBytes, derivePrefixBytes
    }) => sendAction("pipelineMcelieceEncryptCompact", {
      passwordBytes, filenameBytes, contentBytes, extraSeedBytes, derivePrefixBytes
    }).then(coerceResult),

    pipelineMcelieceDecryptCompact: ({ passwordBytes, sivBytes }) =>
      sendAction("pipelineMcelieceDecryptCompact", { passwordBytes, sivBytes })
        .then((result) => ({
          filenameBytes: coerceResult(result.filenameBytes),
          fileBytes: coerceResult(result.fileBytes)
        })),

    deflateRaw: ({ inputBytes }) =>
      sendAction("deflateRaw", { inputBytes })
        .then(coerceResult),

    inflateRaw: ({ inputBytes, maxOutputLength }) =>
      sendAction("inflateRaw", { inputBytes, maxOutputLength })
        .then(coerceResult)
  });

  window.diaryCoreClient = client;
})();
