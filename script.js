// ----- DOM -----
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const wallToggleEl = document.getElementById("wallToggle");
const wallStateEl = document.getElementById("wallState");
const btnUp = document.getElementById("btnUp");
const btnLeft = document.getElementById("btnLeft");
const btnPause = document.getElementById("btnPause");
const btnRight = document.getElementById("btnRight");
const btnDown = document.getElementById("btnDown");

// ----- Audio -----
const eatSound = new Audio("eat.mp3");
const hitSound = new Audio("hit.mp3");
[eatSound, hitSound].forEach(a => {
  a.preload = "auto";
});

// ----- Config -----
const GRID_SIZE = 24;
const CELL_PX = Math.floor(canvas.width / GRID_SIZE);
const TICK_RATE = 8;
const STEP_MS = 1000 / TICK_RATE;
const COLORS = {
  gridLine: "#161a20",
  food: "#ffb34d",
  body: "#7bda5a",
  head: "#c8ff9f",
  mouthCut: "#0f1318",
  eye: "#0b0f14"
};

// ----- State -----
let snake, dir, nextDir, food, score;
let highScore = readHighScore();
let wallOn = true;
let lastTime = 0, acc = 0;
let running = true, justTurnedThisTick = false;
let gameOverTriggered = false;

// ----- Init / Persistence -----
function readHighScore() {
  try {
    const v = localStorage.getItem("snakeHighScore");
    const n = v == null ? 0 : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch { return 0; }
}
function writeHighScore(n) {
  try { localStorage.setItem("snakeHighScore", String(n)); } catch {}
}
function resetGame() {
  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  snake = Array.from({ length: 5 }, (_, i) => ({ x: cx - i, y: cy }));
  dir = { x: 1, y: 0 };
  nextDir = { ...dir };
  score = 0;
  updateScoreUI();
  placeFood();
  justTurnedThisTick = false;
  gameOverTriggered = false;
}
function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
}
function updateScoreUI() {
  scoreEl.textContent = String(score);
  highScoreEl.textContent = String(highScore);
}
function updateWallUI() {
  wallStateEl.textContent = wallOn ? "ON" : "OFF";
  wallToggleEl.checked = wallOn;
}

// ----- Input -----
function setNextDir(nx, ny) {
  if (nx === -dir.x && ny === -dir.y) return;
  if (justTurnedThisTick) return;
  nextDir = { x: nx, y: ny };
  justTurnedThisTick = true;
}
window.addEventListener("keydown", e => {
  switch (e.key) {
    case "ArrowUp": setNextDir(0, -1); break;
    case "ArrowDown": setNextDir(0, 1); break;
    case "ArrowLeft": setNextDir(-1, 0); break;
    case "ArrowRight": setNextDir(1, 0); break;
    case " ": togglePause(); break;
  }
});
[btnUp, btnDown, btnLeft, btnRight].forEach((btn, i) => {
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  btn.addEventListener("click", () => setNextDir(...dirs[i]));
});
btnPause.addEventListener("click", togglePause);
wallToggleEl.addEventListener("change", () => {
  wallOn = wallToggleEl.checked;
  updateWallUI();
});

// ----- Loop -----
function togglePause() {
  running = !running;
  if (running) {
    lastTime = performance.now();
    acc = 0;
    requestAnimationFrame(loop);
  }
}
function loop(ts) {
  if (!running) return;
  const dt = ts - lastTime;
  lastTime = ts;
  acc += dt;
  while (acc >= STEP_MS) {
    tick();
    acc -= STEP_MS;
  }
  draw();
  requestAnimationFrame(loop);
}
function tick() {
  dir = { ...nextDir };
  justTurnedThisTick = false;
  const head = snake[0];
  let nx = head.x + dir.x;
  let ny = head.y + dir.y;

  if (wallOn) {
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return gameOver();
  } else {
    nx = (nx + GRID_SIZE) % GRID_SIZE;
    ny = (ny + GRID_SIZE) % GRID_SIZE;
  }

  const newHead = { x: nx, y: ny };
  if (snake.some((s, i) => i !== 0 && s.x === newHead.x && s.y === newHead.y)) return gameOver();
  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    eatSound.currentTime = 0;
    eatSound.play().catch(() => {});
    score++;
    if (score > highScore) {
      highScore = score;
      writeHighScore(highScore);
    }
    updateScoreUI();
    placeFood();
  } else {
    snake.pop();
  }
}

// ----- Render -----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawFood(food.x, food.y);
  for (let i = snake.length - 1; i >= 1; i--) {
    drawSegment(snake[i].x, snake[i].y, COLORS.body, 6);
  }
  const head = snake[0];
  const aboutToEat = (head.x + dir.x === food.x) && (head.y + dir.y === food.y);
  drawHead(head.x, head.y, dir, aboutToEat);
}
function drawGrid() {
  ctx.save();
  ctx.strokeStyle = COLORS.gridLine;
  for (let i = 1; i < GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_PX + 0.5, 0);
    ctx.lineTo(i * CELL_PX + 0.5, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_PX + 0.5);
    ctx.lineTo(canvas.width, i * CELL_PX + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}
function drawFood(cx, cy) {
  const x = cx * CELL_PX;
  const y = cy * CELL_PX;
  const pad = Math.floor(CELL_PX * 0.18);
  const r = (CELL_PX - pad * 2) / 2;
  const cxp = x + CELL_PX / 2;
  const cyp = y + CELL_PX / 2;
  ctx.save();
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc(cxp, cyp, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawSegment(cx, cy, color, radius = 6) {
  const x = cx * CELL_PX;
  const y = cy * CELL_PX;
  const pad = Math.floor(CELL_PX * 0.08); // tighter spacing
  const w = CELL_PX - pad * 2;
  const h = CELL_PX - pad * 2;
  const r = Math.min(radius, Math.floor(Math.min(w, h) / 3));
  ctx.save();
  ctx.fillStyle = color;
  roundRect(ctx, x + pad, y + pad, w, h, r);
  ctx.fill();
  ctx.restore();
}
function drawHead(cx, cy, d, aboutToEat) {
  const x = cx * CELL_PX;
  const y = cy * CELL_PX;
  const pad = Math.floor(CELL_PX *
