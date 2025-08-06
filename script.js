const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');

// Colorful palette
const PADDLE_COLORS = ['#00ffc6', '#ff5c58', '#ffc93c'];
const BALL_COLORS = ['#00bcd4', '#ff4e50', '#f9d423', '#ff6e7f', '#66ff99'];
const NET_COLOR = '#fff';
const SCORE_COLOR = '#f9d423';
const SHADOW_COLOR = '#222d';

// Game constants
const PADDLE_WIDTH = 16;
const PADDLE_HEIGHT = 110;
const BALL_RADIUS = 13;
const PLAYER_X = 28;
const AI_X = canvas.width - PLAYER_X - PADDLE_WIDTH;
const PADDLE_SPEED = 7.2;
const BALL_SPEED = 6.2;

// AI Weakness
const AI_PADDLE_SPEED = 3.3; // Bikin AI lebih lambat
const AI_REACT_DELAY = 12;   // Frame delay (semakin besar, semakin lambat AI bereaksi)
const AI_ERROR_RANGE = 60;   // Error acak maksimum (pixel)

let aiTargetY = 0;
let aiDelayCounter = 0;

// Game state
let playerY = (canvas.height - PADDLE_HEIGHT) / 2;
let aiY = (canvas.height - PADDLE_HEIGHT) / 2;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballVX = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
let ballVY = BALL_SPEED * (Math.random() * 2 - 1);
let ballColorIndex = 0;
let playerScore = 0;
let aiScore = 0;
let paddleGlow = 0;

// Mouse control for player paddle
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    playerY = mouseY - PADDLE_HEIGHT / 2;
    if (playerY < 0) playerY = 0;
    if (playerY > canvas.height - PADDLE_HEIGHT)
        playerY = canvas.height - PADDLE_HEIGHT;
});

// Draw net
function drawNet() {
    ctx.save();
    ctx.strokeStyle = NET_COLOR;
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 14]);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
}

// Draw paddles
function drawPaddle(x, y, colorIndex, glow = false) {
    ctx.save();
    ctx.shadowColor = glow ? PADDLE_COLORS[colorIndex] : SHADOW_COLOR;
    ctx.shadowBlur = glow ? 30 : 8;
    ctx.fillStyle = PADDLE_COLORS[colorIndex];
    ctx.fillRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT);
    // Pseudo-gloss effect
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 2, y + 4, PADDLE_WIDTH - 4, PADDLE_HEIGHT * 0.4);
    ctx.globalAlpha = 1;
    ctx.restore();
}

// Draw ball
function drawBall(x, y, colorIndex) {
    ctx.save();
    ctx.shadowColor = BALL_COLORS[colorIndex];
    ctx.shadowBlur = 28;
    let grad = ctx.createRadialGradient(x, y, 4, x, y, BALL_RADIUS);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.5, BALL_COLORS[colorIndex]);
    grad.addColorStop(1, '#222a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Draw scores
function drawScores() {
    ctx.save();
    ctx.font = "bold 48px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = SCORE_COLOR;
    ctx.fillText(playerScore, canvas.width / 2 - 80, 62);
    ctx.fillText(aiScore, canvas.width / 2 + 80, 62);
    ctx.restore();
}

// Animated background glow
function drawBGGlow(time) {
    let grad = ctx.createLinearGradient(
        0, (canvas.height * (0.3 + 0.2 * Math.sin(time / 1100))),
        canvas.width, canvas.height * (0.7 + 0.2 * Math.cos(time / 1200))
    );
    grad.addColorStop(0, "#b490ca22");
    grad.addColorStop(0.4, "#5ee7df11");
    grad.addColorStop(1, "#ffc93c22");
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// Draw everything
function draw(time = 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBGGlow(time);
    drawNet();
    drawPaddle(PLAYER_X, playerY, 0, paddleGlow > 0);
    drawPaddle(AI_X, aiY, 1);
    drawBall(ballX, ballY, ballColorIndex);
    drawScores();
}

// Update game state
function update() {
    ballX += ballVX;
    ballY += ballVY;

    // Ball collision with top/bottom walls
    if (ballY - BALL_RADIUS < 0) {
        ballY = BALL_RADIUS;
        ballVY = -ballVY;
        paddleGlow = 6;
    }
    if (ballY + BALL_RADIUS > canvas.height) {
        ballY = canvas.height - BALL_RADIUS;
        ballVY = -ballVY;
        paddleGlow = 6;
    }

    // Ball collision with player paddle
    if (
        ballX - BALL_RADIUS < PLAYER_X + PADDLE_WIDTH &&
        ballY > playerY &&
        ballY < playerY + PADDLE_HEIGHT
    ) {
        ballX = PLAYER_X + PADDLE_WIDTH + BALL_RADIUS;
        ballVX = -ballVX * 1.035;
        let collidePoint = ballY - (playerY + PADDLE_HEIGHT / 2);
        let normalized = collidePoint / (PADDLE_HEIGHT / 2);
        ballVY = BALL_SPEED * (normalized + (Math.random() - 0.5) * 0.3);
        ballColorIndex = (ballColorIndex + 1) % BALL_COLORS.length;
        paddleGlow = 12;
    }

    // Ball collision with AI paddle
    if (
        ballX + BALL_RADIUS > AI_X &&
        ballY > aiY &&
        ballY < aiY + PADDLE_HEIGHT
    ) {
        ballX = AI_X - BALL_RADIUS;
        ballVX = -ballVX * 1.035;
        let collidePoint = ballY - (aiY + PADDLE_HEIGHT / 2);
        let normalized = collidePoint / (PADDLE_HEIGHT / 2);
        ballVY = BALL_SPEED * (normalized + (Math.random() - 0.5) * 0.3);
        ballColorIndex = (ballColorIndex + 1) % BALL_COLORS.length;
        paddleGlow = 10;
    }

    // Score (ball out left/right)
    if (ballX - BALL_RADIUS < 0) {
        aiScore += 1;
        resetBall(-1);
    }
    if (ballX + BALL_RADIUS > canvas.width) {
        playerScore += 1;
        resetBall(1);
    }

    // --- EASY AI ---
    // Delay AI reaction
    aiDelayCounter++;
    if (aiDelayCounter > AI_REACT_DELAY) {
        // Target Y is the ball + random error, but only set after delay
        aiTargetY = ballY + (Math.random() - 0.5) * AI_ERROR_RANGE;
        aiDelayCounter = 0;
    }
    let aiCenter = aiY + PADDLE_HEIGHT / 2;
    if (aiTargetY < aiCenter - 16) {
        aiY -= AI_PADDLE_SPEED;
    } else if (aiTargetY > aiCenter + 16) {
        aiY += AI_PADDLE_SPEED;
    }
    if (aiY < 0) aiY = 0;
    if (aiY > canvas.height - PADDLE_HEIGHT) aiY = canvas.height - PADDLE_HEIGHT;

    if (paddleGlow > 0) paddleGlow--;
}

// Reset ball to center
function resetBall(dir = 1) {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballVX = BALL_SPEED * (dir || (Math.random() > 0.5 ? 1 : -1));
    ballVY = BALL_SPEED * (Math.random() * 2 - 1);
    ballColorIndex = Math.floor(Math.random() * BALL_COLORS.length);
    aiTargetY = canvas.height / 2; // Reset AI target
}

// Main loop
function loop(time) {
    update();
    draw(time);
    requestAnimationFrame(loop);
}

// Start game
loop(0);