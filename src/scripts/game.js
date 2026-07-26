/**
 * game.js — the hero easter egg: a small boss fight against the GameJam logo.
 *
 * LOADED ON DEMAND ONLY. scripts/main.js fetches this file the first time a
 * visitor presses "Spæl" or the logo, so people who never find it never pay
 * for it. Nothing on the page depends on this script.
 *
 * Layout-aware: on a wide hero the logo sits to the right, so play runs
 * left→right (Space Impact style). On a narrow/stacked hero the logo is on
 * top, so play runs bottom→up (Space Invaders style). One code path, driven
 * by `dir`.
 *
 * Art note: ship + effects are drawn here as original vector art. Swap in a
 * real sprite later by passing { shipSrc: "/img/ship.png" } to start().
 */
(function () {
  "use strict";

  /* ---- tunables ------------------------------------------------------ */
  var PLAYER_SPEED = 330;   // px per second
  var BULLET_SPEED = 660;
  var SHOT_SPEED = 285;     // boss projectiles
  var FIRE_COOLDOWN = 0.16; // seconds between player shots
  var BOSS_FIRE_EVERY = 0.78;
  var BOSS_HP = 100;
  var HIT_DAMAGE = 4;
  var LIVES = 3;
  var INVULN = 1.2;         // seconds of mercy after being hit

  /* ---- state --------------------------------------------------------- */
  var hero, logoEl, canvas, ctx, closeBtn, msgEl, triggerEl;
  var W = 0, H = 0, dpr = 1, mode = "horizontal", reduced = false;
  var raf = null, last = 0, running = false, over = false;
  var keys = {}, drag = null, shake = 0, flashing = false;
  var player, bullets, shots, parts, boss, dir, shipImg = null;

  function q(sel, root) { return (root || document).querySelector(sel); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---- setup --------------------------------------------------------- */

  function start(opts) {
    opts = opts || {};
    hero = opts.hero || q(".hero");
    if (!hero || running) return;
    logoEl = q(".hero__mascot", hero);
    if (!logoEl) return;
    triggerEl = opts.returnFocusTo || null;

    reduced = !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    if (opts.shipSrc) {
      shipImg = new Image();
      shipImg.src = opts.shipSrc;
    }

    boss = { hp: BOSS_HP, ox: 0, oy: 0, t: 0, fire: 0.6, flash: 0,
             bx: 0, by: 0, bw: 0, bh: 0, amp: 0 };

    buildDom();
    measure();
    reset();
    bind();

    hero.classList.add("hero--playing");
    running = true; over = false; last = 0;
    raf = requestAnimationFrame(loop);
    if (closeBtn) closeBtn.focus();
  }

  function buildDom() {
    canvas = document.createElement("canvas");
    canvas.className = "hero__game";
    canvas.setAttribute("aria-hidden", "true");
    hero.appendChild(canvas);
    ctx = canvas.getContext("2d");

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "game__close";
    closeBtn.setAttribute("aria-label", "Enda spælið");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", exit);
    hero.appendChild(closeBtn);
  }

  function measure() {
    var hr = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(hr.width));
    H = Math.max(1, Math.round(hr.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    mode = W >= 820 ? "horizontal" : "vertical";
    dir = mode === "horizontal" ? { x: 1, y: 0 } : { x: 0, y: -1 };

    // Boss hitbox = the logo's box, trimmed for its transparent margins.
    var prev = logoEl.style.transform;
    logoEl.style.transform = "none";
    var lr = logoEl.getBoundingClientRect();
    logoEl.style.transform = prev;

    var inset = 0.30;
    boss.bw = lr.width * (1 - inset);
    boss.bh = lr.height * (1 - inset);
    boss.bx = (lr.left - hr.left) + (lr.width * inset) / 2;
    boss.by = (lr.top - hr.top) + (lr.height * inset) / 2;
    boss.amp = mode === "horizontal"
      ? clamp((H - boss.bh) / 2 - 12, 0, 70)
      : clamp((W - boss.bw) / 2 - 12, 0, 70);
  }

  function region() {
    if (mode === "horizontal") {
      return { x0: 28, x1: Math.max(70, W * 0.34), y0: 28, y1: H - 28 };
    }
    return { x0: 28, x1: W - 28, y0: Math.max(70, H * 0.52), y1: H - 28 };
  }

  function reset() {
    var r = region();
    player = {
      x: mode === "horizontal" ? r.x0 + 22 : (r.x0 + r.x1) / 2,
      y: mode === "horizontal" ? (r.y0 + r.y1) / 2 : r.y1 - 18,
      r: 15, cool: 0, lives: LIVES, inv: 0
    };
    bullets = []; shots = []; parts = [];
    boss.hp = BOSS_HP; boss.ox = 0; boss.oy = 0; boss.t = 0;
    boss.fire = 0.6; boss.flash = 0;
    shake = 0;
    restoreLogo();
  }

  /* ---- input --------------------------------------------------------- */

  function onKeyDown(e) {
    if (!running) return;
    var k = e.key;
    if (k === "Escape") { exit(); return; }
    keys[k] = true;
    if (k === " " || k === "ArrowUp" || k === "ArrowDown" ||
        k === "ArrowLeft" || k === "ArrowRight") {
      e.preventDefault(); // only while the game owns the keyboard
    }
  }
  function onKeyUp(e) { keys[e.key] = false; }

  function localPoint(e) {
    var hr = hero.getBoundingClientRect();
    return { x: e.clientX - hr.left, y: e.clientY - hr.top };
  }
  function onPointerDown(e) { drag = localPoint(e); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); }
  function onPointerMove(e) { if (drag) drag = localPoint(e); }
  function onPointerUp() { drag = null; }

  function bind() {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", onResize);
  }
  function unbind() {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", onResize);
  }
  function onResize() {
    if (!running) return;
    measure();
    var r = region();
    player.x = clamp(player.x, r.x0, r.x1);
    player.y = clamp(player.y, r.y0, r.y1);
  }

  /* ---- loop ---------------------------------------------------------- */

  function loop(ts) {
    if (!running) return;
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (!over) update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    var r = region();

    /* player movement — keyboard, or follow the finger/pointer */
    var mx = 0, my = 0;
    if (keys.ArrowLeft || keys.a || keys.A) mx -= 1;
    if (keys.ArrowRight || keys.d || keys.D) mx += 1;
    if (keys.ArrowUp || keys.w || keys.W) my -= 1;
    if (keys.ArrowDown || keys.s || keys.S) my += 1;

    if (drag) {
      var dx = drag.x - player.x, dy = drag.y - player.y;
      var d = Math.hypot(dx, dy);
      if (d > 2) { mx = dx / d; my = dy / d; }
    } else if (mx || my) {
      var m = Math.hypot(mx, my) || 1;
      mx /= m; my /= m;
    }
    player.x = clamp(player.x + mx * PLAYER_SPEED * dt, r.x0, r.x1);
    player.y = clamp(player.y + my * PLAYER_SPEED * dt, r.y0, r.y1);

    /* firing — space on desktop, auto-fire while dragging on touch */
    player.cool -= dt;
    if ((keys[" "] || drag) && player.cool <= 0) {
      player.cool = FIRE_COOLDOWN;
      bullets.push({
        x: player.x + dir.x * player.r,
        y: player.y + dir.y * player.r
      });
    }
    if (player.inv > 0) player.inv -= dt;

    /* boss drifts along the axis it has room on, and shoots back */
    boss.t += dt;
    var sway = Math.sin(boss.t * 0.9) * boss.amp;
    if (mode === "horizontal") { boss.oy = sway; boss.ox = Math.sin(boss.t * 0.5) * 12; }
    else { boss.ox = sway; boss.oy = Math.sin(boss.t * 0.5) * 10; }

    boss.fire -= dt;
    if (boss.fire <= 0) {
      boss.fire = BOSS_FIRE_EVERY;
      var bx = bossCx(), by = bossCy();
      var ax = player.x - bx, ay = player.y - by;
      var al = Math.hypot(ax, ay) || 1;
      for (var s = -1; s <= 1; s++) {
        var a = Math.atan2(ay / al, ax / al) + s * 0.22;
        shots.push({ x: bx, y: by, vx: Math.cos(a) * SHOT_SPEED, vy: Math.sin(a) * SHOT_SPEED });
      }
    }
    if (boss.flash > 0) boss.flash -= dt;
    applyLogo();

    /* player bullets */
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += dir.x * BULLET_SPEED * dt;
      b.y += dir.y * BULLET_SPEED * dt;
      if (b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) { bullets.splice(i, 1); continue; }
      if (hitsBoss(b.x, b.y)) {
        bullets.splice(i, 1);
        boss.hp -= HIT_DAMAGE;
        boss.flash = 0.09;
        burst(b.x, b.y, reduced ? 3 : 7, ["#f4f4f4", "#90bae6"]);
        if (boss.hp <= 0) { win(); return; }
      }
    }

    /* boss projectiles */
    for (var j = shots.length - 1; j >= 0; j--) {
      var sh = shots[j];
      sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      if (sh.x < -40 || sh.x > W + 40 || sh.y < -40 || sh.y > H + 40) { shots.splice(j, 1); continue; }
      if (player.inv <= 0 && Math.hypot(sh.x - player.x, sh.y - player.y) < player.r + 6) {
        shots.splice(j, 1);
        player.lives -= 1;
        player.inv = INVULN;
        if (!reduced) shake = 0.28;
        burst(player.x, player.y, reduced ? 6 : 18, ["#ca4e3a", "#f4f4f4"]);
        if (player.lives <= 0) { lose(); return; }
      }
    }

    /* particles */
    for (var p = parts.length - 1; p >= 0; p--) {
      var pt = parts[p];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.98; pt.vy *= 0.98;
      pt.life -= dt;
      if (pt.life <= 0) parts.splice(p, 1);
    }
    if (shake > 0) shake -= dt;
  }

  function bossCx() { return boss.bx + boss.ox + boss.bw / 2; }
  function bossCy() { return boss.by + boss.oy + boss.bh / 2; }
  function hitsBoss(x, y) {
    return x > boss.bx + boss.ox && x < boss.bx + boss.ox + boss.bw &&
           y > boss.by + boss.oy && y < boss.by + boss.oy + boss.bh;
  }

  function applyLogo() {
    logoEl.style.transform = "translate(" + boss.ox.toFixed(1) + "px," + boss.oy.toFixed(1) + "px)";
    var want = boss.flash > 0;
    if (want !== flashing) {
      flashing = want;
      logoEl.style.filter = want ? "brightness(1.9) saturate(0.45)" : "";
    }
  }

  function burst(x, y, n, colours) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 40 + Math.random() * 190;
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.5,
        c: colours[(Math.random() * colours.length) | 0]
      });
    }
  }

  /* ---- drawing ------------------------------------------------------- */

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake * 22, (Math.random() - 0.5) * shake * 22);
    }

    // player bullets
    ctx.fillStyle = "#f4f4f4";
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, dir.x ? 9 : 3, dir.x ? 3 : 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // boss projectiles
    for (var j = 0; j < shots.length; j++) {
      var s = shots[j];
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ca4e3a";
      ctx.fill();
    }

    // particles
    for (var p = 0; p < parts.length; p++) {
      var pt = parts[p];
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2));
      ctx.fillStyle = pt.c;
      ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // ship (hidden briefly while blinking after a hit)
    if (!over && !(player.inv > 0 && Math.floor(player.inv * 12) % 2)) {
      drawShip(player.x, player.y, player.r, dir.x ? 0 : -Math.PI / 2);
    }

    ctx.restore();
    drawHud();
  }

  function drawShip(x, y, r, angle) {
    var useImg = shipImg && shipImg.complete && shipImg.naturalWidth;

    ctx.save();
    ctx.translate(x, y);
    // A saucer reads as level in both orientations, so only the drawn
    // placeholder (which has a nose) gets rotated to face its direction.
    if (!useImg) ctx.rotate(angle);

    if (useImg) {
      var w = r * 3.6, h = (shipImg.naturalHeight / shipImg.naturalWidth) * w;
      var smooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;   // keep the pixel art crisp
      ctx.drawImage(shipImg, Math.round(-w / 2), Math.round(-h / 2), w, h);
      ctx.imageSmoothingEnabled = smooth;
      ctx.restore();
      return;
    }

    // engine flare
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, 0);
    ctx.lineTo(-r * (1.15 + Math.random() * 0.35), 0);
    ctx.strokeStyle = "#ca4e3a";
    ctx.lineWidth = r * 0.34;
    ctx.lineCap = "round";
    ctx.stroke();

    // hull
    ctx.beginPath();
    ctx.moveTo(r * 1.05, 0);
    ctx.lineTo(-r * 0.6, r * 0.62);
    ctx.lineTo(-r * 0.28, 0);
    ctx.lineTo(-r * 0.6, -r * 0.62);
    ctx.closePath();
    ctx.fillStyle = "#f4f4f4";
    ctx.fill();

    // cockpit
    ctx.beginPath();
    ctx.arc(r * 0.12, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#039685";
    ctx.fill();

    ctx.restore();
  }

  function drawHud() {
    // boss health bar — kept clear of the close button in the top-right
    var pad = 22, barH = 9, reserve = 58;
    var w, x, y;
    if (mode === "horizontal") {
      w = Math.min(W - pad * 2 - reserve, 420);
      x = W - pad - reserve - w;
      y = pad + 4;
    } else {
      w = Math.min(W - pad * 2, 420);
      x = (W - w) / 2;
      y = pad + reserve;      // sits below the close button on narrow screens
    }
    ctx.fillStyle = "rgba(244,244,244,0.28)";
    ctx.fillRect(x, y, w, barH);
    ctx.fillStyle = "#ca4e3a";
    ctx.fillRect(x, y, w * Math.max(0, boss.hp / BOSS_HP), barH);

    // lives — small copies of the player's own ship
    var useImg = shipImg && shipImg.complete && shipImg.naturalWidth;
    for (var i = 0; i < player.lives; i++) {
      var lx = pad + 12 + i * 34, ly = H - pad - 6;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.globalAlpha = 0.92;
      if (useImg) {
        var lw = 26, lh = (shipImg.naturalHeight / shipImg.naturalWidth) * lw;
        var sm = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(shipImg, Math.round(-lw / 2), Math.round(-lh / 2), lw, lh);
        ctx.imageSmoothingEnabled = sm;
      } else {
        ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(-5, 5); ctx.lineTo(-2, 0); ctx.lineTo(-5, -5);
        ctx.closePath();
        ctx.fillStyle = "rgba(244,244,244,0.9)";
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- end states ---------------------------------------------------- */

  function win() {
    over = true;
    burst(bossCx(), bossCy(), reduced ? 14 : 70, ["#ca4e3a", "#f4f4f4", "#90bae6"]);
    if (!reduced) shake = 0.5;
    logoEl.style.transition = "transform 700ms ease, opacity 700ms ease";
    logoEl.style.transform = "translate(" + boss.ox + "px," + boss.oy + "px) scale(0.25) rotate(14deg)";
    logoEl.style.opacity = "0";
    showMsg("Vunnið!", "Tú vann á bossanum.");
  }

  function lose() {
    over = true;
    showMsg("Endað", "Bossin vann henda ferðina.");
  }

  function showMsg(title, sub) {
    msgEl = document.createElement("div");
    msgEl.className = "game__msg";
    msgEl.setAttribute("role", "status");
    msgEl.innerHTML =
      '<p class="game__msg-title"></p><p class="game__msg-sub"></p>' +
      '<span class="game__msg-actions">' +
      '<button type="button" class="button button--primary" data-retry>Royn aftur</button>' +
      '<button type="button" class="button button--secondary" data-exit>Enda</button>' +
      "</span>";
    q(".game__msg-title", msgEl).textContent = title;
    q(".game__msg-sub", msgEl).textContent = sub;
    hero.appendChild(msgEl);
    q("[data-retry]", msgEl).addEventListener("click", retry);
    q("[data-exit]", msgEl).addEventListener("click", exit);
    q("[data-retry]", msgEl).focus();
  }

  function retry() {
    if (msgEl) { msgEl.remove(); msgEl = null; }
    measure();
    reset();
    over = false;
    last = 0;
    if (closeBtn) closeBtn.focus();
  }

  function restoreLogo() {
    logoEl.style.transition = "";
    logoEl.style.transform = "";
    logoEl.style.opacity = "";
    logoEl.style.filter = "";
    flashing = false;
  }

  function exit() {
    if (!running) return;
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    unbind();
    keys = {}; drag = null;
    if (msgEl) { msgEl.remove(); msgEl = null; }
    if (canvas) { canvas.remove(); canvas = null; }
    if (closeBtn) { closeBtn.remove(); closeBtn = null; }
    restoreLogo();
    hero.classList.remove("hero--playing");
    if (triggerEl && triggerEl.focus) triggerEl.focus();
  }

  window.GJGame = { start: start, stop: exit };
})();
