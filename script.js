const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const box = 20;
const rows = canvas.height / box;
const cols = canvas.width / box;

let snake = [{ x: 10, y: 10 }];
let direction = "RIGHT";
let food = spawnFood();
let score = 0;
let highscore = localStorage.getItem("highscore") || 0;
let gameOver = false;

const eatSound = document.getElementById("eatSound");
const hitSound = document.getElementById("hitSound");

document.getElementById("highscore").textContent = `High Score: ${highscore}`;

document.addEventListener("keydown", (e) => {
  if (gameOver) {
    resetGame();
    return;
  }

  switch (e.key) {
    case "ArrowUp":
      if (direction !== "DOWN") direction = "UP";
      break;
    case "ArrowDown":
      if (direction !== "UP") direction = "DOWN";
      break;
    case "ArrowLeft":
      if (direction !== "RIGHT") direction = "LEFT";
      break;
    case "ArrowRight":
      if (direction !== "LEFT") direction = "RIGHT";
      break;
  }
});

function spawnFood() {
  return {
    x: Math.floor(Math.random() * cols),
    y: Math.floor(Math.random() * rows),
  };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw food
  ctx.fillStyle = "red";
  ctx.fillRect(food.x * box, food.y * box, box, box);

  // Draw snake
  ctx.fillStyle = "lime";
  snake.forEach((segment) => {
    ctx.fillRect(segment.x * box, segment.y * box, box, box);
  });

  moveSnake();
  checkCollision();
  document.getElementById("score").textContent = `Score: ${score}`;
}

function moveSnake() {
  const head = { ...snake[0] };

  switch (direction) {
    case "UP": head.y--; break;
    case "DOWN": head.y++; break;
    case "LEFT": head.x--; break;
    case "RIGHT": head.x++; break;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    eatSound.currentTime = 0;
    eatSound.play();
    food = spawnFood();
  } else {
    snake.pop();
  }
}

function checkCollision() {
  const head = snake[0];

  // Wall collision
  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    endGame();
  }

  // Self collision
  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      endGame();
    }
  }
}

function endGame() {
  hitSound.currentTime = 0;
  hitSound.play();
  gameOver = true;
  if (score > highscore) {
    highscore = score;
    localStorage.setItem("highscore", highscore);
    document.getElementById("highscore").textContent = `High Score: ${highscore}`;
  }
  alert("Game Over! Press any arrow key to restart.");
}

function resetGame() {
  snake = [{ x: 10, y: 10 }];
  direction = "RIGHT";
  food = spawnFood();
  score = 0;
  gameOver = false;
}

setInterval(() => {
  if (!gameOver) draw();
}, 100);
