try {
  const theme = localStorage.getItem("theme") || "blush";
  document.documentElement.setAttribute("data-theme", theme);
} catch (_) {
  document.documentElement.setAttribute("data-theme", "blush");
}
