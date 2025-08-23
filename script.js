const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const highscoreDisplay = document.getElementById("highscore");
const messageBox = document.getElementById("messageBox");

const eatSound = document.getElementById("eatSound");
const hitSound = document.getElementById("hitSound");

let snake = [{ x: 10, y: 10 }];
let direction = { x: 0, y: 0 };
let food = { x: 5, y: 5 };
let score = 0;
let highscore = 0;
let gridSize = 20;
let gameInterval;

function startGame() {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 0, y: 0 };
  food = generateFood();
  score = 0;
  updateScore();
  messageBox.classList.add("hidden");
  clearInterval(gameInterval);
  gameInterval = setInterval(update, 100);
}

function update() {
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // Collision detection
  if (head.x < 0 || head.x >= canvas.width / gridSize || head.y < 0 || head.y >= canvas.height / gridSize || isCollision(head)) {
    hitSound.currentTime = 0;
    hitSound.play();
    messageBox.classList.remove("hidden");
    clearInterval(gameInterval);
    return;
  }

  snake.unshift(head);

  // Eating food
  if (head.x === food.x && head.y === food.y) {
    eatSound.currentTime = 0;
    eatSound.play();
    score++;
    updateScore();
    food = generateFood();
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw snake
  ctx.fillStyle = "lime";
  snake.forEach(segment => {
    ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
  });

  // Draw food
  ctx.fillStyle = "red";
  ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
}

function generateFood() {
  return {
    x: Math.floor(Math.random() * canvas.width / gridSize),
    y: Math.floor(Math.random() * canvas.height / gridSize)
  };
}

function isCollision(pos) {
  return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}

function updateScore() {
  scoreDisplay.textContent = `Score: ${score}`;
  if (score > highscore) {
    highscore = score;
    highscoreDisplay.textContent = `High Score: ${highscore}`;
  }
}

document.addEventListener("keydown", e => {
  switch (e.key) {
    case "ArrowUp": if (direction.y === 0) direction = { x: 0, y: -1 }; break;
    case "ArrowDown": if (direction.y === 0) direction = { x: 0, y: 1 }; break;
    case "ArrowLeft": if (direction.x === 0) direction = { x: -1, y: 0 }; break;
    case "ArrowRight": if (direction.x === 0) direction = { x: 1, y: 0 }; break;
    default: if (messageBox.classList.contains("hidden") === false) startGame(); break;
  }
});

startGame();
