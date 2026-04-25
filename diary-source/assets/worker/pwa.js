const currentScript = document.currentScript;
const siteRoot = currentScript?.dataset.siteRoot || "./";

function resolveScopePath(siteRootURL) {
  if (siteRootURL.pathname.endsWith("/")) {
    return siteRootURL.pathname;
  }

  return `${siteRootURL.pathname}/`;
}

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  const siteRootURL = new URL(siteRoot, window.location.href);
  const serviceWorkerURL = new URL("service-worker.js", siteRootURL);
  const scope = resolveScopePath(siteRootURL);

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(serviceWorkerURL, { scope, updateViaCache: 'none' }).catch((error) => {
      console.error("Failed to register the site service worker.", error);
    });
  });
}
