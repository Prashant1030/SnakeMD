(() => {
  // ----- Config -----
  const COLS = 30;
  const ROWS = 30;

  // Levels: lower ms = faster
  const LEVEL_SPEEDS_MS = [150, 125, 105, 90, 78, 68, 60]; // Level 1..n
  const POINTS_PER_LEVEL = 50;

  // Drawing
  const GRID_COLOR_ALPHA = 0.08;
  const BODY_ROUND = 6;

  // Bonus food
  const FOODS_PER_BONUS = 5;
  const BONUS_LIFETIME_MS = 4000;
  const BONUS_VALUE = 5;

  // Mouth animation
  const MOUTH_OPEN_MS = 250;

  // ----- State -----
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
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

  const intro = document.getElementById('intro');

  let cellSize = Math.floor(canvas.width / COLS);
  // ensure pixel-perfect grid
  canvas.width = cellSize * COLS;
  canvas.height = cellSize * ROWS;

  // Game variables
  let snake = []; // array of {x,y}
  let dir = { x: 1, y: 0 }; // start moving right
  let nextDir = { x: 1, y: 0 };
  let tickTimer = null;
  let running = true;
  let gameOver = false;

  let score = 0;
  let high = Number(localStorage.getItem('snake_highscore_v1') || 0);
  let level = 1;

  let wallsOn = true;
  let theme = (document.documentElement.getAttribute('data-theme') || 'dark');

  let food = null; // {x,y, color: 'red' }
  let bonusFood = null; // {x,y,expires}
  let foodsEaten = 0; // counts normal foods eaten (for bonus spawn)
  let lastEatTime = 0; // for mouth open animation

  // Sounds
  const sEat = new Audio('sounds/eat.mp3');
  const sSpawn = new Audio('sounds/spawn.mp3');
  const sHit = new Audio('sounds/hit.mp3');
  [sEat, sSpawn, sHit].forEach(a => { a.preload = 'auto'; a.volume = 0.8; });

  // ----- Utilities -----
  function randInt(n) { return Math.floor(Math.random() * n); }
  function posEq(a,b){ return a && b && a.x === b.x && a.y === b.y; }
  function inSnake(p) { return snake.some(s => s.x === p.x && s.y === p.y); }
  function inSnakeExceptTail(p) {
    // When moving, last tail cell will vacate; to avoid "spawn inside moving body",
    // still exclude the current tail to be safe.
    return snake.slice(0, -1).some(s => s.x === p.x && s.y === p.y);
  }
  function wrap(x, max) { return (x + max) % max; }

  function setTheme(val) {
    document.documentElement.setAttribute('data-theme', val);
    theme = val;
  }

  function setWalls(val) {
    wallsOn = (val === 'on');
  }

  function updateHUD() {
    scoreEl.textContent = String(score);
    highEl.textContent = String(high);
    levelEl.textContent = String(level);
    btnCenter.textContent = gameOver ? '⟳' : (running ? '⏸' : '▶');
  }

  function speedForLevel(lv) {
    return LEVEL_SPEEDS_MS[Math.min(lv-1, LEVEL_SPEEDS_MS.length-1)];
  }

  function resizeForDPR() {
    // Keep the board crisp on high-DPI screens without changing logical grid
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
  function spawnFood(avoidBonus = false) {
    let p;
    do {
      p = { x: randInt(COLS), y: randInt(ROWS) };
    } while (inSnake(p) || (avoidBonus && bonusFood && posEq(p, bonusFood)));
    food = { x: p.x, y: p.y, color: 'red' };
  }

  function spawnBonus() {
    let p;
    let tries = 0;
    do {
      p = { x: randInt(COLS), y: randInt(ROWS) };
      tries++;
      if (tries > 500) break; // fail-safe
    } while (inSnake(p) || (food && posEq(p, food)));
    bonusFood = { x: p.x, y: p.y, expires: performance.now() + BONUS_LIFETIME_MS };
    // play spawn sound (may be blocked before user interaction)
    sSpawn.currentTime = 0; sSpawn.play().catch(()=>{});
  }

  // ----- Snake init -----
  function resetSnake() {
    snake = [];
    const startLen = Math.floor(COLS / 4); // quarter of play zone length
    // Start centered vertically, head on the right
    const y = Math.floor(ROWS / 2);
    const headX = Math.floor(COLS / 2);
    for (let i = 0; i < startLen; i++) {
      snake.unshift({ x: headX - i, y }); // head at index 0
    }
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
  }

  function resetGame(preserveHigh = true) {
    running = true;
    gameOver = false;
    score = 0;
    foodsEaten = 0;
    bonusFood = null;
    lastEatTime = 0;
    if (!preserveHigh) high = 0;
    level = 1;
    resetSnake();
    spawnFood(true);
    updateHUD();
    setTick();
    draw();
  }

  // ----- Input -----
  function setDirection(dx, dy) {
    // prevent reversing into ourselves
    if (snake.length > 1 && dx === -dir.x && dy === -dir.y) return;
    nextDir = { x: dx, y: dy };
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') setDirection(0, -1);
    else if (k === 'arrowdown' || k === 's') setDirection(0, 1);
    else if (k === 'arrowleft' || k === 'a') setDirection(-1, 0);
    else if (k === 'arrowright' || k === 'd') setDirection(1, 0);
    else if (k === ' ' || k === 'enter') togglePauseOrRestart();
  });

  btnUp.addEventListener('click', () => setDirection(0, -1));
  btnDown.addEventListener('click', () => setDirection(0, 1));
  btnLeft.addEventListener('click', () => setDirection(-1, 0));
  btnRight.addEventListener('click', () => setDirection(1, 0));
  btnCenter.addEventListener('click', togglePauseOrRestart);

  function togglePauseOrRestart() {
    if (gameOver) {
      resetGame(true);
      return;
    }
    running = !running;
    updateHUD();
    if (running) setTick();
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

  selWalls.addEventListener('change', (e) => setWalls(e.target.value));
  selTheme.addEventListener('change', (e) => setTheme(e.target.value));

  // ----- Game loop -----
  function setTick() {
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      if (!running || gameOver) return;
      step();
      draw();
    }, speedForLevel(level));
  }

  function step() {
    // apply queued direction
    dir = nextDir;

    // compute next head
    const head = snake[0];
    let nx = head.x + dir.x;
    let ny = head.y + dir.y;

    if (wallsOn) {
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        return endGame();
      }
    } else {
      nx = wrap(nx, COLS);
      ny = wrap(ny, ROWS);
    }

    const newHead = { x: nx, y: ny };

    // self-collision
    if (inSnake(newHead)) {
      return endGame();
    }

    // move
    snake.unshift(newHead);

    // eating logic
    let ate = false;

    if (food && posEq(newHead, food)) {
      ate = true;
      score += 1;
      foodsEaten += 1;
      lastEatTime = performance.now();
      // play eat
      sEat.currentTime = 0; sEat.play().catch(()=>{});
      spawnFood(true);
      // maybe spawn bonus
      if (foodsEaten % FOODS_PER_BONUS === 0) {
        spawnBonus();
      }
    }

    if (bonusFood && posEq(newHead, bonusFood)) {
      ate = true;
      score += BONUS_VALUE;
      bonusFood = null;
      lastEatTime = performance.now();
      sEat.currentTime = 0; sEat.play().catch(()=>{});
    }

    if (!ate) {
      // remove tail
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
      setTick();
    }

    // high score
    if (score > high) {
      high = score;
      localStorage.setItem('snake_highscore_v1', String(high));
    }

    updateHUD();
  }

  function endGame() {
    gameOver = true;
    running = false;
    updateHUD();
    clearInterval(tickTimer);
    // hit sound
    sHit.currentTime = 0; sHit.play().catch(()=>{});
  }

  // ----- Draw -----
  function draw() {
    const cs = cellSize;
    // Clear board
    ctx.fillStyle = getCSS('--board-bg');
    ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio||1), canvas.height / (window.devicePixelRatio||1));

    // subtle grid
    drawGrid();

    // draw foods
    if (food) {
      drawFood(food.x, food.y, getCSS('--food-red'));
    }
    if (bonusFood) {
      drawFood(bonusFood.x, bonusFood.y, getCSS('--food-green'));
      // draw bonus ring timer
      drawBonusTimer(bonusFood);
    }

    // draw snake
    drawSnake();
    // if game over, overlay text
    if (gameOver) drawGameOver();
  }

  function drawGrid() {
    const cs = cellSize;
    const w = COLS * cs, h = ROWS * cs;
    ctx.save();
    ctx.strokeStyle = gridColor();
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x*cs + 0.5, 0);
      ctx.lineTo(x*cs + 0.5, h);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y*cs + 0.5);
      ctx.lineTo(w, y*cs + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  function gridColor() {
    // compute rgba based on current --fg with low alpha, but simpler: use --grid
    return getCSS('--grid');
  }

  function getCSS(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function drawFood(x, y, color) {
    const cs = cellSize;
    const cx = x*cs + cs/2;
    const cy = y*cs + cs/2;
    const r = cs*0.35;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();
    // small highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(cx - r*0.3, cy - r*0.3, r*0.25, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawBonusTimer(bf) {
    const cs = cellSize;
    const cx = bf.x*cs + cs/2;
    const cy = bf.y*cs + cs/2;
    const r = cs*0.45;
    const remaining = Math.max(0, bf.expires - performance.now());
    const t = remaining / BONUS_LIFETIME_MS;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + Math.PI*2*t);
    ctx.stroke();
    ctx.restore();
  }

  function drawSnake() {
    if (snake.length === 0) return;

    // draw body/tail first
    for (let i = snake.length - 1; i >= 1; i--) {
      const seg = snake[i];
      const isTail = (i === snake.length - 1);
      drawSegment(seg, isTail ? 'tail' : 'body');
    }

    // draw head last
    drawHead();
  }

  function drawSegment(seg, kind) {
    const cs = cellSize;
    const x = seg.x*cs;
    const y = seg.y*cs;
    ctx.save();
    if (kind === 'tail') {
      // rounded pill with a smaller circle to suggest taper
      ctx.fillStyle = getCSS('--snake-tail');
      roundRect(ctx, x+2, y+2, cs-4, cs-4, BODY_ROUND);
      ctx.fill();

      ctx.fillStyle = getCSS('--snake-body');
      ctx.beginPath();
      ctx.arc(x + cs/2, y + cs/2, cs*0.18, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.fillStyle = getCSS('--snake-body');
      roundRect(ctx, x+2, y+2, cs-4, cs-4, BODY_ROUND);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHead() {
    const cs = cellSize;
    const head = snake[0];
    const x = head.x*cs;
    const y = head.y*cs;
    const dx = dir.x, dy = dir.y;

    // base head
    ctx.save();
    ctx.fillStyle = getCSS('--snake-head');
    roundRect(ctx, x+1, y+1, cs-2, cs-2, BODY_ROUND+2);
    ctx.fill();

    // mouth orientation and animation
    const tNow = performance.now();
    const mouthOpen = (tNow - lastEatTime) < MOUTH_OPEN_MS;
    const mouthWidth = mouthOpen ? cs*0.4 : cs*0.18;
    const mouthDepth = mouthOpen ? cs*0.52 : cs*0.32;

    // compute mouth triangle based on direction (front face)
    const cx = x + cs/2, cy = y + cs/2;
    const boardColor = getCSS('--board-bg');
    ctx.fillStyle = boardColor;

    ctx.beginPath();
    if (dx === 1 && dy === 0) {
      // right
      ctx.moveTo(x + cs, y + cs/2);
      ctx.lineTo(cx + mouthDepth, cy - mouthWidth/2);
      ctx.lineTo(cx + mouthDepth, cy + mouthWidth/2);
    } else if (dx === -1 && dy === 0) {
      // left
      ctx.moveTo(x, y + cs/2);
      ctx.lineTo(cx - mouthDepth, cy - mouthWidth/2);
      ctx.lineTo(cx - mouthDepth, cy + mouthWidth/2);
    } else if (dx === 0 && dy === -1) {
      // up
      ctx.moveTo(x + cs/2, y);
      ctx.lineTo(cx - mouthWidth/2, cy - mouthDepth);
      ctx.lineTo(cx + mouthWidth/2, cy - mouthDepth);
    } else if (dx === 0 && dy === 1) {
      // down
      ctx.moveTo(x + cs/2, y + cs);
      ctx.lineTo(cx - mouthWidth/2, cy + mouthDepth);
      ctx.lineTo(cx + mouthWidth/2, cy + mouthDepth);
    }
    ctx.closePath();
    ctx.fill();

    // eyes: two circles slightly behind the mouth
    const eyeOffsetFront = cs*0.18;
    const eyeSpread = cs*0.18;
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
      // down
      ex1 = cx - eyeSpread; ey1 = cy - eyeOffsetFront;
      ex2 = cx + eyeSpread; ey2 = cy - eyeOffsetFront;
    }

    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(ex1, ey1, cs*0.12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2, ey2, cs*0.12, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = getCSS('--snake-eye');
    ctx.beginPath(); ctx.arc(ex1, ey1, cs*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2, ey2, cs*0.05, 0, Math.PI*2); ctx.fill();

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

  // ----- Start -----
  function initSettings() {
    // load persisted settings if desired; default walls on, theme dark
    selWalls.value = wallsOn ? 'on' : 'off';
    selTheme.value = theme;
  }

  function autoHideIntro() {
    setTimeout(() => {
      intro.style.display = 'none';
    }, 3500);
    intro.addEventListener('click', () => { intro.style.display = 'none'; });
  }

  function init() {
    initSettings();
    resetGame(true);
    autoHideIntro();
    updateHUD();
    // resume drawing on resize for crispness
    window.addEventListener('resize', resizeForDPR);
    resizeForDPR();

    // Attempt to unlock audio on first interaction to avoid autoplay issues
    const unlock = () => {
      [sEat, sSpawn, sHit].forEach(a => {
        a.muted = false;
        a.play().then(()=>a.pause()).catch(()=>{});
      });
      window.removeEventListener('pointerdown', unlock, { passive: true });
      window.removeEventListener('keydown', unlock, { passive: true });
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  init();
})();
