const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const box = 20;
let snake = [];
let direction = "right";
let food = spawnFood();
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let isPaused = false;
let gameOver = false;
let wallCollision = false;
let interval;

document.getElementById("highScore").textContent = highScore;

function initSnake() {
  snake = [];
  for (let i = 0; i < 5; i++) {
    snake.push({ x: 200 - i * box, y: 200 });
  }
}

function spawnFood() {
  return {
    x: Math.floor(Math.random() * (canvas.width / box)) * box,
    y: Math.floor(Math.random() * (canvas.height / box)) * box,
  };
}

function draw() {
  if (isPaused || gameOver) return;

  const head = { ...snake[0] };
  switch (direction) {
    case "up": head.y -= box; break;
    case "down": head.y += box; break;
    case "left": head.x -= box; break;
    case "right": head.x += box; break;
  }

  if (wallCollision) {
    if (
      head.x < 0 || head.x >= canvas.width ||
      head.y < 0 || head.y >= canvas.height
    ) {
      endGame();
      return;
    }
  } else {
    if (head.x < 0) head.x = canvas.width - box;
    if (head.x >= canvas.width) head.x = 0;
    if (head.y < 0) head.y = canvas.height - box;
    if (head.y >= canvas.height) head.y = 0;
  }

  if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    document.getElementById("score").textContent = score;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore);
      document.getElementById("highScore").textContent = highScore;
    }
    food = spawnFood();
  } else {
    snake.pop();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawFood();
  drawSnake();
}

function drawSnake() {
  snake.forEach((seg, i) => {
    if (i === 0) {
      // Head with eyes and fangs
      ctx.fillStyle = "#00f";
      ctx.beginPath();
      ctx.arc(seg.x + box / 2, seg.y + box / 2, box / 2, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(seg.x + 6, seg.y + 6, 3, 0, Math.PI * 2);
      ctx.arc(seg.x + 14, seg.y + 6, 3, 0, Math.PI * 2);
      ctx.fill();

      // Fangs
      ctx.fillStyle = "red";
      ctx.fillRect(seg.x + 8, seg.y + 14, 4, 6);
      ctx.fillRect(seg.x + 12, seg.y + 14, 4, 6);
    } else if (i === snake.length - 1) {
      // Cone-shaped tail
      ctx.fillStyle = "#0a0";
      ctx.beginPath();
      ctx.moveTo(seg.x + box / 2, seg.y);
      ctx.lineTo(seg.x, seg.y + box);
      ctx.lineTo(seg.x + box, seg.y + box);
      ctx.closePath();
      ctx.fill();
    } else {
      // Cylindrical body
      ctx.fillStyle = "#0f0";
      ctx.beginPath();
      ctx.arc(seg.x + box / 2, seg.y + box / 2, box / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawFood() {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(food.x + box / 2, food.y + box / 2, box / 2, 0, Math.PI * 2);
  ctx.fill();
}

function setDirection(dir) {
  const opposite = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };
  if (dir !== opposite[direction]) direction = dir;
}

function togglePause() {
  if (gameOver) {
    restartGame();
  } else {
    isPaused = !isPaused;
    document.getElementById("centerBtn").textContent = isPaused ? "▶️" : "⏸️";
  }
}

function toggleWall() {
  wallCollision = document.getElementById("wallToggle").checked;
}

function endGame() {
  clearInterval(interval);
  gameOver = true;
  document.getElementById("centerBtn").textContent = "🔄";
}

function restartGame() {
  initSnake();
  direction = "right";
  food = spawnFood();
  score = 0;
  isPaused = false;
  gameOver = false;
  document.getElementById("score").textContent = score;
  document.getElementById("centerBtn").textContent = "⏸️";
  interval = setInterval(draw, 150);
}

document.addEventListener("keydown", e => {
  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };
  if (keyMap[e.key]) setDirection(keyMap[e.key]);
});

restartGame();
