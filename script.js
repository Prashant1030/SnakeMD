(() => {
  'use strict';

  // ====== DOM ======
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const levelEl = document.getElementById('level');

  const overlay = document.getElementById('overlay');
  const btnStart = document.getElementById('btnStart');

  const btnSettings = document.getElementById('btnSettings');
  const settingsPanel = document.getElementById('settingsPanel');
  const toggleWalls = document.getElementById('toggleWalls');
  const selectTheme = document.getElementById('selectTheme');
  const btnResetHigh = document.getElementById('btnResetHigh');
  const btnTheme = document.getElementById('btnTheme');

  const btnUp = document.getElementById('dirUp');
  const btnDown = document.getElementById('dirDown');
  const btnLeft = document.getElementById('dirLeft');
  const btnRight = document.getElementById('dirRight');
  const btnCenter = document.getElementById('btnCenter');

  const toast = document.getElementById('toast');

  // ====== Config ======
  const GRID = 28;              // board is GRID x GRID cells
  const MAX_BOARD_PX = 560;     // canvas max size
  const MIN_BOARD_PX = 360;

  const BASE_SPEED = 7;         // moves/sec at Level 1
  const SPEED_PER_LEVEL = 2;    // +2 moves/sec each level
  const POINTS_PER_LEVEL = 100; // advance level every 100 points

  const BONUS_INTERVAL = 5;     // spawn bonus after every 5 red foods
  const BONUS_POINTS = 5;
  const BONUS_LIFETIME_MS = 4000;

  // ====== State ======
  let tile = 16;                // computed size in px per cell
  let running = false;
  let gameOver = false;

  let snake = [];               // array of segments {x,y}
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let changedThisTick = false;

  let score = 0;
  let highScore = 0;
  let level = 1;
  let foodsEaten = 0;           // counts only red foods

  let wallsOn = true;
  let theme = 'dark';

  let food = null;              // {x,y}
  let bonus = null;             // {x,y, expiresAt:number}
  let mouthOpenUntil = 0;       // timestamp until which mouth is open

  let lastTs = 0;
  let acc = 0;

  // ====== Setup / Persistence ======
  function loadPrefs() {
    highScore = parseInt(localStorage.getItem('snake:high') || '0', 10);
    wallsOn = localStorage.getItem('snake:walls') !== 'off';
    theme = localStorage.getItem('snake:theme') || 'dark';
    updateTheme(theme);
  }

  function saveHigh() {
    localStorage.setItem('snake:high', String(highScore));
  }
  function saveWalls() {
    localStorage.setItem('snake:walls', wallsOn ? 'on' : 'off');
  }
  function saveTheme() {
    localStorage.setItem('snake:theme', theme);
  }

  function fitCanvas() {
    const size = Math.min(
      MAX_BOARD_PX,
      Math.max(MIN_BOARD_PX, Math.floor(window.innerWidth - 32))
    );
    tile = Math.floor(size / GRID);
    const snap = tile * GRID;
    canvas.width = snap;
    canvas.height = snap;
  }

  function levelSpeed(lvl) {
    return BASE_SPEED + SPEED_PER_LEVEL * (lvl - 1);
  }

  function stepMs() {
    return 1000 / levelSpeed(level);
  }

  function showOverlay() {
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function showToast(msg, ms = 1400) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), ms);
  }

  // ====== Game Init / Reset ======
  function startPositions() {
    // Snake length at start = half of the playzone width (GRID / 2)
    const len = Math.floor(GRID / 2);
    const cy = Math.floor(GRID / 2);
    const startX = Math.floor(GRID / 2 - len / 2);

    const arr = [];
    for (let i = 0; i < len; i++) {
      arr.push({ x: startX + i, y: cy });
    }
    return arr;
  }

  function resetGame(hard = false) {
    snake = startPositions();
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    changedThisTick = false;

    food = spawnFood();
    bonus = null;
    mouthOpenUntil = 0;
    foodsEaten = 0;

    if (hard) {
      score = 0;
      level = 1;
    }

    updateHUD();
  }

  function updateHUD() {
    scoreEl.textContent = String(score);
    highScoreEl.textContent = String(highScore);
    levelEl.textContent = String(level);
    toggleWalls.checked = wallsOn;
    selectTheme.value = theme;
    btnCenter.textContent = running && !gameOver ? '⏸' : (gameOver ? '↻' : '▶');
  }

  // ====== Utilities ======
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function cellEq(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function occupiedBySnake(p) {
    return snake.some(s => s.x === p.x && s.y === p.y);
  }

  function spawnFood() {
    while (true) {
      const p = { x: randInt(0, GRID - 1), y: randInt(0, GRID - 1) };
      if (!occupiedBySnake(p) && (!bonus || !cellEq(p, bonus))) return p;
    }
  }

  function spawnBonus() {
    // Only one bonus at a time
    if (bonus) return;
    const now = performance.now();
    let p;
    do {
      p = { x: randInt(0, GRID - 1), y: randInt(0, GRID - 1) };
    } while (occupiedBySnake(p) || cellEq(p, food));
    bonus = { x: p.x, y: p.y, expiresAt: now + BONUS_LIFETIME_MS };
  }

  function clampWrap(n, min, max) {
    // wrap to [min,max]
    const span = max - min + 1;
    let r = (n - min) % span;
    if (r < 0) r += span;
    return min + r;
  }

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  function setDirection(x, y) {
    if (!running || gameOver) return;
    if (changedThisTick) return;
    const proposal = { x, y };
    if (isOpposite(proposal, dir)) return;
    nextDir = proposal;
    changedThisTick = true;
  }

  function updateTheme(next) {
    theme = next === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  }

  // ====== Input ======
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter','w','a','s','d','W','A','S','D','p','P','r','R'].includes(k)) {
      e.preventDefault();
    }
    switch (k) {
      case 'ArrowUp': case 'w': case 'W': setDirection(0,-1); break;
      case 'ArrowDown': case 's': case 'S': setDirection(0, 1); break;
      case 'ArrowLeft': case 'a': case 'A': setDirection(-1,0); break;
      case 'ArrowRight': case 'd': case 'D': setDirection(1, 0); break;
      case ' ': case 'Enter': toggleRunPause(); break;
      case 'p': case 'P': toggleRunPause(); break;
      case 'r': case 'R': if (gameOver) restart(); break;
    }
  }, { passive: false });

  function bindPointer(el, fn) {
    el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); fn(); }, { passive: false });
  }
  bindPointer(btnUp, () => setDirection(0,-1));
  bindPointer(btnDown, () => setDirection(0, 1));
  bindPointer(btnLeft, () => setDirection(-1,0));
  bindPointer(btnRight, () => setDirection(1, 0));
  bindPointer(btnCenter, () => {
    if (gameOver) restart();
    else toggleRunPause();
  });

  btnStart.addEventListener('click', () => {
    hideOverlay();
    restart(true);
  });

  btnSettings.addEventListener('click', () => {
    settingsPanel.showModal();
  });

  btnResetHigh.addEventListener('click', () => {
    highScore = 0;
    saveHigh();
    updateHUD();
    showToast('High score reset');
  });

  toggleWalls.addEventListener('change', () => {
    wallsOn = toggleWalls.checked;
    saveWalls();
    showToast(`Walls ${wallsOn ? 'ON' : 'OFF'}`);
  });

  selectTheme.addEventListener('change', () => {
    updateTheme(selectTheme.value);
    saveTheme();
  });

  btnTheme.addEventListener('click', () => {
    updateTheme(theme === 'dark' ? 'light' : 'dark');
    selectTheme.value = theme;
    saveTheme();
  });

  // ====== Game Loop ======
  function toggleRunPause(force) {
    if (typeof force === 'boolean') running = force;
    else running = !running;
    if (gameOver) running = false;
    updateHUD();
  }

  function restart(hard = false) {
    gameOver = false;
    toggleRunPause(true);
    resetGame(hard);
  }

  function tickUpdate() {
    // Apply new direction at tick start
    dir = nextDir;

    // Next head
    const head = snake[0];
    let nx = head.x + dir.x;
    let ny = head.y + dir.y;

    if (wallsOn) {
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
        return endGame();
      }
    } else {
      nx = clampWrap(nx, 0, GRID - 1);
      ny = clampWrap(ny, 0, GRID - 1);
    }

    const newHead = { x: nx, y: ny };

    // Self-collision
    if (occupiedBySnake(newHead)) {
      return endGame();
    }

    // Move
    snake.unshift(newHead);

    // Eating checks
    const now = performance.now();

    if (cellEq(newHead, food)) {
      score += 1;
      foodsEaten += 1;
      mouthOpenUntil = now + 300;
      food = spawnFood();
      // Bonus rule: every 5 red foods, spawn bonus
      if (foodsEaten % BONUS_INTERVAL === 0) spawnBonus();
      // grow (do nothing; we already unshifted without popping)
    } else if (bonus && cellEq(newHead, bonus)) {
      score += BONUS_POINTS;
      mouthOpenUntil = now + 300;
      bonus = null; // collected
      // keep growth for bonus too
    } else {
      // no food eaten: move tail forward
      snake.pop();
    }

    // Bonus expiration
    if (bonus && now > bonus.expiresAt) {
      bonus = null;
    }

    // High score
    if (score > highScore) {
      highScore = score;
      saveHigh();
    }

    // Level progression
    const nextLevel = Math.floor(score / POINTS_PER_LEVEL) + 1;
    if (nextLevel !== level) {
      level = nextLevel;
      showToast(`Level ${level}! Speed up`);
    }

    updateHUD();
    changedThisTick = false;
  }

  function endGame() {
    running = false;
    gameOver = true;
    updateHUD();
    showToast('Game Over — tap ↻ to restart', 1800);
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = ts - lastTs;
    lastTs = ts;

    if (running && !gameOver) {
      acc += dt;
      const step = stepMs();
      while (acc >= step) {
        tickUpdate();
        acc -= step;
      }
    } else {
      changedThisTick = false; // allow direction set while paused
    }

    draw();
    requestAnimationFrame(loop);
  }

  // ====== Rendering ======
  function draw() {
    // background
    const bg = getCss('--bg', '#0e1116');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle grid
    ctx.strokeStyle = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      const p = i * tile;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(canvas.width, p); ctx.stroke();
    }

    // draw food
    if (food) drawFood(food.x, food.y, getCss('--accent-2', '#e84141'));
    // draw bonus (with pulse)
    if (bonus) drawBonus(bonus);

    // draw snake body (tail -> head for layering)
    if (snake.length > 0) {
      drawTail();
      drawBody();
      drawHead();
    }
  }

  function cellRect(x, y, pad = 0) {
    return [x * tile + pad, y * tile + pad, tile - pad * 2, tile - pad * 2];
  }

  function drawFood(x, y, color) {
    const cx = x * tile + tile / 2;
    const cy = y * tile + tile / 2;
    const r = Math.max(3, Math.floor(tile * 0.3));
    ctx.fillStyle = color;
    circle(cx, cy, r);
  }

  function drawBonus(b) {
    const cx = b.x * tile + tile / 2;
    const cy = b.y * tile + tile / 2;
    // pulse by time
    const t = (b.expiresAt - performance.now()) / BONUS_LIFETIME_MS;
    const pulse = 0.85 + 0.15 * Math.sin(performance.now() / 120);
    const r = Math.max(3, Math.floor(tile * 0.28 * pulse));
    ctx.fillStyle = getCss('--bonus', '#19c37d');
    circle(cx, cy, r);
    // thin ring
    ctx.lineWidth = Math.max(1, Math.floor(tile * 0.08));
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(cx, cy, r + ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
    // tiny timer arc (optional visual)
    ctx.lineWidth = Math.max(1, Math.floor(tile * 0.06));
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, r + ctx.lineWidth * 1.6, -Math.PI/2, -Math.PI/2 + Math.max(0, 2 * Math.PI * t));
    ctx.stroke();
  }

  function drawTail() {
    // Tail = last element; orientation = last-1 -> last
    if (snake.length < 2) return;
    const tail = snake[snake.length - 1];
    const before = snake[snake.length - 2];
    const vx = tail.x - before.x;
    const vy = tail.y - before.y;

    // Tail base
    const pad = Math.max(1, Math.floor(tile * 0.12));
    ctx.fillStyle = getCss('--accent', '#2ecc71');
    const [x, y, w, h] = cellRect(tail.x, tail.y, pad);
    roundRect(x, y, w, h, Math.floor(tile * 0.25));

    // Rounded end cap
    ctx.fillStyle = getCss('--accent', '#2ecc71');
    const cx = tail.x * tile + tile / 2;
    const cy = tail.y * tile + tile / 2;
    const capR = Math.max(2, Math.floor(tile * 0.28));
    const tipOffset = Math.floor(tile * 0.25);
    circle(cx - vx * tipOffset, cy - vy * tipOffset, capR);
  }

  function drawBody() {
    // Body segments between head and tail
    ctx.fillStyle = getCss('--accent', '#2ecc71');
    const pad = Math.max(1, Math.floor(tile * 0.10));
    for (let i = 1; i < snake.length - 1; i++) {
      const s = snake[i];
      const [x, y, w, h] = cellRect(s.x, s.y, pad);
      roundRect(x, y, w, h, Math.floor(tile * 0.2));
    }
  }

  function drawHead() {
    const head = snake[0];
    const neck = snake[1] || head;
    const vx = head.x - neck.x;
    const vy = head.y - neck.y;

    // Head base
    const baseColor = lighten(getCss('--accent', '#2ecc71'), 0.12);
    ctx.fillStyle = baseColor;
    const pad = Math.max(1, Math.floor(tile * 0.08));
    const [x, y, w, h] = cellRect(head.x, head.y, pad);
    roundRect(x, y, w, h, Math.floor(tile * 0.28));

    // Mouth direction = current movement vector (dir)
    const front = { x: head.x + dir.x, y: head.y + dir.y };

    // Draw mouth wedge by subtracting a triangle from the head front
    const now = performance.now();
    const mouthOpen = now < mouthOpenUntil;
    const mouthDepth = mouthOpen ? Math.floor(tile * 0.42) : Math.floor(tile * 0.22);
    const mouthWidth = Math.floor(tile * (mouthOpen ? 0.55 : 0.38));
    ctx.fillStyle = getCss('--bg', '#0e1116');

    ctx.beginPath();
    if (dir.x === 1) {
      // right-facing mouth (triangle at right side)
      const mx = head.x * tile + tile - pad;
      const my = head.y * tile + tile / 2;
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - mouthDepth, my - mouthWidth / 2);
      ctx.lineTo(mx - mouthDepth, my + mouthWidth / 2);
    } else if (dir.x === -1) {
      const mx = head.x * tile + pad;
      const my = head.y * tile + tile / 2;
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + mouthDepth, my - mouthWidth / 2);
      ctx.lineTo(mx + mouthDepth, my + mouthWidth / 2);
    } else if (dir.y === 1) {
      const mx = head.x * tile + tile / 2;
      const my = head.y * tile + tile - pad;
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - mouthWidth / 2, my - mouthDepth);
      ctx.lineTo(mx + mouthWidth / 2, my - mouthDepth);
    } else {
      const mx = head.x * tile + tile / 2;
      const my = head.y * tile + pad;
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - mouthWidth / 2, my + mouthDepth);
      ctx.lineTo(mx + mouthWidth / 2, my + mouthDepth);
    }
    ctx.closePath();
    ctx.fill();

    // Eyes slightly behind mouth
    const eyeR = Math.max(2, Math.floor(tile * 0.10));
    const eyeOffsetFront = Math.floor(tile * 0.28);  // how far from mouth towards center
    const eyeOffsetSide = Math.floor(tile * 0.22);   // vertical separation
    const cx = head.x * tile + tile / 2;
    const cy = head.y * tile + tile / 2;

    let e1x, e1y, e2x, e2y;
    if (dir.x === 1) {
      e1x = cx + tile / 2 - eyeOffsetFront; e1y = cy - eyeOffsetSide;
      e2x = cx + tile / 2 - eyeOffsetFront; e2y = cy + eyeOffsetSide;
    } else if (dir.x === -1) {
      e1x = cx - tile / 2 + eyeOffsetFront; e1y = cy - eyeOffsetSide;
      e2x = cx - tile / 2 + eyeOffsetFront; e2y = cy + eyeOffsetSide;
    } else if (dir.y === 1) {
      e1x = cx - eyeOffsetSide; e1y = cy + tile / 2 - eyeOffsetFront;
      e2x = cx + eyeOffsetSide; e2y = cy + tile / 2 - eyeOffsetFront;
    } else { // up
      e1x = cx - eyeOffsetSide; e1y = cy - tile / 2 + eyeOffsetFront;
      e2x = cx + eyeOffsetSide; e2y = cy - tile / 2 + eyeOffsetFront;
    }
    ctx.fillStyle = getCss('--bg', '#0e1116');
    circle(e1x, e1y, eyeR);
    circle(e2x, e2y, eyeR);
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fill();
  }

  function getCss(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  function lighten(hex, amt) {
    try {
      const c = hex.replace('#','');
      const n = parseInt(c, 16);
      let r = Math.min(255, ((n >> 16) & 255) + Math.floor(255 * amt));
      let g = Math.min(255, ((n >> 8) & 255) + Math.floor(255 * amt));
      let b = Math.min(255, (n & 255) + Math.floor(255 * amt));
      return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
    } catch { return hex; }
  }

  // ====== Start ======
  function init() {
    loadPrefs();
    fitCanvas();
    resetGame(true);
    updateHUD();
    showOverlay();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    const wasRunning = running;
    fitCanvas();
    // redraw automatically next frame
    if (!wasRunning) draw();
  });

  init();
})();
