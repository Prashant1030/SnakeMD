const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const wallStatusEl = document.getElementById("wallStatus");
const wallToggleBtn = document.getElementById("wallToggle");
const hitSound = document.getElementById("hitSound");

let snake = [{ x: 10, y: 10 }];
let direction = { x: 0, y: 0 };
let food = { x: 5, y: 5 };
let score = 0;
let highScore = 0;
let wallOn = true;
let gamePaused = false;

const gridSize = 20;
const tileCount = canvas.width / gridSize;

function drawGame() {
  if (gamePaused) return;

  moveSnake();
  if (checkCollision()) {
    hitSound.play();
    resetGame();
    return;
  }

  if (snake[0].x === food.x && snake[0].y === food.y) {
    snake.push({ ...snake[snake.length - 1] });
    score++;
    scoreEl.textContent = score;
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
    }
    placeFood();
  }

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ff0000";
  ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);

  ctx.fillStyle = "#00ff00";
  snake.forEach(segment => {
    ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
  });
}

function moveSnake() {
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  snake.unshift(head);
  snake.pop();
}

function checkCollision() {
  const head = snake[0];

  if (wallOn && (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount)) {
    return true;
  }

  if (!wallOn) {
    head.x = (head.x + tileCount) % tileCount;
    head.y = (head.y + tileCount) % tileCount;
  }

  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      return true;
    }
  }

  return false;
}

function placeFood() {
  food.x = Math.floor(Math.random() * tileCount);
  food.y = Math.floor(Math.random() * tileCount);
}

function resetGame() {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 0, y: 0 };
  score = 0;
  scoreEl.textContent = score;
  placeFood();
}

document.getElementById("up").onclick = () => direction = { x: 0, y: -1 };
document.getElementById("down").onclick = () => direction = { x: 0, y: 1 };
document.getElementById("left").onclick = () => direction = { x: -1, y: 0 };
document.getElementById("right").onclick = () => direction = { x: 1, y: 0 };

document.getElementById("pausePlay").onclick = () => {
  gamePaused = !gamePaused;
  document.getElementById("pausePlay").textContent = gamePaused ? "▶️" : "⏸";
};

wallToggleBtn.onclick = () => {
  wallOn = !wallOn;
  wallStatusEl.textContent = wallOn ? "ON" : "OFF";
  wallToggleBtn.textContent = `Wall: ${wallOn ? "ON" : "OFF"}`;
};

placeFood();
setInterval(drawGame, 150);
