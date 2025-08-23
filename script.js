"use strict";

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
const GRID_SIZE = 24;
const CELL_PX = Math.floor(canvas.width / GRID_SIZE);
const TICK_RATE = 8;
const STEP_MS = 1000 / TICK_RATE;

const COLORS = {
  snake: "#7bda5a",
  snakeHead: "#b8ff8c",
  food: "#ffb34d"
};

// ----- State -----
let snake, dir, nextDir, food;
let score, highScore = readHighScore();
let wallOn = true;
let lastTime = 0, acc = 0;
let running = true, justTurnedThisTick = false;
let gameOverTriggered = false;

// ----- Init -----
function resetGame() {
  const start = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
  snake = [start, { x: start.x - 1, y: start.y }, { x: start.x - 2, y: start.y }];
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

window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp": setNextDir(0, -1); e.preventDefault(); break;
    case "ArrowDown": setNextDir(0, 1); e.preventDefault(); break;
    case "ArrowLeft": setNextDir(-1, 0); e.preventDefault(); break;
    case "ArrowRight": setNextDir(1, 0); e.preventDefault(); break;
    case " ": togglePause(); e.preventDefault(); break;
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

wallToggleEl.addEventListener("change", () => { wallOn = wallToggleEl.checked; updateWallUI(); });

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
  const dt = ts - lastTime; lastTime = ts; acc += dt;
  while (acc >= STEP_MS) { tick(); acc -= STEP_MS; }
  draw();
  requestAnimationFrame(loop);
}

function tick() {
  dir = { ...nextDir };
  justTurnedThisTick = false;
  const head = snake[0];
  let newX = head.x + dir.x, newY = head.y + dir.y;

  if (wallOn) {
    if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) return gameOver();
  } else {
    if (newX < 0) newX = GRID_SIZE - 1;
    if (newX >= GRID_SIZE) newX = 0;
    if (newY < 0) newY = GRID_SIZE - 1;
    if (newY >= GRID_SIZE) newY = 0;
  }

  const newHead = { x: newX, y: newY };
  if (snake.some((s, i) => i && s.x === newHead.x && s.y === newHead.y)) return gameOver();

  snake.unshift(newHead);
  if (newHead.x === food.x && newHead.y === food.y) {
    eatSound.currentTime = 0; eatSound.play();
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 1; i < GRID_SIZE; i++) {
    ctx.strokeStyle = "#161a20"; ctx.beginPath();
    ctx.moveTo(i * CELL_PX + 0.5, 0); ctx.lineTo(i * CELL_PX + 0.5, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL_PX + 0.5); ctx.lineTo(canvas.width, i * CELL_PX + 0.5); ctx.stroke();
  }
  drawCell(food.x, food.y, COLORS.food, 5);
  for (let i = snake.length - 1; i >= 1; i--) drawCell(snake[i].x, snake[i].y, COLORS.snake, 4);
  drawCell(snake[0].x, snake[0].y, COLORS.snakeHead, 3);
}
function drawCell(cx, cy, color, inset = 4) {
  const pad = Math.max(0, Math.min(inset, Math.floor(CELL_PX / 3)));
  ctx.fillStyle = color;
  ctx.fillRect(cx * CELL_PX + pad, cy * CELL_PX + pad, CELL_PX - pad * 2, CELL_PX - pad * 2);
}

// ----- Game Over -----
function gameOver() {
  if (gameOverTriggered) return;
  gameOverTriggered = true;
  hitSound.currentTime = 0; hitSound.play();
  running = false;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff"; ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center"; ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 18);
  ctx.font = "500 16px sans-serif";
  ctx.fillText("Press Space or tap Pause to restart", canvas.width / 2, canvas.height / 2 + 14);
  ctx
