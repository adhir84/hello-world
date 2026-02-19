// ─── Snake Game ───────────────────────────────────────────────────────────────
// A beginner-friendly Snake game using HTML5 Canvas.
// Key concepts demonstrated:
//   - Game loop with requestAnimationFrame
//   - Keyboard input handling
//   - Canvas 2D drawing
//   - Game state management (idle, playing, game over)
//   - Collision detection

// ── Constants ──────────────────────────────────────────────────────────────────

const GRID_SIZE  = 20;          // Size of each cell in pixels
const COLS       = 20;          // Number of columns
const ROWS       = 20;          // Number of rows
const BASE_SPEED = 150;         // Milliseconds between each game tick (lower = faster)

// Colours
const COLORS = {
  background:  '#0f3460',
  gridLine:    'rgba(255,255,255,0.03)',
  snakeHead:   '#4ecca3',
  snakeBody:   '#38a387',
  snakeOutline:'#2d806a',
  food:        '#e94560',
  foodGlow:    'rgba(233,69,96,0.4)',
  superFood:   '#f5a623',
  superGlow:   'rgba(245,166,35,0.4)',
  text:        '#e0e0e0',
};

// Directions (dx, dy)
const DIR = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};

// ── DOM references ─────────────────────────────────────────────────────────────

const canvas    = document.getElementById('canvas');
const ctx       = canvas.getContext('2d');
const overlay   = document.getElementById('overlay');
const startBtn  = document.getElementById('start-btn');
const scoreEl   = document.getElementById('score');
const bestEl    = document.getElementById('best');
const levelEl   = document.getElementById('level');
const titleEl   = document.getElementById('overlay-title');
const msgEl     = document.getElementById('overlay-msg');
const scoreMsg  = document.getElementById('overlay-score');

// ── Game State ─────────────────────────────────────────────────────────────────

let snake;          // Array of {x, y} segments; index 0 is the head
let direction;      // Current movement direction
let nextDirection;  // Buffered direction (set on keypress, applied each tick)
let food;           // {x, y} position of current food
let superFood;      // {x, y} | null – bonus food that appears occasionally
let superFoodTimer; // How many ticks the super food stays
let score;
let bestScore = 0;
let level;
let gameState;      // 'idle' | 'playing' | 'dead'
let lastTickTime;   // Timestamp of the last game tick
let animFrameId;    // requestAnimationFrame handle
let foodPulse = 0;  // Animation counter for food pulse effect

// ── Initialisation ─────────────────────────────────────────────────────────────

function initGame() {
  // Start the snake in the middle of the board, 3 segments long
  const startX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS / 2);
  snake = [
    { x: startX,     y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];

  direction     = DIR.RIGHT;
  nextDirection = DIR.RIGHT;
  score         = 0;
  level         = 1;
  superFood     = null;
  superFoodTimer = 0;
  gameState     = 'playing';
  lastTickTime  = null;

  placeFood();
  updateHUD();
}

// ── Food placement ─────────────────────────────────────────────────────────────

function placeFood() {
  food = randomEmptyCell();
}

function placeSuperfood() {
  superFood      = randomEmptyCell();
  superFoodTimer = 30; // visible for 30 ticks
}

function randomEmptyCell() {
  let cell;
  do {
    cell = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (isOccupied(cell));
  return cell;
}

function isOccupied(cell) {
  return snake.some(seg => seg.x === cell.x && seg.y === cell.y)
      || (food      && food.x      === cell.x && food.y      === cell.y)
      || (superFood && superFood.x === cell.x && superFood.y === cell.y);
}

// ── Game tick (logic update) ───────────────────────────────────────────────────

function tick() {
  // Apply buffered direction (prevents 180° reversal)
  direction = nextDirection;

  // Calculate new head position
  const head = snake[0];
  const newHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  // Wall collision
  if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
    endGame();
    return;
  }

  // Self collision (ignore the tail tip which will move away)
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
      endGame();
      return;
    }
  }

  // Move: add new head
  snake.unshift(newHead);

  // Check regular food
  if (newHead.x === food.x && newHead.y === food.y) {
    score += 10 * level;
    placeFood();

    // Every 5 foods, level up
    const foodsEaten = Math.floor(score / (10 * level));
    if (score > 0 && score % (50 * level) === 0) {
      level++;
    }

    // Occasionally spawn a superfood
    if (!superFood && Math.random() < 0.3) {
      placeSuperfood();
    }
  } else {
    // No food eaten — remove tail to maintain length
    snake.pop();
  }

  // Check super food
  if (superFood && newHead.x === superFood.x && newHead.y === superFood.y) {
    score += 50 * level;
    superFood = null;
  }

  // Tick down super food timer
  if (superFood) {
    superFoodTimer--;
    if (superFoodTimer <= 0) {
      superFood = null;
    }
  }

  updateHUD();
}

function endGame() {
  gameState = 'dead';
  if (score > bestScore) bestScore = score;
  bestEl.textContent = bestScore;
}

// ── HUD update ─────────────────────────────────────────────────────────────────

function updateHUD() {
  scoreEl.textContent = score;
  bestEl.textContent  = bestScore;
  levelEl.textContent = level;
}

// ── Speed calculation ──────────────────────────────────────────────────────────

function tickInterval() {
  // Speed increases with level; minimum 60ms
  return Math.max(60, BASE_SPEED - (level - 1) * 15);
}

// ── Game loop ──────────────────────────────────────────────────────────────────

function gameLoop(timestamp) {
  if (gameState === 'playing') {
    // First frame
    if (!lastTickTime) lastTickTime = timestamp;

    const elapsed = timestamp - lastTickTime;

    if (elapsed >= tickInterval()) {
      lastTickTime = timestamp;
      tick();
    }

    draw(timestamp);

    if (gameState === 'playing') {
      animFrameId = requestAnimationFrame(gameLoop);
    } else {
      // Game just ended — draw one final frame then show overlay
      draw(timestamp);
      showOverlay('Game Over', `You scored ${score} points!`, 'Play Again');
    }
  }
}

// ── Drawing ────────────────────────────────────────────────────────────────────

function draw(timestamp) {
  foodPulse = timestamp / 500; // Smooth oscillation for glow effects

  drawBackground();
  drawGrid();
  if (superFood) drawSuperFood();
  drawFood();
  drawSnake();
}

function drawBackground() {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * GRID_SIZE, 0);
    ctx.lineTo(x * GRID_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * GRID_SIZE);
    ctx.lineTo(canvas.width, y * GRID_SIZE);
    ctx.stroke();
  }
}

function drawFood() {
  const { x, y } = food;
  const cx = x * GRID_SIZE + GRID_SIZE / 2;
  const cy = y * GRID_SIZE + GRID_SIZE / 2;
  const radius = GRID_SIZE / 2 - 2;

  // Pulsing glow
  const glowSize = 8 + Math.sin(foodPulse) * 4;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize + radius);
  glow.addColorStop(0, COLORS.foodGlow);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowSize + radius, 0, Math.PI * 2);
  ctx.fill();

  // Circle
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 3, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawSuperFood() {
  const { x, y } = superFood;
  const cx = x * GRID_SIZE + GRID_SIZE / 2;
  const cy = y * GRID_SIZE + GRID_SIZE / 2;
  const radius = GRID_SIZE / 2 - 1;

  // Pulsing glow
  const glowSize = 10 + Math.sin(foodPulse * 1.5) * 5;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize + radius);
  glow.addColorStop(0, COLORS.superGlow);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowSize + radius, 0, Math.PI * 2);
  ctx.fill();

  // Star shape
  drawStar(cx, cy, 5, radius, radius * 0.45, COLORS.superFood);

  // Blink warning when about to expire
  if (superFoodTimer < 8 && Math.floor(foodPulse * 3) % 2 === 0) return;

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 3, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(cx, cy, points, outerR, innerR, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawSnake() {
  snake.forEach((seg, index) => {
    const x = seg.x * GRID_SIZE;
    const y = seg.y * GRID_SIZE;
    const size = GRID_SIZE - 1;

    if (index === 0) {
      // Head — brighter colour
      ctx.fillStyle = COLORS.snakeHead;
    } else {
      // Body — fades slightly toward the tail
      const fade = 1 - (index / snake.length) * 0.5;
      ctx.fillStyle = shadeColor(COLORS.snakeBody, fade);
    }

    ctx.fillRect(x + 1, y + 1, size - 1, size - 1);

    // Subtle border
    ctx.strokeStyle = COLORS.snakeOutline;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 1.5, y + 1.5, size - 2, size - 2);

    // Draw eyes on head
    if (index === 0) {
      drawEyes(seg);
    }
  });
}

function drawEyes(head) {
  const cx = head.x * GRID_SIZE + GRID_SIZE / 2;
  const cy = head.y * GRID_SIZE + GRID_SIZE / 2;

  // Offset eyes based on direction
  const { x: dx, y: dy } = direction;
  const perpX = -dy;
  const perpY =  dx;
  const eyeOffset = GRID_SIZE * 0.22;
  const fwdOffset  = GRID_SIZE * 0.15;
  const eyeRadius  = 2.5;

  const positions = [
    { x: cx + perpX * eyeOffset + dx * fwdOffset, y: cy + perpY * eyeOffset + dy * fwdOffset },
    { x: cx - perpX * eyeOffset + dx * fwdOffset, y: cy - perpY * eyeOffset + dy * fwdOffset },
  ];

  positions.forEach(pos => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(pos.x + dx * 1, pos.y + dy * 1, eyeRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Multiply a hex colour's brightness by a factor
function shadeColor(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

// ── Overlay helpers ────────────────────────────────────────────────────────────

function showOverlay(title, msg, btnLabel) {
  titleEl.textContent   = title;
  msgEl.textContent     = msg;
  startBtn.textContent  = btnLabel;
  scoreMsg.textContent  = score > 0 ? `Score: ${score}` : '';
  overlay.style.display = 'flex';
}

function hideOverlay() {
  overlay.style.display = 'none';
}

// ── Input handling ─────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (gameState !== 'playing') return;

  // Prevent page scroll on arrow keys
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }

  const current = direction;

  switch (e.key) {
    case 'ArrowUp':    case 'w': case 'W':
      if (current !== DIR.DOWN)  nextDirection = DIR.UP;    break;
    case 'ArrowDown':  case 's': case 'S':
      if (current !== DIR.UP)    nextDirection = DIR.DOWN;  break;
    case 'ArrowLeft':  case 'a': case 'A':
      if (current !== DIR.RIGHT) nextDirection = DIR.LEFT;  break;
    case 'ArrowRight': case 'd': case 'D':
      if (current !== DIR.LEFT)  nextDirection = DIR.RIGHT; break;
  }
});

// ── Start button ───────────────────────────────────────────────────────────────

startBtn.addEventListener('click', () => {
  hideOverlay();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  initGame();
  animFrameId = requestAnimationFrame(gameLoop);
});

// ── Initial state ──────────────────────────────────────────────────────────────

// Draw a static preview while on the start screen
(function initialDraw() {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
})();

showOverlay('Snake', 'Use arrow keys or WASD to move', 'Start Game');
