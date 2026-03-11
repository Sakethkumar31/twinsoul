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

// Gallery elements
const galleryList = document.getElementById("gallery-list");
const galleryNote = document.getElementById("gallery-note");
const galleryFormModal = document.getElementById("gallery-form-modal");
const galleryForm = document.getElementById("gallery-form");
const galleryModalTitle = document.getElementById("gallery-modal-title");
const addGalleryBtn = document.getElementById("add-gallery-btn");
const syncInstagramBtn = document.getElementById("sync-instagram-btn");

// Bestsellers elements
const bestsellersList = document.getElementById("bestsellers-list");
const bestsellersNote = document.getElementById("bestsellers-note");
const bestsellerFormModal = document.getElementById("bestseller-form-modal");
const bestsellerForm = document.getElementById("bestseller-form");
const bestsellerModalTitle = document.getElementById("bestseller-modal-title");
const addBestsellerBtn = document.getElementById("add-bestseller-btn");

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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', """);
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

// ============ Gallery Management ============
function renderGallery(gallery) {
  if (!galleryList) return;
  
  if (!gallery || gallery.length === 0) {
    galleryList.innerHTML = "<p>No highlights yet. Add one or sync from Instagram.</p>";
    return;
  }

  galleryList.innerHTML = gallery.map(item => `
    <div class="gallery-admin-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.title}" />
      <div class="gallery-admin-info">
        <h4>${escapeHtml(item.title)}</h4>
        <p>${item.likes} likes | ${item.comments} comments</p>
        <span class="badge badge-type">${item.type}</span>
      </div>
      <div class="gallery-admin-actions">
        <button type="button" class="secondary-btn btn-sm" data-make-bestseller="${item.id}">★ Best Seller</button>
        <button type="button" class="secondary-btn btn-sm" data-edit-gallery="${item.id}">Edit</button>
        <button type="button" class="danger-btn btn-sm" data-delete-gallery="${item.id}">Delete</button>
      </div>
    </div>
  `).join("");

  // Event listeners
  galleryList.querySelectorAll("[data-make-bestseller]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const item = gallery.find(g => g.id === btn.dataset.makeBestseller);
      if (item) {
        try {
          await request("/api/admin/bestsellers", {
            method: "POST",
            body: JSON.stringify({
              title: item.title,
              description: item.description,
              image: item.image,
              link: item.link,
              category: "Gallery",
              badge: "Best Seller",
              orderCount: item.likes || 0,
              rating: 4.5
            })
          });
          bestsellersNote.textContent = "Added to Best Sellers!";
          loadDashboard();
        } catch (error) {
          bestsellersNote.textContent = error.message;
        }
      }
    });
  });

  galleryList.querySelectorAll("[data-edit-gallery]").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = gallery.find(g => g.id === btn.dataset.editGallery);
      if (item) openGalleryModal(item);
    });
  });

  galleryList.querySelectorAll("[data-delete-gallery]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete this highlight?")) {
        try {
          await request(`/api/admin/gallery/${btn.dataset.deleteGallery}`, { method: "DELETE" });
          galleryNote.textContent = "Highlight deleted.";
          loadDashboard();
        } catch (error) {
          galleryNote.textContent = error.message;
        }
      }
    });
  });
}

function openGalleryModal(item = null) {
  if (!galleryFormModal || !galleryForm) return;
  
  galleryModalTitle.textContent = item ? "Edit Highlight" : "Add New Highlight";
  document.getElementById("gallery-item-id").value = item?.id || "";
  document.getElementById("gallery-image").value = item?.image || "";
  document.getElementById("gallery-title").value = item?.title || "";
  document.getElementById("gallery-description").value = item?.description || "";
  document.getElementById("gallery-type").value = item?.type || "photo";
  document.getElementById("gallery-link").value = item?.link || "";
  document.getElementById("gallery-likes").value = item?.likes || 0;
  document.getElementById("gallery-comments").value = item?.comments || 0;
  
  galleryFormModal.classList.remove("hidden");
}

function closeGalleryModal() {
  if (!galleryFormModal) return;
  galleryFormModal.classList.add("hidden");
  galleryForm.reset();
}

if (addGalleryBtn) {
  addGalleryBtn.addEventListener("click", () => openGalleryModal());
}

if (galleryForm) {
  galleryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    galleryNote.textContent = "Saving...";
    
    const id = document.getElementById("gallery-item-id").value;
    const data = {
      image: document.getElementById("gallery-image").value.trim(),
      title: document.getElementById("gallery-title").value.trim(),
      description: document.getElementById("gallery-description").value.trim(),
      type: document.getElementById("gallery-type").value,
      link: document.getElementById("gallery-link").value.trim(),
      likes: parseInt(document.getElementById("gallery-likes").value) || 0,
      comments: parseInt(document.getElementById("gallery-comments").value) || 0
    };

    try {
      if (id) {
        await request(`/api/admin/gallery/${id}`, {
          method: "PUT",
          body: JSON.stringify(data)
        });
        galleryNote.textContent = "Highlight updated.";
      } else {
        await request("/api/admin/gallery", {
          method: "POST",
          body: JSON.stringify(data)
        });
        galleryNote.textContent = "Highlight added.";
      }
      closeGalleryModal();
      loadDashboard();
    } catch (error) {
      galleryNote.textContent = error.message;
    }
  });
}

// Modal close buttons
document.querySelectorAll(".close-modal, .cancel-modal").forEach(btn => {
  btn.addEventListener("click", closeGalleryModal);
});

// Close modal on outside click
if (galleryFormModal) {
  galleryFormModal.addEventListener("click", (e) => {
    if (e.target === galleryFormModal) closeGalleryModal();
  });
}

// Sync from Instagram
if (syncInstagramBtn) {
  syncInstagramBtn.addEventListener("click", async () => {
    galleryNote.textContent = "Syncing from Instagram...";
    setBusy(syncInstagramBtn, "Syncing...", "Sync from Instagram", true);
    
    try {
      const result = await request("/api/admin/sync-instagram", { method: "POST" });
      galleryNote.textContent = result.message;
      loadDashboard();
    } catch (error) {
      galleryNote.textContent = error.message;
    } finally {
      setBusy(syncInstagramBtn, "Syncing...", "Sync from Instagram", false);
    }
  });
}

// ============ Best Sellers Management ============
function renderBestsellers(bestsellers) {
  if (!bestsellersList) return;
  
  if (!bestsellers || bestsellers.length === 0) {
    bestsellersList.innerHTML = "<p>No best sellers yet. Add from gallery or create new.</p>";
    return;
  }

  bestsellersList.innerHTML = bestsellers.map(item => `
    <div class="gallery-admin-item" data-id="${item.id}">
      <img src="${item.image || 'assets/image.png'}" alt="${item.title}" />
      <div class="gallery-admin-info">
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.description || '').substring(0, 60)}${item.description && item.description.length > 60 ? '...' : ''}</p>
        <span class="badge ${item.badge === 'Best Seller' ? 'badge-best' : 'badge-type'}">${item.badge || 'No Badge'}</span>
        <span>₹${item.price || 0}</span>
        <span>${item.orderCount || 0} orders</span>
        <span>★ ${item.rating || 0}</span>
      </div>
      <div class="gallery-admin-actions">
        ${item.link ? `<a href="${item.link}" target="_blank" class="secondary-btn btn-sm">View on Instagram</a>` : ''}
        <button type="button" class="secondary-btn btn-sm" data-edit-bestseller="${item.id}">Edit</button>
        <button type="button" class="danger-btn btn-sm" data-delete-bestseller="${item.id}">Delete</button>
      </div>
    </div>
  `).join("");

  // Event listeners
  bestsellersList.querySelectorAll("[data-edit-bestseller]").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = bestsellers.find(b => b.id === btn.dataset.editBestseller);
      if (item) openBestsellerModal(item);
    });
  });

  bestsellersList.querySelectorAll("[data-delete-bestseller]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete this best seller?")) {
        try {
          await request(`/api/admin/bestsellers/${btn.dataset.deleteBestseller}`, { method: "DELETE" });
          bestsellersNote.textContent = "Best seller deleted.";
          loadDashboard();
        } catch (error) {
          bestsellersNote.textContent = error.message;
        }
      }
    });
  });
}

function openBestsellerModal(item = null) {
  if (!bestsellerFormModal || !bestsellerForm) return;
  
  bestsellerModalTitle.textContent = item ? "Edit Best Seller" : "Add New Best Seller";
  document.getElementById("bestseller-item-id").value = item?.id || "";
  document.getElementById("bestseller-title").value = item?.title || "";
  document.getElementById("bestseller-description").value = item?.description || "";
  document.getElementById("bestseller-price").value = item?.price || 0;
  document.getElementById("bestseller-category").value = item?.category || "";
  document.getElementById("bestseller-image").value = item?.image || "";
  document.getElementById("bestseller-badge").value = item?.badge || "Best Seller";
  document.getElementById("bestseller-link").value = item?.link || "";
  document.getElementById("bestseller-orders").value = item?.orderCount || 0;
  document.getElementById("bestseller-rating").value = item?.rating || 4.5;
  
  bestsellerFormModal.classList.remove("hidden");
}

function closeBestsellerModal() {
  if (!bestsellerFormModal) return;
  bestsellerFormModal.classList.add("hidden");
  bestsellerForm.reset();
}

if (addBestsellerBtn) {
  addBestsellerBtn.addEventListener("click", () => openBestsellerModal());
}

if (bestsellerForm) {
  bestsellerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    bestsellersNote.textContent = "Saving...";
    
    const id = document.getElementById("bestseller-item-id").value;
    const data = {
      title: document.getElementById("bestseller-title").value.trim(),
      description: document.getElementById("bestseller-description").value.trim(),
      price: parseInt(document.getElementById("bestseller-price").value) || 0,
      category: document.getElementById("bestseller-category").value.trim(),
      image: document.getElementById("bestseller-image").value.trim(),
      badge: document.getElementById("bestseller-badge").value,
      link: document.getElementById("bestseller-link").value.trim(),
      orderCount: parseInt(document.getElementById("bestseller-orders").value) || 0,
      rating: parseFloat(document.getElementById("bestseller-rating").value) || 4.5
    };

    try {
      if (id) {
        await request(`/api/admin/bestsellers/${id}`, {
          method: "PUT",
          body: JSON.stringify(data)
        });
        bestsellersNote.textContent = "Best seller updated.";
      } else {
        await request("/api/admin/bestsellers", {
          method: "POST",
          body: JSON.stringify(data)
        });
        bestsellersNote.textContent = "Best seller added.";
      }
      closeBestsellerModal();
      loadDashboard();
    } catch (error) {
      bestsellersNote.textContent = error.message;
    }
  });
}

// Close bestseller modal on outside click
if (bestsellerFormModal) {
  bestsellerFormModal.addEventListener("click", (e) => {
    if (e.target === bestsellerFormModal) closeBestsellerModal();
  });
}

// ============ Inquiries Management ============
function renderInquiries(inquiries) {
  inquiriesBody.innerHTML = "";
  if (!inquiries.length) {
    inquiriesBody.innerHTML = "<tr><td colspan='7'>No inquiries yet.</td></tr>";
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
      <td>${escapeHtml(inquiry.name)}</td>
      <td><a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></td>
      <td>${escapeHtml(inquiry.product)}</td>
      <td>${escapeHtml(inquiry.details).substring(0, 50)}${inquiry.details && inquiry.details.length > 50 ? '...' : ''}</td>
      <td></td>
      <td>${new Date(inquiry.createdAt).toLocaleString()}</td>
      <td></td>
    `;

    // Status dropdown
    const select = document.createElement("select");
    select.className = "status-select";
    ["new", "quoted", "in-progress", "closed"].forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
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
    
    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger-btn btn-sm";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this inquiry?")) {
        try {
          await request(`/api/admin/inquiries/${inquiry.id}`, { method: "DELETE" });
          inquiriesNote.textContent = "Inquiry deleted.";
          loadDashboard();
        } catch (error) {
          inquiriesNote.textContent = error.message;
        }
      }
    });
    
    const actionCell = row.children[6];
    actionCell.appendChild(deleteBtn);
    
    inquiriesBody.appendChild(row);
  });
}

// ============ Form & Button Events ============
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
  renderGallery(data.gallery || []);
  renderBestsellers(data.bestsellers || []);
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

