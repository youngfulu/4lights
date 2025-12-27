const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mouse/touch position
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let targetMouseX = mouseX;
let targetMouseY = mouseY;

// Smooth mouse tracking
let smoothMouseX = mouseX;
let smoothMouseY = mouseY;

// Emoji list
const emojis = ['🌟', '✨', '⭐', '💫', '🔥', '💎', '🎯', '⚡', '🎨', '🎭', '🎪', '🎬', '🎮', '🎲', '🎰', '🎯', '🎪', '🎨', '🎭', '🎬', '🎮', '🎲', '🎰', '🚀', '🌙', '☀️', '⭐', '🌟', '✨', '💫', '🔥'];

// Calculate bounding box (1/5 from top and bottom)
function getBoundingBox() {
    const screenHeight = canvas.height;
    const margin = screenHeight / 5;
    return {
        x: 0,
        y: margin,
        width: canvas.width,
        height: screenHeight - (margin * 2)
    };
}

// Generate points with minimum distance constraint
function generatePoints(count, minDistance) {
    const box = getBoundingBox();
    const points = [];
    const maxAttempts = 1000;
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let validPoint = false;
        let point;
        
        while (!validPoint && attempts < maxAttempts) {
            point = {
                x: Math.random() * box.width + box.x,
                y: Math.random() * box.height + box.y,
                baseX: 0, // Will be set after generation
                baseY: 0, // Will be set after generation
                layer: (i % 2 === 0) ? 'layer_1' : 'layer_2', // odd points (1st, 3rd, 5th...) = layer_1, even points (2nd, 4th, 6th...) = layer_2
                emoji: emojis[Math.floor(Math.random() * emojis.length)] // Random emoji for each point
            };
            
            validPoint = true;
            
            // Check distance to all existing points
            for (let j = 0; j < points.length; j++) {
                const dx = point.x - points[j].x;
                const dy = point.y - points[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    validPoint = false;
                    break;
                }
            }
            
            attempts++;
        }
        
        if (validPoint) {
            // Store base position
            point.baseX = point.x;
            point.baseY = point.y;
            // Initialize current size for smooth zoom (will be set properly based on layer)
            points.push(point);
        }
    }
    
    return points;
}

// Emoji size settings - MUST be declared before use
const baseEmojiSize = 24; // Base size for layer_1
const layer2SizeMultiplier = 1 / 1.6; // Layer_2 is 1.6 times smaller
const hoverZoom = 3.0; // Zoom factor on hover (3x bigger)
const zoomSmoothness = 0.15; // Smoothness factor for zoom interpolation

// Generate 100 points
const points = generatePoints(100, 50);

// Initialize current sizes for all points
points.forEach(point => {
    if (point.layer === 'layer_1') {
        point.currentSize = baseEmojiSize;
    } else {
        point.currentSize = baseEmojiSize * layer2SizeMultiplier;
    }
});

// Check if mouse is hovering over a point
function isPointHovered(pointX, pointY, mouseX, mouseY, size) {
    const distance = Math.sqrt(
        Math.pow(pointX - mouseX, 2) + 
        Math.pow(pointY - mouseY, 2)
    );
    return distance < size; // Hover radius based on emoji size
}

// Mouse move handler
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    targetMouseX = e.clientX - rect.left;
    targetMouseY = e.clientY - rect.top;
}

// Touch move handler
function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        targetMouseX = e.touches[0].clientX - rect.left;
        targetMouseY = e.touches[0].clientY - rect.top;
    }
}

// Mouse leave handler (reset to center)
function handleMouseLeave() {
    targetMouseX = canvas.width / 2;
    targetMouseY = canvas.height / 2;
}

// Add event listeners
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('mouseleave', handleMouseLeave);

// Parallax effect parameters
const parallaxStrength = 0.02; // How much points move
const layer1Speed = 1.0; // Speed for layer_1
const layer2Speed = 0.5; // Speed for layer_2 (slower for depth effect)

// Draw points with parallax and emojis
function draw() {
    // Smooth mouse position
    smoothMouseX += (targetMouseX - smoothMouseX) * 0.1;
    smoothMouseY += (targetMouseY - smoothMouseY) * 0.1;
    
    // Calculate center offset
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const offsetX = (smoothMouseX - centerX) * parallaxStrength;
    const offsetY = (smoothMouseY - centerY) * parallaxStrength;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw bounding box outline (optional, for visualization)
    // const box = getBoundingBox();
    // ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    // ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Set text alignment for emojis
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw layer_1 points (odd points - faster parallax)
    points.forEach(point => {
        if (point.layer === 'layer_1') {
            const x = point.baseX + (offsetX * layer1Speed);
            const y = point.baseY + (offsetY * layer1Speed);
            
            // Check if hovered
            const isHovered = isPointHovered(x, y, smoothMouseX, smoothMouseY, baseEmojiSize * hoverZoom / 2);
            const targetSize = isHovered ? baseEmojiSize * hoverZoom : baseEmojiSize;
            
            // Smoothly interpolate size
            point.currentSize += (targetSize - point.currentSize) * zoomSmoothness;
            
            ctx.font = `${point.currentSize}px Arial`;
            ctx.fillText(point.emoji, x, y);
        }
    });
    
    // Draw layer_2 points (even points - slower parallax for depth, smaller emojis)
    points.forEach(point => {
        if (point.layer === 'layer_2') {
            const x = point.baseX + (offsetX * layer2Speed);
            const y = point.baseY + (offsetY * layer2Speed);
            
            // Layer_2 base size is 1.6 times smaller
            const layer2BaseSize = baseEmojiSize * layer2SizeMultiplier;
            
            // Check if hovered
            const isHovered = isPointHovered(x, y, smoothMouseX, smoothMouseY, layer2BaseSize * hoverZoom / 2);
            const targetSize = isHovered ? layer2BaseSize * hoverZoom : layer2BaseSize;
            
            // Smoothly interpolate size
            if (!point.currentSize) point.currentSize = layer2BaseSize;
            point.currentSize += (targetSize - point.currentSize) * zoomSmoothness;
            
            ctx.font = `${point.currentSize}px Arial`;
            ctx.fillText(point.emoji, x, y);
        }
    });
}

// Animation loop
function animate() {
    draw();
    requestAnimationFrame(animate);
}

// Start animation
animate();

// Redraw on resize
window.addEventListener('resize', () => {
    resizeCanvas();
    // Regenerate points for new canvas size
    const newPoints = generatePoints(100, 50);
    points.length = 0;
    points.push(...newPoints);
    // Update mouse position
    targetMouseX = canvas.width / 2;
    targetMouseY = canvas.height / 2;
    smoothMouseX = targetMouseX;
    smoothMouseY = targetMouseY;
});
