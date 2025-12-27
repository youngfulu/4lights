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
                layer: (i % 2 === 0) ? 'layer_1' : 'layer_2' // odd points (1st, 3rd, 5th...) = layer_1, even points (2nd, 4th, 6th...) = layer_2
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
            points.push(point);
        }
    }
    
    return points;
}

// Generate 100 points
const points = generatePoints(100, 50);

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

// Draw points with parallax
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
    
    // Draw layer_1 points (odd points - faster parallax)
    ctx.fillStyle = '#fff';
    points.forEach(point => {
        if (point.layer === 'layer_1') {
            const x = point.baseX + (offsetX * layer1Speed);
            const y = point.baseY + (offsetY * layer1Speed);
            
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw layer_2 points (even points - slower parallax for depth)
    ctx.fillStyle = '#fff';
    points.forEach(point => {
        if (point.layer === 'layer_2') {
            const x = point.baseX + (offsetX * layer2Speed);
            const y = point.baseY + (offsetY * layer2Speed);
            
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
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
