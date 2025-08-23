const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const box = 20;
let snake = [{ x: 9 * box, y: 10 * box }];
let direction = "RIGHT";
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;

let food = {
  x: Math.floor(Math.random() * 19 + 1) * box,
  y: Math.floor(Math.random() * 19 + 1) * box
};

const eatSound = new Audio("eat.mp3");
const hitSound = new Audio("hit.mp3");

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
  else if (e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
  else if (e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
  else if (e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
});

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  snake.forEach((segment, i) => {
    ctx.fillStyle = i === 0 ? "#00ff00" : "#00aa00";
    ctx.fillRect(segment.x, segment.y, box, box);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(segment.x, segment.y, box, box);
  });

  ctx.fillStyle = "red";
  ctx.fillRect(food.x, food.y, box, box);

  let headX = snake[0].x;
  let headY = snake[0].y;

  if (direction === "LEFT") headX -= box;
  if (direction === "UP") headY -= box;
  if (direction === "RIGHT") headX += box;
  if (direction === "DOWN") headY += box;

  if (headX === food.x && headY === food.y) {
    score++;
    eatSound.play();
    food = {
      x: Math.floor(Math.random() * 19 + 1) * box,
      y: Math.floor(Math.random() * 19 + 1) * box
    };
  } else {
    snake.pop();
  }

  let newHead = { x: headX, y: headY };

  if (
    headX < 0 || headX >= canvas.width ||
    headY < 0 || headY >= canvas.height ||
    snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)
  ) {
    hitSound.play();
    score = 0;
    snake = [{ x: 9 * box, y: 10 * box }];
    direction = "RIGHT";
  }

  snake.unshift(newHead);

  document.getElementById("scoreBox").textContent = "Score: " + score;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
  document.getElementById("highScoreBox").textContent = "High Score: " + highScore;
}

setInterval(draw, 100);
