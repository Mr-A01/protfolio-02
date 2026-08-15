/**
 * Master cinematic scroll — Lenis + GSAP ScrollTrigger
 * Guarantees __scrollProgress updates every frame
 */

import { setGlobalProgress } from "./three-scene.js";

let lenis = null;
let masterTween = null;

function syncProgress(p) {
  const v = Math.max(0, Math.min(1, p));
  window.__scrollProgress = v;
  setGlobalProgress(v);
}

export function initScroll() {
  const Ctor = window.Lenis || window.lenis;

  if (Ctor) {
    lenis = new Ctor({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
      wheelMultiplier: 0.9,
    });

    // Update ScrollTrigger AND our progress on every Lenis scroll
    lenis.on("scroll", ({ progress: lp }) => {
      ScrollTrigger.update();
      // Lenis progress is 0→1 when available
      if (typeof lp === "number") {
        syncProgress(lp);
      } else {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        syncProgress(window.scrollY / max);
      }
    });

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

    const driver = { p: 0 };

    masterTween = gsap.to(driver, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.9,
        onUpdate: (self) => {
          syncProgress(self.progress);
        },
      },
    });
  }

  // Native fallback — always works
  const onNativeScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = window.scrollY / max;
    // Only use if ScrollTrigger isn't driving (or as backup)
    if (!masterTween || Math.abs((window.__scrollProgress || 0) - p) > 0.02) {
      syncProgress(p);
    }
  };
  window.addEventListener("scroll", onNativeScroll, { passive: true });

  // Continuous progress sync from scroll position (belt + suspenders)
  gsap.ticker.add(() => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = (lenis ? lenis.scroll : window.scrollY) / max;
    if (Number.isFinite(p)) {
      // Prefer ScrollTrigger progress if available; else native
      if (!masterTween) syncProgress(p);
    }
  });

  setupHero();
  setupHeader();
  setupReveals();
  setupNav();

  syncProgress(0);
  console.info("[scroll] Master timeline active");
  return lenis;
}

function setupHero() {
  const els = [".hero__greeting", ".hero__name", ".hero__title", ".hero__subtitle", ".hero__badge"];
  gsap.set(els, { opacity: 0, y: 28 });
  gsap.set(".hero__scroll", { opacity: 0 });
  gsap.set(".hero__cta", { opacity: 0, y: 16 });

  gsap
    .timeline({ delay: 0.35 })
    .to(".hero__badge", { opacity: 1, y: 0, duration: 1, ease: "expo.out" }, 0)
    .to(".hero__greeting", { opacity: 1, y: 0, duration: 1.1, ease: "expo.out" }, 0.08)
    .to(".hero__name", { opacity: 1, y: 0, duration: 1.3, ease: "expo.out" }, 0.15)
    .to(".hero__title", { opacity: 1, y: 0, duration: 1.05, ease: "expo.out" }, 0.28)
    .to(".hero__subtitle", { opacity: 1, y: 0, duration: 1.05, ease: "expo.out" }, 0.4)
    .to(".hero__cta", { opacity: 1, y: 0, duration: 1, ease: "expo.out" }, 0.55)
    .to(".hero__scroll", { opacity: 1, duration: 0.9, ease: "power2.out" }, 0.85);

  gsap.to(".hero__content", {
    opacity: 0,
    y: -36,
    ease: "none",
    scrollTrigger: {
      trigger: "#hero",
      start: "center center",
      end: "bottom top",
      scrub: 1,
    },
  });
}

function setupHeader() {
  const header = document.getElementById("header");
  if (!header) return;

  ScrollTrigger.create({
    start: 40,
    onUpdate: (self) => {
      header.classList.toggle("is-scrolled", self.scroll() > 40);
    },
  });
}

function setupReveals() {
  const ids = [
    "about", "services", "skills", "projects",
    "process", "experience", "testimonials", "faq", "contact",
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const kids = el.querySelector(".section__inner")?.children;
    if (!kids?.length) return;

    gsap.set(kids, { opacity: 0, y: 32 });
    gsap.to(kids, {
      opacity: 1,
      y: 0,
      duration: 1.05,
      stagger: 0.06,
      ease: "expo.out",
      scrollTrigger: {
        trigger: el,
        start: "top 78%",
        toggleActions: "play none none reverse",
      },
    });
  });

  ScrollTrigger.create({
    trigger: "#skills",
    start: "top 65%",
    onEnter: () => {
      document.querySelectorAll(".skill-card__fill").forEach((bar, i) => {
        gsap.to(bar, {
          width: `${bar.dataset.level || 0}%`,
          duration: 1.35,
          ease: "expo.out",
          delay: i * 0.05,
        });
      });
    },
    onLeaveBack: () => {
      document.querySelectorAll(".skill-card__fill").forEach((bar) => {
        gsap.set(bar, { width: "0%" });
      });
    },
  });
}

function setupNav() {
  [
    "hero", "about", "services", "skills", "projects",
    "process", "experience", "testimonials", "faq", "contact",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: "top 45%",
      end: "bottom 45%",
      onEnter: () => setActive(id),
      onEnterBack: () => setActive(id),
    });
  });
}

function setActive(id) {
  document.querySelectorAll(".nav__link").forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
  });
}

export function scrollTo(target) {
  if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.3 });
  else if (typeof target === "string")
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  else target?.scrollIntoView({ behavior: "smooth" });
}

export function getLenis() {
  return lenis;
}
