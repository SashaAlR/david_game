// Game variables
let score = 0;
let arrowsLeft = 10;
let gameActive = false;
let windStrength = 0;
let windDirection = 0;
let difficulty = 'easy';
let isPulling = false;
let pullPower = 0;
let pullInterval;
let mouseX = 0;
let mouseY = 0;
let cannonCooldown = false;
let planeIsActive = true;
let rocketCooldown = false;

// DOM elements
const gameArea = document.getElementById('game-area');
const scoreDisplay = document.getElementById('score');
const arrowsDisplay = document.getElementById('arrows');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const bowContainer = document.getElementById('bow-container');
const arrowNocked = document.getElementById('arrow-nocked');
const mainTarget = document.getElementById('main-target');
const cow = document.getElementById('cow');
const cow2 = document.getElementById('cow2');
const plane = document.getElementById('plane');
const cannon = document.getElementById('cannon');
const cannonBarrel = document.getElementById('cannon-barrel');
const rocketLauncher = document.getElementById('rocket-launcher');
const launcherTube = document.getElementById('launcher-tube');
const crosshair = document.getElementById('crosshair');
const trajectoryCanvas = document.getElementById('trajectory-canvas');
const powerMeter = document.getElementById('power-meter');
const powerFill = document.getElementById('power-fill');
const windIndicator = document.getElementById('wind-indicator');
const windArrow = document.getElementById('wind-arrow');
const windStrengthDisplay = document.getElementById('wind-strength');

// Setup canvas
const ctx = trajectoryCanvas.getContext('2d');
trajectoryCanvas.width = gameArea.offsetWidth;
trajectoryCanvas.height = gameArea.offsetHeight;

// Physics constants
const GRAVITY = 0.5;
const ARROW_SPEED = 15;

// Sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playBowRelease() {
    playSound(300, 0.3);
    setTimeout(() => playSound(200, 0.2), 100);
}

function playHitSound() {
    playSound(500, 0.1);
}

// Mouse tracking
gameArea.addEventListener('mousemove', (e) => {
    const rect = gameArea.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // Update crosshair position
    crosshair.style.left = mouseX - 30 + 'px';
    crosshair.style.top = mouseY - 30 + 'px';

    if (gameActive) {
        crosshair.style.display = 'block';

        // Draw trajectory preview when pulling
        if (isPulling) {
            drawTrajectoryPreview();
        }
    }
});

gameArea.addEventListener('mouseenter', () => {
    if (gameActive) {
        crosshair.style.display = 'block';
    }
});

gameArea.addEventListener('mouseleave', () => {
    crosshair.style.display = 'none';
});

// Update wind periodically
function updateWind() {
    if (!gameActive) return;

    // Random wind direction and apply strength
    windDirection = (Math.random() * 360);

    // Update visual indicator
    windArrow.style.transform = `rotate(${windDirection}deg)`;

    // Update strength display
    if (windStrength === 0) {
        windStrengthDisplay.textContent = 'None';
        windStrengthDisplay.style.color = '#4CAF50';
    } else if (windStrength === 0.3) {
        windStrengthDisplay.textContent = 'Light';
        windStrengthDisplay.style.color = '#FFC107';
    } else {
        windStrengthDisplay.textContent = 'Strong';
        windStrengthDisplay.style.color = '#F44336';
    }
}

// Randomly change plane flight path
function randomizePlaneHeight() {
    if (!gameActive) return;

    // 40% chance to fly low at target height, 60% chance to fly high
    const flyLow = Math.random() < 0.4;

    if (flyLow) {
        plane.style.animation = 'flyPlaneLow 20s linear';
    } else {
        plane.style.animation = 'flyPlaneHigh 20s linear';
    }

    // Reset animation after it completes and randomize again
    setTimeout(randomizePlaneHeight, 20000);
}

// Tank shoots at plane automatically
function cannonShootAtPlane() {
    if (!gameActive || !planeIsActive) {
        setTimeout(cannonShootAtPlane, 500);
        return;
    }

    if (cannonCooldown) {
        setTimeout(cannonShootAtPlane, 500);
        return;
    }

    const planeRect = plane.getBoundingClientRect();
    const cannonRect = cannon.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();

    // Check if plane is in shooting range
    const planeX = planeRect.left - gameAreaRect.left;

    // Tank shoots when plane is in middle area - every time!
    if (planeX > gameAreaRect.width * 0.35 && planeX < gameAreaRect.width * 0.65) {
        cannonCooldown = true;

        // Aim tank barrel at plane
        const dx = planeRect.left - cannonRect.left;
        const dy = cannonRect.top - planeRect.top;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        cannonBarrel.style.transform = `translateX(-50%) rotate(${-angle}deg)`;

        // Fire tank shell with guaranteed hit
        setTimeout(() => {
            fireTankShell(planeRect, cannonRect, gameAreaRect);
        }, 300);

        // Reset cooldown after plane is hit and resets (5 seconds)
        setTimeout(() => {
            cannonCooldown = false;
        }, 5000);
    }

    // Check again soon
    setTimeout(cannonShootAtPlane, 500);
}

function fireTankShell(planeRect, cannonRect, gameAreaRect) {
    // Create tank shell
    const shell = document.createElement('div');
    shell.classList.add('cannon-ball');

    const startX = cannonRect.left - gameAreaRect.left + 60;
    const startY = cannonRect.top - gameAreaRect.top + 25;

    shell.style.left = startX + 'px';
    shell.style.top = startY + 'px';
    gameArea.appendChild(shell);

    // Calculate trajectory to plane - track plane's current position
    let frame = 0;
    const totalFrames = 40;

    const shellFlight = setInterval(() => {
        frame++;

        // Always track the plane's current position for guaranteed hit
        const currentPlaneRect = plane.getBoundingClientRect();
        const targetX = currentPlaneRect.left - gameAreaRect.left + currentPlaneRect.width / 2;
        const targetY = currentPlaneRect.top - gameAreaRect.top + currentPlaneRect.height / 2;

        // Get current shell position
        const currentX = parseFloat(shell.style.left);
        const currentY = parseFloat(shell.style.top);

        // Calculate new position moving toward plane
        const progress = frame / totalFrames;
        const newX = startX + (targetX - startX) * progress;
        const newY = startY + (targetY - startY) * progress;

        shell.style.left = newX + 'px';
        shell.style.top = newY + 'px';

        // Check if shell reached the plane (guaranteed hit on last frame)
        if (frame >= totalFrames - 2) {
            clearInterval(shellFlight);
            shell.remove();
            planeHitByTank();
            return;
        }

        // Also check collision during flight
        const shellRect = shell.getBoundingClientRect();
        if (
            shellRect.left < currentPlaneRect.right &&
            shellRect.right > currentPlaneRect.left &&
            shellRect.top < currentPlaneRect.bottom &&
            shellRect.bottom > currentPlaneRect.top
        ) {
            clearInterval(shellFlight);
            shell.remove();
            planeHitByTank();
            return;
        }
    }, 20);
}

// Rocket launcher shoots at plane automatically
function rocketShootAtPlane() {
    if (!gameActive || !planeIsActive) {
        setTimeout(rocketShootAtPlane, 600);
        return;
    }

    if (rocketCooldown) {
        setTimeout(rocketShootAtPlane, 600);
        return;
    }

    const planeRect = plane.getBoundingClientRect();
    const launcherRect = rocketLauncher.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();

    // Check if plane is in shooting range (right side of screen)
    const planeX = planeRect.left - gameAreaRect.left;

    // Rocket launcher shoots when plane is in right area
    if (planeX > gameAreaRect.width * 0.5 && planeX < gameAreaRect.width * 0.9) {
        rocketCooldown = true;

        // Aim launcher tube at plane
        const dx = planeRect.left - launcherRect.left;
        const dy = launcherRect.top - planeRect.top;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        launcherTube.style.transform = `translateX(-50%) rotate(${-angle}deg)`;

        // Fire rocket
        setTimeout(() => {
            fireRocket(planeRect, launcherRect, gameAreaRect);
        }, 400);

        // Reset cooldown after 6 seconds
        setTimeout(() => {
            rocketCooldown = false;
        }, 6000);
    }

    // Check again soon
    setTimeout(rocketShootAtPlane, 600);
}

function fireRocket(planeRect, launcherRect, gameAreaRect) {
    // Create rocket
    const rocket = document.createElement('div');
    rocket.classList.add('rocket');

    const startX = launcherRect.left - gameAreaRect.left + 35;
    const startY = launcherRect.top - gameAreaRect.top + 40;

    rocket.style.left = startX + 'px';
    rocket.style.top = startY + 'px';
    gameArea.appendChild(rocket);

    // Add rocket smoke trail
    const smokeTrail = [];
    for (let i = 0; i < 5; i++) {
        const smoke = document.createElement('div');
        smoke.textContent = '💨';
        smoke.style.position = 'absolute';
        smoke.style.fontSize = '20px';
        smoke.style.zIndex = '12';
        smoke.style.pointerEvents = 'none';
        smoke.style.opacity = '0';
        gameArea.appendChild(smoke);
        smokeTrail.push(smoke);
    }

    // Calculate trajectory to plane - tracking system
    let frame = 0;
    const totalFrames = 50;

    const rocketFlight = setInterval(() => {
        frame++;

        // Track the plane's current position
        const currentPlaneRect = plane.getBoundingClientRect();
        const targetX = currentPlaneRect.left - gameAreaRect.left + currentPlaneRect.width / 2;
        const targetY = currentPlaneRect.top - gameAreaRect.top + currentPlaneRect.height / 2;

        // Get current rocket position
        const currentX = parseFloat(rocket.style.left);
        const currentY = parseFloat(rocket.style.top);

        // Calculate new position moving toward plane
        const progress = frame / totalFrames;
        const newX = startX + (targetX - startX) * progress;
        const newY = startY + (targetY - startY) * progress;

        // Calculate rotation based on velocity
        const dx = newX - currentX;
        const dy = newY - currentY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        rocket.style.left = newX + 'px';
        rocket.style.top = newY + 'px';
        rocket.style.transform = `rotate(${angle}deg)`;

        // Update smoke trail
        smokeTrail.forEach((smoke, index) => {
            const delay = index * 2;
            if (frame > delay) {
                smoke.style.left = (currentX - (frame - delay) * 3) + 'px';
                smoke.style.top = (currentY + (frame - delay) * 0.3) + 'px';
                smoke.style.opacity = Math.max(0, 0.6 - (frame - delay) * 0.015);
            }
        });

        // Check if rocket reached the plane (hit on last few frames)
        if (frame >= totalFrames - 2) {
            clearInterval(rocketFlight);
            rocket.remove();
            smokeTrail.forEach(smoke => smoke.remove());
            planeHitByRocket();
            return;
        }

        // Also check collision during flight
        const rocketRect = rocket.getBoundingClientRect();
        if (
            rocketRect.left < currentPlaneRect.right &&
            rocketRect.right > currentPlaneRect.left &&
            rocketRect.top < currentPlaneRect.bottom &&
            rocketRect.bottom > currentPlaneRect.top
        ) {
            clearInterval(rocketFlight);
            rocket.remove();
            smokeTrail.forEach(smoke => smoke.remove());
            planeHitByRocket();
            return;
        }
    }, 20);
}

function planeHitByRocket() {
    // Similar effect to tank hit, but don't set planeIsActive to false
    // This allows multiple hits
    const planeRect = plane.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();

    // Show explosion effect
    const explosion = document.createElement('div');
    explosion.textContent = '💥';
    explosion.style.position = 'absolute';
    explosion.style.left = (planeRect.left - gameAreaRect.left) + 'px';
    explosion.style.top = (planeRect.top - gameAreaRect.top) + 'px';
    explosion.style.fontSize = '50px';
    explosion.style.zIndex = '30';
    explosion.style.animation = 'floatUp 0.8s ease';
    explosion.style.pointerEvents = 'none';

    gameArea.appendChild(explosion);

    // Make plane wobble
    plane.style.animation = 'none';
    plane.style.transform = 'scale(0.9) rotate(-10deg)';

    setTimeout(() => {
        explosion.remove();
        // Resume plane animation
        const currentLeft = planeRect.left - gameAreaRect.left;
        plane.style.left = currentLeft + 'px';
        plane.style.animation = plane.style.animation.includes('Low') ? 'flyPlaneLow 20s linear' : 'flyPlaneHigh 20s linear';
        plane.style.transform = 'scale(1) rotate(0deg)';
    }, 800);
}

function planeHitByTank() {
    planeIsActive = false;

    // Get current plane position BEFORE stopping animation
    const planeRect = plane.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();

    // Calculate exact position relative to game area
    const planeX = planeRect.left - gameAreaRect.left;
    const planeY = planeRect.top - gameAreaRect.top;

    // Stop plane's normal animation and lock position immediately
    plane.style.animation = 'none';
    plane.style.left = planeX + 'px';
    plane.style.top = planeY + 'px';
    plane.style.transform = 'none';

    // Set ballistic physics - use local variables for movement
    let currentX = planeX;
    let currentY = planeY;
    let velocityX = 1.5; // Horizontal momentum (reduced from 3)
    let velocityY = -1; // Initial upward kick from explosion (reduced from -2)
    let rotation = 0;
    const gravity = 0.2; // Reduced from 0.4 for slower fall
    const rotationSpeed = 5; // Reduced from 8 for slower spin

    // Show explosion effect
    const explosion = document.createElement('div');
    explosion.textContent = '💥';
    explosion.style.position = 'absolute';
    explosion.style.left = currentX + 'px';
    explosion.style.top = currentY + 'px';
    explosion.style.fontSize = '60px';
    explosion.style.zIndex = '30';
    explosion.style.animation = 'floatUp 1s ease';
    explosion.style.pointerEvents = 'none';

    gameArea.appendChild(explosion);

    setTimeout(() => {
        explosion.remove();
    }, 1000);

    // Create multiple smoke trails
    const smokeTrails = [];
    for (let i = 0; i < 3; i++) {
        const smoke = document.createElement('div');
        smoke.textContent = '💨';
        smoke.style.position = 'absolute';
        smoke.style.fontSize = '30px';
        smoke.style.zIndex = '29';
        smoke.style.pointerEvents = 'none';
        smoke.style.opacity = '0.7';
        gameArea.appendChild(smoke);
        smokeTrails.push(smoke);
    }

    // Ballistic fall animation
    let frame = 0;
    const fallAnimation = setInterval(() => {
        frame++;

        // Apply gravity to velocity
        velocityY += gravity;

        // Update position
        currentX += velocityX;
        currentY += velocityY;
        rotation += rotationSpeed;

        // Update plane position and rotation - make it LARGER as it falls (zoom effect)
        const scale = Math.min(2.5, 1 + frame * 0.015); // Grows from 1x to 2.5x (slower growth)
        plane.style.left = currentX + 'px';
        plane.style.top = currentY + 'px';
        plane.style.transform = `rotate(${rotation}deg) scale(${scale})`;
        plane.style.opacity = Math.max(0.2, 1 - frame * 0.005); // Fades even slower

        // Update smoke trails
        smokeTrails.forEach((smoke, index) => {
            const delay = index * 5;
            if (frame > delay) {
                smoke.style.left = (currentX - (frame - delay) * 2 + index * 10) + 'px';
                smoke.style.top = (currentY + (frame - delay) * 0.5) + 'px';
                smoke.style.opacity = Math.max(0, 0.7 - (frame - delay) * 0.02);
            }
        });

        // Stop when plane goes off screen or after enough time
        if (currentY > gameAreaRect.height + 100 || frame > 100) {
            clearInterval(fallAnimation);

            // Remove smoke trails
            smokeTrails.forEach(smoke => smoke.remove());

            // Reset plane after it falls
            setTimeout(() => {
                plane.style.left = '-100px';
                plane.style.top = '40px';
                plane.style.animation = 'flyPlaneHigh 20s linear infinite';
                plane.style.opacity = '1';
                plane.style.transform = 'none';
                planeIsActive = true;
            }, 1000);
        }
    }, 20);
}

// Difficulty selection
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        difficulty = btn.dataset.difficulty;

        difficultyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        switch(difficulty) {
            case 'easy':
                windStrength = 0;
                break;
            case 'medium':
                windStrength = 0.3;
                break;
            case 'hard':
                windStrength = 0.6;
                break;
        }

        updateWind();
    });
});

// Trajectory preview
function drawTrajectoryPreview() {
    ctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

    const bowRect = bowContainer.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();

    const startX = bowRect.left + bowRect.width / 2 - gameAreaRect.left;
    const startY = bowRect.top + 120 - gameAreaRect.top;

    const baseAngle = -45;
    const angle = baseAngle + (pullPower / 10);
    const power = (pullPower / 100) * ARROW_SPEED;
    const angleRad = (angle * Math.PI) / 180;

    let vx = Math.cos(angleRad) * power;
    let vy = Math.sin(angleRad) * power;
    let x = startX;
    let y = startY;

    // Draw trajectory
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let i = 0; i < 100; i++) {
        vy += GRAVITY;
        x += vx;
        y += vy;

        ctx.lineTo(x, y);

        if (x > trajectoryCanvas.width || y > trajectoryCanvas.height || x < 0) {
            break;
        }
    }

    ctx.stroke();
    ctx.setLineDash([]);
}

// Bow controls
bowContainer.addEventListener('mousedown', (e) => {
    if (!gameActive || arrowsLeft <= 0) return;
    isPulling = true;
    pullPower = 0;
    powerMeter.style.display = 'block';

    pullInterval = setInterval(() => {
        pullPower += 2;
        if (pullPower > 100) pullPower = 100;

        // Pull back the arrow visually
        arrowNocked.style.transform = `translateX(-${100 + pullPower}%)`;

        // Update power meter
        powerFill.style.height = pullPower + '%';
    }, 50);
});

document.addEventListener('mouseup', () => {
    if (!gameActive || !isPulling) return;

    isPulling = false;
    clearInterval(pullInterval);
    powerMeter.style.display = 'none';
    ctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

    if (pullPower > 10) {
        shootArrow();
    }

    // Reset arrow position
    arrowNocked.style.transform = 'translateX(-100%)';
    pullPower = 0;
});

// Start game
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

function startGame() {
    gameActive = true;
    score = 0;
    arrowsLeft = 10;
    scoreDisplay.textContent = score;
    arrowsDisplay.textContent = arrowsLeft;
    startBtn.classList.add('hidden');

    // Clear any previous stuck arrows
    document.querySelectorAll('.stuck-arrow').forEach(arrow => arrow.remove());
    mainTarget.classList.remove('on-fire');

    // Initialize wind
    updateWind();

    // Update wind every 5 seconds
    setInterval(updateWind, 5000);

    // Start randomizing plane flight path
    randomizePlaneHeight();

    // Start cannon shooting
    cannonShootAtPlane();

    // Start rocket launcher shooting
    rocketShootAtPlane();
}

function shootArrow() {
    if (arrowsLeft <= 0) return;

    arrowsLeft--;
    arrowsDisplay.textContent = arrowsLeft;

    playBowRelease();

    // Get bow position
    const bowRect = bowContainer.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();

    // Calculate starting position (relative to game area)
    const startX = bowRect.left + bowRect.width / 2 - gameAreaRect.left;
    const startY = bowRect.top + 120 - gameAreaRect.top;

    // Calculate angle based on pull power (higher power = more horizontal)
    const baseAngle = -45; // degrees
    const angle = baseAngle + (pullPower / 10); // adjust angle with power

    // Create arrow element
    const arrow = document.createElement('div');
    arrow.classList.add('flying-arrow');
    arrow.style.left = startX + 'px';
    arrow.style.top = startY + 'px';
    gameArea.appendChild(arrow);

    // Calculate velocity components
    const power = (pullPower / 100) * ARROW_SPEED;
    const angleRad = (angle * Math.PI) / 180;
    let vx = Math.cos(angleRad) * power;
    let vy = Math.sin(angleRad) * power;

    // Arrow physics simulation
    let x = startX;
    let y = startY;
    let rotation = angle;

    const arrowFlight = setInterval(() => {
        // Apply gravity
        vy += GRAVITY;

        // Apply wind
        vx += windStrength * (Math.random() - 0.5) * 0.2;

        // Update position
        x += vx;
        y += vy;

        // Calculate rotation based on velocity
        rotation = Math.atan2(vy, vx) * (180 / Math.PI);

        // Update arrow visual
        arrow.style.left = x + 'px';
        arrow.style.top = y + 'px';
        arrow.style.transform = `rotate(${rotation}deg)`;

        // Check collision with target
        const targetRect = mainTarget.getBoundingClientRect();
        const arrowRect = arrow.getBoundingClientRect();

        if (
            arrowRect.left < targetRect.right &&
            arrowRect.right > targetRect.left &&
            arrowRect.top < targetRect.bottom &&
            arrowRect.bottom > targetRect.top
        ) {
            clearInterval(arrowFlight);
            hitTarget(arrow, arrowRect, targetRect);
            return;
        }

        // Check collision with cow
        const cowRect = cow.getBoundingClientRect();

        if (
            arrowRect.left < cowRect.right &&
            arrowRect.right > cowRect.left &&
            arrowRect.top < cowRect.bottom &&
            arrowRect.bottom > cowRect.top
        ) {
            clearInterval(arrowFlight);
            hitCow(arrow, arrowRect, cow);
            return;
        }

        // Check collision with cow2
        const cow2Rect = cow2.getBoundingClientRect();

        if (
            arrowRect.left < cow2Rect.right &&
            arrowRect.right > cow2Rect.left &&
            arrowRect.top < cow2Rect.bottom &&
            arrowRect.bottom > cow2Rect.top
        ) {
            clearInterval(arrowFlight);
            hitCow(arrow, arrowRect, cow2);
            return;
        }

        // Check collision with plane (flying or falling)
        const planeRect = plane.getBoundingClientRect();

        if (
            arrowRect.left < planeRect.right &&
            arrowRect.right > planeRect.left &&
            arrowRect.top < planeRect.bottom &&
            arrowRect.bottom > planeRect.top
        ) {
            clearInterval(arrowFlight);

            if (planeIsActive) {
                // Hit flying plane - give points
                hitPlane(arrow, arrowRect);
            } else {
                // Hit falling plane - still give points but different message
                hitFallingPlane(arrow, arrowRect);
            }
            return;
        }

        // Check if arrow is out of bounds
        if (x > gameAreaRect.width || y > gameAreaRect.height || x < 0) {
            clearInterval(arrowFlight);
            arrow.remove();

            if (arrowsLeft <= 0) {
                endGame();
            }
        }
    }, 20);
}

function hitTarget(arrow, arrowRect, targetRect) {
    playHitSound();

    // Calculate hit position relative to target center
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const arrowCenterX = arrowRect.left + arrowRect.width / 2;
    const arrowCenterY = arrowRect.top + arrowRect.height / 2;

    const distance = Math.sqrt(
        Math.pow(arrowCenterX - targetCenterX, 2) +
        Math.pow(arrowCenterY - targetCenterY, 2)
    );

    // Calculate score based on distance from center
    const targetRadius = targetRect.width / 2;
    let points = 0;

    if (distance < targetRadius * 0.2) {
        points = 10; // Yellow (bullseye)
    } else if (distance < targetRadius * 0.4) {
        points = 8; // Red
    } else if (distance < targetRadius * 0.6) {
        points = 6; // Blue
    } else if (distance < targetRadius * 0.8) {
        points = 4; // Black
    } else {
        points = 2; // White
    }

    score += points;
    scoreDisplay.textContent = score;

    // Set target on fire!
    mainTarget.classList.add('on-fire');

    // Add fire emoji elements
    const fire1 = document.createElement('div');
    fire1.classList.add('fire-effect');
    fire1.textContent = '🔥';
    mainTarget.appendChild(fire1);

    const fire2 = document.createElement('div');
    fire2.classList.add('fire-effect-small');
    fire2.textContent = '🔥';
    mainTarget.appendChild(fire2);

    setTimeout(() => {
        mainTarget.classList.remove('on-fire');
        fire1.remove();
        fire2.remove();
    }, 1000);

    // Create stuck arrow at hit position
    const stuckArrow = document.createElement('div');
    stuckArrow.classList.add('stuck-arrow');
    const gameAreaRect = gameArea.getBoundingClientRect();
    stuckArrow.style.left = (arrowRect.left - gameAreaRect.left) + 'px';
    stuckArrow.style.top = (arrowRect.top - gameAreaRect.top) + 'px';
    stuckArrow.style.transform = arrow.style.transform;
    gameArea.appendChild(stuckArrow);

    // Show points
    showPoints(points, arrowCenterX - gameAreaRect.left, arrowCenterY - gameAreaRect.top);

    // Remove flying arrow
    arrow.remove();

    // Check if game is over
    if (arrowsLeft <= 0) {
        setTimeout(endGame, 1000);
    }
}

function hitPlane(arrow, arrowRect) {
    playHitSound();

    // Big bonus points for hitting the plane!
    const bonusPoints = 25;
    score += bonusPoints;
    scoreDisplay.textContent = score;

    // Make plane react
    plane.style.animation = 'none';
    plane.style.transform = 'scale(1.3) rotate(-15deg)';

    // Show "WHOOSH!" text
    const gameAreaRect = gameArea.getBoundingClientRect();
    const planeRect = plane.getBoundingClientRect();
    const whooshText = document.createElement('div');
    whooshText.textContent = 'WHOOSH! ✈️';
    whooshText.style.position = 'absolute';
    whooshText.style.left = (planeRect.left - gameAreaRect.left) + 'px';
    whooshText.style.top = (planeRect.top - gameAreaRect.top - 50) + 'px';
    whooshText.style.color = '#00BFFF';
    whooshText.style.fontWeight = 'bold';
    whooshText.style.fontSize = '32px';
    whooshText.style.pointerEvents = 'none';
    whooshText.style.zIndex = '30';
    whooshText.style.textShadow = '3px 3px 6px rgba(0,0,0,0.8)';
    whooshText.style.animation = 'floatUp 1.5s ease';

    gameArea.appendChild(whooshText);

    // Show bonus points
    showPoints(bonusPoints, planeRect.left + planeRect.width / 2 - gameAreaRect.left, planeRect.top - gameAreaRect.top + 20);

    setTimeout(() => {
        whooshText.remove();
        // Continue plane animation from current position
        const currentLeft = planeRect.left - gameAreaRect.left;
        plane.style.left = currentLeft + 'px';
        plane.style.animation = plane.style.animation.includes('Low') ? 'flyPlaneLow 20s linear' : 'flyPlaneHigh 20s linear';
        plane.style.transform = 'scale(1) rotate(0deg)';
    }, 1500);

    // Remove arrow
    arrow.remove();

    // Check if game is over
    if (arrowsLeft <= 0) {
        setTimeout(endGame, 1000);
    }
}

function hitFallingPlane(arrow, arrowRect) {
    playHitSound();

    // Bonus points for hitting falling plane!
    const bonusPoints = 10;
    score += bonusPoints;
    scoreDisplay.textContent = score;

    // Show "SMASH!" text
    const gameAreaRect = gameArea.getBoundingClientRect();
    const planeRect = plane.getBoundingClientRect();
    const smashText = document.createElement('div');
    smashText.textContent = 'SMASH! 💥';
    smashText.style.position = 'absolute';
    smashText.style.left = (planeRect.left - gameAreaRect.left) + 'px';
    smashText.style.top = (planeRect.top - gameAreaRect.top - 50) + 'px';
    smashText.style.color = '#FF6347';
    smashText.style.fontWeight = 'bold';
    smashText.style.fontSize = '32px';
    smashText.style.pointerEvents = 'none';
    smashText.style.zIndex = '30';
    smashText.style.textShadow = '3px 3px 6px rgba(0,0,0,0.8)';
    smashText.style.animation = 'floatUp 1.5s ease';

    gameArea.appendChild(smashText);

    // Show bonus points
    showPoints(bonusPoints, planeRect.left + planeRect.width / 2 - gameAreaRect.left, planeRect.top - gameAreaRect.top + 20);

    setTimeout(() => {
        smashText.remove();
    }, 1500);

    // Remove arrow
    arrow.remove();

    // Check if game is over
    if (arrowsLeft <= 0) {
        setTimeout(endGame, 1000);
    }
}

function hitCow(arrow, arrowRect, cowElement) {
    playHitSound();

    // Bonus points for hitting the cow!
    const bonusPoints = 15;
    score += bonusPoints;
    scoreDisplay.textContent = score;

    // Determine which cow was hit and get its animation
    const isCow2 = cowElement === cow2;
    const originalAnimation = isCow2 ? 'grazeMove3 12s ease-in-out infinite' : 'grazeMove2 10s ease-in-out infinite';

    // Make cow react
    cowElement.style.animation = 'none';
    cowElement.style.transform = 'scale(1.2) rotate(10deg)';

    // Show "MOO!" text
    const gameAreaRect = gameArea.getBoundingClientRect();
    const cowRect = cowElement.getBoundingClientRect();
    const mooText = document.createElement('div');
    mooText.textContent = 'MOO! 🐄';
    mooText.style.position = 'absolute';
    mooText.style.left = (cowRect.left - gameAreaRect.left) + 'px';
    mooText.style.top = (cowRect.top - gameAreaRect.top - 50) + 'px';
    mooText.style.color = '#FF69B4';
    mooText.style.fontWeight = 'bold';
    mooText.style.fontSize = '32px';
    mooText.style.pointerEvents = 'none';
    mooText.style.zIndex = '30';
    mooText.style.textShadow = '3px 3px 6px rgba(0,0,0,0.8)';
    mooText.style.animation = 'floatUp 1.5s ease';

    gameArea.appendChild(mooText);

    // Show bonus points
    showPoints(bonusPoints, cowRect.left + cowRect.width / 2 - gameAreaRect.left, cowRect.top - gameAreaRect.top + 20);

    setTimeout(() => {
        mooText.remove();
        cowElement.style.animation = originalAnimation;
        cowElement.style.transform = 'translateX(0)';
    }, 1500);

    // Remove arrow
    arrow.remove();

    // Check if game is over
    if (arrowsLeft <= 0) {
        setTimeout(endGame, 1000);
    }
}

function showPoints(points, x, y) {
    const pointsPopup = document.createElement('div');
    pointsPopup.textContent = '+' + points;
    pointsPopup.style.position = 'absolute';
    pointsPopup.style.left = x + 'px';
    pointsPopup.style.top = y + 'px';
    pointsPopup.style.color = '#FFD700';
    pointsPopup.style.fontWeight = 'bold';
    pointsPopup.style.fontSize = '28px';
    pointsPopup.style.pointerEvents = 'none';
    pointsPopup.style.zIndex = '30';
    pointsPopup.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    pointsPopup.style.animation = 'floatUp 1s ease';

    gameArea.appendChild(pointsPopup);

    setTimeout(() => {
        pointsPopup.remove();
    }, 1000);
}

// Add float up animation
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-50px);
        }
    }
`;
document.head.appendChild(style);

function endGame() {
    gameActive = false;

    // Show game over screen
    showGameOver();
}

function showGameOver() {
    const gameOver = document.createElement('div');
    gameOver.classList.add('game-over');

    let message = '';
    const averageScore = score / 10;

    if (averageScore >= 8) {
        message = 'Amazing! You are a master archer!';
    } else if (averageScore >= 6) {
        message = 'Great shooting! Keep practicing!';
    } else if (averageScore >= 4) {
        message = 'Good try! You are getting better!';
    } else {
        message = 'Keep practicing! You will improve!';
    }

    gameOver.innerHTML = `
        <h2>Game Over!</h2>
        <p>Final Score: <strong>${score}</strong> / 100</p>
        <p>Average per arrow: <strong>${averageScore.toFixed(1)}</strong></p>
        <p>${message}</p>
    `;

    gameArea.appendChild(gameOver);
    restartBtn.classList.remove('hidden');
}

function resetGame() {
    // Remove game over screen
    const gameOver = document.querySelector('.game-over');
    if (gameOver) {
        gameOver.remove();
    }

    // Remove stuck arrows
    document.querySelectorAll('.stuck-arrow').forEach(arrow => arrow.remove());
    mainTarget.classList.remove('on-fire');

    restartBtn.classList.add('hidden');
    startBtn.classList.remove('hidden');
}
