// Game canvas and context
const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');

// Score elements
const playerScoreElement = document.getElementById('playerScore');
const aiScoreElement = document.getElementById('aiScore');

// Modern neon color palette matching CSS
const COLORS = {
    neonBlue: '#00f5ff',
    neonPink: '#ff006e', 
    neonGreen: '#39ff14',
    neonPurple: '#bf00ff',
    neonOrange: '#ff8c00',
    white: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.3)'
};

// Game constants
const GAME_CONFIG = {
    paddleWidth: 16,
    paddleHeight: 100,
    ballRadius: 12,
    playerX: 30,
    ballSpeed: 5.5,
    paddleSpeed: 8,
    aiSpeed: 3.0,
    aiReactionDelay: 20,
    maxBallSpeed: 9
};

// Calculate AI paddle position
GAME_CONFIG.aiX = canvas.width - GAME_CONFIG.playerX - GAME_CONFIG.paddleWidth;

// Game state
const gameState = {
    player: {
        y: (canvas.height - GAME_CONFIG.paddleHeight) / 2,
        score: 0,
        color: COLORS.neonBlue
    },
    ai: {
        y: (canvas.height - GAME_CONFIG.paddleHeight) / 2,
        score: 0,
        color: COLORS.neonPink,
        targetY: canvas.height / 2,
        reactionCounter: 0
    },
    ball: {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: GAME_CONFIG.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
        vy: GAME_CONFIG.ballSpeed * (Math.random() * 2 - 1),
        color: COLORS.neonGreen,
        trail: []
    },
    effects: {
        paddleGlow: 0,
        ballGlow: 0,
        screenShake: 0
    },
    controls: {
        upPressed: false,
        downPressed: false,
        paused: false
    },
    particles: []
};

// Input handling
const keys = {};

// Keyboard controls
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    switch(e.code) {
        case 'ArrowUp':
            gameState.controls.upPressed = true;
            e.preventDefault();
            break;
        case 'ArrowDown':
            gameState.controls.downPressed = true;
            e.preventDefault();
            break;
        case 'Space':
            gameState.controls.paused = !gameState.controls.paused;
            e.preventDefault();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    
    switch(e.code) {
        case 'ArrowUp':
            gameState.controls.upPressed = false;
            break;
        case 'ArrowDown':
            gameState.controls.downPressed = false;
            break;
    }
});

// Mouse controls (alternative to keyboard)
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const targetY = mouseY - GAME_CONFIG.paddleHeight / 2;
    
    // Smooth mouse movement
    gameState.player.y += (targetY - gameState.player.y) * 0.1;
    
    // Clamp to canvas bounds
    gameState.player.y = Math.max(0, Math.min(canvas.height - GAME_CONFIG.paddleHeight, gameState.player.y));
});

// Particle system for visual effects
class Particle {
    constructor(x, y, color, velocity = {}) {
        this.x = x;
        this.y = y;
        this.vx = velocity.x || (Math.random() - 0.5) * 8;
        this.vy = velocity.y || (Math.random() - 0.5) * 8;
        this.color = color;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.03;
        this.size = 2 + Math.random() * 4;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= this.decay;
        this.size *= 0.99;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

// Create particle explosion
function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 3 + Math.random() * 4;
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        gameState.particles.push(new Particle(x, y, color, velocity));
    }
}

// Draw functions with modern neon effects
function drawNet() {
    ctx.save();
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 10]);
    ctx.globalAlpha = 0.4;
    ctx.shadowColor = COLORS.white;
    ctx.shadowBlur = 5;
    
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.restore();
}

function drawPaddle(x, y, color, glowing = false) {
    ctx.save();
    
    // Glow effect
    if (glowing) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 25;
        ctx.globalAlpha = 0.8;
    } else {
        ctx.shadowColor = COLORS.shadow;
        ctx.shadowBlur = 10;
    }
    
    // Main paddle
    ctx.fillStyle = color;
    ctx.fillRect(x, y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight);
    
    // Highlight effect
    const gradient = ctx.createLinearGradient(x, y, x + GAME_CONFIG.paddleWidth, y);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, GAME_CONFIG.paddleWidth, GAME_CONFIG.paddleHeight);
    
    ctx.restore();
}

function drawBall(ball) {
    ctx.save();
    
    // Ball trail effect
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < ball.trail.length; i++) {
        const trailPoint = ball.trail[i];
        const alpha = (i / ball.trail.length) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(trailPoint.x, trailPoint.y, GAME_CONFIG.ballRadius * (i / ball.trail.length), 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Main ball with gradient and glow
    ctx.globalAlpha = 1;
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = gameState.effects.ballGlow > 0 ? 30 : 15;
    
    const gradient = ctx.createRadialGradient(
        ball.x - 3, ball.y - 3, 0,
        ball.x, ball.y, GAME_CONFIG.ballRadius
    );
    gradient.addColorStop(0, COLORS.white);
    gradient.addColorStop(0.3, ball.color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, GAME_CONFIG.ballRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawParticles() {
    gameState.particles.forEach(particle => {
        particle.draw(ctx);
    });
}

function drawPauseOverlay() {
    if (!gameState.controls.paused) return;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = COLORS.neonBlue;
    ctx.font = 'bold 48px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = COLORS.neonBlue;
    ctx.shadowBlur = 20;
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    
    ctx.font = '20px Space Grotesk, sans-serif';
    ctx.fillStyle = COLORS.white;
    ctx.shadowBlur = 10;
    ctx.fillText('Press SPACE to continue', canvas.width / 2, canvas.height / 2 + 50);
    ctx.restore();
}

// Game logic functions
function updatePlayerPaddle() {
    if (gameState.controls.upPressed) {
        gameState.player.y -= GAME_CONFIG.paddleSpeed;
    }
    if (gameState.controls.downPressed) {
        gameState.player.y += GAME_CONFIG.paddleSpeed;
    }
    
    // Clamp to canvas bounds
    gameState.player.y = Math.max(0, Math.min(canvas.height - GAME_CONFIG.paddleHeight, gameState.player.y));
}

function updateAI() {
    // AI reaction delay for more realistic gameplay
    gameState.ai.reactionCounter++;
    
    if (gameState.ai.reactionCounter > GAME_CONFIG.aiReactionDelay) {
        // Add some randomness to AI targeting
        const errorRange = 80;
        gameState.ai.targetY = gameState.ball.y + (Math.random() - 0.5) * errorRange;
        gameState.ai.reactionCounter = 0;
    }
    
    const aiCenter = gameState.ai.y + GAME_CONFIG.paddleHeight / 2;
    const diff = gameState.ai.targetY - aiCenter;
    
    if (Math.abs(diff) > 5) {
        gameState.ai.y += Math.sign(diff) * GAME_CONFIG.aiSpeed;
    }
    
    // Clamp AI paddle to canvas bounds
    gameState.ai.y = Math.max(0, Math.min(canvas.height - GAME_CONFIG.paddleHeight, gameState.ai.y));
}

function updateBall() {
    const ball = gameState.ball;
    
    // Update ball trail
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 8) {
        ball.trail.shift();
    }
    
    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Wall collisions (top/bottom)
    if (ball.y - GAME_CONFIG.ballRadius <= 0 || ball.y + GAME_CONFIG.ballRadius >= canvas.height) {
        ball.vy = -ball.vy;
        ball.y = ball.y - GAME_CONFIG.ballRadius <= 0 ? GAME_CONFIG.ballRadius : canvas.height - GAME_CONFIG.ballRadius;
        
        // Visual effects
        gameState.effects.screenShake = 5;
        createParticles(ball.x, ball.y, ball.color, 6);
    }
    
    // Paddle collisions
    checkPaddleCollision();
    
    // Score detection
    if (ball.x - GAME_CONFIG.ballRadius < 0) {
        gameState.ai.score++;
        updateScoreDisplay();
        resetBall(-1);
        createParticles(0, ball.y, COLORS.neonPink, 12);
    } else if (ball.x + GAME_CONFIG.ballRadius > canvas.width) {
        gameState.player.score++;
        updateScoreDisplay();
        resetBall(1);
        createParticles(canvas.width, ball.y, COLORS.neonBlue, 12);
    }
}

function checkPaddleCollision() {
    const ball = gameState.ball;
    
    // Player paddle collision
    if (ball.x - GAME_CONFIG.ballRadius <= GAME_CONFIG.playerX + GAME_CONFIG.paddleWidth &&
        ball.x - GAME_CONFIG.ballRadius >= GAME_CONFIG.playerX &&
        ball.y >= gameState.player.y &&
        ball.y <= gameState.player.y + GAME_CONFIG.paddleHeight) {
        
        ball.x = GAME_CONFIG.playerX + GAME_CONFIG.paddleWidth + GAME_CONFIG.ballRadius;
        
        // Calculate bounce angle based on where ball hits paddle
        const hitPos = (ball.y - (gameState.player.y + GAME_CONFIG.paddleHeight / 2)) / (GAME_CONFIG.paddleHeight / 2);
        const bounceAngle = hitPos * Math.PI / 4; // Max 45 degrees
        
        const speed = Math.min(Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.05, GAME_CONFIG.maxBallSpeed);
        ball.vx = speed * Math.cos(bounceAngle);
        ball.vy = speed * Math.sin(bounceAngle);
        
        // Ensure ball moves away from paddle
        if (ball.vx < 0) ball.vx = -ball.vx;
        
        // Visual effects
        gameState.effects.paddleGlow = 15;
        gameState.effects.ballGlow = 10;
        createParticles(ball.x, ball.y, gameState.player.color, 8);
        
        // Change ball color
        const colors = [COLORS.neonGreen, COLORS.neonPurple, COLORS.neonOrange];
        ball.color = colors[Math.floor(Math.random() * colors.length)];
    }
    
    // AI paddle collision
    if (ball.x + GAME_CONFIG.ballRadius >= GAME_CONFIG.aiX &&
        ball.x + GAME_CONFIG.ballRadius <= GAME_CONFIG.aiX + GAME_CONFIG.paddleWidth &&
        ball.y >= gameState.ai.y &&
        ball.y <= gameState.ai.y + GAME_CONFIG.paddleHeight) {
        
        ball.x = GAME_CONFIG.aiX - GAME_CONFIG.ballRadius;
        
        // Calculate bounce angle
        const hitPos = (ball.y - (gameState.ai.y + GAME_CONFIG.paddleHeight / 2)) / (GAME_CONFIG.paddleHeight / 2);
        const bounceAngle = hitPos * Math.PI / 4;
        
        const speed = Math.min(Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.05, GAME_CONFIG.maxBallSpeed);
        ball.vx = -speed * Math.cos(bounceAngle);
        ball.vy = speed * Math.sin(bounceAngle);
        
        // Ensure ball moves away from paddle
        if (ball.vx > 0) ball.vx = -ball.vx;
        
        // Visual effects
        gameState.effects.paddleGlow = 15;
        gameState.effects.ballGlow = 10;
        createParticles(ball.x, ball.y, gameState.ai.color, 8);
        
        // Change ball color
        const colors = [COLORS.neonGreen, COLORS.neonPurple, COLORS.neonOrange];
        ball.color = colors[Math.floor(Math.random() * colors.length)];
    }
}

function updateScoreDisplay() {
    playerScoreElement.textContent = gameState.player.score;
    aiScoreElement.textContent = gameState.ai.score;
    
    // Add glow effect to score that just changed
    if (gameState.player.score > gameState.ai.score) {
        playerScoreElement.style.textShadow = `0 0 20px ${COLORS.neonBlue}`;
        setTimeout(() => {
            playerScoreElement.style.textShadow = `0 0 10px rgba(0, 245, 255, 0.5)`;
        }, 500);
    } else if (gameState.ai.score > gameState.player.score) {
        aiScoreElement.style.textShadow = `0 0 20px ${COLORS.neonPink}`;
        setTimeout(() => {
            aiScoreElement.style.textShadow = `0 0 10px rgba(0, 245, 255, 0.5)`;
        }, 500);
    }
}

function resetBall(direction = 0) {
    const ball = gameState.ball;
    
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    
    const angle = (Math.random() - 0.5) * Math.PI / 3; // Random angle within 60 degrees
    ball.vx = GAME_CONFIG.ballSpeed * Math.cos(angle) * (direction || (Math.random() > 0.5 ? 1 : -1));
    ball.vy = GAME_CONFIG.ballSpeed * Math.sin(angle);
    
    ball.trail = [];
    ball.color = COLORS.neonGreen;
    
    // Reset AI target
    gameState.ai.targetY = canvas.height / 2;
}

function updateEffects() {
    // Decay effects
    if (gameState.effects.paddleGlow > 0) gameState.effects.paddleGlow--;
    if (gameState.effects.ballGlow > 0) gameState.effects.ballGlow--;
    if (gameState.effects.screenShake > 0) gameState.effects.screenShake--;
    
    // Update particles
    gameState.particles = gameState.particles.filter(particle => {
        particle.update();
        return !particle.isDead();
    });
}

// Main game loop
function gameLoop() {
    // Clear canvas with screen shake effect
    ctx.save();
    if (gameState.effects.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * gameState.effects.screenShake;
        const shakeY = (Math.random() - 0.5) * gameState.effects.screenShake;
        ctx.translate(shakeX, shakeY);
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!gameState.controls.paused) {
        // Update game state
        updatePlayerPaddle();
        updateAI();
        updateBall();
        updateEffects();
    }
    
    // Draw everything
    drawNet();
    drawPaddle(GAME_CONFIG.playerX, gameState.player.y, gameState.player.color, gameState.effects.paddleGlow > 0);
    drawPaddle(GAME_CONFIG.aiX, gameState.ai.y, gameState.ai.color, gameState.effects.paddleGlow > 0);
    drawBall(gameState.ball);
    drawParticles();
    drawPauseOverlay();
    
    ctx.restore();
    
    requestAnimationFrame(gameLoop);
}

// Initialize game
function initGame() {
    // Set initial canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Recalculate positions based on actual canvas size
    GAME_CONFIG.aiX = canvas.width - GAME_CONFIG.playerX - GAME_CONFIG.paddleWidth;
    
    // Reset game state
    gameState.player.y = (canvas.height - GAME_CONFIG.paddleHeight) / 2;
    gameState.ai.y = (canvas.height - GAME_CONFIG.paddleHeight) / 2;
    resetBall();
    
    updateScoreDisplay();
}

// Handle window resize
window.addEventListener('resize', () => {
    setTimeout(initGame, 100);
});

// Start the game
initGame();
gameLoop();

// Add focus to canvas for keyboard controls
canvas.setAttribute('tabindex', '0');
canvas.focus();
