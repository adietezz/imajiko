/**
 * MakeReign High-Fidelity gamified controller for Imajiko Card Store.
 * Supports direct pixel cursor movements, scroll-depth score ticking, figma options, and footer Dino.
 */

// Application State
const state = {
  scrollScore: 0,
  interactiveScore: 0,
  totalScore: 0,
  lives: 3,
  gameActive: false,
  gameStarted: false,
  fontsInteracted: { aeonik: false, helvetica: false },
  // Playroom gamification states
  tickets: 0,
  unlockedItems: [], // List of locked stikers/frames unlocked
  originalPhotoSrc: null,
  activeFrame: "none"
};

// --- PLAYGROUND PERSISTENCE ---
function loadPlaygroundState() {
  try {
    const savedTickets = localStorage.getItem("imajiko_tickets");
    if (savedTickets) state.tickets = parseInt(savedTickets);
    const savedUnlocked = localStorage.getItem("imajiko_unlocked_items");
    if (savedUnlocked) state.unlockedItems = JSON.parse(savedUnlocked);
  } catch (e) {
    console.error("Failed to load playground state:", e);
  }
}

function savePlaygroundState() {
  try {
    localStorage.setItem("imajiko_tickets", state.tickets.toString());
    localStorage.setItem("imajiko_unlocked_items", JSON.stringify(state.unlockedItems));
  } catch (e) {
    console.error("Failed to save playground state:", e);
  }
}

function updateTicketsDisplay() {
  const hudTickets = document.getElementById("hudTickets");
  if (hudTickets) {
    hudTickets.textContent = state.tickets.toLocaleString();
  }
}

function syncUnlockedItemsDOM() {
  // 1. Frames
  const frameButtons = document.querySelectorAll("#frameButtonsGrid .btn-frame-choice");
  frameButtons.forEach(btn => {
    const frame = btn.getAttribute("data-frame");
    const itemId = `frame-${frame}`;
    if (state.unlockedItems.includes(itemId)) {
      btn.classList.remove("locked");
    }
  });

  // 2. Stickers
  const stickerButtons = document.querySelectorAll(".btn-sticker[data-sticker]");
  stickerButtons.forEach(btn => {
    const emoji = btn.getAttribute("data-sticker");
    const itemId = `sticker-${emoji}`;
    if (state.unlockedItems.includes(itemId)) {
      btn.classList.remove("locked");
    }
  });
}

// Card templates database (Non-technical description)
const templates = [
  {
    id: "birthday",
    title: "Website Selamat Ulang Tahun",
    desc: "Kirim kejutan spesial dengan lilin digital interaktif yang bisa ditiup, balon warna-warni yang terbang di layar, dan lagu ulang tahun otomatis.",
    price: "Rp 35.000",
    icon: "🎂",
    lynkLink: "https://lynk.id/imajiko/ultah"
  },
  {
    id: "graduation",
    title: "Website Ucapan Wisuda",
    desc: "Scrapbook digital untuk mengenang memori masa kuliah/sekolah. Dilengkapi dengan animasi toga terbang interaktif dan pesan harapan digital.",
    price: "Rp 39.000",
    icon: "🎓",
    lynkLink: "https://lynk.id/imajiko/wisuda"
  },
  {
    id: "anniversary",
    title: "Website Ucapan Anniversary",
    desc: "Hadiah romantis dengan penghitung waktu mundur hari jadian, amplop surat cinta interaktif yang bisa dibuka, dan galeri album foto cinta.",
    price: "Rp 45.000",
    icon: "💖",
    lynkLink: "https://lynk.id/imajiko/anniv"
  }
];

// DOM elements
const loader = document.getElementById("loader");
const loaderProgress = document.getElementById("progress");
const scoreEl = document.getElementById("score");
const scoreHeartsEl = document.getElementById("scoreHearts");
const koModal = document.querySelector(".ko-modal");
const koModalBtn = document.querySelector(".ko-button");
const koModalText = document.querySelector(".ko-paragraph");

// --- 1. LOADER INITIALIZATION ---
function runLoader() {
  const loaderProgress = document.getElementById("progress");
  const btnStartStore = document.getElementById("btnStartStore");
  if (!loaderProgress || !btnStartStore) return;

  let start = null;
  const duration = 3750; // 3.75 seconds to reach 100% (matches the Dino meteor strike and dissolve point)

  function animate(timestamp) {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const progressPercent = Math.min(100, Math.floor((elapsed / duration) * 100));

    loaderProgress.textContent = `${progressPercent.toString().padStart(2, "0")}%`;

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      // Loader count complete, show start button (audio policy gesture compliance)
      // Smoothly fade in and flash via CSS class
      btnStartStore.classList.add("show");

      // Smoothly collapse the dino loader so that the percentage drops down closer to the text below
      const dinoLoader = document.querySelector(".dino-loader");
      if (dinoLoader) {
        dinoLoader.classList.add("fade-collapse");
      }

      btnStartStore.addEventListener("click", () => {
        loader.classList.add("loaded");
        window.Sound.init();
        window.Sound.playGameStart();
        window.Sound.startBGM();
        handleScrollReveal(); // Trigger initial view check
      });
    }
  }

  requestAnimationFrame(animate);
}

// --- 2. SINGLE CURSOR TRACKING (NO TRAILS) ---
const cursorContainer = document.getElementById("cursor");
const pointerContainer = document.getElementById("pointer");

window.addEventListener("mousemove", (e) => {
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  // Directly position cursor containers
  cursorContainer.style.left = `${mouseX}px`;
  cursorContainer.style.top = `${mouseY}px`;
  pointerContainer.style.left = `${mouseX}px`;
  pointerContainer.style.top = `${mouseY}px`;

  // Show cursor
  if (cursorContainer.style.display !== "block" && pointerContainer.style.display !== "block") {
    cursorContainer.style.display = "block";
  }
});

function setupCursorHovers() {
  const interactiveEls = document.querySelectorAll("a, button, input, textarea, .figma-radio-label, .window-close-btn");

  interactiveEls.forEach(el => {
    el.addEventListener("mouseenter", () => {
      cursorContainer.style.display = "none";
      pointerContainer.style.display = "block";
    });
    el.addEventListener("mouseleave", () => {
      cursorContainer.style.display = "block";
      pointerContainer.style.display = "none";
    });
  });
}

// --- 3. SCROLL-BASED SCORE & REVEALS ---
function updateScoreDisplay() {
  state.totalScore = state.scrollScore + state.interactiveScore;
  scoreEl.textContent = state.totalScore.toLocaleString();
}

window.addEventListener("scroll", () => {
  // Add score based on scroll position (12 points per pixel scrolled)
  state.scrollScore = Math.floor(window.scrollY * 12);
  updateScoreDisplay();
  handleScrollReveal();
});

// Viewport Intersection observer for scroll reveal triggers
function handleScrollReveal() {
  const revealElements = document.querySelectorAll(".scroll-reveal, .floating-window");
  revealElements.forEach(el => {
    const elementTop = el.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;
    // Reveal slightly before they fully enter the viewport
    if (elementTop < windowHeight - 80) {
      el.classList.add("active");
    }
  });
}

function addInteractiveScore(amount) {
  state.interactiveScore += amount;
  updateScoreDisplay();
  window.Sound.playCoin();
}

function loseLife(reasonHtml, isDinoGame = false) {
  state.lives--;
  window.Sound.playHit();
  updateHeartsDOM();

  if (isDinoGame) {
    window.Sound.playGameOver();
    const dinoKoOverlay = document.getElementById("dinoKoOverlay");
    if (dinoKoOverlay) {
      dinoKoOverlay.classList.add("active");
      state.gameActive = false;
      setTimeout(() => {
        dinoKoOverlay.classList.remove("active");
        resetDinoRun();
        if (state.lives <= 0) {
          koModalText.innerHTML = `
            <span class="bad-design">GAME OVER!</span>
            Skor akhir kamu: <strong>${state.totalScore.toLocaleString()}</strong>. Hati-hati dengan rintangan kaktus dan pilihan desainmu!
          `;
          koModalBtn.textContent = "Ulangi Game";
          koModal.classList.add("visible");
        }
      }, 2200);
    } else {
      resetDinoRun();
      if (state.lives <= 0) {
        koModalText.innerHTML = `
          <span class="bad-design">GAME OVER!</span>
          Skor akhir kamu: <strong>${state.totalScore.toLocaleString()}</strong>. Hati-hati dengan rintangan kaktus dan pilihan desainmu!
        `;
        koModalBtn.textContent = "Ulangi Game";
        koModal.classList.add("visible");
      }
    }
  } else {
    if (state.lives <= 0) {
      window.Sound.playGameOver();
      koModalText.innerHTML = `
        <span class="bad-design">GAME OVER!</span>
        Skor akhir kamu: <strong>${state.totalScore.toLocaleString()}</strong>. Hati-hati dengan rintangan kaktus dan pilihan desainmu!
      `;
      koModalBtn.textContent = "Ulangi Game";
      koModal.classList.add("visible");
      state.gameActive = false;
    } else {
      // Lose a life warning
      koModalText.innerHTML = reasonHtml;
      koModalBtn.textContent = "Lanjutkan";
      koModal.classList.add("visible");
      state.gameActive = false;
    }
  }
}

function updateHeartsDOM() {
  scoreHeartsEl.innerHTML = "";
  for (let i = 0; i < state.lives; i++) {
    const heart = document.createElement("img");
    heart.src = "https://cdn.prod.website-files.com/6372430429fe8ce1b14c1fa8/63724c18d186156051a5f7f2_heart.svg";
    scoreHeartsEl.appendChild(heart);
  }
  if (state.lives <= 0) {
    scoreHeartsEl.innerHTML = "<span style='color: red;'>FOR REAL?</span>";
  }
}

function resetDinoRun() {
  tRex = new TRexDino();
  cacti = [];
  dinoSpeed = 6;
  spawnTimer = 0;
  state.gameStarted = false;
  state.gameActive = false;
}

function resetGame() {
  state.scrollScore = 0;
  state.interactiveScore = 0;
  state.lives = 3;
  state.fontsInteracted = { aeonik: false, helvetica: false };
  updateScoreDisplay();
  updateHeartsDOM();
  koModal.classList.remove("visible");

  window.Sound.playGameStart();
  startDinoGame();
}

// --- 4. PURIKURA CARD DECORATOR & PHOTO BOOTH ---
function setupPurikuraGame() {
  const purikuraVideo = document.getElementById("purikuraVideo");
  const purikuraPhoto = document.getElementById("purikuraPhoto");
  const btnToggleCamera = document.getElementById("btnToggleCamera");
  const btnCapturePhoto = document.getElementById("btnCapturePhoto");
  const btnRestartPhoto = document.getElementById("btnRestartPhoto");

  const fileUploadInput = document.getElementById("fileUploadInput");
  const btnUploadProxy = document.getElementById("btnUploadProxy");

  const filterButtons = document.querySelectorAll("#filterButtonsGrid .btn-sticker");

  const chkToggleTextOverlay = document.getElementById("chkToggleTextOverlay");
  const txtCustomOverlayText = document.getElementById("txtCustomOverlayText");
  const purikuraTextOverlay = document.getElementById("purikuraTextOverlay");

  const radioAeonik = document.getElementById("radio-aeonik");
  const radioHelvetica = document.getElementById("radio-helvetica");
  const radioComic = document.getElementById("radio-comic");

  const labelAeonik = document.getElementById("label-aeonik");
  const labelHelvetica = document.getElementById("label-helvetica");
  const labelComic = document.getElementById("label-comic");

  const purikuraScreen = document.getElementById("purikuraScreen");
  const btnClearStickers = document.getElementById("btnClearStickers");
  const btnDownloadPurikura = document.getElementById("btnDownloadPurikura");
  const stickerButtons = document.querySelectorAll(".btn-sticker[data-sticker]");

  let videoStream = null;
  let activeFilter = "normal";
  let activeFont = "kawaii";

  const moodTexts = {
    kawaii: "ニコニコ! 💕✨",
    romantis: "ドキドキ... 💖",
    tsundere: "ツンデレ! 💢"
  };

  // Initial setup
  txtCustomOverlayText.value = moodTexts.kawaii;
  purikuraTextOverlay.textContent = moodTexts.kawaii;
  purikuraTextOverlay.className = "placed-text-overlay font-kawaii";

  function updateRadioLabels() {
    labelAeonik.classList.toggle("active", radioAeonik.checked);
    labelHelvetica.classList.toggle("active", radioHelvetica.checked);
    labelComic.classList.toggle("active", radioComic.checked);
  }
  updateRadioLabels();

  // Mood style radio events
  radioAeonik.addEventListener("change", () => {
    if (radioAeonik.checked) {
      activeFont = "kawaii";
      purikuraTextOverlay.className = "placed-text-overlay font-kawaii";
      if (!txtCustomOverlayText.value.trim() || Object.values(moodTexts).includes(txtCustomOverlayText.value)) {
        txtCustomOverlayText.value = moodTexts.kawaii;
        purikuraTextOverlay.textContent = moodTexts.kawaii;
      }
      updateRadioLabels();
      addInteractiveScore(50);
    }
  });

  radioHelvetica.addEventListener("change", () => {
    if (radioHelvetica.checked) {
      activeFont = "romantis";
      purikuraTextOverlay.className = "placed-text-overlay font-romantis";
      if (!txtCustomOverlayText.value.trim() || Object.values(moodTexts).includes(txtCustomOverlayText.value)) {
        txtCustomOverlayText.value = moodTexts.romantis;
        purikuraTextOverlay.textContent = moodTexts.romantis;
      }
      updateRadioLabels();
      addInteractiveScore(50);
    }
  });

  radioComic.addEventListener("change", () => {
    if (radioComic.checked) {
      activeFont = "tsundere";
      purikuraTextOverlay.className = "placed-text-overlay font-tsundere";
      if (!txtCustomOverlayText.value.trim() || Object.values(moodTexts).includes(txtCustomOverlayText.value)) {
        txtCustomOverlayText.value = moodTexts.tsundere;
        purikuraTextOverlay.textContent = moodTexts.tsundere;
      }
      updateRadioLabels();
      addInteractiveScore(50);
    }
  });

  // Custom text input syncing
  txtCustomOverlayText.addEventListener("input", () => {
    purikuraTextOverlay.textContent = txtCustomOverlayText.value;
  });

  // Toggle overlay visibility
  chkToggleTextOverlay.addEventListener("change", () => {
    purikuraTextOverlay.style.display = chkToggleTextOverlay.checked ? "block" : "none";
  });

  // Webcam stream handlers
  btnToggleCamera.addEventListener("click", () => {
    if (videoStream) {
      // Turn off camera
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
      purikuraVideo.style.display = "none";
      purikuraPhoto.style.display = "block";
      btnToggleCamera.textContent = "📸 KAMERA";
      btnCapturePhoto.disabled = true;
      window.Sound.playClose();
    } else {
      // Start camera feed
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }).then(stream => {
        videoStream = stream;
        purikuraVideo.srcObject = stream;
        purikuraVideo.style.display = "block";
        purikuraPhoto.style.display = "none";
        btnToggleCamera.textContent = "❌ MATIKAN";
        btnCapturePhoto.disabled = false;
        window.Sound.playClick();
        showRetroToast("📸 KAMERA AKTIF! Klik JEPRET untuk mengambil foto.");
      }).catch(err => {
        console.error("Gagal membuka webcam: ", err);
        showRetroToast("❌ GAGAL MEMBUKA KAMERA! Gunakan tombol Unggah Foto.");
      });
    }
  });

  // Cache original photo src
  state.originalPhotoSrc = purikuraPhoto.src;

  // Snapshot photo capture
  btnCapturePhoto.addEventListener("click", () => {
    if (!videoStream) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = purikuraVideo.videoWidth || 640;
    tempCanvas.height = purikuraVideo.videoHeight || 480;

    const ctx = tempCanvas.getContext("2d");
    ctx.drawImage(purikuraVideo, 0, 0, tempCanvas.width, tempCanvas.height);

    // Load captured stream into background photo
    purikuraPhoto.src = tempCanvas.toDataURL("image/png");
    state.originalPhotoSrc = purikuraPhoto.src;

    // Reset filters visual state
    activeFilter = "normal";
    purikuraPhoto.className = "purikura-bg-photo filter-normal";
    filterButtons.forEach(b => {
      b.classList.toggle("active-filter", b.getAttribute("data-filter") === "normal");
    });

    // Stop stream
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
    purikuraVideo.style.display = "none";
    purikuraPhoto.style.display = "block";
    btnToggleCamera.textContent = "📸 KAMERA";
    btnCapturePhoto.disabled = true;

    // Reward & SFX
    window.Sound.playCoin();
    addInteractiveScore(150);
    showRetroToast("⚡ JEPETAN SELESAI! Silakan edit teks & tempel stiker.");
  });

  // Proxy file uploader button
  btnUploadProxy.addEventListener("click", () => {
    fileUploadInput.click();
  });

  fileUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      purikuraPhoto.src = event.target.result;
      state.originalPhotoSrc = purikuraPhoto.src;

      // Reset filters visual state
      activeFilter = "normal";
      purikuraPhoto.className = "purikura-bg-photo filter-normal";
      filterButtons.forEach(b => {
        b.classList.toggle("active-filter", b.getAttribute("data-filter") === "normal");
      });

      // Stop video if it's active
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        purikuraVideo.style.display = "none";
        purikuraPhoto.style.display = "block";
        btnToggleCamera.textContent = "📸 KAMERA";
        btnCapturePhoto.disabled = true;
      }

      window.Sound.playCoin();
      addInteractiveScore(100);
      showRetroToast("📤 FOTO BERHASIL DIUNGGAH!");
    };
    reader.readAsDataURL(file);
  });

  // Reset/Restart photo event
  if (btnRestartPhoto) {
    btnRestartPhoto.addEventListener("click", () => {
      // Stop webcam stream if active
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
      }

      // Reset UI elements to default halftone dot placeholder
      purikuraVideo.style.display = "none";
      purikuraPhoto.style.display = "block";
      purikuraPhoto.src = "https://cdn.prod.website-files.com/6372430429fe8ce1b14c1fa8/63bc260a92d847b2c95e54d6_halftone-dot.png";
      state.originalPhotoSrc = purikuraPhoto.src;

      // Reset filters visual state
      activeFilter = "normal";
      purikuraPhoto.className = "purikura-bg-photo filter-normal";
      filterButtons.forEach(b => {
        b.classList.toggle("active-filter", b.getAttribute("data-filter") === "normal");
      });

      // Reset button states
      btnToggleCamera.textContent = "📸 KAMERA";
      btnCapturePhoto.disabled = true;

      // Clear file upload input value
      fileUploadInput.value = "";

      // Play audio & show notification
      window.Sound.playClose();
      showRetroToast("🔄 FOTO BERHASIL DI-RESET!");
    });
  }

  // Helper to pixelate image in JS canvas
  function pixelatePhotoAction(srcDataUrl, pixelSize = 12) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.naturalWidth || img.width || 640;
      canvas.height = img.naturalHeight || img.height || 480;

      const w = Math.ceil(canvas.width / pixelSize);
      const h = Math.ceil(canvas.height / pixelSize);

      // Downscale
      const smallCanvas = document.createElement("canvas");
      smallCanvas.width = w;
      smallCanvas.height = h;
      const smallCtx = smallCanvas.getContext("2d");
      smallCtx.drawImage(img, 0, 0, w, h);

      // Upscale crisp
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.drawImage(smallCanvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);

      purikuraPhoto.src = canvas.toDataURL("image/png");
    };
    img.src = srcDataUrl;
  }

  // Photo filter swapper
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.getAttribute("data-filter");
      activeFilter = filter;

      if (!state.originalPhotoSrc) {
        state.originalPhotoSrc = purikuraPhoto.src;
      }

      if (filter !== "pixel") {
        purikuraPhoto.src = state.originalPhotoSrc;
        purikuraPhoto.className = `purikura-bg-photo filter-${filter}`;
      } else {
        pixelatePhotoAction(state.originalPhotoSrc, 12);
        purikuraPhoto.className = `purikura-bg-photo filter-normal`;
      }

      // Sync buttons visual active-filter state
      filterButtons.forEach(b => b.classList.remove("active-filter"));
      btn.classList.add("active-filter");

      window.Sound.playClick();
      addInteractiveScore(50);
      showRetroToast(`🎨 FILTER DIUBAH: ${filter.toUpperCase()}`);
    });
  });

  // Frames selection & Locked Frames purchases
  const frameButtons = document.querySelectorAll("#frameButtonsGrid .btn-frame-choice");
  const purikuraFrameOverlay = document.getElementById("purikuraFrameOverlay");

  if (frameButtons && purikuraFrameOverlay) {
    frameButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const frame = btn.getAttribute("data-frame");
        const cost = parseInt(btn.getAttribute("data-cost") || "0");
        const itemId = `frame-${frame}`;

        // Buy locked frame
        if (btn.classList.contains("locked")) {
          if (state.tickets >= cost) {
            if (confirm(`Buka Bingkai "${frame.toUpperCase()}" seharga ${cost} Tiket?`)) {
              state.tickets -= cost;
              state.unlockedItems.push(itemId);
              btn.classList.remove("locked");
              updateTicketsDisplay();
              savePlaygroundState();
              window.Sound.playGameStart();
              showRetroToast(`🔓 BINGKAI ${frame.toUpperCase()} BERHASIL DIBUKA!`);
            } else {
              return;
            }
          } else {
            window.Sound.playBuzzer();
            showRetroToast(`❌ Tiket tidak cukup! Mainkan Dino Runner di footer untuk mengumpulkan ${cost} tiket.`);
            return;
          }
        }

        state.activeFrame = frame;
        purikuraFrameOverlay.className = `purikura-frame-overlay frame-${frame}`;

        // Sync active frame choices
        frameButtons.forEach(b => b.classList.remove("active-frame"));
        btn.classList.add("active-frame");

        window.Sound.playClick();
        addInteractiveScore(50);
        showRetroToast(`🖼️ BINGKAI DIUBAH: ${frame.toUpperCase()}`);
      });
    });
  }

  // Dragging event binder utility
  function makeDraggable(el) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    el.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = el.offsetLeft;
      initialTop = el.offsetTop;
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = `${initialLeft + dx}px`;
      el.style.top = `${initialTop + dy}px`;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Touch support for mobile devices
    el.addEventListener("touchstart", (e) => {
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      initialLeft = el.offsetLeft;
      initialTop = el.offsetTop;
    });

    window.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      el.style.left = `${initialLeft + dx}px`;
      el.style.top = `${initialTop + dy}px`;
    });

    window.addEventListener("touchend", () => {
      isDragging = false;
    });
  }

  // Bind initial draggable onto text overlay
  makeDraggable(purikuraTextOverlay);

  // Sticker Placement
  stickerButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const emoji = btn.getAttribute("data-sticker");
      const cost = parseInt(btn.getAttribute("data-cost") || "0");
      const itemId = `sticker-${emoji}`;

      // Buy locked sticker
      if (btn.classList.contains("locked")) {
        if (state.tickets >= cost) {
          if (confirm(`Buka Stiker "${emoji}" seharga ${cost} Tiket?`)) {
            state.tickets -= cost;
            state.unlockedItems.push(itemId);
            btn.classList.remove("locked");
            updateTicketsDisplay();
            savePlaygroundState();
            window.Sound.playGameStart();
            showRetroToast(`🔓 STIKER ${emoji} BERHASIL DIBUKA!`);
          } else {
            return;
          }
        } else {
          window.Sound.playBuzzer();
          showRetroToast(`❌ Tiket tidak cukup! Mainkan Dino Runner di footer untuk mengumpulkan ${cost} tiket.`);
          return;
        }
      }

      const sticker = document.createElement("span");
      sticker.className = "placed-sticker";
      sticker.textContent = emoji;

      // Random coordinates inside container
      const randomLeft = Math.floor(Math.random() * 65) + 10;
      const randomTop = Math.floor(Math.random() * 50) + 15;
      const randomRot = Math.floor(Math.random() * 60) - 30;

      sticker.style.left = `${randomLeft}%`;
      sticker.style.top = `${randomTop}%`;
      sticker.style.transform = `rotate(${randomRot}deg)`;

      purikuraScreen.appendChild(sticker);
      makeDraggable(sticker);

      window.Sound.playCoin();
      addInteractiveScore(100);
      showRetroToast(`✨ Tempel stiker ${emoji}! Seret stiker sesukamu.`);

      // Double click to delete
      sticker.addEventListener("dblclick", () => {
        sticker.remove();
        window.Sound.playClose();
        showRetroToast(`🗑️ Stiker dihapus!`);
      });
    });
  });

  // Clear all stickers
  if (btnClearStickers) {
    btnClearStickers.addEventListener("click", () => {
      const stickers = purikuraScreen.querySelectorAll(".placed-sticker");
      stickers.forEach(s => s.remove());
      window.Sound.playClose();
      showRetroToast("🧹 Semua stiker dibersihkan!");
    });
  }

  // Canvas Exporter assembler (Save As PNG)
  if (btnDownloadPurikura) {
    btnDownloadPurikura.addEventListener("click", () => {
      const canvas = document.createElement("canvas");
      canvas.width = purikuraScreen.clientWidth || 500;
      canvas.height = purikuraScreen.clientHeight || 350;
      const ctx = canvas.getContext("2d");

      // A. Draw background photo (with filters applied)
      if (activeFilter === "mono") {
        ctx.filter = "grayscale(1) contrast(1.15)";
      } else if (activeFilter === "pink") {
        ctx.filter = "sepia(0.2) hue-rotate(300deg) saturate(1.5) contrast(1.05)";
      } else if (activeFilter === "vintage") {
        ctx.filter = "sepia(0.75) contrast(1.1) brightness(0.95)";
      } else {
        ctx.filter = "none";
      }

      // Draw background image depending on active frame
      if (state.activeFrame === "polaroid") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Polaroid borders are 20px, bottom is 70px
        drawImageCover(ctx, purikuraPhoto, 20, 20, canvas.width - 40, canvas.height - 90);
      } else if (state.activeFrame === "ssr") {
        ctx.fillStyle = "#121212";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // SSR inset is 10px
        drawImageCover(ctx, purikuraPhoto, 10, 10, canvas.width - 20, canvas.height - 20);
      } else {
        drawImageCover(ctx, purikuraPhoto, 0, 0, canvas.width, canvas.height);
      }

      ctx.filter = "none"; // reset filter

      // B. Draw frame graphics overlay on top of photo
      if (state.activeFrame === "polaroid") {
        ctx.fillStyle = "#ff007f";
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("IMAJIKO PRINT CLUB 🌸", canvas.width / 2, canvas.height - 25);
      } else if (state.activeFrame === "arcade") {
        // Draw thick dark border
        ctx.lineWidth = 30;
        ctx.strokeStyle = "#1a1a1a";
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Draw glowing inner lines
        ctx.strokeStyle = "#ff007f";
        ctx.lineWidth = 4;
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

        // Title Text
        ctx.fillStyle = "#00f0ff";
        ctx.font = "7px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("LEVEL UP EVENT 🕹️", canvas.width / 2, 35);
      } else if (state.activeFrame === "ssr") {
        // Draw double golden borders
        ctx.strokeStyle = "#ffd13b";
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

        // SSR badge
        ctx.fillStyle = "#ffd13b";
        ctx.fillRect(16, 16, 40, 18);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.strokeRect(16, 16, 40, 18);

        ctx.fillStyle = "#000000";
        ctx.font = "bold 8px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("SSR", 16 + 20, 16 + 12);

        // Holographic sheen lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.moveTo(-100, 0); ctx.lineTo(canvas.width, canvas.height + 100);
        ctx.moveTo(-30, 0); ctx.lineTo(canvas.width + 70, canvas.height + 70);
        ctx.moveTo(30, 0); ctx.lineTo(canvas.width + 130, canvas.height + 70);
        ctx.stroke();

        // Stats text
        ctx.fillStyle = "#ffd13b";
        ctx.font = "6px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("DESIGN: 99  VIBES: 99  RARITY: SSR", canvas.width / 2, canvas.height - 25);
      }

      // B. Draw custom text overlay bubble
      if (chkToggleTextOverlay.checked && txtCustomOverlayText.value.trim()) {
        const textStr = txtCustomOverlayText.value.trim();
        const left = purikuraTextOverlay.offsetLeft;
        const top = purikuraTextOverlay.offsetTop;
        const width = purikuraTextOverlay.offsetWidth;
        const height = purikuraTextOverlay.offsetHeight;

        ctx.save();

        // Translate to center of text block and rotate -6 degrees (matching CSS)
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(-6 * Math.PI / 180);

        // Draw bubble rectangle background (no border stroke!)
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.roundRect(-width / 2, -height / 2, width, height, 8);
        ctx.fill();

        // Configure font styles matching sfxMap exactly
        let fontStr = "22px 'Press Start 2P', monospace";
        let lineHeight = 28;
        let textColor = "#ff007f";

        if (activeFont === "kawaii") {
          textColor = "#ff007f"; // Neon Pink
        } else if (activeFont === "romantis") {
          textColor = "#8257e5"; // Neon Purple
        } else {
          textColor = "#e2e77d"; // MakeReign Yellow
        }

        ctx.font = fontStr;

        // Wrap text to fit inside the bubble box width (accounting for padding)
        const paddingX = 32;
        const maxWidth = width - paddingX;
        const lines = [];
        const paragraphs = textStr.split("\n");

        paragraphs.forEach(p => {
          const words = p.split(" ");
          let currentLine = words[0] || "";
          for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + " " + word;
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth <= maxWidth) {
              currentLine = testLine;
            } else {
              lines.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) {
            lines.push(currentLine);
          }
        });

        // Vertical centering relative to the translated origin (0, 0)
        const totalTextHeight = lines.length * lineHeight;
        let startY = -totalTextHeight / 2;

        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        lines.forEach((line, index) => {
          const x = 0;
          const y = startY + index * lineHeight;

          // 1. Draw flat brutalist black shadow (offset +4px, +4px)
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(line, x + 4, y + 4);
          ctx.fillStyle = "#000000";
          ctx.fillText(line, x + 4, y + 4);

          // 2. Draw thick black outline for main text
          ctx.lineWidth = 3;
          ctx.strokeText(line, x, y);

          // 3. Draw colored main text fill
          ctx.fillStyle = textColor;
          ctx.fillText(line, x, y);
        });

        ctx.restore();
      }

      // C. Draw placed stickers
      const stickers = purikuraScreen.querySelectorAll(".placed-sticker");
      stickers.forEach(s => {
        const text = s.textContent;
        const left = s.offsetLeft;
        const top = s.offsetTop;
        const width = s.offsetWidth || 32;
        const height = s.offsetHeight || 32;

        ctx.font = "32px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Parse rotation value
        let rotVal = 0;
        if (s.style.transform && s.style.transform.includes("rotate")) {
          const match = s.style.transform.match(/rotate\(([-\d]+)deg\)/);
          if (match) rotVal = (parseInt(match[1]) * Math.PI) / 180;
        }

        ctx.save();
        // Translate to center of sticker stamp
        ctx.translate(left + width / 2, top + height / 2);
        ctx.rotate(rotVal);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      });

      // D. Trigger client-side download PNG file
      const link = document.createElement("a");
      link.download = "purikura_card.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      // Rewards
      window.Sound.playCoin();
      addInteractiveScore(300);
      showRetroToast("💾 FOTO PURIKURA BERHASIL DIUNDUH! Bagikan ke TikTok kamu.");
    });
  }
}

// --- 5. CLASSIC GOOGLE DINO GAME (FOOTER) ---
const dinoCanvas = document.getElementById("dinoCanvas");
const dinoCtx = dinoCanvas.getContext("2d");
const dinoStartOverlay = document.getElementById("dinoStartOverlay");
const btnStartDino = document.getElementById("btnStartDino");

let dinoAnimationId;
let tRex;
let cacti = [];
let dinoSpeed = 6;
let spawnTimer = 0;
let isFooterVisible = false;
let groundX = 0;

// Preload original Chrome Dino spritesheet
const dinoSpriteSheet = new Image();
dinoSpriteSheet.crossOrigin = "anonymous";
dinoSpriteSheet.src = "https://raw.githubusercontent.com/wayou/t-rex-runner/master/assets/default_200_percent/offline-sprite-2x.png";
let isSpriteSheetLoaded = false;
dinoSpriteSheet.onload = () => {
  isSpriteSheetLoaded = true;
};

function resizeDinoCanvas() {
  dinoCanvas.width = dinoCanvas.parentElement.clientWidth;
  dinoCanvas.height = 180;
}
window.addEventListener("resize", resizeDinoCanvas);

class TRexDino {
  constructor() {
    this.width = 44;
    this.height = 47;
    this.x = 50;
    this.y = 100;
    this.vy = 0;
    this.gravity = 0.7;
    this.jumpForce = -11;
    this.isGrounded = false;
    this.crashed = false;
    this.animFrame = 0;
  }

  jump() {
    if (this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      window.Sound.playJump();
    }
  }

  update() {
    this.vy += this.gravity;
    this.y += this.vy;

    const groundY = dinoCanvas.height - 30 - this.height;
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.isGrounded = true;
    }

    if (this.isGrounded && state.gameActive) {
      this.animFrame = Math.floor(Date.now() / 100) % 2;
    }
  }

  draw() {
    if (isSpriteSheetLoaded) {
      if (this.crashed) {
        dinoCtx.drawImage(dinoSpriteSheet, 2030, 2, 88, 94, this.x, this.y, this.width, this.height);
      } else if (!this.isGrounded) {
        dinoCtx.drawImage(dinoSpriteSheet, 1678, 2, 88, 94, this.x, this.y, this.width, this.height);
      } else {
        const frameX = this.animFrame === 0 ? 1854 : 1942;
        dinoCtx.drawImage(dinoSpriteSheet, frameX, 2, 88, 94, this.x, this.y, this.width, this.height);
      }
    } else {
      dinoCtx.fillStyle = "#535353"; // Classic grey T-Rex
      // Head
      dinoCtx.fillRect(this.x + 22, this.y, 22, 17);
      dinoCtx.clearRect(this.x + 28, this.y + 4, 4, 4); // Eye
      // Body / neck
      dinoCtx.fillRect(this.x + 14, this.y + 17, 22, 17);
      dinoCtx.fillRect(this.x, this.y + 20, 14, 11); // Tail
      dinoCtx.fillRect(this.x + 36, this.y + 20, 6, 3); // Arm
      // Legs
      if (this.isGrounded && this.animFrame === 0) {
        dinoCtx.fillRect(this.x + 14, this.y + 34, 6, 13);
        dinoCtx.fillRect(this.x + 26, this.y + 34, 6, 8);
      } else if (this.isGrounded && this.animFrame === 1) {
        dinoCtx.fillRect(this.x + 14, this.y + 34, 6, 8);
        dinoCtx.fillRect(this.x + 26, this.y + 34, 6, 13);
      } else {
        dinoCtx.fillRect(this.x + 14, this.y + 34, 6, 13);
        dinoCtx.fillRect(this.x + 26, this.y + 34, 6, 13);
      }
    }
  }
}

class CactusObstacle {
  constructor() {
    this.type = Math.random() > 0.5 ? "large" : "small";
    if (this.type === "small") {
      this.width = 17;
      this.height = 35;
      this.spriteX = 446;
      this.spriteY = 2;
      this.spriteW = 34;
      this.spriteH = 70;
    } else {
      this.width = 25;
      this.height = 50;
      this.spriteX = 652;
      this.spriteY = 2;
      this.spriteW = 50;
      this.spriteH = 100;
    }
    this.x = dinoCanvas.width;
    this.y = dinoCanvas.height - 30 - this.height;
  }

  update() {
    this.x -= dinoSpeed;
  }

  draw() {
    if (isSpriteSheetLoaded) {
      dinoCtx.drawImage(
        dinoSpriteSheet,
        this.spriteX,
        this.spriteY,
        this.spriteW,
        this.spriteH,
        this.x,
        this.y,
        this.width,
        this.height
      );
    } else {
      dinoCtx.fillStyle = "#535353"; // Classic Grey
      dinoCtx.fillRect(this.x + this.width / 2 - 3, this.y, 6, this.height);
      dinoCtx.fillRect(this.x, this.y + 10, this.width, 5);
      dinoCtx.fillRect(this.x, this.y + 5, 4, 6);
      dinoCtx.fillRect(this.x + this.width - 4, this.y + 7, 4, 6);
    }
  }
}

function startDinoGame() {
  resizeDinoCanvas();
  tRex = new TRexDino();
  cacti = [];
  dinoSpeed = 6;
  spawnTimer = 0;
  state.gameActive = true;
  state.gameStarted = true;

  if (dinoAnimationId) cancelAnimationFrame(dinoAnimationId);
  animateDino();
}

function drawDinoStartScreen() {
  if (!tRex) {
    tRex = new TRexDino();
  }
  tRex.crashed = false; // Reset crashed state
  dinoCtx.clearRect(0, 0, dinoCanvas.width, dinoCanvas.height);

  // Draw Ground
  if (isSpriteSheetLoaded) {
    dinoCtx.drawImage(dinoSpriteSheet, 2, 104, 2400, 24, 0, dinoCanvas.height - 38, 1200, 12);
  } else {
    dinoCtx.strokeStyle = "#535353";
    dinoCtx.lineWidth = 2;
    dinoCtx.beginPath();
    dinoCtx.moveTo(0, dinoCanvas.height - 30);
    dinoCtx.lineTo(dinoCanvas.width, dinoCanvas.height - 30);
    dinoCtx.stroke();
  }

  // Draw Dino standing
  tRex.draw();

  // Flashing prompt text: show/hide every 600ms
  if (Math.floor(Date.now() / 600) % 2 === 0) {
    dinoCtx.fillStyle = "#535353";
    dinoCtx.font = "10px 'Press Start 2P', monospace";
    dinoCtx.textAlign = "center";
    dinoCtx.fillText("TEKAN SPASI / TAP UNTUK BERMAIN", dinoCanvas.width / 2, dinoCanvas.height / 2 - 20);
  }
}

function animateDino() {
  if (!isFooterVisible) return;

  if (!state.gameStarted) {
    drawDinoStartScreen();
    dinoAnimationId = requestAnimationFrame(animateDino);
    return;
  }

  if (!state.gameActive) {
    // Game is paused (warning modal open)
    dinoAnimationId = requestAnimationFrame(animateDino);
    return;
  }

  dinoCtx.clearRect(0, 0, dinoCanvas.width, dinoCanvas.height); // Transparent frame

  // Scroll and draw Ground
  groundX -= dinoSpeed;
  if (groundX <= -1200) {
    groundX = 0;
  }

  if (isSpriteSheetLoaded) {
    dinoCtx.drawImage(dinoSpriteSheet, 2, 104, 2400, 24, groundX, dinoCanvas.height - 38, 1200, 12);
    dinoCtx.drawImage(dinoSpriteSheet, 2, 104, 2400, 24, groundX + 1200, dinoCanvas.height - 38, 1200, 12);
  } else {
    dinoCtx.strokeStyle = "#535353"; // Grey line
    dinoCtx.lineWidth = 2;
    dinoCtx.beginPath();
    dinoCtx.moveTo(0, dinoCanvas.height - 30);
    dinoCtx.lineTo(dinoCanvas.width, dinoCanvas.height - 30);
    dinoCtx.stroke();
  }

  // Update Dino
  tRex.update();
  tRex.draw();

  // Obstacles logic
  spawnTimer++;
  if (spawnTimer > 90 + Math.random() * 60) {
    cacti.push(new CactusObstacle());
    spawnTimer = 0;
  }

  for (let i = cacti.length - 1; i >= 0; i--) {
    const cactus = cacti[i];
    cactus.update();
    cactus.draw();

    // Check Collision
    if (
      tRex.x < cactus.x + cactus.width &&
      tRex.x + tRex.width > cactus.x &&
      tRex.y < cactus.y + cactus.height &&
      tRex.y + tRex.height > cactus.y
    ) {
      tRex.crashed = true;
      loseLife(`
        <span class="bad-design">GAME OVER - KAMU MENABRAK KAKTUS!</span>
        T-Rex menabrak rintangan kaktus saat berlari. Nyawa kamu berkurang 1.
      `, true);
      return;
    }

    if (cactus.x < -50) {
      cacti.splice(i, 1);
      addInteractiveScore(100); // Reward for dodging cactus!
      state.tickets += 10;
      updateTicketsDisplay();
      savePlaygroundState();
    }
  }

  dinoAnimationId = requestAnimationFrame(animateDino);
}

// Global key events for jump/start
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    // Exceptions for typing in text inputs/textareas
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT")) {
      return; // Let standard typing happen
    }

    if (isFooterVisible) {
      e.preventDefault();
      if (!state.gameStarted) {
        startDinoGame();
      } else if (state.gameActive) {
        tRex.jump();
      }
    }
  }
});

dinoCanvas.addEventListener("touchstart", (e) => {
  if (isFooterVisible) {
    e.preventDefault();
    if (!state.gameStarted) {
      startDinoGame();
    } else if (state.gameActive) {
      tRex.jump();
    }
  }
}, { passive: false });

dinoCanvas.addEventListener("mousedown", () => {
  if (isFooterVisible) {
    if (!state.gameStarted) {
      startDinoGame();
    } else if (state.gameActive) {
      tRex.jump();
    }
  }
});

function setupDinoAutoStart() {
  const footerEl = document.querySelector(".section.footer");
  if (!footerEl) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isFooterVisible = entry.isIntersecting;
      if (isFooterVisible) {
        if (state.gameStarted && !koModal.classList.contains("visible")) {
          state.gameActive = true;
        }
        if (!dinoAnimationId) {
          animateDino();
        }
      } else {
        state.gameActive = false;
        if (dinoAnimationId) {
          cancelAnimationFrame(dinoAnimationId);
          dinoAnimationId = null;
        }
      }
    });
  }, { threshold: 0.1 });

  observer.observe(footerEl);
}

// Helper to draw image mimicking CSS object-fit: cover
function drawImageCover(ctx, img, x, y, w, h) {
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;
  if (!imgWidth || !imgHeight) return;

  const imgRatio = imgWidth / imgHeight;
  const targetRatio = w / h;

  let sx, sy, sw, sh;

  if (imgRatio > targetRatio) {
    // Image is wider than target area - crop horizontal sides
    sh = imgHeight;
    sw = imgHeight * targetRatio;
    sx = (imgWidth - sw) / 2;
    sy = 0;
  } else {
    // Image is taller than target area - crop vertical top/bottom
    sw = imgWidth;
    sh = imgWidth / targetRatio;
    sx = 0;
    sy = (imgHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Retro toast notification system
function showRetroToast(message) {
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "30px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.backgroundColor = "var(--color-text-light)";
  toast.style.color = "var(--color-text-dark)";
  toast.style.border = "var(--border-thick)";
  toast.style.boxShadow = "6px 6px 0px #000";
  toast.style.padding = "15px 25px";
  toast.style.fontFamily = "var(--font-pixel)";
  toast.style.fontSize = "0.7rem";
  toast.style.zIndex = "9999";
  toast.style.textAlign = "center";
  toast.innerHTML = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Bind clipboard copy actions for new dynamic catalog buttons
function bindDynamicCatalogEvents() {
  const btnCopyPromoLink = document.getElementById("btnCopyPromoLink");
  if (btnCopyPromoLink) {
    btnCopyPromoLink.addEventListener("click", () => {
      const shareText = `Yuk beli template website ucapan keren (Ulang Tahun, Wisuda, Anniversary) di Imajiko Store! Desain premium & harga bersahabat. Kunjungi: ${window.location.href}`;

      navigator.clipboard.writeText(shareText).then(() => {
        addInteractiveScore(200);
        showRetroToast("🔗 LINK PROMOSI DISALIN!<br>Sebarkan ke TikTok atau WA untuk membantu kami!");
      }).catch(err => {
        console.error("Gagal menyalin link: ", err);
      });
    });
  }

  // Play a mock video click effect on TikTok card
  const playBtn = document.querySelector(".tiktok-play-btn");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      window.Sound.playCoin();
      addInteractiveScore(100);
      showRetroToast("▶ VIDEO PREVIEW DIMULAI!<br>Membuka demo visual TikTok...");
      setTimeout(() => {
        window.open("https://tiktok.com/@imajiko.store", "_blank");
      }, 1000);
    });
  }
}

// --- 6. CATALOG POPULATION ---
function isStoreActive() {
  const loader = document.getElementById("loader");
  const collectOverlay = document.getElementById("collectInitOverlay");
  if (loader && !loader.classList.contains("loaded")) return false;
  if (collectOverlay && !collectOverlay.classList.contains("hidden")) return false;
  return true;
}

function initCatalog() {
  const brutalistGrid = document.getElementById("brutalistGrid");
  if (!brutalistGrid) return;
  brutalistGrid.innerHTML = "";

  // A. RIRI_SAMA (Sakura Theme)
  const card1 = document.createElement("div");
  card1.className = "stationery-card sakura-theme scroll-reveal";
  card1.innerHTML = `
    <div class="washi-tape-header">
      <span>🌸 RIRI_SAMA (りり様)</span>
      <button class="window-close-btn">X</button>
    </div>
    <div class="stationery-body">
      <div class="feedback-note">
        <div class="feedback-author">
          <span>@riri.amalia</span>
          <span>🎂 ULANG TAHUN</span>
        </div>
        <div class="feedback-text">"Sumpah lilin digitalnya bisa ditiup beneran! Pacar aku seneng bgt pas denger lagu & liat balon terbang. Makasih Imajiko!"</div>
      </div>
      <div class="feedback-note">
        <div class="feedback-author">
          <span>@fauzan.ramadhan</span>
          <span>🌙 LEBARAN</span>
        </div>
        <div class="feedback-text">"Lebaran card pixel art kuil pagoda Jepang & takbiran chiptune epic banget! Keluarga kaget pas buka link."</div>
      </div>
      <div class="japan-seal">祝</div>
    </div>
  `;
  brutalistGrid.appendChild(card1);

  // B. PUTRI_SAMA (Yuzu Theme)
  const card2 = document.createElement("div");
  card2.className = "stationery-card yuzu-theme scroll-reveal";
  card2.innerHTML = `
    <div class="washi-tape-header">
      <span>🍡 PUTRI_SAMA (ぷとり様)</span>
      <button class="window-close-btn">X</button>
    </div>
    <div class="stationery-body">
      <div class="feedback-note">
        <div class="feedback-author">
          <span>@putri.annisa</span>
          <span>💖 ANNIVERSARY</span>
        </div>
        <div class="feedback-text">"Penghitung waktu mundurnya bikin merinding romantis bgt. Amplop surat cintanya jg unik bgt bisa dibuka."</div>
      </div>
      <div class="feedback-note">
        <div class="feedback-author">
          <span>@clara.sartika</span>
          <span>🎄 NATAL</span>
        </div>
        <div class="feedback-text">"Efek salju neonnya cantik banget. Lagunya juga auto-play. Sangat ngebantu buat kado natal low-budget tapi premium!"</div>
      </div>
      <div class="japan-seal">良</div>
    </div>
  `;
  brutalistGrid.appendChild(card2);

  // C. DAVE_SAMA (Matcha Theme)
  const card3 = document.createElement("div");
  card3.className = "stationery-card matcha-theme scroll-reveal";
  card3.innerHTML = `
    <div class="washi-tape-header">
      <span>⛩️ DAVE_SAMA (だべ様)</span>
      <button class="window-close-btn">X</button>
    </div>
    <div class="stationery-body">
      <div class="feedback-note">
        <div class="feedback-author">
          <span>@dave.pratama</span>
          <span>🎓 WISUDA</span>
        </div>
        <div class="feedback-text">"Toga terbangnya seru bgt di layar. Scrapbook foto kuliah temen-temen jadi keliatan makin estetik dan keren. Arigatou!"</div>
      </div>
      <div class="feedback-note">
        <div class="feedback-author">
          <span>@haruto.kun</span>
          <span>👘 HARAJUKU</span>
        </div>
        <div class="feedback-text">"Street fashion pixel art wisudanya detail banget! Serasa lulus di Jepang beneran."</div>
      </div>
      <div class="japan-seal">感</div>
    </div>
  `;
  brutalistGrid.appendChild(card3);

  // D. TIKTOK_PROMO (Soda Theme)
  const tiktokCard = document.createElement("div");
  tiktokCard.className = "stationery-card soda-theme scroll-reveal";
  tiktokCard.innerHTML = `
    <div class="washi-tape-header">
      <span>🎮 TIKTOK_KAWAII (ティックトック)</span>
      <button class="window-close-btn">X</button>
    </div>
    <div class="stationery-body">
      <div class="tiktok-frame">
        <div class="tiktok-video-mockup">
          <button class="tiktok-play-btn">▶</button>
        </div>
        <div class="tiktok-info">@imajiko.store • Lihat video demo & tren terupdate di TikTok kami!</div>
      </div>
      <a href="https://tiktok.com/@imajiko.store" target="_blank" class="tiktok-action-btn">KUNJUNGI TIKTOK</a>
      <button id="btnCopyPromoLink" class="tiktok-action-btn" style="background-color: var(--color-bg-dark); margin-top: 5px;">🔗 SALIN LINK PROMOSI</button>
      <div class="japan-seal">極</div>
    </div>
  `;
  brutalistGrid.appendChild(tiktokCard);

  // Global listener for closing windows and stationery cards
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("window-close-btn")) {
      const windowEl = e.target.closest(".stationery-card") || e.target.closest(".floating-window");
      if (windowEl) {
        windowEl.style.display = "none";
        if (isStoreActive()) {
          window.Sound.playClose();
        }
      }
    }
  });

  setupCursorHovers();
  bindDynamicCatalogEvents();
}

// --- 6b. CARDS DECK & PREVIEWS LOGIC ---

function initCard3DTilt() {
  const cardContainers = document.querySelectorAll(".card-container");
  cardContainers.forEach(container => {
    const inner = container.querySelector(".card-inner");
    const glare = container.querySelector(".card-glare");
    const holo = container.querySelector(".card-hologram");

    // Play chiptune blip on hover
    container.addEventListener("mouseenter", () => {
      if (isStoreActive() && !container.classList.contains("flipped")) {
        window.Sound.playHover();
      }
      inner.style.transition = "transform 0.1s ease";
    });

    container.addEventListener("mousemove", (e) => {
      if (container.classList.contains("flipped")) return;

      container.classList.add("hovered");
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const w = rect.width;
      const h = rect.height;

      const rotX = ((y / h) - 0.5) * -30;
      const rotY = ((x / w) - 0.5) * 30;

      const px = (x / w) * 100;
      const py = (y / h) * 100;

      inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.08)`;

      if (glare) {
        glare.style.setProperty("--glare-x", `${100 - px}%`);
        glare.style.setProperty("--glare-y", `${100 - py}%`);
      }
      if (holo) {
        holo.style.setProperty("--holo-x", `${px}%`);
        holo.style.setProperty("--holo-y", `${py}%`);
      }
    });

    container.addEventListener("mouseleave", () => {
      container.classList.remove("hovered");
      inner.style.transition = "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)";
      inner.style.transform = "";

      if (glare) {
        glare.style.setProperty("--glare-x", "50%");
        glare.style.setProperty("--glare-y", "50%");
      }
      if (holo) {
        holo.style.setProperty("--holo-x", "50%");
        holo.style.setProperty("--holo-y", "50%");
      }
    });

    // Card details modal popup handler
    container.addEventListener("click", (e) => {
      // Ignore clicks on target links or buttons
      if (e.target.closest(".btn-manga-buy") || e.target.closest(".btn-card-tiktok") || e.target.closest(".btn-flip-back")) {
        return;
      }

      // If modal is active, ignore
      const cardModal = document.getElementById("cardModal");
      if (cardModal && cardModal.classList.contains("active")) {
        return;
      }

      openCardModal(container);
    });
  });

  // Global listeners for details modal
  const cardModal = document.getElementById("cardModal");
  const cardModalContent = document.getElementById("cardModalContent");

  window.openCardModal = function (container) {
    const inner = container.querySelector(".card-inner");
    const cardBack = container.querySelector(".card-back");
    if (!cardBack || !inner || !cardModal || !cardModalContent) return;

    // Read category and set it on modal
    const category = container.getAttribute("data-category") || "birthday";
    cardModal.setAttribute("data-category", category);

    // Clone card back to avoid layout reflows on original parent grid item
    const cardBackClone = cardBack.cloneNode(true);
    cardBackClone.classList.add("in-modal");

    // Change btn-flip-back text inside clone to ✕
    const closeBtn = cardBackClone.querySelector(".btn-flip-back");
    if (closeBtn) closeBtn.textContent = "✕";

    cardModalContent.appendChild(cardBackClone);

    // Inject pulsating manga SFX overlay badge
    const sfxMap = {
      birthday: "ドドド!",
      anniversary: "ゴゴゴ...",
      graduation: "シャキーン!",
      festive: "ニコニコ!"
    };
    const sfxText = sfxMap[category] || "ゴゴゴ...";
    const sfxEl = document.createElement("div");
    sfxEl.className = "modal-sfx-text";
    sfxEl.textContent = sfxText;
    cardModalContent.appendChild(sfxEl);

    // Show modal overlay
    cardModal.classList.add("active");

    if (isStoreActive()) {
      window.Sound.playClick();
    }
  };

  window.closeCardModal = function () {
    if (!cardModal || !cardModalContent) return;

    // Clear contents of modal content container completely
    cardModalContent.innerHTML = "";
    cardModal.removeAttribute("data-category");

    // Hide modal overlay
    cardModal.classList.remove("active");

    if (isStoreActive()) {
      window.Sound.playClick();
    }
  };

  // Close when clicking the backdrop
  if (cardModal) {
    cardModal.addEventListener("click", (e) => {
      if (e.target === cardModal || e.target === cardModalContent) {
        closeCardModal();
      }
    });
  }

  // Esc keypress close
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cardModal && cardModal.classList.contains("active")) {
      closeCardModal();
    }
  });

  // Flip back buttons (close modal button) click handling globally
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-flip-back");
    if (btn) {
      e.stopPropagation();
      if (cardModal && cardModal.classList.contains("active")) {
        closeCardModal();
      }
    }
  });

  // Buy buttons play coin thud sound and handle transaction animation globally
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-manga-buy-transaction");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();

      if (btn.classList.contains("animating")) return;

      btn.classList.add("animating");

      if (isStoreActive() && window.Sound && typeof window.Sound.playCoin === "function") {
        window.Sound.playCoin();
      }

      const redirectUrl = btn.getAttribute("data-href");
      if (redirectUrl) {
        // 1.2s animation + 0.8s delay = 2.0s (2000ms)
        setTimeout(() => {
          window.open(redirectUrl, "_blank");
          btn.classList.remove("animating");
        }, 2000);
      }
      return;
    }

    const legacyBtn = e.target.closest(".btn-manga-buy");
    if (legacyBtn) {
      if (isStoreActive() && window.Sound && typeof window.Sound.playCoin === "function") {
        window.Sound.playCoin();
      }
    }
  });
}

function initCategoryFilters() {
  const filterButtons = document.querySelectorAll(".btn-filter");
  const cardsGrid = document.getElementById("cardsGrid");
  const cardContainers = document.querySelectorAll(".card-container");
  if (!cardsGrid) return;

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const category = btn.getAttribute("data-filter");

      // Play click sound
      if (isStoreActive()) {
        window.Sound.playClick();
      }

      // Update active button state
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Trigger grid fade out
      cardsGrid.classList.add("filtering");

      setTimeout(() => {
        cardContainers.forEach(container => {
          container.classList.remove("flipped");
          const cardCategory = container.getAttribute("data-category");
          if (category === "all" || cardCategory === category) {
            container.classList.remove("filtered-out");
          } else {
            container.classList.add("filtered-out");
          }
        });

        // Fade grid back in
        cardsGrid.classList.remove("filtering");
      }, 250);
    });
  });
}

function initCardPreviews() {
  // 1. Balloons (Birthday)
  const birthdayBalloons = document.getElementById("birthdayBalloons");
  const balloonColors = ["#fe2c55", "#ca1437", "#ffd13b", "#ffe675", "#00ff66", "#00f0ff"];
  setInterval(() => {
    if (isStoreActive() && birthdayBalloons) {
      const b = document.createElement("div");
      b.className = "lcd-balloon-el";
      b.style.backgroundColor = balloonColors[Math.floor(Math.random() * balloonColors.length)];
      b.style.left = `${5 + Math.random() * 90}%`;
      b.style.animationDuration = `${3 + Math.random() * 2}s`;
      birthdayBalloons.appendChild(b);
      setTimeout(() => b.remove(), 5000);
    }
  }, 800);

  // 2. Caps (Graduation)
  const graduationCaps = document.getElementById("graduationCaps");
  setInterval(() => {
    if (isStoreActive() && graduationCaps) {
      const cap = document.createElement("span");
      cap.className = "lcd-flying-cap";
      cap.textContent = "🎓";
      cap.style.left = `${5 + Math.random() * 90}%`;
      cap.style.animationDuration = `${3 + Math.random() * 2}s`;
      graduationCaps.appendChild(cap);
      setTimeout(() => cap.remove(), 5000);
    }
  }, 700);

  // 3. Sakura Petals (Sakura Confession)
  const sakuraPetals = document.getElementById("sakuraPetals");
  setInterval(() => {
    if (isStoreActive() && sakuraPetals) {
      const petal = document.createElement("div");
      petal.className = "lcd-sakura-petal";
      petal.style.left = `${5 + Math.random() * 90}%`;
      petal.style.animationDuration = `${3 + Math.random() * 2}s`;
      sakuraPetals.appendChild(petal);
      setTimeout(() => petal.remove(), 4000);
    }
  }, 700);

  // 4. Stars (Kyoto Starry Night)
  const starryStars = document.getElementById("starryStars");
  if (starryStars) {
    for (let i = 0; i < 15; i++) {
      const star = document.createElement("span");
      star.className = "lcd-star";
      star.textContent = "★";
      star.style.left = `${5 + Math.random() * 90}%`;
      star.style.top = `${5 + Math.random() * 90}%`;
      star.style.animationDelay = `${Math.random() * 1.2}s`;
      starryStars.appendChild(star);
    }
  }

  // 5. Snow (Neon Christmas)
  const christmasSnow = document.getElementById("christmasSnow");
  setInterval(() => {
    if (isStoreActive() && christmasSnow) {
      const flake = document.createElement("span");
      flake.className = "lcd-snowflake";
      flake.textContent = "❄";
      flake.style.left = `${5 + Math.random() * 90}%`;
      flake.style.animationDuration = `${2.5 + Math.random() * 2}s`;
      christmasSnow.appendChild(flake);
      setTimeout(() => flake.remove(), 4500);
    }
  }, 500);
}

// --- 7. MENU DRAWER LISTENERS ---
function setupMenuDrawer() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const menuDrawer = document.getElementById("menuDrawer");
  const menuOverlay = document.getElementById("menuOverlay");
  const menuCloseBtn = document.getElementById("menuCloseBtn");
  const menuSoundBtn = document.getElementById("menuSoundBtn");
  const menuLinks = document.querySelectorAll(".menu-link-item");

  function openMenu() {
    menuDrawer.classList.add("open");
    menuOverlay.classList.add("open");
    window.Sound.playClick();
  }

  function closeMenu() {
    menuDrawer.classList.remove("open");
    menuOverlay.classList.remove("open");
    window.Sound.playClose();
  }

  hamburgerBtn.addEventListener("click", openMenu);
  menuCloseBtn.addEventListener("click", closeMenu);
  menuOverlay.addEventListener("click", closeMenu);

  // Close drawer on link click
  menuLinks.forEach(link => {
    link.addEventListener("click", () => {
      menuDrawer.classList.remove("open");
      menuOverlay.classList.remove("open");
    });
  });

  // Sound control inside menu
  menuSoundBtn.addEventListener("click", () => {
    const isMuted = window.Sound.toggleMute();
    window.Sound.playClick();

    // Sync HUD status
    if (isMuted) {
      menuSoundBtn.textContent = "SUARA: MATI";
      menuSoundBtn.style.backgroundColor = "#ff007f";
      menuSoundBtn.style.color = "#fff";
    } else {
      menuSoundBtn.textContent = "SUARA: HIDUP";
      menuSoundBtn.style.backgroundColor = "var(--color-bg-yellow)";
      menuSoundBtn.style.color = "#000";
    }
  });
}

// Copy Text Helper for Customizer to Lynk.id checkout flow
function setupCopyTextHelper() {
  const btnCopyCustomText = document.getElementById("btnCopyCustomText");
  const txtCustomOverlayText = document.getElementById("txtCustomOverlayText");

  if (btnCopyCustomText && txtCustomOverlayText) {
    btnCopyCustomText.addEventListener("click", () => {
      const textToCopy = txtCustomOverlayText.value.trim();
      if (!textToCopy) return;

      navigator.clipboard.writeText(textToCopy).then(() => {
        addInteractiveScore(150);
        showRetroToast("📋 TEKS KUSTOM BERHASIL DISALIN!<br>Rekatkan teks ini pada formulir pesanan di Lynk.id.");

        // Dynamic visual confirmation
        const originalText = btnCopyCustomText.textContent;
        btnCopyCustomText.textContent = "✅ TEKS DISALIN!";
        btnCopyCustomText.style.backgroundColor = "var(--color-bg-yellow)";
        btnCopyCustomText.style.color = "var(--color-text-dark)";

        setTimeout(() => {
          btnCopyCustomText.textContent = originalText;
          btnCopyCustomText.style.backgroundColor = "";
          btnCopyCustomText.style.color = "";
        }, 2000);
      }).catch(err => {
        console.error("Gagal menyalin teks: ", err);
      });
    });
  }
}

// --- 7b. DYNAMIC CATALOG RENDERING ---
function renderCatalogCards() {
  const cardsGrid = document.getElementById("cardsGrid");
  if (!cardsGrid) return;
  cardsGrid.innerHTML = "";

  function getOverlayHTML(overlayType) {
    switch (overlayType) {
      case "balloons":
        return `<div class="lcd-balloons-box" id="birthdayBalloons"></div>`;
      case "countdown":
        return `<div class="lcd-countdown-timer">00d : 12h : 44m : 55s</div>`;
      case "graduationCaps":
        return `<div class="lcd-toga-float-box" id="graduationCaps"></div>`;
      case "arcade":
        return `<div class="lcd-arcade-screen">1UP LEVEL UP!<br>🎂 Press Start 🕹️</div>`;
      case "sakuraPetals":
        return `<div class="lcd-sakura-float-box" id="sakuraPetals"></div>`;
      case "starryStars":
        return `<div class="lcd-stars-box" id="starryStars"></div>`;
      case "harajukuRun":
        return `<div class="lcd-harajuku-run">🎓🏃‍♀️💨</div>`;
      case "mosque":
        return `<div class="lcd-lantern-glow">🏮✨</div><div class="lcd-crescent">🌙⭐ EID MUBARAK</div>`;
      case "christmasSnow":
        return `<div class="lcd-snow-box" id="christmasSnow"></div>`;
      default:
        return "";
    }
  }

  // Generate cards from products.js cardsData array
  if (window.cardsData && Array.isArray(window.cardsData)) {
    window.cardsData.forEach(card => {
      const cardEl = document.createElement("div");
      cardEl.className = "card-container";
      cardEl.id = card.id;
      cardEl.setAttribute("data-category", card.category);
      cardEl.innerHTML = `
        <div class="card-inner">
            <div class="card-face card-front" style="background-image: url('${card.frontImage}');">
                <div class="card-glare"></div>
                <div class="card-hologram"></div>
                <div class="card-rarity-badge">${card.badge}</div>
            </div>
            <div class="card-face card-back">
                <div class="card-back-header">
                    <span class="card-back-rarity">${card.rarityTag}</span>
                    <button class="btn-flip-back" title="Balik Kartu">↺</button>
                </div>
                <div class="card-back-info">
                    <h2 class="card-back-title">${card.title}</h2>
                    <p class="card-back-desc">${card.desc}</p>
                </div>
                <div class="card-lcd-preview">
                    <img class="lcd-preview-image" src="${card.lcdImage}" alt="LCD Preview">
                    ${getOverlayHTML(card.lcdOverlay)}
                </div>
                <div class="card-back-action">
                    <div class="card-price-container">
                        ${card.originalPrice ? `<span class="card-price-original">${card.originalPrice}</span>` : ''}
                        <span class="card-price">${card.price}</span>
                    </div>
                    <div class="card-action-buttons">
                        <a href="${card.tiktokUrl}" target="_blank" class="btn-card-tiktok" title="Lihat Demo TikTok">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="tiktok-icon">
                                <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39V186.36A210.76,210.76,0,0,1,448,209.91Z" />
                            </svg>
                        </a>
                        <button class="btn-manga-buy btn-manga-buy-transaction" data-href="${card.checkoutUrl}">
                            <span class="left-side">
                                <span class="left-side-inner">
                                    <span class="card">
                                        <span class="card-line"></span>
                                        <span class="buttons"></span>
                                    </span>
                                    <span class="post">
                                        <span class="post-line"></span>
                                        <span class="screen">
                                            <span class="dollar">$</span>
                                        </span>
                                        <span class="numbers"></span>
                                        <span class="numbers-line2"></span>
                                    </span>
                                </span>
                            </span>
                            <span class="right-side">
                                <span class="new">MILIKI SEKARANG</span>
                                <svg viewBox="0 0 451.846 451.847" class="arrow">
                                    <path fill="currentColor" d="M345.441 248.292L151.154 442.573c-12.359 12.365-32.397 12.365-44.75 0-12.354-12.354-12.354-32.391 0-44.744L278.318 225.92 106.409 54.017c-12.354-12.359-12.354-32.394 0-44.748 12.354-12.359 32.391-12.359 44.75 0l194.287 194.284c6.177 6.18 9.262 14.271 9.262 22.366 0 8.099-3.091 16.196-9.267 22.373z"></path>
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      `;
      cardsGrid.appendChild(cardEl);
    });
  }
}

// --- 7c. PLAYGROUND RETRO JUKEBOX CONTROLLER ---
function setupJukebox() {
  const jukeboxHandle = document.getElementById("jukeboxHandle");
  const retroJukebox = document.getElementById("retroJukebox");
  const jukeboxCloseBtn = document.getElementById("jukeboxCloseBtn");
  const btnJukeboxPlay = document.getElementById("btnJukeboxPlay");
  const btnJukeboxNext = document.getElementById("btnJukeboxNext");
  const btnJukeboxShuffle = document.getElementById("btnJukeboxShuffle");
  const jukeboxDisplay = document.getElementById("jukeboxDisplay");
  const cassetteLabelTitle = document.getElementById("cassetteLabelTitle");

  const progressBar = document.getElementById("progress-bar");
  const leftRoll = document.getElementById("left-roll");
  const rightRoll = document.getElementById("right-roll");

  const MIN_ROLL = 34; // Batas kecil pita saat habis
  const MAX_ROLL = 120; // Batas besar pita saat penuh

  let isDraggingProgressBar = false;

  if (!retroJukebox) return;

  function updateTapeSizes(percentage) {
    const p = Math.max(0, Math.min(1, percentage));
    const leftSize = MAX_ROLL - ((MAX_ROLL - MIN_ROLL) * p);
    const rightSize = MIN_ROLL + ((MAX_ROLL - MIN_ROLL) * p);

    if (leftRoll) {
      leftRoll.style.width = `${leftSize}px`;
      leftRoll.style.height = `${leftSize}px`;
    }
    if (rightRoll) {
      rightRoll.style.width = `${rightSize}px`;
      rightRoll.style.height = `${rightSize}px`;
    }
  }

  // Initialize tape sizes
  updateTapeSizes(0);

  // Slider events
  if (progressBar) {
    progressBar.addEventListener("mousedown", () => { isDraggingProgressBar = true; });
    progressBar.addEventListener("touchstart", () => { isDraggingProgressBar = true; });
    progressBar.addEventListener("mouseup", () => { isDraggingProgressBar = false; });
    progressBar.addEventListener("touchend", () => { isDraggingProgressBar = false; });

    progressBar.addEventListener("input", (e) => {
      const percentage = parseFloat(e.target.value);
      updateTapeSizes(percentage / 100);
    });

    progressBar.addEventListener("change", (e) => {
      if (window.Sound && window.Sound.activePlayer && window.Sound.activePlayer.duration) {
        const pct = parseFloat(e.target.value) / 100;
        window.Sound.activePlayer.currentTime = pct * window.Sound.activePlayer.duration;
      }
    });
  }

  // Toggle Jukebox window (active state for mobile click override)
  if (jukeboxHandle) {
    jukeboxHandle.addEventListener("click", () => {
      retroJukebox.classList.remove("closed-clicked");
      retroJukebox.classList.toggle("open-active");
      if (window.Sound && typeof window.Sound.playClick === "function") {
        window.Sound.playClick();
      }
    });
  }

  if (jukeboxCloseBtn) {
    jukeboxCloseBtn.addEventListener("click", () => {
      retroJukebox.classList.remove("open-active");
      retroJukebox.classList.add("closed-clicked");
      if (window.Sound && typeof window.Sound.playClose === "function") {
        window.Sound.playClose();
      }
    });
  }

  // Clear closed-clicked state when mouse leaves the jukebox area (for desktop hover reuse)
  if (retroJukebox) {
    retroJukebox.addEventListener("mouseleave", () => {
      retroJukebox.classList.remove("closed-clicked");
    });
  }

  // Render Scrollable Jukebox Queue List
  function renderQueue() {
    const queueList = document.getElementById("jukeboxQueueList");
    const queueCount = document.getElementById("queueCount");
    if (!queueList || !window.Sound || !window.Sound.playlist) return;

    queueList.innerHTML = "";
    const playlist = window.Sound.playlist;
    const currentIndex = window.Sound.currentTrackIndex;

    if (queueCount) {
      queueCount.textContent = `${currentIndex + 1} / ${playlist.length}`;
    }

    playlist.forEach((track, index) => {
      const item = document.createElement("div");
      item.className = "queue-item";
      if (index === currentIndex) {
        item.classList.add("active");
      }

      const isPlaying = index === currentIndex && window.Sound.isPlayingBgm;

      item.innerHTML = `
        <div class="queue-item-index">${(index + 1).toString().padStart(2, "0")}</div>
        <div class="queue-item-details">
          <div class="queue-item-name">${track.name}</div>
          <div class="queue-item-artist">${track.artist}</div>
        </div>
        ${isPlaying ? '<div class="queue-item-status">▶ PLAYING</div>' : ''}
      `;

      item.addEventListener("click", () => {
        if (!window.Sound.ctx) {
          window.Sound.init();
        }
        window.Sound.setTrack(index);
        if (!window.Sound.isPlayingBgm) {
          window.Sound.startBGM();
        }
        window.Sound.playClick();
        addInteractiveScore(20);
      });

      queueList.appendChild(item);
    });

    // Auto-scroll the active item into view inside the queue box
    const activeItem = queueList.querySelector(".queue-item.active");
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  // Sync kaset & status text display
  function updateJukeboxDisplay() {
    if (!window.Sound || !window.Sound.playlist) return;
    const isPlaying = window.Sound.isPlayingBgm;
    const track = window.Sound.playlist[window.Sound.currentTrackIndex];

    if (cassetteLabelTitle && track) {
      cassetteLabelTitle.textContent = track.name.toUpperCase();
    }

    if (isPlaying) {
      retroJukebox.classList.add("playing");
      if (jukeboxDisplay && track) {
        jukeboxDisplay.innerHTML = `SEKARANG MEMUTAR:<br><span style="color:#00ff66">${track.name} - ${track.artist}</span>`;
      }
    } else {
      retroJukebox.classList.remove("playing");
      if (jukeboxDisplay) {
        jukeboxDisplay.innerHTML = `STATUS: JEDA / MATI<br><span style="color:#ff007f">KLIK PLAY UNTUK MEMUTAR</span>`;
      }
    }

    if (btnJukeboxShuffle && window.Sound) {
      btnJukeboxShuffle.innerHTML = window.Sound.isShuffle ? " SHUFFLE: ON" : " SHUFFLE: OFF";
      btnJukeboxShuffle.style.backgroundColor = window.Sound.isShuffle ? "#ffe675" : "var(--color-bg-yellow)";
    }

    renderQueue();
  }

  // Play/Pause button
  btnJukeboxPlay.addEventListener("click", () => {
    if (!window.Sound) return;
    if (!window.Sound.ctx) {
      window.Sound.init();
    }

    if (window.Sound.isPlayingBgm) {
      window.Sound.stopBGM();
    } else {
      window.Sound.startBGM();
    }

    window.Sound.playClick();
  });

  // Next track button
  btnJukeboxNext.addEventListener("click", () => {
    if (!window.Sound || !window.Sound.playlist) return;
    if (!window.Sound.ctx) {
      window.Sound.init();
    }

    let nextIndex = window.Sound.currentTrackIndex + 1;
    if (nextIndex >= window.Sound.playlist.length) {
      nextIndex = 0;
    }

    window.Sound.setTrack(nextIndex);
    window.Sound.playClick();
    addInteractiveScore(50);
  });

  // Shuffle toggle button
  if (btnJukeboxShuffle) {
    btnJukeboxShuffle.addEventListener("click", () => {
      if (!window.Sound) return;
      if (!window.Sound.ctx) {
        window.Sound.init();
      }
      window.Sound.toggleShuffle();
      window.Sound.playClick();
      addInteractiveScore(30);
    });
  }

  // Hook Sound class methods to auto-update display and simulate tapes in real-time
  if (window.Sound) {
    window.Sound.onBgmStateChange = () => {
      updateJukeboxDisplay();
    };
    window.Sound.onTrackEnd = () => {
      updateJukeboxDisplay();
    };
    window.Sound.onTimeUpdate = (percent) => {
      if (progressBar && !isDraggingProgressBar) {
        progressBar.value = percent;
      }
      updateTapeSizes(percent / 100);
    };
  }

  updateJukeboxDisplay();
}

// --- 7.5. GOOEY TEXT MORPHING ANIMATION ---
function initGooeyText() {
  const text1El = document.getElementById("gooeyText1");
  const text2El = document.getElementById("gooeyText2");
  if (!text1El || !text2El) return;

  const texts = ["YOUR DESIGN", "YOUR STYLE", "YOUR CARD", "YOUR EVENT", "YOUR STORY"];
  const morphTime = 1.0;
  const cooldownTime = 0.55;

  let textIndex = texts.length - 1;
  let time = new Date();
  let morph = 0;
  let cooldown = cooldownTime;

  text1El.textContent = texts[textIndex % texts.length];
  text2El.textContent = texts[(textIndex + 1) % texts.length];

  const setMorph = (fraction) => {
    text2El.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
    text2El.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

    const invFraction = 1 - fraction;
    text1El.style.filter = `blur(${Math.min(8 / invFraction - 8, 100)}px)`;
    text1El.style.opacity = `${Math.pow(invFraction, 0.4) * 100}%`;
  };

  const doCooldown = () => {
    morph = 0;
    text2El.style.filter = "";
    text2El.style.opacity = "100%";
    text1El.style.filter = "";
    text1El.style.opacity = "0%";
  };

  const doMorph = () => {
    morph -= cooldown;
    cooldown = 0;
    let fraction = morph / morphTime;

    if (fraction > 1) {
      cooldown = cooldownTime;
      fraction = 1;
    }

    setMorph(fraction);
  };

  function animate() {
    requestAnimationFrame(animate);
    const newTime = new Date();
    const shouldIncrementIndex = cooldown > 0;
    const dt = (newTime.getTime() - time.getTime()) / 1000;
    time = newTime;

    cooldown -= dt;

    if (cooldown <= 0) {
      if (shouldIncrementIndex) {
        textIndex = (textIndex + 1) % texts.length;
        text1El.textContent = texts[textIndex % texts.length];
        text2El.textContent = texts[(textIndex + 1) % texts.length];
      }
      doMorph();
    } else {
      doCooldown();
    }
  }

  animate();
}

// --- 7.5 MOBILE INTERACTIVE PIXEL CAT GUARD ---
function setupMobileCat() {
  const mobileCatContainer = document.getElementById("mobileCatContainer");
  const pixelCat = document.getElementById("pixelCat");
  const customizerSection = document.getElementById("customizer-section");

  if (!mobileCatContainer || !pixelCat || !customizerSection) {
    console.warn("Mobile cat container elements missing from DOM.");
    return;
  }

  let clickCount = 0;
  let isUnlocked = false;

  function playMeowSound() {
    if (!window.Sound) return;
    window.Sound.init();

    // Pitch-bend meow frequency sweep using oscillator (triangle wave)
    const pitch = 380 + Math.random() * 40; // slight random pitch variety
    window.Sound.playTone(pitch, 'triangle', 0.12, 0.1, pitch * 1.55);
    setTimeout(() => {
      window.Sound.playTone(pitch * 1.55, 'triangle', 0.18, 0.1, pitch * 1.15);
    }, 100);
  }

  function playVictoryChime() {
    if (!window.Sound) return;
    window.Sound.init();

    // Retro upward arpeggio: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        window.Sound.playTone(freq, 'square', 0.15, 0.12, freq * 1.05);
      }, idx * 100);
    });

    // Sparkling final chord
    setTimeout(() => {
      window.Sound.playTone(1318.51, 'sine', 0.4, 0.08); // E6
      window.Sound.playTone(1567.98, 'sine', 0.4, 0.08); // G6
    }, 400);
  }

  function spawnEmojiParticle(emoji) {
    if (!mobileCatContainer) return;
    const particle = document.createElement("div");
    particle.className = "cat-emoji-particle";
    particle.textContent = emoji;

    // Position randomly inside the mobileCatContainer near the cat
    particle.style.left = "calc(50% + " + (Math.random() * 60 - 30) + "px)";
    particle.style.top = "calc(50% + " + (Math.random() * 40 - 20) + "px)";

    const dx = (Math.random() * 60 - 30);
    particle.style.setProperty("--dx", `${dx}px`);

    mobileCatContainer.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 1000);
  }

  // Bind click handlers to both cat and container for responsive clicking
  pixelCat.addEventListener("click", (e) => {
    e.stopPropagation();
    handleCatInteraction();
  });

  mobileCatContainer.addEventListener("click", () => {
    handleCatInteraction();
  });

  function handleCatInteraction() {
    if (isUnlocked) return;

    // Increment clicks
    clickCount++;

    // Apply bounce animation class
    pixelCat.classList.remove("is-clicking");
    void pixelCat.offsetWidth; // Reflow to restart CSS animation
    pixelCat.classList.add("is-clicking");

    // Play retro meow sound
    playMeowSound();

    // Spawn particles
    spawnEmojiParticle("🐾");
    spawnEmojiParticle("✨");

    if (clickCount >= 4) {
      isUnlocked = true;

      // Play retro victory chime
      playVictoryChime();

      // Explosion of particles
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          spawnEmojiParticle(["🌟", "✨", "💕", "🐾", "🎉"][i % 5]);
        }, i * 50);
      }

      // Transition delay before hide and reveal
      setTimeout(() => {
        customizerSection.classList.add("booth-unlocked");

        // Scroll smoothly to revealed customizer booth
        const yOffset = -80; // offset for nav bar
        const elementPosition = customizerSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY + yOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }, 1000);
    }
  }
}

// --- 8. BOOTSTRAP ---
function bootstrap() {
  // Load custom catalog data from localStorage if present
  const localData = localStorage.getItem("imajiko_catalog");
  if (localData) {
    try {
      window.cardsData = JSON.parse(localData);
    } catch (e) {
      console.error("Failed to parse local catalog:", e);
    }
  }

  // Fallback to globally declared cardsData if window.cardsData is not defined yet
  if (!window.cardsData && typeof cardsData !== "undefined") {
    window.cardsData = cardsData;
  }

  // Load Playroom States
  loadPlaygroundState();

  runLoader();
  setupCursorHovers();
  setupPurikuraGame();
  setupCopyTextHelper();
  renderCatalogCards();
  initCatalog();
  initCard3DTilt();
  initCategoryFilters();
  initCardPreviews();
  setupMenuDrawer();
  updateHeartsDOM();
  updateScoreDisplay();
  updateTicketsDisplay();
  syncUnlockedItemsDOM();
  setupJukebox();
  initGooeyText();
  resizeDinoCanvas();

  // KO modal button action
  koModalBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (state.lives <= 0) {
      resetGame();
    } else {
      koModal.classList.remove("visible");
      startDinoGame();
    }
  });

  btnStartDino.addEventListener("click", () => {
    startDinoGame();
  });

  // Start auto-start observer for Dino Game
  setupDinoAutoStart();

  // Initialize mobile interactive cat guard
  setupMobileCat();
}

window.addEventListener("DOMContentLoaded", bootstrap);
