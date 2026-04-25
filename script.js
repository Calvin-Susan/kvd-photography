(() => {
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const closeBtn = document.getElementById("lightbox-close");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  let photos = [];
  let currentIndex = -1;
  let triggerEl = null;

  const srcOf = (p) => (typeof p === "string" ? p : p.src);
  const captionOf = (p) => (typeof p === "string" ? "" : p.caption || "");
  const altOf = (p) => (typeof p === "string" ? "" : p.alt || p.caption || "");

  async function loadPhotos() {
    try {
      const res = await fetch("photos.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("manifest missing");
      const data = await res.json();
      photos = Array.isArray(data) ? data : data.photos || [];
    } catch (err) {
      console.warn("Failed to load photos manifest:", err);
      photos = [];
    }

    if (photos.length === 0) {
      renderEmptyState();
      return;
    }

    renderGallery();
  }

  function renderEmptyState() {
    const empty = document.createElement("p");
    empty.className = "gallery__empty";
    empty.textContent = "No photos yet.";
    gallery.appendChild(empty);
  }

  function renderGallery() {
    const frag = document.createDocumentFragment();

    photos.forEach((photo, i) => {
      const alt = altOf(photo);

      const item = document.createElement("button");
      item.type = "button";
      item.className = "gallery__item";
      item.style.animationDelay = `${Math.min(i * 40, 600)}ms`;
      item.setAttribute("aria-label", alt || `Open photo ${i + 1}`);

      const img = document.createElement("img");
      img.src = srcOf(photo);
      img.alt = alt;
      img.loading = "lazy";
      img.decoding = "async";
      if (typeof photo === "object" && photo.width && photo.height) {
        img.width = photo.width;
        img.height = photo.height;
      }

      item.appendChild(img);
      item.addEventListener("click", () => openLightbox(i, item));
      frag.appendChild(item);
    });

    gallery.appendChild(frag);
  }

  function openLightbox(index, fromEl) {
    triggerEl = fromEl || document.activeElement;
    currentIndex = index;
    updateLightboxContent();
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.setAttribute("data-open", "true"));
    document.body.classList.add("lightbox-open");
    closeBtn.focus();
  }

  function closeLightbox() {
    lightbox.setAttribute("data-open", "false");
    document.body.classList.remove("lightbox-open");
    setTimeout(() => {
      lightbox.hidden = true;
      lightboxImage.src = "";
    }, 280);
    if (triggerEl && typeof triggerEl.focus === "function") {
      triggerEl.focus();
    }
    triggerEl = null;
  }

  function step(delta) {
    if (photos.length === 0) return;
    currentIndex = (currentIndex + delta + photos.length) % photos.length;
    updateLightboxContent();
  }

  function updateLightboxContent() {
    const photo = photos[currentIndex];
    lightboxImage.src = srcOf(photo);
    lightboxImage.alt = altOf(photo);
    lightboxCaption.textContent = captionOf(photo);
    if (typeof photo === "object" && photo.width && photo.height) {
      lightboxImage.width = photo.width;
      lightboxImage.height = photo.height;
    } else {
      lightboxImage.removeAttribute("width");
      lightboxImage.removeAttribute("height");
    }

    if (photos.length > 1) {
      [1, -1].forEach((d) => {
        const p = photos[(currentIndex + d + photos.length) % photos.length];
        const pre = new Image();
        pre.src = srcOf(p);
      });
    }
  }

  function isOpen() {
    return lightbox.getAttribute("data-open") === "true";
  }

  function trapFocus(e) {
    const focusable = lightbox.querySelectorAll(
      "button:not([disabled]):not([hidden])"
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !lightbox.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  closeBtn.addEventListener("click", closeLightbox);
  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "Tab") trapFocus(e);
  });

  let touchStartX = 0;
  let touchStartY = 0;
  lightbox.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );
  lightbox.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
      } else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
        closeLightbox();
      }
    },
    { passive: true }
  );

  loadPhotos();
})();
