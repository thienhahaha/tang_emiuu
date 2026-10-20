(function () {
  const $ = (id) => document.getElementById(id);
  const rain = $("rain");

  const HEARTS = ["❤️", "💖", "💕", "💗", "💓", "💘", "🩷", "🌸", "✨"];
  const MAX_ON_SCREEN = 140;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPAWN_EVERY = reduceMotion ? 600 : 140; // ms, nhỏ hơn = nhiều tim hơn

  const rand = (min, max) => Math.random() * (max - min) + min;

  /* ================= Mưa trái tim ================= */
  function createHeart(startMidway) {
    if (rain.childElementCount >= MAX_ON_SCREEN) return;

    const el = document.createElement("span");
    el.className = "heart";
    el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];

    const duration = rand(5, 11);
    el.style.left = rand(0, 100) + "vw";
    el.style.fontSize = rand(16, 40) + "px";
    el.style.animationDuration = duration + "s";
    if (startMidway === true) el.style.animationDelay = "-" + rand(0, duration * 0.9) + "s";
    el.style.setProperty("--drift", rand(-90, 90) + "px");
    el.style.setProperty("--spin", rand(-40, 40) + "deg");
    el.style.setProperty("--op", rand(0.55, 1).toFixed(2));

    el.addEventListener("animationend", () => el.remove());
    rain.appendChild(el);
  }

  function burst(n) {
    for (let i = 0; i < n; i++) setTimeout(createHeart, i * 40);
  }

  let timer = setInterval(createHeart, SPAWN_EVERY);
  document.addEventListener("visibilitychange", () => {
    clearInterval(timer);
    if (!document.hidden) timer = setInterval(createHeart, SPAWN_EVERY);
  });
  for (let i = 0; i < 30; i++) createHeart(true);

  /* ================= Chạm vào trái tim ================= */
  const hint = $("hint");
  let messages = [];
  try { messages = JSON.parse(hint.dataset.messages || "[]"); } catch (e) { messages = []; }
  let msgIndex = 0;

  document.addEventListener("heart:tap", () => {
    burst(24);
    if (messages.length) {
      hint.textContent = messages[msgIndex % messages.length];
      msgIndex++;
      hint.classList.remove("pop");
      void hint.offsetWidth;            // khởi động lại hiệu ứng
      hint.classList.add("pop");
    }
  });

  /* ================= Modal dùng chung ================= */
  const focusStack = [];

  function openModal(modal) {
    focusStack.push(document.activeElement);
    modal.hidden = false;
    const first = modal.querySelector("button, textarea");
    if (first) first.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    const prev = focusStack.pop();
    if (prev && prev.focus) prev.focus();
  }

  function topModal() {
    const open = document.querySelectorAll(".modal:not([hidden])");
    return open.length ? open[open.length - 1] : null;
  }

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest("[data-close]")) closeModal(modal);
    });
  });

  document.addEventListener("keydown", (e) => {
    const open = topModal();
    if (!open) return;
    if (e.key === "Escape") closeModal(open);
    if (open.id === "memoryModal") {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    }
  });

  /* ================= Mở thư ================= */
  const letterModal = $("letterModal");
  let opened = false;

  $("openBtn").addEventListener("click", () => {
    openModal(letterModal);
    if (!opened) { burst(40); opened = true; }
  });
  $("moreBtn").addEventListener("click", () => burst(50));

  /* ================= Kỷ niệm ================= */
  const memoryModal = $("memoryModal");
  const gallery = $("gallery");
  const galleryEmpty = $("galleryEmpty");
  const photoImg = $("photoImg");
  const photoCap = $("photoCap");
  const photoCounter = $("photoCounter");
  const photoBox = document.querySelector(".photo");

  let photos = [];
  let index = 0;
  let loaded = false;

  function show(i) {
    if (!photos.length) return;
    index = (i + photos.length) % photos.length;
    const p = photos[index];
    photoImg.src = p.url;
    photoImg.alt = p.caption || "Ảnh kỷ niệm " + (index + 1);
    photoCap.textContent = p.caption;
    photoCounter.textContent = (index + 1) + " / " + photos.length;
    photoBox.classList.toggle("flip", index % 2 === 1);
  }

  async function loadMemories() {
    try {
      const res = await fetch("/api/memories");
      photos = await res.json();
    } catch (err) {
      photos = [];
    }
    loaded = true;
    const has = photos.length > 0;
    gallery.hidden = !has;
    galleryEmpty.hidden = has;
    photoCounter.hidden = !has;
    if (has) show(0);
  }

  $("memoryBtn").addEventListener("click", async () => {
    openModal(memoryModal);
    if (!loaded) await loadMemories();
    burst(25);
  });
  $("prevBtn").addEventListener("click", () => show(index - 1));
  $("nextBtn").addEventListener("click", () => show(index + 1));

  // Vuốt trái/phải trên điện thoại
  let startX = null;
  gallery.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  gallery.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  /* ================= Cảm nghĩ ================= */
  const feedbackModal = $("feedbackModal");
  const form = $("feedbackForm");
  const text = $("feedbackText");
  const msg = $("feedbackMsg");
  const sendBtn = $("sendBtn");
  let mood = "";

  $("feedbackBtn").addEventListener("click", () => openModal(feedbackModal));

  $("moods").addEventListener("click", (e) => {
    const b = e.target.closest(".mood");
    if (!b) return;
    mood = b.dataset.mood;
    document.querySelectorAll(".mood").forEach((m) => m.classList.toggle("active", m === b));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = text.value.trim();
    if (!message) {
      msg.textContent = "chx viết j maaa 🥺";
      text.focus();
      return;
    }

    sendBtn.disabled = true;
    msg.textContent = "Đang gửi...";
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mood }),
      });
      const data = await res.json();
      if (data.ok) {
        msg.textContent = "đã gửi";
        text.value = "";
        burst(60);
        setTimeout(() => { closeModal(feedbackModal); msg.textContent = ""; }, 1800);
      } else {
        msg.textContent = data.error || "lỗi roi";
      }
    } catch (err) {
      msg.textContent = "lỗi roi";
    } finally {
      sendBtn.disabled = false;
    }
  });
})();
