const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const box = 20;
let snake = [{ x: 9 * box, y: 9 * box }];
let direction = "right";
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let food = spawnFood();
let gameInterval;
let isPaused = false;

document.getElementById("highScore").textContent = highScore;

function drawSnake() {
  snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#00f" : "#0f0";
    ctx.save();
    ctx.translate(segment.x + box / 2, segment.y + box / 2);
    if (index === 0 || index === snake.length - 1) {
      const angle = getRotationAngle(index);
      ctx.rotate(angle);
    }
    ctx.fillRect(-box / 2, -box / 2, box, box);
    ctx.restore();
  });
}

function getRotationAngle(index) {
  let dir;
  if (index === 0) dir = direction;
  else {
    const tail = snake[snake.length - 1];
    const beforeTail = snake[snake.length - 2];
    if (tail.x < beforeTail.x) dir = "left";
    else if (tail.x > beforeTail.x) dir = "right";
    else if (tail.y < beforeTail.y) dir = "up";
    else dir = "down";
  }
  switch (dir) {
    case "up": return 0;
    case "right": return Math.PI / 2;
    case "down": return Math.PI;
    case "left": return -Math.PI / 2;
  }
}

function drawFood() {
  ctx.fillStyle = "red";
  ctx.fillRect(food.x, food.y, box, box);
}

function spawnFood() {
  return {
    x: Math.floor(Math.random() * 20) * box,
    y: Math.floor(Math.random() * 20) * box,
  };
}

function changeDirection(dir) {
  const opposite = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };
  if (dir !== opposite[direction]) direction = dir;
}

function updateGame() {
  if (isPaused) return;

  const head = { x: snake[0].x, y: snake[0].y };
  switch (direction) {
    case "up": head.y -= box; break;
    case "down": head.y += box; break;
    case "left": head.x -= box; break;
    case "right": head.x += box; break;
  }

  if (
    head.x < 0 || head.x >= canvas.width ||
    head.y < 0 || head.y >= canvas.height ||
    snake.some(seg => seg.x === head.x && seg.y === head.y)
  ) {
    clearInterval(gameInterval);
    alert("Game Over!");
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

function pauseGame() {
  isPaused = true;
}

function resumeGame() {
  isPaused = false;
}

function restartGame() {
  clearInterval(gameInterval);
  snake = [{ x: 9 * box, y: 9 * box }];
  direction = "right";
  score = 0;
  document.getElementById("score").textContent = score;
  food = spawnFood();
  isPaused = false;
  gameInterval = setInterval(updateGame, 150);
}

document.addEventListener("keydown", e => {
  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };
  if (keyMap[e.key]) changeDirection(keyMap[e.key]);
});

restartGame();
