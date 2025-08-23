(() => {
  'use strict';

  // ----- DOM -----
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const wallToggleBtn = document.getElementById('wallToggle');
  const themeToggleBtn = document.getElementById('themeToggle');
  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnPausePlay = document.getElementById('btnPausePlay');

  // ----- Config -----
  const GRID = 24;                 // grid dimension (GRID x GRID)
  const MAX_CANVAS = 480;          // px
  const BASE_SPEED = 8;            // moves per second
  const SPEED_STEP = 0.25;         // increase after each food
  const MAX_SPEED = 16;            // cap

  // ----- State -----
  let tile;                        // computed tile size
  let snake;                       // array of {x,y}
  let dir;                         // current direction {x,y}
  let nextDir;                     // queued direction for next tick
  let food;                        // {x,y}
  let score;
  let highScore = parseInt(localStorage.getItem('SnakeMD.highScore') || '0', 10);
  let wallsOn = true;
  let paused = false;
  let movesPerSecond = BASE_SPEED;
  let stepMs = 1000 / movesPerSecond;
  let lastTime = 0;
  let acc = 0;
  let changedThisTick = false;

  // ----- Init -----
  function fitCanvas() {
    const size = Math.min(MAX_CANVAS, Math.floor(window.innerWidth - 32));
    tile = Math.floor(size / GRID);
    const snap = tile * GRID;
    canvas.width = snap;
    canvas.height = snap;
  }

  function resetGame() {
    snake = [{ x: 5, y: 12 }, { x: 4, y: 12 }, { x: 3, y: 12 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    movesPerSecond = BASE_SPEED;
    stepMs = 1000 / movesPerSecond;
    food = spawnFood();
    updateHUD();
  }

  function updateHUD() {
    scoreEl.textContent = String(score);
    highScoreEl.textContent = String(highScore);
    wallToggleBtn.textContent = `Wall: ${wallsOn ? 'ON' : 'OFF'}`;
    wallToggleBtn.setAttribute('aria-pressed', String(wallsOn));
  }

  function spawnFood() {
    while (true) {
      const p = { x: randInt(0, GRID - 1), y: randInt(0, GRID - 1) };
      if (!snake.some(s => s.x === p.x && s.y === p.y)) return p;
    }
  }

  // ----- Utilities -----
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  function setDirection(nx, ny) {
    const proposal = { x: nx, y: ny };
    if (changedThisTick) return;            // one change per tick
    if (isOpposite(proposal, dir)) return;  // prevent 180°
    nextDir = proposal;
    changedThisTick = true;
  }

  function togglePause(force) {
    paused = typeof force === 'boolean' ? force : !paused;
    btnPausePlay.textContent = paused ? '▶' : '⏸';
  }

  // ----- Input -----
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault(); setDirection(0, -1); break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault(); setDirection(0, 1); break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault(); setDirection(-1, 0); break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault(); setDirection(1, 0); break;
      case ' ':
      case 'Enter':
        e.preventDefault(); togglePause(); break;
    }
  }, { passive: false });

  function bindTap(el, handler) {
    const act = (ev) => { ev.preventDefault(); handler(); };
    el.addEventListener('click', act);
    el.addEventListener('touchstart', act, { passive: false });
  }

  bindTap(btnUp,    () => setDirection(0, -1));
  bindTap(btnDown,  () => setDirection(0,  1));
  bindTap(btnLeft,  () => setDirection(-1, 0));
  bindTap(btnRight, () => setDirection(1,  0));
  bindTap(btnPausePlay, () => togglePause());

  bindTap(wallToggleBtn, () => { wallsOn = !wallsOn; updateHUD(); });
  bindTap(themeToggleBtn, () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'light' ? '' : 'light';
    if (next) root.setAttribute('data-theme', next); else root.removeAttribute('data-theme');
  });

  // ----- Game Loop -----
  function update() {
    // apply queued direction at start of tick
    dir = nextDir;

    // compute next head
    const head = snake[0];
    let nx = head.x + dir.x;
    let ny = head.y + dir.y;

    if (wallsOn) {
      // collision with boundary ends game
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
        handleGameOver();
        return;
      }
    } else {
      // wrap around
      nx = (nx + GRID) % GRID;
      ny = (ny + GRID) % GRID;
    }

    const nextHead = { x: nx, y: ny };

    // self-collision
    if (snake.some(seg => seg.x === nextHead.x && seg.y === nextHead.y)) {
      handleGameOver();
      return;
    }

    // move
    snake.unshift(nextHead);

    // food check
    if (nextHead.x === food.x && nextHead.y === food.y) {
      score += 1;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('SnakeMD.highScore', String(highScore));
      }
      food = spawnFood();
      // gentle speed-up
      movesPerSecond = Math.min(MAX_SPEED, movesPerSecond + SPEED_STEP);
      stepMs = 1000 / movesPerSecond;
      updateHUD();
    } else {
      snake.pop(); // no growth
    }

    // allow direction change in next tick
    changedThisTick = false;
  }

  function draw() {
    // clear
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#0f1216';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw grid (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      const p = i * tile;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(canvas.width, p); ctx.stroke();
    }

    // food
    drawCell(food.x, food.y, '#e94141');

    // snake body
    for (let i = snake.length - 1; i >= 1; i--) {
      const s = snake[i];
      drawCell(s.x, s.y, '#35c759');
    }

    // head (brighter, with simple eyes)
    const head = snake[0];
    drawCell(head.x, head.y, '#56e37a');
    drawEyes(head, dir);
  }

  function drawCell(x, y, color) {
    const pad = Math.max(1, Math.floor(tile * 0.1));
    ctx.fillStyle = color;
    ctx.fillRect(x * tile + pad, y * tile + pad, tile - pad * 2, tile - pad * 2);
  }

  function drawEyes(head, dir) {
    const cx = head.x * tile;
    const cy = head.y * tile;
    const r = Math.max(2, Math.floor(tile * 0.12));
    ctx.fillStyle = '#0b0f14';

    let ex1, ey1, ex2, ey2;
    const offset = Math.floor(tile * 0.25);

    if (dir.x === 1) {        // right
      ex1 = cx + tile - offset; ey1 = cy + offset;
      ex2 = cx + tile - offset; ey2 = cy + tile - offset;
    } else if (dir.x === -1) { // left
      ex1 = cx + offset; ey1 = cy + offset;
      ex2 = cx + offset; ey2 = cy + tile - offset;
    } else if (dir.y === 1) {  // down
      ex1 = cx + offset; ey1 = cy + tile - offset;
      ex2 = cx + tile - offset; ey2 = cy + tile - offset;
    } else {                    // up
      ex1 = cx + offset; ey1 = cy + offset;
      ex2 = cx + tile - offset; ey2 = cy + offset;
    }
    circle(ex1, ey1, r); circle(ex2, ey2, r);
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function handleGameOver() {
    // brief reset; keep high score
    resetGame();
    togglePause(true); // pause after reset
  }

  // ----- RAF Loop -----
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;

    if (!paused) {
      acc += dt;
      while (acc >= stepMs) {
        update();
        acc -= stepMs;
      }
    }

    draw();
    requestAnimationFrame(loop);
  }

  // ----- Start -----
  fitCanvas();
  resetGame();
  updateHUD();
  togglePause(false);       // start playing
  requestAnimationFrame(loop);

  // Resize handling (optional: only refit when paused to avoid distortion)
  window.addEventListener('resize', () => {
    const wasPaused = paused;
    togglePause(true);
    fitCanvas();
    // redraw after resize
    draw();
    togglePause(wasPaused ? true : false);
  });
})();
