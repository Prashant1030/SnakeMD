"use strict";

/**
 * Snake Evolution — focused visuals
 * - Start length: 5 segments
 * - No AI obstacles on level 1
 * - Open mouth toward food when about to eat
 * - Wall ON = border death, OFF = wrap
 * - Fixed-timestep loop, debounced input
 * - Sounds: eat.mp3, hit.mp3
 */

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
[eatSound, hitSound].forEach(a => { a.preload = "auto"; });

// ----- Config -----
const GRID_SIZE = 24;                          // board cells per side
const CELL_PX = Math.floor(canvas.width / GRID_SIZE);
const TICK_RATE = 8;                           // moves per second
const STEP_MS = 1000 / TICK_RATE;

const COLORS = {
  gridLine: "#161a20",
  food: "#ffb34d",
  body: "#7bda5a",
  head: "#c8ff9f",
  mouthCut: "#0f1318",                         // match canvas bg
  eye: "#0b0f14"
};

// ----- State -----
let snake;
let dir;               // current direction {x,y}
let nextDir;           // buffered direction for next tick
let food;
let score;
let highScore = readHighScore();
let wallOn = true;

let lastTime = 0;
let acc = 0;
let running = true;
let justTurnedThisTick = false;
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
  // Start length: 5 segments, facing right
  snake = [
    { x: cx,     y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
    { x: cx - 3, y: cy },
    { x: cx - 4, y: cy }
  ];
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
  // prevent 180-reverse and limit to one turn per tick
  if (nx === -dir.x && ny === -dir.y) return;
  if (justTurnedThisTick) return;
  nextDir = { x: nx, y: ny };
  justTurnedThisTick = true;
}

window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp": setNextDir(0, -1); e.preventDefault(); break;
    case "ArrowDown": setNextDir(0, 1); e.preventDefault(); break;
    case "ArrowLeft": setNextDir(-1, 0); e.preventDefault(); break;
    case "ArrowRight": setNextDir(1, 0); e.preventDefault(); break;
    case " ":
    case "Spacebar":
      togglePause(); e.preventDefault(); break;
  }
}, { passive: false });

function bindButton(el, handler) {
  const press = (ev) => { ev.preventDefault(); handler(); };
  el.addEventListener("pointerdown", press);
  el.addEventListener("click", press);
}
bindButton(btnUp, () => setNextDir(0, -1));
bindButton(btnDown, () => setNextDir(0, 1));
bindButton(btnLeft, () => setNextDir(-1, 0));
bindButton(btnRight, () => setNextDir(1, 0));
bindButton(btnPause, () => togglePause());

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
  // apply next dir once per tick
  dir = { ...nextDir };
  justTurnedThisTick = false;

  const head = snake[0];
  let nx = head.x + dir.x;
  let ny = head.y + dir.y;

  if (wallOn) {
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return gameOver();
  } else {
    // wrap
    if (nx < 0) nx = GRID_SIZE - 1;
    if (nx >= GRID_SIZE) nx = 0;
    if (ny < 0) ny = GRID_SIZE - 1;
    if (ny >= GRID_SIZE) ny = 0;
  }

  const newHead = { x: nx, y: ny };

  // self collision
  if (snake.some((s, i) => i !== 0 && s.x === newHead.x && s.y === newHead.y)) {
    return gameOver();
  }

  // move
  snake.unshift(newHead);

  // eat
  if (newHead.x === food.x && newHead.y === food.y) {
    eatSound.currentTime = 0;
    eatSound.play().catch(() => {});
    score++;
    if (score > highScore) { highScore = score; writeHighScore(highScore); }
    updateScoreUI();
    placeFood();
  } else {
    snake.pop();
  }
}

// ----- Render -----
function draw() {
  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // grid
  ctx.save();
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;
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

  // food
  drawFood(food.x, food.y);

  // body (tail to neck)
  for (let i = snake.length - 1; i >= 1; i--) {
    const s = snake[i];
    drawSegment(s.x, s.y, COLORS.body, 6);
  }

  // head with mouth/eyes
  const head = snake[0];
  const aboutToEat = (head.x + dir.x === food.x) && (head.y + dir.y === food.y);
  drawHead(head.x, head.y, dir, aboutToEat);
}

function drawFood(cx, cy) {
  const x = cx * CELL_PX;
  const y = cy * CELL_PX;
  const pad = Math.max(3, Math.floor(CELL_PX * 0.18));
  const r = Math.floor((CELL_PX - pad * 2) / 2);
  const cxp = x + CELL_PX / 2;
  const cyp = y + CELL_PX / 2;

  ctx.save();
  // food base
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc(cxp, cyp, r, 0, Math.PI * 2);
  ctx.fill();
  // subtle highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.arc(cxp - r * 0.3, cyp - r * 0.3, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSegment(cx, cy, color, radius = 6) {
  const x = cx * CELL_PX;
  const y = cy * CELL_PX;
  const pad = Math.max(2, Math.floor(CELL_PX * 0.12));
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
  const pad = Math.max(2, Math.floor(CELL_PX * 0.10));
  const w = CELL_PX - pad * 2;
  const h = CELL_PX - pad * 2;
  const r = Math.floor(Math.min(w, h) / 2.2);

  // head base (rounded)
  ctx.save();
  ctx.fillStyle = COLORS.head;
  roundRect(ctx, x + pad, y + pad, w, h, Math.floor(r * 0.9));
  ctx.fill();

  // Open mouth: wedge cut in movement direction when about to eat
  if (aboutToEat) {
    const centerX = x + CELL_PX / 2;
    const centerY = y + CELL_PX / 2;
    const theta = dirToAngle(d);       // radians
    const spread = Math.PI / 5;        // mouth open angle
    const mouthR = Math.min(w, h) / 2;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, mouthR, theta - spread, theta + spread, false);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  // Eyes
  const eyeOffset = Math.floor(CELL_PX * 0.18);
  const eyeR = Math.max(2, Math.floor(CELL_PX * 0.06));
  const eyePos = eyePositions(d, x, y, eyeOffset);

  ctx.fillStyle = "#ffffff";
  for (const p of eyePos) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.eye;
  for (const p of eyePos) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, eyeR * 0.55), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function dirToAngle(d) {
  if (d.x === 1 && d.y === 0) return 0;                 // right
  if (d.x === -1 && d.y === 0) return Math.PI;          // left
  if (d.x === 0 && d.y === -1) return -Math.PI / 2;     // up
  return Math.PI / 2;                                   // down
}

function eyePositions(d, x, y, off) {
  // base center for each eye depends on direction
  const cx = x + CELL_PX / 2;
  const cy = y + CELL_PX / 2;
  const lateral = Math.max(6, Math.floor(CELL_PX * 0.2));

  if (d.x === 1) {
    // right-facing
    return [
      { x: cx + off, y: cy - lateral / 2 },
      { x: cx + off, y: cy + lateral / 2 }
    ];
  } else if (d.x === -1) {
    // left-facing
    return [
      { x: cx - off, y: cy - lateral / 2 },
      { x: cx - off, y: cy + lateral / 2 }
    ];
  } else if (d.y === -1) {
    // up
    return [
      { x: cx - lateral / 2, y: cy - off },
      { x: cx + lateral / 2, y: cy - off }
    ];
  } else {
    // down
    return [
      { x: cx - lateral / 2, y: cy + off },
      { x: cx + lateral / 2, y: cy + off }
    ];
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ----- Game Over -----
function gameOver() {
  if (gameOverTriggered) return;
  gameOverTriggered = true;
  hitSound.currentTime = 0;
  hitSound.play().catch(() => {});
  running = false;

  // overlay
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 28px ui-sans-serif, system-ui, -apple-system, Segoe UI";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 18);
  ctx.font = "500 16px ui-sans-serif, system-ui, -apple-system, Segoe UI";
  ctx.fillText("Press Space or tap Pause to restart", canvas.width / 2, canvas.height / 2 + 14);
  ctx.restore();

  // one-time restart handlers
  const restart = () => {
    btnPause.removeEventListener("click", restartClick);
    window.removeEventListener("keydown", restartKey);
    resetGame();
    running = true;
    lastTime = performance.now();
    acc = 0;
    requestAnimationFrame(loop);
  };
  const restartClick = (ev) => { ev.preventDefault(); restart(); };
  const restartKey = (e) => {
    if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); restart(); }
  };
  btnPause.addEventListener("click", restartClick, { once: true });
  window.addEventListener("keydown", restartKey, { once: true });
}

// ----- Start -----
function start() {
  wallOn = true;
  updateWallUI();
  highScoreEl.textContent = String(highScore);
  resetGame();
  running = true;
  lastTime = performance.now();
  acc = 0;
  requestAnimationFrame(loop);
}

start();
