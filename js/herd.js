// A small StringNet-style herding simulation (after Strömbom et al., 2014).
// Sheep: local repulsion, attraction to nearby flockmates when threatened, flight from shepherds.
// Shepherds: hold slots on an arc behind the flock, opposite the goal, joined by a "string".

const N_SHEEP = 40;
const N_DOGS = 3;

export function startHerd(canvas, { onStat, toggleBtn } = {}) {
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let W = 0, H = 0, U = 1, dpr = 1;
  let colors = readColors();
  let running = !reduce.matches;
  let visible = true;
  let raf = 0;
  let settle = 0;
  let rng = mulberry32(7);

  const sheep = [];
  const dogs = [];
  const goal = { x: 0, y: 0, r: 0 };

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    return {
      ink: v("--ink"), ink2: v("--ink-2"), rule: v("--rule"), surface: v("--surface"),
      dogs: [v("--blue"), v("--red"), v("--orange")], green: v("--green"),
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const oldW = W || rect.width, oldH = H || rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    U = Math.min(W, H) / 100;
    goal.r = 13 * U;
    // keep agents inside after a resize
    const sx = W / oldW, sy = H / oldH;
    for (const a of [...sheep, ...dogs]) { a.x *= sx; a.y *= sy; }
    goal.x *= sx; goal.y *= sy;
  }

  function init() {
    sheep.length = 0; dogs.length = 0;
    for (let i = 0; i < N_SHEEP; i++) {
      sheep.push({ x: W * (0.55 + 0.3 * rng()), y: H * (0.12 + 0.35 * rng()), vx: 0, vy: 0 });
    }
    for (let k = 0; k < N_DOGS; k++) {
      dogs.push({ x: W * (0.08 + 0.1 * k), y: H * (0.85 - 0.05 * k), vx: 0, vy: 0, trail: [] });
    }
    goal.x = W * 0.2; goal.y = H * 0.72;
  }

  function step() {
    const ra = 2.4 * U, rs = 24 * U;
    const sheepSpeed = 0.22 * U, fleeSpeed = 0.55 * U, dogSpeed = 0.9 * U;

    // flock statistics
    let cx = 0, cy = 0;
    for (const s of sheep) { cx += s.x; cy += s.y; }
    cx /= sheep.length; cy /= sheep.length;
    let R = 0;
    for (const s of sheep) R = Math.max(R, Math.hypot(s.x - cx, s.y - cy));

    // sheep update
    for (const s of sheep) {
      let rx = 0, ry = 0;
      for (const o of sheep) {
        if (o === s) continue;
        const dx = s.x - o.x, dy = s.y - o.y, d = Math.hypot(dx, dy);
        if (d > 0 && d < ra) { rx += dx / d; ry += dy / d; }
      }
      let threat = false, fx = 0, fy = 0;
      for (const g of dogs) {
        const dx = s.x - g.x, dy = s.y - g.y, d = Math.hypot(dx, dy);
        if (d < rs && d > 0) { threat = true; fx += (dx / d) * (1 - d / rs + 0.3); fy += (dy / d) * (1 - d / rs + 0.3); }
      }
      let ax = 0, ay = 0, speed = sheepSpeed * 0.25;
      if (threat) {
        // attraction to local centre of mass of nearest neighbours
        const near = sheep
          .filter((o) => o !== s)
          .map((o) => ({ o, d: (o.x - s.x) ** 2 + (o.y - s.y) ** 2 }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 8);
        let lx = 0, ly = 0;
        for (const { o } of near) { lx += o.x; ly += o.y; }
        lx = lx / near.length - s.x; ly = ly / near.length - s.y;
        const ll = Math.hypot(lx, ly) || 1;
        ax = 1.05 * lx / ll + 1.0 * fx; ay = 1.05 * ly / ll + 1.0 * fy;
        speed = fleeSpeed;
      } else {
        ax = (rng() - 0.5) * 0.6; ay = (rng() - 0.5) * 0.6; // grazing
      }
      ax += 2 * rx; ay += 2 * ry;
      // walls
      const m = 4 * U;
      if (s.x < m) ax += (m - s.x) / m * 2; if (s.x > W - m) ax -= (s.x - (W - m)) / m * 2;
      if (s.y < m) ay += (m - s.y) / m * 2; if (s.y > H - m) ay -= (s.y - (H - m)) / m * 2;
      const al = Math.hypot(ax, ay) || 1;
      const nx = 0.5 * s.vx + 0.5 * (ax / al) * speed + (rng() - 0.5) * 0.06 * U;
      const ny = 0.5 * s.vy + 0.5 * (ay / al) * speed + (rng() - 0.5) * 0.06 * U;
      s.vx = nx; s.vy = ny;
    }
    for (const s of sheep) {
      s.x = clamp(s.x + s.vx, 1, W - 1);
      s.y = clamp(s.y + s.vy, 1, H - 1);
    }

    // dogs: StringNet arc behind the flock, opposite the goal
    let dx = cx - goal.x, dy = cy - goal.y;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    const inGoalFrac = countInGoal() / sheep.length;
    // Strömbom collecting: if a sheep strays beyond the cohesion radius, the nearest
    // shepherd leaves the arc, gets behind the stray and pushes it back to the flock.
    const fN = 3.2 * U * Math.sqrt(sheep.length);
    let far = null, farD = 0;
    for (const s of sheep) { const d = Math.hypot(s.x - cx, s.y - cy); if (d > farD) { farD = d; far = s; } }
    let collector = -1;
    if (farD > fN && inGoalFrac < 0.9) {
      let best = Infinity;
      dogs.forEach((g, i) => { const d = Math.hypot(g.x - far.x, g.y - far.y); if (d < best) { best = d; collector = i; } });
      const g = dogs[collector];
      const ux = (far.x - cx) / farD, uy = (far.y - cy) / farD;
      moveDog(g, far.x + ux * 5 * U, far.y + uy * 5 * U, dogSpeed * 1.1);
    }
    const radius = Math.min(Math.max(R, 6 * U), fN) + 9 * U;
    const spread = inGoalFrac > 0.9 ? 1.25 : 0.85; // widen and hold when the job is done
    const angles = [-spread, 0, spread];
    // assign slots by angle order so dogs do not cross the flock
    const order = dogs
      .map((g, i) => ({ i, a: Math.atan2(g.y - cy, g.x - cx) - Math.atan2(dy, dx) }))
      .map((o) => ({ ...o, a: wrap(o.a) }))
      .sort((p, q) => p.a - q.a)
      .map((o) => o.i);
    const drivers = order.filter((i) => i !== collector);
    const slotAngles = drivers.length === angles.length ? angles : [-spread * 0.6, spread * 0.6];
    drivers.forEach((di, k) => {
      const th = slotAngles[k];
      const ux = dx * Math.cos(th) - dy * Math.sin(th);
      const uy = dx * Math.sin(th) + dy * Math.cos(th);
      moveDog(dogs[di], cx + ux * radius, cy + uy * radius, dogSpeed);
    });
    for (const g of dogs) {
      g.trail.push([g.x, g.y]);
      if (g.trail.length > 70) g.trail.shift();
    }

    function moveDog(g, tx, ty, maxSpeed) {
      tx = clamp(tx, 2 * U, W - 2 * U); ty = clamp(ty, 2 * U, H - 2 * U);
      let vx = tx - g.x, vy = ty - g.y;
      const vl = Math.hypot(vx, vy);
      const sp = Math.min(maxSpeed, vl * 0.12);
      if (vl > 0) { vx = (vx / vl) * sp; vy = (vy / vl) * sp; }
      g.vx = 0.7 * g.vx + 0.3 * vx; g.vy = 0.7 * g.vy + 0.3 * vy;
      g.x += g.vx; g.y += g.vy;
    }

    // move the goal once the flock has settled in it
    if (inGoalFrac >= 0.9) {
      settle++;
      if (settle > 140) { relocateGoal(cx, cy); settle = 0; }
    } else settle = 0;
  }

  function countInGoal() {
    let n = 0;
    for (const s of sheep) if (Math.hypot(s.x - goal.x, s.y - goal.y) < goal.r) n++;
    return n;
  }

  function relocateGoal(cx, cy) {
    for (let t = 0; t < 30; t++) {
      const x = W * (0.15 + 0.7 * rng()), y = H * (0.15 + 0.7 * rng());
      if (Math.hypot(x - cx, y - cy) > Math.min(W, H) * 0.45) { goal.x = x; goal.y = y; return; }
    }
    goal.x = W - goal.x; goal.y = H - goal.y;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // occupancy-map grid
    ctx.strokeStyle = colors.rule; ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
    const gs = 10 * U;
    ctx.beginPath();
    for (let x = gs; x < W; x += gs) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
    for (let y = gs; y < H; y += gs) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
    ctx.stroke(); ctx.globalAlpha = 1;

    // goal
    ctx.fillStyle = colors.green; ctx.globalAlpha = 0.1;
    ctx.beginPath(); ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = colors.green; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(goal.x, goal.y, 2.2, 0, Math.PI * 2); ctx.fillStyle = colors.green; ctx.fill();

    // dog trails
    dogs.forEach((g, k) => {
      ctx.strokeStyle = colors.dogs[k]; ctx.lineWidth = 1.5;
      for (let i = 1; i < g.trail.length; i++) {
        ctx.globalAlpha = (i / g.trail.length) * 0.5;
        ctx.beginPath(); ctx.moveTo(g.trail[i - 1][0], g.trail[i - 1][1]); ctx.lineTo(g.trail[i][0], g.trail[i][1]); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // the string between shepherds (sorted along the arc)
    const sorted = [...dogs].sort((a, b) => a.x * 1e-3 + Math.atan2(a.y - goal.y, a.x - goal.x) - (b.x * 1e-3 + Math.atan2(b.y - goal.y, b.x - goal.x)));
    ctx.strokeStyle = colors.ink2; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); sorted.forEach((g, i) => (i ? ctx.lineTo(g.x, g.y) : ctx.moveTo(g.x, g.y))); ctx.stroke();
    ctx.setLineDash([]);

    // sheep
    ctx.fillStyle = colors.ink;
    for (const s of sheep) { ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(2.4, 0.95 * U), 0, Math.PI * 2); ctx.fill(); }

    // dogs
    dogs.forEach((g, k) => {
      const a = Math.atan2(g.vy, g.vx) || 0, r = Math.max(6, 2.2 * U);
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, r * 0.65); ctx.lineTo(-r * 0.7, -r * 0.65); ctx.closePath();
      ctx.fillStyle = colors.dogs[k]; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = colors.surface; ctx.stroke();
      ctx.restore();
    });

    if (onStat) onStat(countInGoal(), sheep.length);
  }

  function loop() {
    step(); step();
    draw();
    raf = running && visible ? requestAnimationFrame(loop) : 0;
  }

  function play() { if (!raf && running && visible) raf = requestAnimationFrame(loop); }
  function setRunning(v) {
    running = v;
    if (toggleBtn) { toggleBtn.textContent = v ? "Pause" : "Play"; toggleBtn.setAttribute("aria-pressed", String(!v)); }
    if (v) play(); else { cancelAnimationFrame(raf); raf = 0; }
  }

  // input: click or tap moves the goal
  canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    goal.x = clamp(e.clientX - r.left, goal.r * 0.6, W - goal.r * 0.6);
    goal.y = clamp(e.clientY - r.top, goal.r * 0.6, H - goal.r * 0.6);
    settle = 0;
    if (!running) { for (let i = 0; i < 4; i++) step(); draw(); }
  });
  toggleBtn?.addEventListener("click", () => setRunning(!running));

  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) play(); }, { threshold: 0.05 }).observe(canvas);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { colors = readColors(); draw(); });
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) play(); });

  resize();
  init();
  if (!running) {
    // reduced motion: show a settled, mid-drive frame and wait for Play
    for (let i = 0; i < 520; i++) step();
    setRunning(false);
    draw();
  } else {
    setRunning(true);
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
