/**
 * UI: projects, skills, services, process, testimonials, form, nav
 */

import { t } from "./i18n.js";

let projectsData = [];
let currentFilter = "all";

export async function initUI() {
  const res = await fetch("data/projects.json");
  projectsData = await res.json();

  buildSkills();
  buildServices();
  buildProcess();
  buildTestimonials();
  buildProjects();
  buildExperience();
  buildFilters();
  buildFaq();
  initModal();
  initForm();
  initMobileNav();
  initNavLinks();

  window.addEventListener("languagechange", () => {
    buildSkills();
    buildServices();
    buildProcess();
    buildTestimonials();
    buildExperience();
    buildFaq();
    buildAboutStats();
    const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
    if (allBtn) allBtn.textContent = t("projects.filterAll");
  });
}

function buildSkills() {
  const grid = document.getElementById("skillsGrid");
  if (!grid) return;
  const items = t("skills.items");
  if (!Array.isArray(items)) return;

  grid.innerHTML = items
    .map(
      (item) => `
    <div class="skill-card">
      <div class="skill-card__name">${item.name}</div>
      <div class="skill-card__bar">
        <div class="skill-card__fill" data-level="${item.level}" style="width:0%"></div>
      </div>
    </div>`
    )
    .join("");
}

function buildServices() {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  const items = t("services.items");
  if (!Array.isArray(items)) return;

  grid.innerHTML = items
    .map(
      (item) => `
    <article class="service-card">
      <div class="service-card__icon">${item.icon}</div>
      <h3 class="service-card__title">${item.title}</h3>
      <p class="service-card__desc">${item.desc}</p>
    </article>`
    )
    .join("");
}

function buildProcess() {
  const grid = document.getElementById("processGrid");
  if (!grid) return;
  const steps = t("process.steps");
  if (!Array.isArray(steps)) return;

  grid.innerHTML = steps
    .map(
      (s) => `
    <div class="process-step">
      <div class="process-step__num">${s.num}</div>
      <h3 class="process-step__title">${s.title}</h3>
      <p class="process-step__desc">${s.desc}</p>
    </div>`
    )
    .join("");
}

function buildTestimonials() {
  const grid = document.getElementById("testimonialsGrid");
  if (!grid) return;
  const items = t("testimonials.items");
  if (!Array.isArray(items)) return;

  grid.innerHTML = items
    .map(
      (item) => `
    <blockquote class="testimonial-card">
      <p class="testimonial-card__quote">${item.quote}</p>
      <footer>
        <div class="testimonial-card__name">${item.name}</div>
        <div class="testimonial-card__role">${item.role}</div>
      </footer>
    </blockquote>`
    )
    .join("");
}

function buildFilters() {
  const container = document.getElementById("projectFilters");
  if (!container) return;

  const categories = ["all", ...new Set(projectsData.map((p) => p.category))];
  container.innerHTML = categories
    .map((cat) => {
      const label = cat === "all" ? t("projects.filterAll") : cat;
      return `<button class="filter-btn ${cat === currentFilter ? "is-active" : ""}" data-filter="${cat}" type="button">${label}</button>`;
    })
    .join("");

  container.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      container.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderProjects();
    });
  });
}

function buildProjects() {
  renderProjects();
}

function renderProjects() {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  const filtered =
    currentFilter === "all"
      ? projectsData
      : projectsData.filter((p) => p.category === currentFilter);

  const doRender = () => {
    grid.innerHTML = filtered
      .map(
        (p) => `
      <article class="project-card" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.title}">
        <div class="project-card__visual">
          <div class="project-card__gradient" style="background: radial-gradient(circle at 30% 30%, ${p.color}88, transparent 70%), linear-gradient(135deg, ${p.color}33, #030305);"></div>
        </div>
        <div class="project-card__body">
          <div class="project-card__meta">
            <span class="project-card__cat">${p.category}</span>
            <span class="project-card__year">${p.year}</span>
          </div>
          <h3 class="project-card__title">${p.title}</h3>
          <p class="project-card__desc">${p.description}</p>
          <div class="project-card__tags">
            ${p.tags.map((tag) => `<span class="project-card__tag">${tag}</span>`).join("")}
          </div>
        </div>
      </article>`
      )
      .join("");

    grid.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", () => openModal(card.dataset.id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(card.dataset.id);
        }
      });
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-3px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });

    if (typeof gsap !== "undefined") {
      gsap.fromTo(
        grid.children,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: "expo.out" }
      );
    }
  };

  if (grid.children.length && typeof gsap !== "undefined") {
    gsap.to(grid.children, {
      opacity: 0,
      y: 12,
      duration: 0.2,
      stagger: 0.02,
      ease: "power2.in",
      onComplete: doRender,
    });
  } else {
    doRender();
  }
}


function buildFaq() {
  const list = document.getElementById("faqList");
  if (!list) return;
  const items = t("faq.items");
  if (!Array.isArray(items)) return;

  list.innerHTML = items
    .map(
      (item, i) => `
    <div class="faq-item" data-faq="${i}">
      <button class="faq-item__q" type="button" aria-expanded="false">
        <span>${item.q}</span>
        <span class="faq-item__icon" aria-hidden="true"></span>
      </button>
      <div class="faq-item__a">
        <p>${item.a}</p>
      </div>
    </div>`
    )
    .join("");

  list.querySelectorAll(".faq-item").forEach((item) => {
    const btn = item.querySelector(".faq-item__q");
    btn.addEventListener("click", () => {
      const open = item.classList.contains("is-open");
      list.querySelectorAll(".faq-item").forEach((el) => {
        el.classList.remove("is-open");
        el.querySelector(".faq-item__q")?.setAttribute("aria-expanded", "false");
      });
      if (!open) {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });
}

function buildExperience() {
  const timeline = document.getElementById("timeline");
  if (!timeline) return;
  const items = t("experience.items");
  if (!Array.isArray(items)) return;

  timeline.innerHTML = items
    .map(
      (item) => `
    <div class="timeline__item">
      <div class="timeline__dot"></div>
      <div class="timeline__role">${item.role}</div>
      <div class="timeline__company">${item.company}</div>
      <div class="timeline__period">${item.period}</div>
      <p class="timeline__desc">${item.description}</p>
    </div>`
    )
    .join("");
}

export function buildAboutStats() {
  const container = document.getElementById("aboutStats");
  if (!container) return;
  const stats = t("about.stats");
  if (!Array.isArray(stats)) return;

  container.innerHTML = stats
    .map(
      (s) => `
    <div>
      <div class="about__stat-value">${s.value}</div>
      <div class="about__stat-label">${s.label}</div>
    </div>`
    )
    .join("");
}

function initModal() {
  const modal = document.getElementById("projectModal");
  if (!modal) return;

  modal.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
}

function openModal(id) {
  const project = projectsData.find((p) => p.id === id);
  if (!project) return;

  const modal = document.getElementById("projectModal");
  document.getElementById("modalCat").textContent = `${project.category} · ${project.year}`;
  document.getElementById("modalTitle").textContent = project.title;
  document.getElementById("modalDesc").textContent = project.description;
  document.getElementById("modalTags").innerHTML = project.tags
    .map((t) => `<span class="project-card__tag">${t}</span>`)
    .join("");

  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("is-open"));
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = document.getElementById("projectModal");
  modal.classList.remove("is-open");
  setTimeout(() => {
    modal.hidden = true;
    document.body.style.overflow = "";
  }, 400);
}

function initForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const success = document.getElementById("formSuccess");
    success.classList.add("is-visible");
    form.reset();
    setTimeout(() => success.classList.remove("is-visible"), 4000);
  });
}

function initMobileNav() {
  const btn = document.getElementById("menuBtn");
  const nav = document.getElementById("mobileNav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open);
    nav.hidden = !open;
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      nav.hidden = true;
    });
  });
}

function initNavLinks() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        import("./scroll.js").then(({ scrollTo }) => scrollTo(target));
      }
    });
  });
}
