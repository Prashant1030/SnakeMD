"use strict";

/**
 * Snake Evolution
 * - Fixed-timestep loop
 * - Robust input (prevents reverse into self, debounces per tick)
 * - Wall mode ON = collide with borders ends game; OFF = wrap-around
 * - Persistent high score (localStorage-safe)
 * - Click/touch-friendly controls
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

// ----- Config -----
const GRID_SIZE = 24;               // tiles per side (square board)
const CELL_PX = Math.floor(canvas.width / GRID_SIZE);
const TICK_RATE = 8;                // moves per second
const STEP_MS = 1000 / TICK_RATE;

const COLORS = {
  bgGrid: "#1b1f26",
  snake: "#7bda5a",
  snakeHead: "#b8ff8c",
  food: "#ffb34d"
};

// ----- State -----
let snake;
let dir;             // current direction: {x,y}
let nextDir;         // buffered direction accepted once per tick
let food;
let score;
let highScore = readHighScore();
let wallOn = true;

let lastTime = 0;
let acc = 0;
let running = true;
let justTurnedThisTick = false;

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
  } catch {
    return 0;
  }
}

function writeHighScore(n) {
  try {
    localStorage.setItem("snakeHighScore", String(n));
  } catch {
    // ignore
  }
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
  // Prevent 180-degree reversal
  if (nx === -dir.x && ny === -dir.y) return;
  // Only accept one turn per tick to avoid double-turn exploits
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
      togglePause();
      e.preventDefault();
      break;
  }
}, { passive: false });

// Mobile/touch buttons
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

// Wall toggle
wallToggleEl.addEventListener("change", () => {
  wallOn = wallToggleEl.checked;
  updateWallUI();
});

// ----- Loop -----
function togglePause() {
  running = !running;
  // When resuming, reset accumulators to avoid jump
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
  // Accept buffered direction once per tick
  dir = { ...nextDir };
  justTurnedThisTick = false;

  const head = snake[0];
  let newX = head.x + dir.x;
  let newY = head.y + dir.y;

  if (wallOn) {
    // Collide with borders
    if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
      return gameOver();
    }
  } else {
    // Wrap around
    if (newX < 0) newX = GRID_SIZE - 1;
    if (newX >= GRID_SIZE) newX = 0;
    if (newY < 0) newY = GRID_SIZE - 1;
    if (newY >= GRID_SIZE) newY = 0;
  }

  const newHead = { x: newX, y: newY };

  // Self-collision (note: allow moving into the last tail cell if we’re growing? Not needed here because we grow by pushing)
  if (snake.some((s, i) => i !== 0 && s.x === newHead.x && s.y === newHead.y)) {
    return gameOver();
  }

  // Move
  snake.unshift(newHead);

  // Eat
  if (newHead.x === food.x && newHead.y === food.y) {
    score += 1;
    if (score > highScore) {
      highScore = score;
      writeHighScore(highScore);
    }
    updateScoreUI();
    placeFood();
  } else {
    snake.pop(); // normal move (no growth)
  }
}

// ----- Render -----
function draw() {
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Optional subtle grid
  ctx.save();
  ctx.strokeStyle = "#161a20";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID_SIZE; i++) {
    // vertical
    ctx.beginPath();
    ctx.moveTo(i * CELL_PX + 0.5, 0);
    ctx.lineTo(i * CELL_PX + 0.5, canvas.height);
    ctx.stroke();
    // horizontal
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_PX + 0.5);
    ctx.lineTo(canvas.width, i * CELL_PX + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // Food
  drawCell(food.x, food.y, COLORS.food, 5);

  // Snake body
  for (let i = snake.length - 1; i >= 1; i--) {
    const s = snake[i];
    drawCell(s.x, s.y, COLORS.snake, 4);
  }

  // Snake head
  const head = snake[0];
  drawCell(head.x, head.y, COLORS.snakeHead, 3);
}

function drawCell(cx, cy, color, inset = 4) {
  const x = cx * CELL_PX;
  const y = cy * CELL_PX;
  const pad = Math.max(0, Math.min(inset, Math.floor(CELL_PX / 3)));
  ctx.fillStyle = color;
  ctx.fillRect(x + pad, y + pad, CELL_PX - pad * 2, CELL_PX - pad * 2);
}

// ----- Game Over -----
function gameOver() {
  running = false;

  // Simple message overlay
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px ui-sans-serif, system-ui, -apple-system, Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 18);
  ctx.font = "500 16px ui-sans-serif, system-ui, -apple-system, Segoe UI";
  ctx.fillText("Press Space or tap Pause to restart", canvas.width / 2, canvas.height / 2 + 14);
  ctx.restore();

  // Restart on next pause toggle
  const restart = () => {
    // Clean up one-time listener
    btnPause.removeEventListener("click", restartHandler);
    window.removeEventListener("keydown", restartKeyHandler);

    resetGame();
    running = true;
    lastTime = performance.now();
    acc = 0;
    requestAnimationFrame(loop);
  };

  const restartHandler = (ev) => {
    ev.preventDefault();
    restart();
  };
  const restartKeyHandler = (e) => {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      restart();
    }
  };

  btnPause.addEventListener("click", restartHandler, { once: true });
  window.addEventListener("keydown", restartKeyHandler, { once: true });
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
