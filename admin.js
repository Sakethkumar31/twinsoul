const loginPanel = document.getElementById("login-panel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-btn");
const loginNote = document.getElementById("login-note");
const contentNote = document.getElementById("content-note");
const notificationsNote = document.getElementById("notifications-note");
const inquiriesNote = document.getElementById("inquiries-note");
const passwordWarning = document.getElementById("password-warning");
const contentForm = document.getElementById("content-form");
const inquiriesBody = document.getElementById("inquiries-body");
const saveContentButton = document.getElementById("save-content-btn");
const saveNotificationsButton = document.getElementById("save-notifications-btn");
const overviewSections = document.getElementById("overview-sections");
const overviewNotifications = document.getElementById("overview-notifications");
const overviewInquiries = document.getElementById("overview-inquiries");

const repeaters = {
  heroBullets: document.getElementById("hero-bullets"),
  commissionTags: document.getElementById("commission-tags"),
  aboutParagraphs: document.getElementById("about-paragraphs"),
  aboutStats: document.getElementById("about-stats"),
  referencesList: document.getElementById("references-list"),
  notificationsList: document.getElementById("notifications-list")
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function setBusy(button, busyLabel, idleLabel, busy) {
  if (!button) {
    return;
  }
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

function cloneSingleValueRow(value = "") {
  const fragment = document.getElementById("single-row-template").content.firstElementChild.cloneNode(true);
  fragment.querySelector("[data-field='value']").value = value;
  fragment.querySelector("[data-remove-row]").addEventListener("click", () => fragment.remove());
  return fragment;
}

function cloneStatRow(item = {}) {
  const fragment = document.getElementById("stat-row-template").content.firstElementChild.cloneNode(true);
  fragment.querySelector("[data-field='value']").value = item.value || "";
  fragment.querySelector("[data-field='label']").value = item.label || "";
  fragment.querySelector("[data-remove-row]").addEventListener("click", () => fragment.remove());
  return fragment;
}

function cloneReferenceRow(item = {}) {
  const fragment = document.getElementById("reference-row-template").content.firstElementChild.cloneNode(true);
  fragment.querySelector("[data-field='title']").value = item.title || "";
  fragment.querySelector("[data-field='summary']").value = item.summary || "";
  fragment.querySelector("[data-field='ctaLabel']").value = item.ctaLabel || "";
  fragment.querySelector("[data-field='href']").value = item.href || "";
  fragment.querySelector("[data-remove-row]").addEventListener("click", () => fragment.remove());
  return fragment;
}

function cloneNotificationRow(item = {}) {
  const fragment = document.getElementById("notification-row-template").content.firstElementChild.cloneNode(true);
  fragment.dataset.id = item.id || "";
  fragment.querySelector("[data-field='message']").value = item.message || "";
  fragment.querySelector("[data-field='tone']").value = item.tone || "info";
  fragment.querySelector("[data-field='active']").checked = Boolean(item.active);
  fragment.querySelector("[data-remove-row]").addEventListener("click", () => fragment.remove());
  return fragment;
}

function setSingleValueList(container, values = []) {
  container.innerHTML = "";
  values.forEach((value) => container.appendChild(cloneSingleValueRow(value)));
}

function setStatsList(items = []) {
  repeaters.aboutStats.innerHTML = "";
  items.forEach((item) => repeaters.aboutStats.appendChild(cloneStatRow(item)));
}

function setReferenceList(items = []) {
  repeaters.referencesList.innerHTML = "";
  items.forEach((item) => repeaters.referencesList.appendChild(cloneReferenceRow(item)));
}

function setNotificationList(items = []) {
  repeaters.notificationsList.innerHTML = "";
  items.forEach((item) => repeaters.notificationsList.appendChild(cloneNotificationRow(item)));
}

function getSingleValueList(container) {
  return [...container.querySelectorAll("[data-field='value']")]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getStatsList() {
  return [...repeaters.aboutStats.children]
    .map((row) => ({
      value: row.querySelector("[data-field='value']").value.trim(),
      label: row.querySelector("[data-field='label']").value.trim()
    }))
    .filter((item) => item.value || item.label);
}

function getReferenceList() {
  return [...repeaters.referencesList.children]
    .map((row) => ({
      title: row.querySelector("[data-field='title']").value.trim(),
      summary: row.querySelector("[data-field='summary']").value.trim(),
      ctaLabel: row.querySelector("[data-field='ctaLabel']").value.trim() || "Open link",
      href: row.querySelector("[data-field='href']").value.trim()
    }))
    .filter((item) => item.title);
}

function getNotificationList() {
  return [...repeaters.notificationsList.children]
    .map((row) => ({
      id: row.dataset.id || "",
      message: row.querySelector("[data-field='message']").value.trim(),
      tone: row.querySelector("[data-field='tone']").value,
      active: row.querySelector("[data-field='active']").checked
    }))
    .filter((item) => item.message);
}

function populateContentForm(content) {
  contentForm.elements.brandName.value = content.brandName || "";
  contentForm.elements.brandLine.value = content.brandLine || "";
  contentForm.elements.instagramHandle.value = content.instagramHandle || "";
  contentForm.elements.instagramUrl.value = content.instagramUrl || "";
  contentForm.elements.heroEyebrow.value = content.hero.eyebrow || "";
  contentForm.elements.heroTitle.value = content.hero.title || "";
  contentForm.elements.heroDescription.value = content.hero.description || "";
  contentForm.elements.heroPrimaryLabel.value = content.hero.primaryCtaLabel || "";
  contentForm.elements.heroPrimaryHref.value = content.hero.primaryCtaHref || "";
  contentForm.elements.heroSecondaryLabel.value = content.hero.secondaryCtaLabel || "";
  contentForm.elements.heroSecondaryHref.value = content.hero.secondaryCtaHref || "";
  contentForm.elements.heroCardTitle.value = content.heroCard.title || "";
  contentForm.elements.heroCardDescription.value = content.heroCard.description || "";
  contentForm.elements.commissionsEyebrow.value = content.commissions.eyebrow || "";
  contentForm.elements.commissionsTitle.value = content.commissions.title || "";
  contentForm.elements.commissionsDescription.value = content.commissions.description || "";
  contentForm.elements.aboutTitle.value = content.about.title || "";
  contentForm.elements.referencesEyebrow.value = content.references.eyebrow || "";
  contentForm.elements.referencesTitle.value = content.references.title || "";
  contentForm.elements.contactEyebrow.value = content.contact.eyebrow || "";
  contentForm.elements.contactTitle.value = content.contact.title || "";
  contentForm.elements.contactPrimaryContact.value = content.contact.primaryContact || "";
  contentForm.elements.contactResponseTime.value = content.contact.responseTime || "";
  contentForm.elements.contactCtaLabel.value = content.contact.ctaLabel || "";
  contentForm.elements.contactCtaHref.value = content.contact.ctaHref || "";

  setSingleValueList(repeaters.heroBullets, content.heroCard.bullets || []);
  setSingleValueList(repeaters.commissionTags, content.commissions.tags || []);
  setSingleValueList(repeaters.aboutParagraphs, content.about.paragraphs || []);
  setStatsList(content.about.stats || []);
  setReferenceList(content.references.items || []);
  if (overviewSections) {
    overviewSections.textContent = "6";
  }
}

function serializeContent() {
  return {
    brandName: contentForm.elements.brandName.value.trim(),
    brandLine: contentForm.elements.brandLine.value.trim(),
    instagramHandle: contentForm.elements.instagramHandle.value.trim(),
    instagramUrl: contentForm.elements.instagramUrl.value.trim(),
    hero: {
      eyebrow: contentForm.elements.heroEyebrow.value.trim(),
      title: contentForm.elements.heroTitle.value.trim(),
      description: contentForm.elements.heroDescription.value.trim(),
      primaryCtaLabel: contentForm.elements.heroPrimaryLabel.value.trim(),
      primaryCtaHref: contentForm.elements.heroPrimaryHref.value.trim(),
      secondaryCtaLabel: contentForm.elements.heroSecondaryLabel.value.trim(),
      secondaryCtaHref: contentForm.elements.heroSecondaryHref.value.trim()
    },
    heroCard: {
      title: contentForm.elements.heroCardTitle.value.trim(),
      description: contentForm.elements.heroCardDescription.value.trim(),
      bullets: getSingleValueList(repeaters.heroBullets)
    },
    commissions: {
      eyebrow: contentForm.elements.commissionsEyebrow.value.trim(),
      title: contentForm.elements.commissionsTitle.value.trim(),
      description: contentForm.elements.commissionsDescription.value.trim(),
      tags: getSingleValueList(repeaters.commissionTags)
    },
    about: {
      title: contentForm.elements.aboutTitle.value.trim(),
      paragraphs: getSingleValueList(repeaters.aboutParagraphs),
      stats: getStatsList()
    },
    references: {
      eyebrow: contentForm.elements.referencesEyebrow.value.trim(),
      title: contentForm.elements.referencesTitle.value.trim(),
      items: getReferenceList()
    },
    contact: {
      eyebrow: contentForm.elements.contactEyebrow.value.trim(),
      title: contentForm.elements.contactTitle.value.trim(),
      primaryContact: contentForm.elements.contactPrimaryContact.value.trim(),
      responseTime: contentForm.elements.contactResponseTime.value.trim(),
      ctaLabel: contentForm.elements.contactCtaLabel.value.trim(),
      ctaHref: contentForm.elements.contactCtaHref.value.trim()
    }
  };
}

function renderInquiries(inquiries) {
  inquiriesBody.innerHTML = "";
  if (!inquiries.length) {
    inquiriesBody.innerHTML = "<tr><td colspan='6'>No inquiries yet.</td></tr>";
    if (overviewInquiries) {
      overviewInquiries.textContent = "0";
    }
    return;
  }

  if (overviewInquiries) {
    overviewInquiries.textContent = String(inquiries.filter((item) => item.status === "new").length);
  }

  inquiries.forEach((inquiry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${inquiry.name}</td>
      <td><a href="mailto:${inquiry.email}">${inquiry.email}</a></td>
      <td>${inquiry.product}</td>
      <td>${inquiry.details}</td>
      <td></td>
      <td>${new Date(inquiry.createdAt).toLocaleString()}</td>
    `;

    const select = document.createElement("select");
    select.className = "status-select";
    ["new", "quoted", "in-progress", "closed"].forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      option.selected = inquiry.status === status;
      select.appendChild(option);
    });

    select.addEventListener("change", async () => {
      try {
        await request(`/api/admin/inquiries/${inquiry.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: select.value })
        });
        inquiriesNote.textContent = "Inquiry status updated.";
      } catch (error) {
        inquiriesNote.textContent = error.message;
      }
    });

    row.children[4].appendChild(select);
    inquiriesBody.appendChild(row);
  });
}

document.querySelectorAll("[data-add-row]").forEach((button) => {
  button.addEventListener("click", () => {
    switch (button.dataset.addRow) {
      case "hero-bullets":
        repeaters.heroBullets.appendChild(cloneSingleValueRow());
        break;
      case "commission-tags":
        repeaters.commissionTags.appendChild(cloneSingleValueRow());
        break;
      case "about-paragraphs":
        repeaters.aboutParagraphs.appendChild(cloneSingleValueRow());
        break;
      case "about-stats":
        repeaters.aboutStats.appendChild(cloneStatRow());
        break;
      case "references-list":
        repeaters.referencesList.appendChild(cloneReferenceRow());
        break;
      case "notifications-list":
        repeaters.notificationsList.appendChild(cloneNotificationRow({ active: true, tone: "info" }));
        break;
      default:
        break;
    }
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginNote.textContent = "";
  const formData = new FormData(loginForm);

  try {
    const session = await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: formData.get("password") })
    });
    loginForm.reset();
    loginPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
    passwordWarning.textContent = session.mustChangePassword
      ? "Change the ADMIN_PASSWORD environment variable before production use."
      : "";
    await loadDashboard();
  } catch (error) {
    loginNote.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  await request("/api/admin/logout", { method: "POST" });
  dashboard.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  passwordWarning.textContent = "";
});

saveContentButton.addEventListener("click", async () => {
  contentNote.textContent = "";
  setBusy(saveContentButton, "Saving...", "Save content", true);
  try {
    await request("/api/admin/site-content", {
      method: "PUT",
      body: JSON.stringify(serializeContent())
    });
    contentNote.textContent = "Site content saved.";
  } catch (error) {
    contentNote.textContent = error.message;
  } finally {
    setBusy(saveContentButton, "Saving...", "Save content", false);
  }
});

saveNotificationsButton.addEventListener("click", async () => {
  notificationsNote.textContent = "";
  setBusy(saveNotificationsButton, "Saving...", "Save notifications", true);
  try {
    const data = await request("/api/admin/notifications", {
      method: "PUT",
      body: JSON.stringify({ notifications: getNotificationList() })
    });
    notificationsNote.textContent = "Notifications saved.";
    if (overviewNotifications) {
      overviewNotifications.textContent = String(data.notifications.filter((item) => item.active).length);
    }
  } catch (error) {
    notificationsNote.textContent = error.message;
  } finally {
    setBusy(saveNotificationsButton, "Saving...", "Save notifications", false);
  }
});

async function loadDashboard() {
  const data = await request("/api/admin/dashboard");
  populateContentForm(data.siteContent);
  setNotificationList(data.notifications);
  renderInquiries(data.inquiries);
  if (overviewNotifications) {
    overviewNotifications.textContent = String(data.notifications.filter((item) => item.active).length);
  }
}

async function bootstrap() {
  try {
    const session = await request("/api/admin/session");
    if (!session.authenticated) {
      return;
    }
    loginPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
    passwordWarning.textContent = session.mustChangePassword
      ? "Change the ADMIN_PASSWORD environment variable before production use."
      : "";
    await loadDashboard();
  } catch (error) {
    loginPanel.classList.remove("hidden");
  }
}

bootstrap();
