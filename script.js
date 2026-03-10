const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const year = document.getElementById("year");
const form = document.getElementById("quote-form");
const note = document.getElementById("form-note");
const filterButtons = document.querySelectorAll(".filter-btn");
const galleryCards = document.querySelectorAll(".gallery-grid .art-card");

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value ?? "";
  }
}

function setLink(id, label, href) {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }
  node.textContent = label ?? "";
  node.href = href || "#";
}

function renderList(containerId, items, mapper) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = items.map(mapper).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return response.json();
}

async function loadSiteContent() {
  try {
    const content = await fetchJson("/api/site-content");

    setText("brand-name", content.brandName);
    setText("footer-brand-name", content.brandName);
    setText("contact-brand-line", content.brandLine);
    setText("hero-eyebrow", content.hero.eyebrow);
    setText("hero-title", content.hero.title);
    setText("hero-description", content.hero.description);
    setLink("hero-primary-cta", content.hero.primaryCtaLabel, content.hero.primaryCtaHref);
    setLink("hero-secondary-cta", content.hero.secondaryCtaLabel, content.hero.secondaryCtaHref);
    setText("hero-card-title", content.heroCard.title);
    setText("hero-card-description", content.heroCard.description);
    setText("commissions-eyebrow", content.commissions.eyebrow);
    setText("commissions-title", content.commissions.title);
    setText("commissions-description", content.commissions.description);
    setText("about-title", content.about.title);
    setText("references-eyebrow", content.references.eyebrow);
    setText("references-title", content.references.title);
    setText("contact-eyebrow", content.contact.eyebrow);
    setText("contact-title", content.contact.title);
    setText("contact-primary", content.contact.primaryContact);
    setText("contact-response", content.contact.responseTime);
    setText("contact-instagram", content.instagramHandle);
    setLink("contact-instagram", content.instagramHandle, content.instagramUrl);
    setLink("contact-cta", content.contact.ctaLabel, content.contact.ctaHref);

    renderList(
      "hero-card-bullets",
      content.heroCard.bullets,
      (item) => `<li>${escapeHtml(item)}</li>`
    );

    renderList(
      "commissions-tags",
      content.commissions.tags,
      (item) => `<span>${escapeHtml(item)}</span>`
    );

    renderList(
      "about-paragraphs",
      content.about.paragraphs,
      (item) => `<p>${escapeHtml(item)}</p>`
    );

    renderList(
      "about-stats",
      content.about.stats,
      (item) => `<div><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`
    );

    renderList(
      "references-list",
      content.references.items,
      (item) => `
        <article class="reference-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <a class="meta-link" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.ctaLabel || "Open link")}</a>
        </article>
      `
    );
  } catch (error) {
    console.error(error);
  }
}

async function loadNotifications() {
  try {
    const notifications = await fetchJson("/api/notifications");
    const bar = document.getElementById("notification-bar");
    const list = document.getElementById("notification-list");
    if (!bar || !list || !Array.isArray(notifications) || notifications.length === 0) {
      return;
    }

    list.innerHTML = notifications
      .map((item) => `<span class="notification-pill notification-${escapeHtml(item.tone)}">${escapeHtml(item.message)}</span>`)
      .join("");
    bar.classList.remove("hidden");
  } catch (error) {
    console.error(error);
  }
}

if (year) {
  year.textContent = new Date().getFullYear();
}

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

if (form && note) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    note.textContent = "Sending inquiry...";
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to send inquiry");
      }
      note.textContent = `Thanks ${data.name}. Your inquiry is saved.`;
      form.reset();
    } catch (error) {
      note.textContent = error.message;
    }
  });
}

if (filterButtons.length > 0 && galleryCards.length > 0) {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      galleryCards.forEach((card) => {
        const show = filter === "all" || card.dataset.media === filter;
        card.classList.toggle("hidden", !show);
      });
    });
  });
}

loadSiteContent();
loadNotifications();
