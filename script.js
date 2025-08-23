(() => {
  // Board/grid config
  const COLS = 50;
  const ROWS = 35;

  // Level speeds (cells per second). Level index is 0-based internally, UI shows +1.
  const LEVEL_SPEEDS = [ 6, 8, 10, 12, 14, 16];

  // DOM refs
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const levelEl = document.getElementById('level');
  const wallsStateEl = document.getElementById('wallsState');
  const overlay = document.getElementById('overlay');
  const centerBtn = document.getElementById('btnCenter');
  const centerIcon = document.getElementById('centerIcon');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettings = document.getElementById('closeSettings');
  const themeSelect = document.getElementById('themeSelect');
  const wallsToggle = document.getElementById('wallsToggle');
  const levelSelect = document.getElementById('levelSelect');
  const resetProgress = document.getElementById('resetProgress');
  const bonusTimerEl = document.getElementById('bonusTimer');
const eatSound = new Audio("sounds/eat.mp3");
const hitSound = new Audio("sounds/hit.mp3");
  const spawnSound = new Audio("sounds/spawn.mp3");


  // Responsive sizing
  function fitCanvas() {
    const maxWidth = Math.min(window.innerWidth - 32, 720);
    const ratio = COLS / ROWS;
    const width = Math.min(maxWidth, 720);
    const height = Math.round(width / ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    // Keep internal resolution fixed for crispness
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  // State
  let cellSize = Math.floor(canvas.width / COLS); // internal draw unit
  const R = Math.floor(Math.min(canvas.width / COLS, canvas.height / ROWS) * 0.45);

  function posToPx(x, y) {
    // center of cell
    return { px: x * (canvas.width / COLS) + (canvas.width / COLS) / 2, py: y * (canvas.height / ROWS) + (canvas.height / ROWS) / 2 };
  }

  // Persistent data
  const store = {
    get highScore() { return parseInt(localStorage.getItem('snake_highscore') || '0', 10); },
    set highScore(v) { localStorage.setItem('snake_highscore', String(v)); },
    get unlockedLevel() { return parseInt(localStorage.getItem('snake_unlocked_level') || '1', 10); }, // UI level number
    set unlockedLevel(v) { localStorage.setItem('snake_unlocked_level', String(v)); },
    get theme() { return localStorage.getItem('snake_theme') || 'dark'; },
    set theme(v) { localStorage.setItem('snake_theme', v); },
    get walls() { return localStorage.getItem('snake_walls') || 'on'; },
    set walls(v) { localStorage.setItem('snake_walls', v); },
  };

  // Game variables
  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = null; // {x,y}
  let bonus = null; // {x,y, expiresAt}
  let foodsEaten = 0;
  let score = 0;
  let level = 1; // UI level number (1..)
  let speed = LEVEL_SPEEDS[level - 1];
  let running = false;
  let gameOver = false;
  let lastTick = 0;
  let stepAccum = 0;
  let stepInterval = 1000 / speed; // ms per cell
  let wallsOn = store.walls === 'on';

  // Head animation
  let mouthOpenTimer = 0; // ms remaining to keep mouth open big
  const MOUTH_OPEN_DURATION = 220; // ms

  // Init settings UI
  function buildLevelSelect() {
    levelSelect.innerHTML = '';
    const maxLevel = LEVEL_SPEEDS.length;
    const unlocked = store.unlockedLevel;
    for (let i = 1; i <= maxLevel; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `Level ${i} — ${LEVEL_SPEEDS[i - 1]} cells/s`;
      if (i > unlocked) opt.disabled = true;
      levelSelect.appendChild(opt);
    }
    levelSelect.value = String(level);
  }

  function applyTheme(value) {
    document.documentElement.setAttribute('data-theme', value);
  }

  function updateHUD() {
    scoreEl.textContent = String(score);
    highScoreEl.textContent = String(store.highScore);
    levelEl.textContent = String(level);
    wallsStateEl.textContent = wallsOn ? 'On' : 'Off';
  }

  // Snake creation: start length = half of board width (in cells)
  function resetGame(fresh = false) {
    const startLen = 4;
    const startY = Math.floor(ROWS / 2);
    const startX = Math.floor((COLS - startLen) / 2);
    snake = [];
    for (let i = 0; i < startLen; i++) {
      snake.push({ x: startX + i, y: startY });
    }
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    foodsEaten = 0;
    food = placeFood();
    bonus = null;
    mouthOpenTimer = 0;
    score = fresh ? 0 : score; // fresh when starting new run, keep otherwise
    gameOver = false;
    running = true;
    stepAccum = 0;
    lastTick = performance.now();
    speed = LEVEL_SPEEDS[level - 1];
    stepInterval = 1000 / speed;
    centerIcon.textContent = '⏸️';
    hideBonusTimer();
    updateHUD();
    drawFrame();
  }

  function placeFood(block = null) {
    const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
    if (block) occupied.add(`${block.x},${block.y}`);
    let x, y;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (occupied.has(`${x},${y}`));
    return { x, y };
  }

  function spawnBonus() {
    bonus = { ...placeFood(food), expiresAt: performance.now() + 4000 };
    spawnSound.play();
    showBonusTimer();
  }

  function consumeFoodIfAny(nextHead) {
    let grew = false;
    if (food && nextHead.x === food.x && nextHead.y === food.y) {
  eatSound.play(); // 👈 play eat sound
  score += 1;
  foodsEaten += 1;
  mouthOpenTimer = MOUTH_OPEN_DURATION;
  grew = true;
  food = placeFood(bonus);
  if (foodsEaten > 0 && foodsEaten % 5 === 0 && !bonus) {
    spawnBonus();
  }
} 
    
    else if (bonus && nextHead.x === bonus.x && nextHead.y === bonus.y) {
      score += 5;
      mouthOpenTimer = MOUTH_OPEN_DURATION;
      grew = true;
      bonus = null;
      hideBonusTimer();
    }
    // Level up each 100 points
    const targetLevel = Math.min(LEVEL_SPEEDS.length, Math.floor(score / 100) + 1);
    if (targetLevel > level) {
      level = targetLevel;
      store.unlockedLevel = Math.max(store.unlockedLevel, level);
      speed = LEVEL_SPEEDS[level - 1];
      stepInterval = 1000 / speed;
    }
    // High score
    if (score > store.highScore) store.highScore = score;
    updateHUD();
    return grew;
  }

  function wrapOrWall(x, y) {
    if (!wallsOn) {
      if (x < 0) x = COLS - 1;
      if (x >= COLS) x = 0;
      if (y < 0) y = ROWS - 1;
      if (y >= ROWS) y = 0;
      return { x, y, hitWall: false };
    } else {
      const hitWall = x < 0 || x >= COLS || y < 0 || y >= ROWS;
      return { x, y, hitWall };
    }
  }

  function tick(now) {
    if (!running) return;
    const dt = now - lastTick;
    lastTick = now;
    stepAccum += dt;
    if (mouthOpenTimer > 0) mouthOpenTimer = Math.max(0, mouthOpenTimer - dt);

    // Bonus expiry
    if (bonus && now > bonus.expiresAt) {
      bonus = null;
      hideBonusTimer();
    } else if (bonus) {
      updateBonusTimer(Math.max(0, bonus.expiresAt - now));
    }

    while (stepAccum >= stepInterval) {
      stepAccum -= stepInterval;
      // apply queued direction
      dir = nextDir;

      // compute next head
      let nx = snake[snake.length - 1].x + dir.x;
      let ny = snake[snake.length - 1].y + dir.y;
      const res = wrapOrWall(nx, ny);
      nx = res.x; ny = res.y;

      if (res.hitWall) {
        endGame();
        return;
      }

      // check self collision (exclude tail if we're about to move it unless we grow)
      const nextHead = { x: nx, y: ny };
      const grew = consumeFoodIfAny(nextHead);
      const bodyToCheck = grew ? snake : snake.slice(1); // when not growing, tail moves away
      if (bodyToCheck.some(p => p.x === nx && p.y === ny)) {
        endGame();
        return;
      }

      // move
      if (!grew) snake.shift(); // remove tail
      snake.push(nextHead);
    }

    drawFrame();
    requestAnimationFrame(tick);
  }

  function endGame() {
      hitSound.play();
    running = false;
    gameOver = true;
    centerIcon.textContent = '🔁';
    drawFrame(true);
  }

  // Drawing
  function clear() {
    if (document.documentElement.getAttribute('data-theme') === 'light') {
      ctx.fillStyle = '#eff3f9';
    } else {
      ctx.fillStyle = '#0b0f14';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrid() {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const cw = canvas.width / COLS;
    const ch = canvas.height / ROWS;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cw, 0);
      ctx.lineTo(x * cw, canvas.height);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ch);
      ctx.lineTo(canvas.width, y * ch);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFood() {
    const drawDot = (p, color, pulse = false) => {
      const { px, py } = posToPx(p.x, p.y);
      const baseR = Math.min(canvas.width / COLS, canvas.height / ROWS) * 0.35;
      const r = pulse ? baseR * (1 + 0.05 * Math.sin(performance.now() * 0.02)) : baseR;
      const grd = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 1, px, py, r);
      grd.addColorStop(0, '#fff');
      grd.addColorStop(1, color);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    };

    if (food) drawDot(food, '#e94141');
    if (bonus) {
      drawDot(bonus, '#35c759', true);
      // Countdown ring
      const { px, py } = posToPx(bonus.x, bonus.y);
      const r = Math.min(canvas.width / COLS, canvas.height / ROWS) * 0.48;
      const remaining = Math.max(0, bonus.expiresAt - performance.now());
      const frac = remaining / 4000;
      ctx.strokeStyle = 'rgba(53,199,89,0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, r, -Math.PI/2, -Math.PI/2 + Math.PI*2*frac);
      ctx.stroke();
    }
  }

  function angleFromDir(d) {
    if (d.x === 1 && d.y === 0) return 0;
    if (d.x === -1 && d.y === 0) return Math.PI;
    if (d.x === 0 && d.y === 1) return Math.PI / 2;
    return -Math.PI / 2; // up
  }

  function drawSnake() {
    const cw = canvas.width / COLS;
    const ch = canvas.height / ROWS;
    const baseR = Math.min(cw, ch) * 0.45;

    // connections for smooth body
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < snake.length - 1; i++) {
      const a = snake[i - 1];
      const b = snake[i];
      const c = snake[i + 1];
      const { px: bx, py: by } = posToPx(b.x, b.y);
      const radius = baseR * 0.85;
      // body bead
      const grad = ctx.createLinearGradient(bx - radius, by - radius, bx + radius, by + radius);
      grad.addColorStop(0, '#88d6ff');
      grad.addColorStop(1, '#2a72ff');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fill();
      // connector to previous
      const { px: ax, py: ay } = posToPx(a.x, a.y);
      ctx.strokeStyle = '#2f66f0';
      ctx.lineWidth = radius * 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // Tail (tapered)
    const tail = snake[0];
    const tailNext = snake[1] || tail;
    const tailAngle = Math.atan2(tailNext.y - tail.y, tailNext.x - tail.x);
    const { px: tx, py: ty } = posToPx(tail.x, tail.y);
    const tailR = baseR * 0.55;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(tailAngle + Math.PI);
    const gradTail = ctx.createLinearGradient(-tailR, -tailR, tailR, tailR);
    gradTail.addColorStop(0, '#5aa3ff');
    gradTail.addColorStop(1, '#1c52d8');
    ctx.fillStyle = gradTail;
    ctx.beginPath();
    ctx.moveTo(-tailR * 0.2, 0);
    ctx.quadraticCurveTo(tailR * 0.3, -tailR * 0.6, tailR * 0.8, 0);
    ctx.quadraticCurveTo(tailR * 0.3, tailR * 0.6, -tailR * 0.2, 0);
    ctx.fill();
    ctx.restore();

    // Head with mouth and eyes
    const head = snake[snake.length - 1];
    const prev = snake[snake.length - 2] || head;
    const ang = Math.atan2(head.y - prev.y, head.x - prev.x);
    const { px: hx, py: hy } = posToPx(head.x, head.y);
    const headR = baseR * 0.95;

    // Head base
    const headGrad = ctx.createRadialGradient(hx - headR * 0.3, hy - headR * 0.3, 2, hx, hy, headR);
    headGrad.addColorStop(0, '#bfe3ff');
    headGrad.addColorStop(1, '#2a72ff');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.fill();

    // Mouth wedge (opens when eating)
    const openFrac = mouthOpenTimer > 0 ? 0.55 : 0.18; // bigger when eating
    const wedge = Math.PI * openFrac;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' ? '#eff3f9' : '#0b0f14';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, headR + 1, -wedge / 2, wedge / 2, false);
    ctx.closePath();
    ctx.fill();

    // Mouth outline
    ctx.strokeStyle = '#0b0f14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, headR, -wedge / 2, wedge / 2, false);
    ctx.stroke();

    // Eyes slightly behind mouth
    const eyeOffsetBack = headR * 0.35;
    const eyeOffsetSide = headR * 0.38;
    const eyeR = headR * 0.14;
    // Left eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-eyeOffsetBack, -eyeOffsetSide, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-eyeOffsetBack - eyeR * 0.25, -eyeOffsetSide - eyeR * 0.25, eyeR * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-eyeOffsetBack, eyeOffsetSide, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-eyeOffsetBack - eyeR * 0.25, eyeOffsetSide - eyeR * 0.25, eyeR * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawFrame(showGameOver = false) {
    clear();
    drawGrid();
    drawFood();
    drawSnake();

    if (showGameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Press the center button or Space to restart', canvas.width / 2, canvas.height / 2 + 22);
      ctx.restore();
    }
  }

  // Bonus timer UI helpers
  function showBonusTimer() {
    bonusTimerEl.classList.remove('hidden');
  }
  function hideBonusTimer() {
    bonusTimerEl.classList.add('hidden');
  }
  function updateBonusTimer(ms) {
    bonusTimerEl.textContent = `Bonus: ${(ms / 1000).toFixed(1)}s`;
  }

  // Controls
  function setDirection(dx, dy) {
    // Prevent reversing directly into self
    if (dx === -dir.x && dy === -dir.y) return;
    nextDir = { x: dx, y: dy };
  }

  document.getElementById('btnUp').addEventListener('click', () => setDirection(0, -1));
  document.getElementById('btnDown').addEventListener('click', () => setDirection(0, 1));
  document.getElementById('btnLeft').addEventListener('click', () => setDirection(-1, 0));
  document.getElementById('btnRight').addEventListener('click', () => setDirection(1, 0));

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') setDirection(0, -1);
    else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') setDirection(0, 1);
    else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') setDirection(-1, 0);
    else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') setDirection(1, 0);
    else if (e.code === 'Space') {
      if (gameOver) restart();
      else togglePause();
    }
  }, { passive: true });

  function togglePause() {
    if (gameOver) return;
    running = !running;
    centerIcon.textContent = running ? '⏸️' : '▶️';
    if (running) {
      lastTick = performance.now();
      requestAnimationFrame(tick);
    }
  }

  function restart() {
    score = 0;
    level = 1;
    speed = LEVEL_SPEEDS[level - 1];
    stepInterval = 1000 / speed;
    resetGame(true);
    requestAnimationFrame(tick);
  }

  centerBtn.addEventListener('click', () => {
    if (gameOver) {
      restart();
    } else {
      togglePause();
    }
  });

  // Settings events
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
    settingsPanel.setAttribute('aria-hidden', settingsPanel.classList.contains('hidden') ? 'true' : 'false');
  });
  closeSettings.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
    settingsPanel.setAttribute('aria-hidden', 'true');
  });

  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
    store.theme = themeSelect.value;
    drawFrame(gameOver);
  });

  wallsToggle.addEventListener('change', () => {
    wallsOn = wallsToggle.value === 'on';
    store.walls = wallsOn ? 'on' : 'off';
    updateHUD();
  });

  levelSelect.addEventListener('change', () => {
    const chosen = parseInt(levelSelect.value, 10);
    if (chosen > store.unlockedLevel) return; // guard
    level = chosen;
    speed = LEVEL_SPEEDS[level - 1];
    stepInterval = 1000 / speed;
    updateHUD();
  });

  resetProgress.addEventListener('click', () => {
    localStorage.removeItem('snake_highscore');
    localStorage.removeItem('snake_unlocked_level');
    store.unlockedLevel = 1;
    buildLevelSelect();
    highScoreEl.textContent = '0';
  });

  // Initialize UI from store
  applyTheme(store.theme);
  themeSelect.value = store.theme;
  wallsToggle.value = store.walls;
  wallsOn = store.walls === 'on';
  buildLevelSelect();
  updateHUD();

  // Idle draw (shows board before start)
  drawFrame(false);
  
const startBtn = document.getElementById('startBtn');
startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  restart();
});

})();












