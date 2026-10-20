/*
 * Trái tim 3D làm từ hàng nghìn hạt lấp lánh.
 *  - Tự xoay quanh trục dọc, đập nhịp nhẹ.
 *  - Kéo chuột/ngón tay để xoay (thả ra vẫn quay tiếp theo quán tính).
 *  - Chạm vào trái tim: các hạt nổ tung ra rồi tụ lại thành tim.
 * Khi chạm trúng tim sẽ phát sự kiện "heart:tap" để script.js xử lý thêm.
 */
(function () {
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 600;
  const COUNT = reduceMotion ? 2200 : isSmall ? 3200 : 4600;   // số hạt
  const STAR_COUNT = 140;
  const AUTO_SPEED = reduceMotion ? 0 : 0.55;                  // rad/giây
  const FOV = 70;                                              // độ sâu phối cảnh
  const COLORS = ["#ffb3d1", "#ff7eb0", "#ff4f93", "#ffd9ea", "#ff94c2"];

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Hình dạng trái tim ---------- */
  function heartCurve(t) {
    const s = Math.sin(t);
    return [
      16 * s * s * s,
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
    ];
  }

  const particles = [];
  for (let i = 0; i < COUNT; i++) {
    const t = rand(0, Math.PI * 2);
    const [cx, cy] = heartCurve(t);
    const onEdge = Math.random() < 0.3;                         // 30% hạt viền cho nét tim rõ
    const s = onEdge ? 1 - Math.random() * 0.04 : Math.sqrt(Math.random());
    const hx = cx * s;
    const hy = cy * s + 2.5;                                    // căn tim vào giữa
    const hz = rand(-1, 1) * 7 * Math.sqrt(Math.max(0, 1 - s * s)) + rand(-0.6, 0.6);

    // Lúc mới vào: hạt bay lơ lửng rồi tụ lại thành tim
    const a = rand(0, Math.PI * 2), b = Math.acos(rand(-1, 1)), r = rand(25, 55);
    particles.push({
      hx, hy, hz,
      x: r * Math.sin(b) * Math.cos(a),
      y: r * Math.sin(b) * Math.sin(a),
      z: r * Math.cos(b),
      vx: 0, vy: 0, vz: 0,
      size: rand(0.9, 2.4),
      phase: rand(0, Math.PI * 2),
      speed: rand(1.5, 4.5),
      ret: 0,                                                   // thời điểm bắt đầu tụ lại
    });
  }

  const sx = new Float32Array(COUNT);
  const sy = new Float32Array(COUNT);
  const ss = new Float32Array(COUNT);

  /* ---------- Sao nền ---------- */
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({ x: Math.random(), y: Math.random(), r: rand(0.6, 1.8), phase: rand(0, 6.28), sp: rand(0.6, 2.2) });
  }

  /* ---------- Kích thước ---------- */
  let dpr = 1, W = 0, H = 0, cx = 0, cy = 0, unit = 1, heartPx = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = Math.floor(window.innerWidth * dpr);
    H = canvas.height = Math.floor(window.innerHeight * dpr);
    heartPx = Math.min(H * 0.42, W * 0.8);                      // chiều cao tim trên màn hình
    unit = heartPx / 30;
    cx = W / 2;
    cy = H * 0.46;
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- Trạng thái ---------- */
  let time = 0;
  let explodeAt = -1e9;
  let angleY = 0, angleX = 0.12, angVel = AUTO_SPEED;
  let dragging = false;

  function explode() {
    explodeAt = time;
    for (const p of particles) {
      let dx = p.x + rand(-6, 6), dy = p.y + rand(-6, 6), dz = p.z + rand(-6, 6);
      const len = Math.hypot(dx, dy, dz) || 1;
      const speed = rand(14, 52);
      p.vx = (dx / len) * speed;
      p.vy = (dy / len) * speed;
      p.vz = (dz / len) * speed;
      p.ret = rand(0.8, 1.6);                                   // mỗi hạt tụ lại lệch nhau cho tự nhiên
    }
  }

  /* ---------- Vẽ ---------- */
  function drawStars() {
    for (const st of stars) {
      const a = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(time * st.sp + st.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = "#ffe9f3";
      const s = st.r * dpr;
      ctx.fillRect(st.x * W, st.y * H, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function frame(dt) {
    time += dt;

    // Xoay
    if (!dragging) {
      angVel += (AUTO_SPEED - angVel) * Math.min(1, dt * 1.2);
      angleX += (0.12 - angleX) * Math.min(1, dt * 0.8);
    }
    angleY += angVel * dt;

    // Nhịp đập
    const beat = 1 + 0.05 * Math.pow(0.5 + 0.5 * Math.sin(time * 2.6), 6);

    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
    const sinceBoom = time - explodeAt;
    const damp = Math.exp(-1.4 * dt);

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];

      if (sinceBoom > p.ret) {
        // Lò xo kéo hạt về vị trí trong trái tim
        p.vx += (p.hx * beat - p.x) * 16 * dt;
        p.vy += (p.hy * beat - p.y) * 16 * dt;
        p.vz += (p.hz * beat - p.z) * 16 * dt;
        const c = 1 - Math.min(1, 6.5 * dt);
        p.vx *= c; p.vy *= c; p.vz *= c;
      } else {
        // Đang bay tung ra
        p.vx *= damp; p.vy *= damp; p.vz *= damp;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Xoay quanh trục Y rồi trục X
      const xr = p.x * cosY + p.z * sinY;
      const zr = -p.x * sinY + p.z * cosY;
      const yr = p.y * cosX - zr * sinX;
      const zr2 = p.y * sinX + zr * cosX;

      const f = FOV / (FOV + zr2);
      sx[i] = cx + xr * unit * f;
      sy[i] = cy - yr * unit * f;
      ss[i] = Math.max(0.6, p.size * f * dpr * (0.75 + 0.5 * Math.sin(time * p.speed + p.phase)));
    }

    ctx.clearRect(0, 0, W, H);
    drawStars();

    // Quầng sáng hồng phía sau tim
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, heartPx * 0.75);
    g.addColorStop(0, "rgba(255, 60, 120, 0.22)");
    g.addColorStop(1, "rgba(255, 60, 120, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Vẽ hạt theo từng nhóm màu
    for (let b = 0; b < COLORS.length; b++) {
      ctx.fillStyle = COLORS[b];
      for (let i = b; i < COUNT; i += COLORS.length) {
        ctx.fillRect(sx[i], sy[i], ss[i], ss[i]);
      }
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    frame(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------- Tương tác: kéo để xoay, chạm để nổ ---------- */
  let lastX = 0, lastY = 0, lastMoveT = 0, downT = 0, moved = 0;

  function isOnHeart(clientX, clientY) {
    const hx = cx / dpr, hy = cy / dpr;
    return Math.hypot(clientX - hx, clientY - hy) <= (heartPx / dpr) * 0.62;
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX; lastY = e.clientY;
    downT = lastMoveT = performance.now();
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    angleY += dx * 0.01;
    angleX = clamp(angleX + dy * 0.006, -0.7, 0.7);
    const t = performance.now();
    angVel = clamp((dx * 0.01) / Math.max(0.008, (t - lastMoveT) / 1000), -8, 8);
    lastX = e.clientX; lastY = e.clientY; lastMoveT = t;
  });

  function endDrag(e, cancelled) {
    if (!dragging) return;
    dragging = false;
    if (!cancelled && moved < 10 && performance.now() - downT < 500 && isOnHeart(e.clientX, e.clientY)) {
      explode();
      document.dispatchEvent(new CustomEvent("heart:tap", { detail: { x: e.clientX, y: e.clientY } }));
    }
  }
  canvas.addEventListener("pointerup", (e) => endDrag(e, false));
  canvas.addEventListener("pointercancel", (e) => endDrag(e, true));

  // Bàn phím: Enter / Space cũng làm tim nổ
  canvas.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      explode();
      document.dispatchEvent(new CustomEvent("heart:tap", { detail: {} }));
    }
  });
})();
