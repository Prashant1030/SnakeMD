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
[eatSound, hitSound].forEach(a => a.preload = "auto");

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

// ----- Init -----
function readHighScore() {
  const v = localStorage.getItem("snakeHighScore");
  const n = v == null ? 0 : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function writeHighScore(n) {
  localStorage.setItem("snakeHighScore", String(n));
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
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
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

function gameOver() {
  hitSound.currentTime = 0;
  hitSound.play().catch(() => {});
  resetGame();
}

// ----- Render ----
