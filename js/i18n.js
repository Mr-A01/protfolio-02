/**
 * Internationalization module
 * Supports English (LTR) and Persian (RTL)
 */

let currentLang = localStorage.getItem("lang") || "en";
let translations = {};

export async function initI18n() {
  const [en, fa] = await Promise.all([
    fetch("data/en.json").then((r) => r.json()),
    fetch("data/fa.json").then((r) => r.json()),
  ]);
  translations = { en, fa };
  applyLanguage(currentLang);
  return currentLang;
}

export function getLang() {
  return currentLang;
}

export function t(key) {
  const keys = key.split(".");
  let val = translations[currentLang];
  for (const k of keys) {
    if (val == null) return key;
    val = val[k];
  }
  return val ?? key;
}

export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyLanguage(lang);
}

function applyLanguage(lang) {
  const data = translations[lang];
  if (!data) return;

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";

  // Update meta
  document.title = data.meta?.title || document.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && data.meta?.description) {
    metaDesc.setAttribute("content", data.meta.description);
  }

  // Update all [data-i18n] elements
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = t(key);
    if (typeof value === "string") {
      el.textContent = value;
    }
  });

  // Update lang toggle UI
  document.querySelectorAll(".lang-toggle span").forEach((span) => {
    span.classList.toggle("is-active", span.dataset.lang === lang);
  });

  // Rebuild dynamic sections that depend on language
  window.dispatchEvent(new CustomEvent("languagechange", { detail: { lang } }));
}

export function getTranslations() {
  return translations[currentLang];
}
