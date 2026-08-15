/**
 * Application bootstrap
 */

import { initI18n, setLanguage } from "./i18n.js";
import { initCursor } from "./cursor.js";
import { initThreeScene } from "./three-scene.js";
import { initScroll } from "./scroll.js";
import { initUI, buildAboutStats } from "./ui.js";

const loader = document.getElementById("loader");
const bar = document.getElementById("loaderProgress");

const progress = (n) => {
  if (bar) bar.style.width = `${Math.min(100, n)}%`;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function waitForTHREE(ms = 5000) {
  return new Promise((resolve, reject) => {
    if (typeof THREE !== "undefined") return resolve(THREE);
    const t0 = Date.now();
    const id = setInterval(() => {
      if (typeof THREE !== "undefined") {
        clearInterval(id);
        resolve(THREE);
      } else if (Date.now() - t0 > ms) {
        clearInterval(id);
        reject(new Error("THREE load timeout"));
      }
    }, 40);
  });
}

async function boot() {
  try {
    progress(8);
    await initI18n();
    progress(22);

    document.getElementById("langToggle")?.addEventListener("click", (e) => {
      const span = e.target.closest("[data-lang]");
      if (!span) return;
      setLanguage(span.dataset.lang);
      buildAboutStats();
    });

    initCursor();
    progress(32);

    await waitForTHREE();
    const canvas = document.getElementById("webgl");
    if (canvas) initThreeScene(canvas);
    progress(55);

    await initUI();
    buildAboutStats();
    progress(72);

    if (typeof gsap !== "undefined") initScroll();
    progress(90);

    await wait(280);
    progress(100);
    await wait(200);

    if (loader) {
      loader.classList.add("is-hidden");
      setTimeout(() => {
        loader.style.display = "none";
      }, 750);
    }
  } catch (err) {
    console.error("[boot]", err);
    if (loader) {
      loader.classList.add("is-hidden");
      setTimeout(() => {
        loader.style.display = "none";
      }, 300);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
