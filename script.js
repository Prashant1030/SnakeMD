// SnakeMD - Fixed & Enhanced Version
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const box = 20;
const canvasSize = 400;
canvas.width = canvasSize;
canvas.height = canvasSize;

let snake = [{ x: 9 * box, y: 10 * box }];
let direction = "RIGHT";
let food = spawnFood();
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let wallCollision = true;

const eatSound = new Audio("sounds/eat.mp3");
const dieSound = new Audio("sounds/die.mp3");

document.addEventListener("keydown", changeDirection);
document.getElementById("wallToggle").addEventListener("click", () => {
  wallCollision = !wallCollision;
  document.getElementById("wallToggle").textContent = wallCollision ? "Wall: ON" : "Wall: OFF";
});

["up", "down", "left", "right"].forEach(dir => {
  document.getElementById(dir).addEventListener("click", () => changeDirection({ key: dir.toUpperCase() }));
});

function changeDirection(e) {
  const key = e.key || e;
  if (key === "ArrowLeft" || key === "LEFT" && direction !== "RIGHT") direction = "LEFT";
  else if (key === "ArrowUp" || key === "UP" && direction !== "DOWN") direction = "UP";
  else if (key === "ArrowRight" || key === "RIGHT" && direction !== "LEFT") direction = "RIGHT";
  else if (key === "ArrowDown" || key === "DOWN" && direction !== "UP") direction = "DOWN";
}

function spawnFood() {
  return {
    x: Math.floor(Math.random() * canvas.width / box) * box,
    y: Math.floor(Math.random() * canvas.height / box) * box
  };
}

function draw() {
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw food
  ctx.fillStyle = "red";
  ctx.fillRect(food.x, food.y, box, box);

  // Draw snake
  snake.forEach((segment, i) => {
    ctx.fillStyle = i === 0 ? "green" : "lime";
    ctx.fillRect(segment.x, segment.y, box, box);
    if (i === 0) drawMouth(segment); // Head animation
  });

  // Move snake
  let head = { ...snake[0] };
  if (direction === "LEFT") head.x -= box;
  if (direction === "UP") head.y -= box;
  if (direction === "RIGHT") head.x += box;
  if (direction === "DOWN") head.y += box;

  // Wall collision
  if (wallCollision && (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height)) {
    dieSound.play();
    resetGame();
    return;
  }

  // Wrap around
  if (!wallCollision) {
    head.x = (head.x + canvas.width) % canvas.width;
    head.y = (head.y + canvas.height) % canvas.height;
  }

  // Self collision
  if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    dieSound.play();
    resetGame();
    return;
  }

  snake.unshift(head);

  // Eat food
  if (head.x === food.x && head.y === food.y) {
    score++;
    eatSound.play();
    food = spawnFood();
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore);
    }
  } else {
    snake.pop();
  }

  updateScore();
}

function drawMouth(head) {
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(head.x + box / 2, head.y + box / 2, box / 4, 0, Math.PI * 2);
  ctx.fill();
}

function updateScore() {
  document.getElementById("score").textContent = `Score: ${score}`;
  document.getElementById("highScore").textContent = `High Score: ${highScore}`;
}

function resetGame() {
  snake = [{ x: 9 * box, y: 10 * box }];
  direction = "RIGHT";
  score = 0;
  food = spawnFood();
}

setInterval(draw, 100);
