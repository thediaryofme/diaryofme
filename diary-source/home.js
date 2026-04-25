const themePillBtn = document.querySelector(".theme-pill-btn");

{
  const hero = document.querySelector(".home-hero");
  const statusBtn = document.querySelector(".home-status-btn");
  const statusBack = document.querySelector(".home-status-back");
  const heroTabs = document.querySelector(".home-hero-tabs");

  const allStickable = document.querySelectorAll(".home-hero-tab-trigger, .home-hero-tab-filler");

  allStickable.forEach((trigger) => {
    trigger.addEventListener("pointerdown", () => {
      trigger.classList.toggle("is-stuck");
    });
  });

  let triggers = [];
  let naturalWidths = [];
  let pendingTabUpdate = 0;
  const fillerMinWidth = 12;

  if (heroTabs) {
    triggers = [...heroTabs.querySelectorAll(".home-hero-tab-trigger")];
  }

  function readAvailableWidth(entry) {
    const boxSize = entry && entry.contentBoxSize;
    const box = Array.isArray(boxSize) ? boxSize[0] : boxSize;
    const observed = box && box.inlineSize
      ? box.inlineSize
      : entry && entry.contentRect && entry.contentRect.width;
    const measured = heroTabs ? heroTabs.getBoundingClientRect().width : 0;
    return observed || measured || window.innerWidth;
  }

  function updateTabVisibility(available) {
    const usable = available - fillerMinWidth;
    let used = 0;
    let overflow = false;
    for (let i = 0; i < triggers.length; i++) {
      if (!overflow && used + naturalWidths[i] <= usable + 0.5) {
        triggers[i].hidden = false;
        used += naturalWidths[i];
      } else {
        overflow = true;
        triggers[i].hidden = true;
      }
    }
  }

  function measureAndUpdate() {
    naturalWidths = triggers.map((t) => {
      const was = t.hidden;
      t.hidden = false;
      const s = getComputedStyle(t);
      const w = t.getBoundingClientRect().width
        + parseFloat(s.marginLeft) + parseFloat(s.marginRight);
      t.hidden = was;
      return w;
    });
    updateTabVisibility(readAvailableWidth());
  }

  function scheduleTabUpdate() {
    cancelAnimationFrame(pendingTabUpdate);
    pendingTabUpdate = requestAnimationFrame(measureAndUpdate);
  }

  if (hero) {
    if (statusBtn) {
      statusBtn.addEventListener("click", () => {
        document.documentElement.dataset.heroState = "status";
        localStorage.setItem("home-hero-state", "status");
        scheduleTabUpdate();
      });
    }

    if (statusBack) {
      statusBack.addEventListener("click", () => {
        delete document.documentElement.dataset.heroState;
        localStorage.removeItem("home-hero-state");
        scheduleTabUpdate();
      });
    }
  }

  if (heroTabs) {
    const fontReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontReady.then(scheduleTabUpdate).catch(scheduleTabUpdate);

    window.addEventListener("resize", scheduleTabUpdate);
    window.addEventListener("orientationchange", () => {
      scheduleTabUpdate();
      setTimeout(scheduleTabUpdate, 300);
    });

    if ("ResizeObserver" in window) {
      new ResizeObserver((entries) => {
        if (naturalWidths.length) {
          updateTabVisibility(readAvailableWidth(entries[0]));
        } else {
          scheduleTabUpdate();
        }
      }).observe(heroTabs);
    }
  }
}

{
  const root = document.documentElement;
  const themeOrder = ["blush", "matcha"];
  const themeLabels = { blush: "blush", matcha: "matcha" };
  const legacyThemeStyleProps = ["--washi-tape", "--highlighter", "--paper", "--pen"];

  function applyTheme(name) {
    root.setAttribute("data-theme", name);

    for (const prop of legacyThemeStyleProps) {
      root.style.removeProperty(prop);
    }

    const heroNote = document.querySelector(".home-hero-note");
    if (heroNote) {
      heroNote.textContent = name === "blush" ? "" : `${name}!`;
      heroNote.style.display = name === "blush" ? "" : "block";
    }

    if (themePillBtn) {
      themePillBtn.textContent = themeLabels[name] ?? name;
    }
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem("theme") || "blush";
    } catch (error) {
      return "blush";
    }
  }

  function setStoredTheme(name) {
    try {
      localStorage.setItem("theme", name);
    } catch (error) {
      return;
    }
  }

  applyTheme(getStoredTheme());

  function cycleTheme() {
    const current = getStoredTheme();
    const idx = themeOrder.indexOf(current);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setStoredTheme(next);
    applyTheme(next);
  }

  if (themePillBtn) {
    themePillBtn.addEventListener("click", cycleTheme);
  }
}

const diaryLink = document.querySelector(".section-secret");
const pageRoot = document.body;

document.querySelectorAll(".home-btn, .hero-mini-btn").forEach((btn) => {
  const press = () => btn.classList.add("is-pressed");
  const release = () => btn.classList.remove("is-pressed");
  btn.addEventListener("pointerdown", press);
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointerleave", release);
  btn.addEventListener("pointercancel", release);
});

function syncDiaryLinkState() {
  if (!diaryLink) {
    return;
  }

  const isOpen = pageRoot.dataset.diaryOpen === "true";

  if (isOpen) {
    diaryLink.removeAttribute("aria-hidden");
    diaryLink.removeAttribute("tabindex");
    return;
  }

  diaryLink.setAttribute("aria-hidden", "true");
  diaryLink.setAttribute("tabindex", "-1");
}

syncDiaryLinkState();

if (diaryLink) {
  diaryLink.addEventListener("click", (e) => {
    if (pageRoot.dataset.diaryOpen !== "true") {
      e.preventDefault();
      pageRoot.dataset.diaryOpen = "true";
      syncDiaryLinkState();
    }
  });
}
