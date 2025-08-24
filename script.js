(() => {
  // ----- Config -----
  const COLS = 30, ROWS = 30;

  // Levels: lower ms = faster; level increases every 50 points
  const LEVEL_SPEEDS_MS = [150, 130, 112, 96, 84, 74, 66, 60, 54];
  const POINTS_PER_LEVEL = 50;

  // Drawing
  const BODY_ROUND = 6;

  // Bonus food
  const FOODS_PER_BONUS = 5;
  const BONUS_LIFETIME_MS = 4000;
  const BONUS_VALUE = 5;

  // Mouth animation
  const MOUTH_OPEN_MS = 250;

  // ----- Elements -----
  const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const COLS = 22, ROWS = 30;
const screenW = Math.min(window.innerWidth, 560); // cap max width
const cellSize = Math.floor(screenW / COLS);

canvas.style.width = `${cellSize * COLS}px`;
canvas.style.height = `${cellSize * ROWS}px`;
canvas.width = cellSize * COLS;
canvas.height = cellSize * ROWS;

  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  const levelEl = document.getElementById('level');

  const settingsBtn = document.getElementById('btn-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('btn-close-settings');
  const selWalls = document.getElementById('toggle-walls');
  const selTheme = document.getElementById('toggle-theme');

  const btnUp = document.getElementById('btn-up');
  const btnDown = document.getElementById('btn-down');
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');
  const btnCenter = document.getElementById('btn-center');

  // ----- Sizing -----
  let cellSize = Math.floor(canvas.width / COLS);
  canvas.width = cellSize * COLS;
  canvas.height = cellSize * ROWS;

  // ----- State -----
  let snake = []; // head at index 0
  let dir = { x: 1, y: 0 }; // start moving right
  let nextDir = { x: 1, y: 0 };
  let tickTimer = null;
  let running = false;
  let gameOver = false;

  let score = 0;
  let high = Number(localStorage.getItem('snake_highscore_md') || 0);
  let level = 1;

  let wallsOn = false;
  let theme = document.documentElement.getAttribute('data-theme') || 'dark';

  let food = null;       // red
  let bonusFood = null;  // green
  let normalFoodsEaten = 0;
  let lastEatTime = 0;   // for mouth open animation

  // Sounds (place files at sounds/eat.mp3, sounds/spawn.mp3, sounds/hit.mp3)
  const sEat = new Audio('sounds/eat.mp3');
  const sSpawn = new Audio('sounds/spawn.mp3');
  const sHit = new Audio('sounds/hit.mp3');
  [sEat, sSpawn, sHit].forEach(a => { a.preload = 'auto'; a.volume = 0.9; });

  // ----- Utilities -----
  const randInt = n => Math.floor(Math.random() * n);
  const posEq = (a, b) => a && b && a.x === b.x && a.y === b.y;
  const wrap = (x, max) => (x + max) % max;
  const getCSS = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function updateHUD() {
    scoreEl.textContent = String(score);
    highEl.textContent = String(high);
    levelEl.textContent = String(level);
    btnCenter.textContent = gameOver ? '⟲' : (running ? '⏸' : '▶');
  }

  const speedForLevel = lv => LEVEL_SPEEDS_MS[Math.min(LEVEL_SPEEDS_MS.length - 1, lv - 1)];

  function resizeForDPR() {
    const dpr = window.devicePixelRatio || 1;
    const logicalW = cellSize * COLS;
    const logicalH = cellSize * ROWS;
    canvas.style.width = logicalW + 'px';
    canvas.style.height = logicalH + 'px';
    canvas.width = Math.floor(logicalW * dpr);
    canvas.height = Math.floor(logicalH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  // ----- Food placement -----
  function inSnake(p) { return snake.some(s => s.x === p.x && s.y === p.y); }

  function spawnFood() {
    let p, tries = 0;
    do {
      p = { x: randInt(COLS), y: randInt(ROWS) };
      tries++;
      if (tries > 2000) break; // fail-safe
    } while (inSnake(p) || (bonusFood && posEq(p, bonusFood)));
    food = { x: p.x, y: p.y };
  }

  function spawnBonus() {
    let p, tries = 0;
    do {
      p = { x: randInt(COLS), y: randInt(ROWS) };
      tries++;
      if (tries > 2000) break;
    } while (inSnake(p) || (food && posEq(p, food)));
    bonusFood = { x: p.x, y: p.y, expires: performance.now() + BONUS_LIFETIME_MS };
    sSpawn.currentTime = 0;
    sSpawn.play().catch(() => {});
  }

  // ----- Snake init/reset -----
  function resetSnake() {
    snake = [];
    // Start length = quarter of play-zone width (at least 4)
    const startLen = Math.max(4, Math.floor(COLS * 0.25));
    const y = Math.floor(ROWS / 2);
    const headX = Math.floor(COLS / 2) - 1;

    // Build to the left so we have room to move right
    for (let i = 0; i < startLen; i++) {
      snake.push({ x: headX - i, y });
    }
    // Ensure head is index 0 (rightmost)
    snake.sort((a, b) => b.x - a.x);
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
  }

  function resetGame(preserveHigh = true) {
    running = true;
    gameOver = false;
    score = 0;
    if (!preserveHigh) high = 0;
    level = 1;
    normalFoodsEaten = 0;
    bonusFood = null;
    lastEatTime = 0;

    resetSnake();
    spawnFood();
    updateHUD();
    draw();
  }

  // ----- Loop control -----
  function startLoop() {
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      if (!running || gameOver) return;
      step();
      draw();
    }, speedForLevel(level));
  }

  function stopLoop() { clearInterval(tickTimer); tickTimer = null; }

  // ----- Input -----
  function setDirection(dx, dy) {
    // prevent reversing
    if (snake.length > 1 && dx === -dir.x && dy === -dir.y) return;
    nextDir = { x: dx, y: dy };
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','enter'].includes(k)) e.preventDefault();

    if (k === 'arrowup' || k === 'w') setDirection(0, -1);
    else if (k === 'arrowdown' || k === 's') setDirection(0, 1);
    else if (k === 'arrowleft' || k === 'a') setDirection(-1, 0);
    else if (k === 'arrowright' || k === 'd') setDirection(1, 0);
    else if (k === ' ' || k === 'enter') togglePauseOrRestart();
  }, { passive: false });

  btnUp.addEventListener('click', () => setDirection(0, -1));
  btnDown.addEventListener('click', () => setDirection(0, 1));
  btnLeft.addEventListener('click', () => setDirection(-1, 0));
  btnRight.addEventListener('click', () => setDirection(1, 0));
  btnCenter.addEventListener('click', togglePauseOrRestart);

  function togglePauseOrRestart() {
    if (gameOver) {
      resetGame(true);
      startLoop();
      return;
    }
    running = !running;
    if (running) startLoop(); else stopLoop();
    updateHUD();
  }

  // Settings UI
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('show');
    settingsPanel.setAttribute('aria-hidden', 'false');
  });
  settingsClose.addEventListener('click', () => {
    settingsPanel.classList.remove('show');
    settingsPanel.setAttribute('aria-hidden', 'true');
  });
  settingsPanel.addEventListener('click', (e) => {
    if (e.target === settingsPanel) {
      settingsPanel.classList.remove('show');
      settingsPanel.setAttribute('aria-hidden', 'true');
    }
  });
  selWalls.addEventListener('change', (e) => { wallsOn = (e.target.value === 'on'); });
  selTheme.addEventListener('change', (e) => {
    theme = e.target.value;
    document.documentElement.setAttribute('data-theme', theme);
    draw();
  });

  // ----- Game step -----
  function step() {
    // queue → active direction
    dir = nextDir;

    // compute next head position
    const head = snake[0];
    let nx = head.x + dir.x;
    let ny = head.y + dir.y;

    // walls or wrap
    if (wallsOn) {
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return endGame();
    } else {
      nx = wrap(nx, COLS);
      ny = wrap(ny, ROWS);
    }

    const nextHead = { x: nx, y: ny };

    // Determine if we will eat this tick
    const willEatNormal = food && posEq(nextHead, food);
    const willEatBonus = bonusFood && posEq(nextHead, bonusFood);
    const willEat = willEatNormal || willEatBonus;

    // Self-collision check that allows moving into the current tail when not eating
    const bodyLenToCheck = snake.length - (willEat ? 0 : 1);
    for (let i = 0; i < bodyLenToCheck; i++) {
      if (snake[i].x === nextHead.x && snake[i].y === nextHead.y) return endGame();
    }

    // move
    snake.unshift(nextHead);

    // eating logic
    if (willEatNormal) {
      score += 1;
      normalFoodsEaten += 1;
      lastEatTime = performance.now();
      sEat.currentTime = 0; sEat.play().catch(() => {});
      spawnFood();
      if (normalFoodsEaten % FOODS_PER_BONUS === 0) spawnBonus();
    } else if (willEatBonus) {
      score += BONUS_VALUE;
      lastEatTime = performance.now();
      bonusFood = null;
      sEat.currentTime = 0; sEat.play().catch(() => {});
    } else {
      // no eat → drop tail
      snake.pop();
    }

    // bonus expiration
    if (bonusFood && performance.now() > bonusFood.expires) {
      bonusFood = null;
    }

    // level progression
    const newLevel = Math.floor(score / POINTS_PER_LEVEL) + 1;
    if (newLevel !== level) {
      level = newLevel;
      startLoop(); // apply new speed immediately
    }

    // high score
    if (score > high) {
      high = score;
      localStorage.setItem('snake_highscore_md', String(high));
    }

    updateHUD();
  }

  function endGame() {
    gameOver = true;
    running = false;
    stopLoop();
    updateHUD();
    sHit.currentTime = 0; sHit.play().catch(() => {});
  }

  // ----- Draw -----
  function draw() {
    const w = COLS * cellSize, h = ROWS * cellSize;

    // background
    ctx.fillStyle = getCSS('--board-bg');
    ctx.fillRect(0, 0, w, h);

    // grid
    drawGrid();

    // foods
    if (food) drawFood(food.x, food.y, getCSS('--food-red'));
    if (bonusFood) {
      drawFood(bonusFood.x, bonusFood.y, getCSS('--food-green'));
      drawBonusTimer(bonusFood);
    }

    // snake
    drawSnake();

    // overlay
    if (gameOver) drawGameOver();
  }

  function drawGrid() {
    const w = COLS * cellSize, h = ROWS * cellSize;
    ctx.save();
    ctx.strokeStyle = getCSS('--grid');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x*cellSize + 0.5, 0);
      ctx.lineTo(x*cellSize + 0.5, h);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y*cellSize + 0.5);
      ctx.lineTo(w, y*cellSize + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawFood(x, y, color) {
    const cx = x*cellSize + cellSize/2;
    const cy = y*cellSize + cellSize/2;
    const r = cellSize*0.35;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();

    // subtle highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(cx - r*0.3, cy - r*0.3, r*0.25, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawBonusTimer(bf) {
    const cx = bf.x*cellSize + cellSize/2;
    const cy = bf.y*cellSize + cellSize/2;
    const r = cellSize*0.45;
    const remaining = Math.max(0, bf.expires - performance.now());
    const t = remaining / BONUS_LIFETIME_MS;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + Math.PI*2*t);
    ctx.stroke();
    ctx.restore();
  }

  function drawSnake() {
    if (!snake.length) return;

    // body & tail
    for (let i = snake.length - 1; i >= 1; i--) {
      const seg = snake[i];
      const isTail = (i === snake.length - 1);
      drawSegment(seg, isTail ? 'tail' : 'body');
    }

    // head last so it sits on top
    drawHead();
  }

  function drawSegment(seg, kind) {
    const x = seg.x * cellSize;
    const y = seg.y * cellSize;
    ctx.save();
    if (kind === 'tail') {
      ctx.fillStyle = getCSS('--snake-tail');
      roundRect(ctx, x+2, y+2, cellSize-4, cellSize-4, BODY_ROUND);
      ctx.fill();

      // small nub for tip
      ctx.fillStyle = getCSS('--snake-body');
      ctx.beginPath();
      ctx.arc(x + cellSize/2, y + cellSize/2, cellSize*0.18, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.fillStyle = getCSS('--snake-body');
      roundRect(ctx, x+2, y+2, cellSize-4, cellSize-4, BODY_ROUND);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHead() {
    const head = snake[0];
    const x = head.x * cellSize;
    const y = head.y * cellSize;
    const dx = dir.x, dy = dir.y;

    ctx.save();

    // head base
    ctx.fillStyle = getCSS('--snake-head');
    roundRect(ctx, x+1, y+1, cellSize-2, cellSize-2, BODY_ROUND+2);
    ctx.fill();

    // mouth (directional wedge)
    const tNow = performance.now();
    const mouthOpen = (tNow - lastEatTime) < MOUTH_OPEN_MS;
    const mouthWidth = mouthOpen ? cellSize*0.42 : cellSize*0.2;
    const mouthDepth = mouthOpen ? cellSize*0.54 : cellSize*0.34;
    const cx = x + cellSize/2, cy = y + cellSize/2;

    ctx.fillStyle = getCSS('--board-bg');
    ctx.beginPath();
    if (dx === 1 && dy === 0) {
      ctx.moveTo(x + cellSize, y + cellSize/2);
      ctx.lineTo(cx + mouthDepth, cy - mouthWidth/2);
      ctx.lineTo(cx + mouthDepth, cy + mouthWidth/2);
    } else if (dx === -1 && dy === 0) {
      ctx.moveTo(x, y + cellSize/2);
      ctx.lineTo(cx - mouthDepth, cy - mouthWidth/2);
      ctx.lineTo(cx - mouthDepth, cy + mouthWidth/2);
    } else if (dx === 0 && dy === -1) {
      ctx.moveTo(x + cellSize/2, y);
      ctx.lineTo(cx - mouthWidth/2, cy - mouthDepth);
      ctx.lineTo(cx + mouthWidth/2, cy - mouthDepth);
    } else {
      ctx.moveTo(x + cellSize/2, y + cellSize);
      ctx.lineTo(cx - mouthWidth/2, cy + mouthDepth);
      ctx.lineTo(cx + mouthWidth/2, cy + mouthDepth);
    }
    ctx.closePath();
    ctx.fill();

    // eyes (two circles slightly behind the mouth)
    const eyeOffsetFront = cellSize*0.18;
    const eyeSpread = cellSize*0.18;
    let ex1, ey1, ex2, ey2;

    if (dx === 1 && dy === 0) {
      ex1 = cx - eyeOffsetFront; ey1 = cy - eyeSpread;
      ex2 = cx - eyeOffsetFront; ey2 = cy + eyeSpread;
    } else if (dx === -1 && dy === 0) {
      ex1 = cx + eyeOffsetFront; ey1 = cy - eyeSpread;
      ex2 = cx + eyeOffsetFront; ey2 = cy + eyeSpread;
    } else if (dx === 0 && dy === -1) {
      ex1 = cx - eyeSpread; ey1 = cy + eyeOffsetFront;
      ex2 = cx + eyeSpread; ey2 = cy + eyeOffsetFront;
    } else {
      ex1 = cx - eyeSpread; ey1 = cy - eyeOffsetFront;
      ex2 = cx + eyeSpread; ey2 = cy - eyeOffsetFront;
    }

    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(ex1, ey1, cellSize*0.12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2, ey2, cellSize*0.12, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = getCSS('--snake-eye');
    ctx.beginPath(); ctx.arc(ex1, ey1, cellSize*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2, ey2, cellSize*0.05, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawGameOver() {
    const w = COLS * cellSize, h = ROWS * cellSize;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', w/2, h/2 - 8);
    ctx.font = '16px system-ui, -apple-system, Segoe UI';
    ctx.fillText('Press Enter or Center Button to restart', w/2, h/2 + 18);
    ctx.restore();
  }

  // ----- Init -----
  function initSettings() {
    selWalls.value = wallsOn ? 'on' : 'off';
    selTheme.value = theme;
  }

  function init() {
    initSettings();
    resetGame(true);      // fresh state and spawn first food
    resizeForDPR();       // crisp canvas
    startLoop();          // auto-start movement
    updateHUD();

    window.addEventListener('resize', resizeForDPR);

    // Unlock audio on first interaction (mobile autoplay policies)
    const unlock = () => {
      [sEat, sSpawn, sHit].forEach(a => {
        a.muted = false;
        a.play().then(() => a.pause()).catch(() => {});
      });
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  init();
})();




