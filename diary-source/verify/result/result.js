(function () {
  const result = window.__verifyResult;
  if (!result || result.outcome !== "match") return;
  const text = (result.message || "").trim();
  if (!text) return;
  const box = document.getElementById("result-message-box");
  if (!box) return;
  box.textContent = text;
  box.hidden = false;
}());
