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

  async function loadPhotos() {
    try {
      const res = await fetch("photos.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("manifest missing");
      const data = await res.json();
      photos = Array.isArray(data) ? data : data.photos || [];
    } catch {
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
      const src = typeof photo === "string" ? photo : photo.src;
      const caption = typeof photo === "string" ? "" : photo.caption || "";
      const alt = typeof photo === "string" ? "" : photo.alt || caption || "";

      const item = document.createElement("button");
      item.type = "button";
      item.className = "gallery__item";
      item.style.animationDelay = `${Math.min(i * 40, 600)}ms`;
      item.setAttribute("aria-label", alt || `Open photo ${i + 1}`);

      const img = document.createElement("img");
      img.src = src;
      img.alt = alt;
      img.loading = "lazy";
      img.decoding = "async";

      item.appendChild(img);
      item.addEventListener("click", () => openLightbox(i));
      frag.appendChild(item);
    });

    gallery.appendChild(frag);
  }

  function openLightbox(index) {
    currentIndex = index;
    updateLightboxContent();
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.setAttribute("data-open", "true"));
    document.body.classList.add("lightbox-open");
  }

  function closeLightbox() {
    lightbox.setAttribute("data-open", "false");
    document.body.classList.remove("lightbox-open");
    setTimeout(() => {
      lightbox.hidden = true;
      lightboxImage.src = "";
    }, 280);
  }

  function step(delta) {
    if (photos.length === 0) return;
    currentIndex = (currentIndex + delta + photos.length) % photos.length;
    updateLightboxContent();
  }

  function updateLightboxContent() {
    const photo = photos[currentIndex];
    const src = typeof photo === "string" ? photo : photo.src;
    const caption = typeof photo === "string" ? "" : photo.caption || "";
    const alt = typeof photo === "string" ? "" : photo.alt || caption || "";

    lightboxImage.src = src;
    lightboxImage.alt = alt;
    lightboxCaption.textContent = caption;

    // Preload neighbors
    if (photos.length > 1) {
      [1, -1].forEach((d) => {
        const p = photos[(currentIndex + d + photos.length) % photos.length];
        const psrc = typeof p === "string" ? p : p.src;
        const pre = new Image();
        pre.src = psrc;
      });
    }
  }

  closeBtn.addEventListener("click", closeLightbox);
  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.getAttribute("data-open") !== "true") return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  });

  // Touch swipe
  let touchStartX = 0;
  let touchStartY = 0;
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      step(dx < 0 ? 1 : -1);
    } else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      closeLightbox();
    }
  }, { passive: true });

  loadPhotos();
})();
