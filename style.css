// --- Canvas and grid ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const TILE = 24; // crisp pixels
const COLS = Math.floor(canvas.width / TILE);
const ROWS = Math.floor(canvas.height / TILE);

// --- UI state ---
const scoreEl = document.getElementById("score");
const highEl = document.getElementById("highscore");
const toggleWallBtn = document.getElementById("toggleWall");
const pausePlayBtn = document.getElementById("pausePlay");

// --- Audio ---
const eatSound = document.getElementById("eatSound");
const hitSound = document.getElementById("hitSound");

// --- Game state ---
let wallOn = true;
let paused = false;
let gameOver = false;

let snake;          // [{x,y}]
let dir;            // "UP"|"DOWN"|"LEFT"|"RIGHT"
let nextDir;        // queued direction to apply on tick
let food;           // {x,y}
let enemies;        // [{x,y,type,dir}]
let obstacles;      // Set of "x,y" strings
let score = 0;
let high = Number(localStorage.getItem("highscore") || 0);

// Ticking system with adjustable speed
let stepMs;         // current milliseconds per tick
let lastTs = 0;
let acc = 0;

init();
requestAnimationFrame(loop);

// --- Initialization ---
function init() {
  snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
  dir = "RIGHT";
  nextDir = "RIGHT";
  enemies = [];
  obstacles = new Set();
  score = 0;
  stepMs = 180; // start speed (lower is faster)
  gameOver = false;
  paused = false;
  updateScores();

  // Initial spawns
  food = safeSpawn();
  spawnObstacles(5);
  spawnEnemies(2); // one hunter, one patroller
}

// --- Main loop ---
function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = ts - lastTs;
  lastTs = ts;

  if (!paused && !gameOver) {
    acc += dt;
    while (acc >= stepMs) {
      tick();
      acc -= stepMs;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

// --- Tick: update game state ---
function tick() {
  // Apply buffered direction (prevents instant reverse)
  if (isValidTurn(dir, nextDir)) dir = nextDir;

  // Move snake
  const head = nextCell(snake[0], dir);
  if (wallOn && outOfBounds(head)) return endGame();
  wrapIfNeeded(head);
  // Collisions with self/obstacles/enemies
  if (hitsSelf(head) || hitsObstacle(head) || hitsEnemy(head)) return endGame();

  snake.unshift(head);

  // Eat logic
  if (sameCell(head, food)) {
    playEat();
    score++;
    updateScores();
    food = safeSpawn();
    // Increase difficulty gradually
    stepMs = Math.max(60, stepMs - 4);
    // Occasionally add hazards as you progress
    if (score % 4 === 0) spawnObstacles(1);
    if (score % 6 === 0 && enemies.length < 5) spawnEnemies(1);
  } else {
    snake.pop();
  }

  // Move enemies after snake
  enemies = enemies.map(moveEnemy);
}

// --- Spawning helpers ---
function safeSpawn() {
  // find a free cell
  while (true) {
    const p = { x: randInt(0, COLS - 1), y: randInt(0, ROWS - 1) };
    if (!onSnake(p) && !hitsObstacle(p) && !hitsEnemy(p) && !sameCell(p, food)) return p;
  }
}

function spawnObstacles(n) {
  for (let i = 0; i < n; i++) {
    const p = safeSpawn();
    obstacles.add(key(p));
  }
}

function spawnEnemies(n) {
  for (let i = 0; i < n; i++) {
    const type = enemies.length % 2 === 0 ? "hunter" : "patroller";
    const dir = ["UP", "DOWN", "LEFT", "RIGHT"][randInt(0, 3)];
    const p = safeSpawn();
    enemies.push({ x: p.x, y: p.y, type, dir });
  }
}

// --- Enemy movement ---
function moveEnemy(e) {
  if (e.type === "hunter") {
    // Greedy chase towards snake head with simple avoidance
    const target = snake[0];
    const options = prioritizeToward(e, target);
    for (const d of options) {
      const n = nextCell(e, d);
      if (isCellFreeForEnemy(n)) { e.x = n.x; e.y = n.y; e.dir = d; return e; }
    }
    // If all blocked, stay put
    return e;
  } else {
    // Patroller: continue straight, turn clockwise if blocked
    const pref = [e.dir, turnCW(e.dir), turnCW(turnCW(e.dir)), turnCW(turnCW(turnCW(e.dir)))];
    for (const d of pref) {
      const n = nextCell(e, d);
      if (isCellFreeForEnemy(n)) { e.x = n.x; e.y = n.y; e.dir = d; return e; }
    }
    return e;
  }
}

function prioritizeToward(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const opts = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    opts.push(dx > 0 ? "RIGHT" : "LEFT", dy > 0 ? "DOWN" : "UP");
  } else {
    opts.push(dy > 0 ? "DOWN" : "UP", dx > 0 ? "RIGHT" : "LEFT");
  }
  // add two alternative directions to avoid deadlocks
  const all = ["UP","RIGHT","DOWN","LEFT"];
  for (const d of all) if (!opts.includes(d)) opts.push(d);
  return opts;
}

function isCellFreeForEnemy(p) {
  if (wallOn && outOfBounds(p)) return false;
  wrapIfNeeded(p);
  if (onSnake(p)) return false;
  if (hitsObstacle(p)) return false;
  // Avoid enemy stacking: allow mild overlap by 1 in 10 to keep flow
  const occupied = enemies.some(en => en.x === p.x && en.y === p.y);
  return !occupied || Math.random() < 0.1;
}

// --- Input ---
document.addEventListener("keydown", (e) => {
  const map = { ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
                w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
                W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT" };
  if (e.key in map || map[e.key]) {
    e.preventDefault();
    if (gameOver) { restart(); return; }
    queueDirection(map[e.key]);
  } else if (e.key === " " || e.key === "Enter") {
    if (gameOver) { restart(); return; }
    togglePause();
  }
});

document.querySelectorAll(".dir").forEach(btn => {
  btn.addEventListener("click", () => {
    if (gameOver) { restart(); return; }
    const d = btn.getAttribute("data-dir");
    queueDirection(d);
  });
});

pausePlayBtn.addEventListener("click", () => {
  if (gameOver) { restart(); return; }
  togglePause();
});

toggleWallBtn.addEventListener("click", () => {
  wallOn = !wallOn;
  toggleWallBtn.textContent = `Wall: ${wallOn ? "ON" : "OFF"}`;
});

// buffer next direction safely
function queueDirection(d) {
  if (!d) return;
  if (isValidTurn(dir, d)) nextDir = d;
}

// --- Draw ---
function draw() {
  // Background grid
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // Obstacles
  ctx.fillStyle = "#8b8b8b";
  for (const cell of obstacles) {
    const [x, y] = cell.split(",").map(Number);
    drawRoundedRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6, 6, "#6f6f6f", "#9a9a9a");
  }

  // Food
  drawFood(food);

  // Enemies
  enemies.forEach(e => drawEnemy(e));

  // Snake
  drawSnake();

  // Overlays
  if (paused && !gameOver) overlayText("Paused", "#ffecb3");
  if (gameOver) overlayText("Game Over\nPress any arrow or center to restart", "#ffcdd2");

  // HUD
  // (score shown in topbar; no extra HUD needed)
}

function drawGrid() {
  ctx.strokeStyle = "#131313";
  ctx.lineWidth = 1;
  for (let x = TILE; x < canvas.width; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = TILE; y < canvas.height; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
}

function drawFood(p) {
  const x = p.x * TILE, y = p.y * TILE;
  // a glossy berry
  const r = TILE / 2 - 2;
  const cx = x + TILE / 2, cy = y + TILE / 2;
  const g = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, r);
  g.addColorStop(0, "#ff758f");
  g.addColorStop(1, "#e94560");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 6, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(e) {
  const x = e.x * TILE, y = e.y * TILE;
  // enemy body
  drawRoundedRect(x + 2, y + 2, TILE - 4, TILE - 4, 6, "#4d6fff", "#8cb0ff");
  // eye to indicate type/direction
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  const ang = angleFor(e.dir);
  ctx.rotate(ang);
  ctx.fillStyle = "#0b1e3a";
  ctx.fillRect(-4, -8, 8, 6);
  ctx.fillStyle = "#cde2ff";
  ctx.fillRect(-2, -7, 4, 3);
  ctx.restore();
}

function drawSnake() {
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const x = seg.x * TILE, y = seg.y * TILE;

    if (i === 0) {
      // Head with fangs oriented by dir
      ctx.save();
      ctx.translate(x + TILE / 2, y + TILE / 2);
      ctx.rotate(angleFor(dir));
      // head base
      drawCapsule(-TILE/2 + 2, -TILE/2 + 2, TILE - 4, TILE - 4, 8, "#39f279", "#b7ffd6");
      // eyes
      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(3, -6, 3, 3);
      ctx.fillRect(3, 3, 3, 3);
      // fangs
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(TILE/2 - 8, -4, 4, 8);
      ctx.fillRect(TILE/2 - 4, -3, 3, 6);
      ctx.restore();
    } else if (i === snake.length - 1) {
      // Tail oriented toward previous segment
      const prev = snake[i - 1];
      const tdir = directionBetween(seg, prev);
      ctx.save();
      ctx.translate(x + TILE / 2, y + TILE / 2);
      ctx.rotate(angleFor(tdir));
      // tapered tail triangle
      ctx.fillStyle = "#2eea6f";
      ctx.beginPath();
      ctx.moveTo(-TILE/2 + 3, 0);
      ctx.lineTo(TILE/2 - 6, -6);
      ctx.lineTo(TILE/2 - 6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      // Body segment with subtle shading
      drawCapsule(x + 3, y + 3, TILE - 6, TILE - 6, 8, "#2eea6f", "#a9ffd0");
    }
  }
}

// --- Drawing primitives ---
function drawRoundedRect(x, y, w, h, r, col, hi) {
  ctx.save();
  ctx.fillStyle = col;
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1;
  roundRectPath(x, y, w, h, r);
  ctx.fill();
  // subtle top highlight
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, hi);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = g;
  roundRectPath(x, y, w, h, r);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawCapsule(x, y, w, h, r, col, hi) {
  drawRoundedRect(x, y, w, h, r, col, hi);
}

function roundRectPath(x, y, w, h, r) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function overlayText(text, color) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = "bold 28px Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  const lines = text.split("\n");
  lines.forEach((ln, i) => ctx.fillText(ln, canvas.width / 2, canvas.height / 2 + i * 34));
  ctx.restore();
}

// --- Utilities & collisions ---
function playEat() { try { eatSound.currentTime = 0; eatSound.play(); } catch {} }
function playHit() { try { hitSound.currentTime = 0; hitSound.play(); } catch {} }

function updateScores() {
  scoreEl.textContent = `Score: ${score}`;
  if (score > high) {
    high = score;
    localStorage.setItem("highscore", String(high));
  }
  highEl.textContent = `High Score: ${high}`;
}

function isValidTurn(cur, nxt) {
  if (!nxt) return false;
  return !((cur === "UP" && nxt === "DOWN") ||
           (cur === "DOWN" && nxt === "UP") ||
           (cur === "LEFT" && nxt === "RIGHT") ||
           (cur === "RIGHT" && nxt === "LEFT"));
}

function outOfBounds(p) { return p.x < 0 || p.y < 0 || p.x >= COLS || p.y >= ROWS; }

function wrapIfNeeded(p) {
  if (wallOn) return;
  if (p.x < 0) p.x = COLS - 1;
  if (p.x >= COLS) p.x = 0;
  if (p.y < 0) p.y = ROWS - 1;
  if (p.y >= ROWS) p.y = 0;
}

function nextCell(p, d) {
  const n = { x: p.x, y: p.y };
  if (d === "UP") n.y--;
  else if (d === "DOWN") n.y++;
  else if (d === "LEFT") n.x--;
  else if (d === "RIGHT") n.x++;
  return n;
}

function sameCell(a, b) { return a && b && a.x === b.x && a.y === b.y; }
function key(p) { return `${p.x},${p.y}`; }

function onSnake(p) { return snake.some(s => sameCell(s, p)); }
function hitsSelf(p) { return snake.some((s, i) => i > 0 && sameCell(s, p)); }
function hitsObstacle(p) { return obstacles.has(key(p)); }
function hitsEnemy(p) { return enemies.some(e => e.x === p.x && e.y === p.y); }

function directionBetween(a, b) {
  if (b.x > a.x) return "RIGHT";
  if (b.x < a.x) return "LEFT";
  if (b.y > a.y) return "DOWN";
  return "UP";
}

function angleFor(d) {
  return d === "UP" ? -Math.PI/2 :
         d === "DOWN" ? Math.PI/2 :
         d === "LEFT" ? Math.PI :
         0;
}

function turnCW(d) {
  return d === "UP" ? "RIGHT" :
         d === "RIGHT" ? "DOWN" :
         d === "DOWN" ? "LEFT" : "UP";
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// --- Game control ---
function togglePause() {
  paused = !paused;
  pausePlayBtn.textContent = paused ? "▶" : "⏸";
}

function endGame() {
  playHit();
  gameOver = true;
}

function restart() {
  lastTs = 0; acc = 0;
  init();
  pausePlayBtn.textContent = "⏸";
}
