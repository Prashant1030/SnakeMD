"use strict";

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

// Sounds
const eatSound = new Audio("eat.mp3");
const hitSound = new Audio("hit.mp3");

// Config
const GRID_SIZE = 24;
const CELL_PX = canvas.width / GRID_SIZE;
const TICK_RATE = 8;
const STEP_MS = 1000 / TICK_RATE;

let snake, dir, nextDir, food;
let score, highScore = readHighScore();
let wallOn = true;
let running = true;
let justTurnedThisTick = false;
let gameOverTriggered = false;
let lastTime = 0, acc = 0;

function resetGame() {
  const startX = Math.floor(GRID_SIZE / 2);
  const startY = Math.floor(GRID_SIZE / 2);
  // Start with 5 segments
  snake = [];
  for (let i = 0; i < 5; i++) {
    snake.push({ x: startX - i, y: startY });
  }
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
    food = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
}

function readHighScore() {
  return Number(localStorage.getItem("snakeHighScore")) || 0;
}

function writeHighScore(n) {
  localStorage.setItem("snakeHighScore", String(n));
}

function updateScoreUI() {
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
}

function updateWallUI() {
  wallStateEl.textContent = wallOn ? "ON" : "OFF";
  wallToggleEl.checked = wallOn;
}

function setNextDir(nx, ny) {
  if (nx === -dir.x && ny === -dir.y) return;
  if (justTurnedThisTick) return;
  nextDir = { x: nx, y: ny };
  justTurnedThisTick = true;
}

window.addEventListener("keydown", e => {
  switch (e.key) {
    case "ArrowUp": setNextDir(0, -1); e.preventDefault(); break;
    case "ArrowDown": setNextDir(0, 1); e.preventDefault(); break;
    case "ArrowLeft": setNextDir(-1, 0); e.preventDefault(); break;
    case "ArrowRight": setNextDir(1, 0); e.preventDefault(); break;
    case " ": togglePause(); e.preventDefault(); break;
  }
});

function bindButton(el, fn) {
  el.addEventListener("click", e => { e.preventDefault(); fn(); });
}
bindButton(btnUp, () => setNextDir(0, -1));
bindButton(btnDown, () => setNextDir(0, 1));
bindButton(btnLeft, () => setNextDir(-1, 0));
bindButton(btnRight, () => setNextDir(1, 0));
bindButton(btnPause, () => togglePause());

wallToggleEl.addEventListener("change", () => { wallOn = wallToggleEl.checked; updateWallUI(); });

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
  acc += ts - lastTime;
  lastTime = ts;
  while (acc >= STEP_MS) { tick(); acc -= STEP_MS; }
  draw();
  requestAnimationFrame(loop);
}

function tick() {
  dir = { ...nextDir };
  justTurnedThisTick = false;

  let nx = snake[0].x + dir.x;
  let ny = snake[0].y + dir.y;

  if (wallOn) {
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return gameOver();
  } else {
    nx = (nx + GRID_SIZE) % GRID_SIZE;
    ny = (ny + GRID_SIZE) % GRID_SIZE;
  }

  const head = { x: nx, y: ny };
  if (snake.some((s, i) => i && s.x === head.x && s.y === head.y)) return gameOver();

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    eatSound.currentTime = 0; eatSound.play();
    score++;
    if (score > highScore) { highScore = score; writeHighScore(highScore); }
    updateScoreUI();
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.clearRect(0, 0,
