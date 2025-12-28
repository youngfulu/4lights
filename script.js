const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Emoji size settings - MUST be declared before use
const baseEmojiSize = 24; // Base size for layer_1
const layer2SizeMultiplier = 1 / 1.6; // Layer_2 is 1.6 times smaller
const hoverZoom = 2.0; // Zoom factor on hover
const alignmentAnimationDuration = 1250; // Animation duration in milliseconds (1.25 seconds)
const alignedSizeMultiplier = 7.0; // Size multiplier when aligned (7x larger)
const panSmoothness = 0.12; // Smoothness factor for camera pan interpolation (smoother with inertia)
const opacitySmoothness = 0.0167; // Smoothness for opacity transition (fade to 0.1 in 1 second: ~60 frames at 60fps, 0.9 / 60 ≈ 0.015, slightly faster)

// Mouse/touch position
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let targetMouseX = mouseX;
let targetMouseY = mouseY;

// Smooth mouse tracking
let smoothMouseX = mouseX;
let smoothMouseY = mouseY;

// Camera zoom - discrete levels
const zoomLevels = [0.5, 0.75, 1.0, 1.5, 2.0, 3.0]; // 2 zoom out levels, base, 3 zoom in levels
let currentZoomIndex = 2; // Start at base level (1.0)
let globalZoomLevel = 1.0;
let targetZoomLevel = 1.0;
const minZoom = 0.5;
const maxZoom = 3.0;
const zoomTransitionDuration = 1500; // 1.5 seconds in milliseconds
let zoomTransitionStartTime = 0;
let zoomTransitionStartLevel = 1.0;
let zoomTransitionTargetLevel = 1.0;
let isZoomTransitioning = false;

// Camera pan (drag to move view) with inertia
let cameraPanX = 0;
let cameraPanY = 0;
let targetCameraPanX = 0;
let targetCameraPanY = 0;
let panVelocityX = 0; // Pan velocity for inertia
let panVelocityY = 0;
let isDragging = false;
let lastDragX = 0;
let lastDragY = 0;
let lastMoveTime = performance.now();

// Alignment state
let alignedEmojiIndex = null; // null = no alignment, otherwise the emoji index to align
let alignedEmojis = []; // Array of emoji objects that are currently aligned

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
    
    // Group emojis by assigning same index to similar emojis
    const emojiGroups = {};
    emojis.forEach((emoji, index) => {
        if (!emojiGroups[emoji]) {
            emojiGroups[emoji] = index; // Use emoji itself as the group identifier
        }
    });
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let validPoint = false;
        let point;
        
        while (!validPoint && attempts < maxAttempts) {
            const emojiIndex = Math.floor(Math.random() * emojis.length);
            const emoji = emojis[emojiIndex];
            point = {
                x: Math.random() * box.width + box.x,
                y: Math.random() * box.height + box.y,
                baseX: 0, // Will be set after generation
                baseY: 0, // Will be set after generation
                originalBaseX: 0, // Store original position (never modified)
                originalBaseY: 0, // Store original position (never modified)
                layer: (i % 2 === 0) ? 'layer_1' : 'layer_2', // odd points (1st, 3rd, 5th...) = layer_1, even points (2nd, 4th, 6th...) = layer_2
                emoji: emoji,
                emojiIndex: emojiGroups[emoji] || emojiIndex, // Same index for identical emojis
                isAligned: false,
                targetX: 0, // Target X position when aligned (center X)
                targetY: 0, // Target Y position when aligned (horizontal line)
                currentAlignedX: 0, // Current interpolated X position
                currentAlignedY: 0,  // Current interpolated Y position
                targetSize: 0, // Target size for smooth size transition
                currentSize: 0, // Current interpolated size
                opacity: 1.0, // Current opacity (1.0 = fully visible, 0.1 = faded)
                targetOpacity: 1.0, // Target opacity for smooth transition
                alignmentStartTime: 0, // Start time for alignment animation
                startX: 0, // Starting X position for animation
                startY: 0, // Starting Y position for animation
                startSize: 0 // Starting size for animation
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
            // Store base position and original position (original never changes)
            point.baseX = point.x;
            point.baseY = point.y;
            point.originalBaseX = point.x;
            point.originalBaseY = point.y;
            point.currentAlignedX = point.x;
            point.currentAlignedY = point.y;
            point.alignmentStartTime = 0; // Initialize animation start time
            point.startX = point.x;
            point.startY = point.y;
            point.startSize = 0; // Will be set after initialization
            // Initial size will be set after baseEmojiSize is defined
            points.push(point);
        }
    }
    
    return points;
}

// Generate 100 points
const points = generatePoints(100, 50);

// Initialize current sizes and opacity for all points
points.forEach(point => {
    if (point.layer === 'layer_1') {
        point.targetSize = baseEmojiSize;
        point.currentSize = baseEmojiSize;
        point.startSize = baseEmojiSize;
    } else {
        point.targetSize = baseEmojiSize * layer2SizeMultiplier;
        point.currentSize = baseEmojiSize * layer2SizeMultiplier;
        point.startSize = baseEmojiSize * layer2SizeMultiplier;
    }
    point.opacity = 1.0;
    point.targetOpacity = 1.0;
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
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;
    const currentTime = performance.now();
    const deltaTime = Math.max(1, currentTime - lastMoveTime); // Prevent division by zero
    lastMoveTime = currentTime;
    
    if (isDragging) {
        // Calculate drag delta and update camera pan target
        const deltaX = mouseXPos - lastDragX;
        const deltaY = mouseYPos - lastDragY;
        targetCameraPanX += deltaX;
        targetCameraPanY += deltaY;
        
        // Update velocity for inertia (pixels per millisecond)
        panVelocityX = deltaX / deltaTime;
        panVelocityY = deltaY / deltaTime;
        
        lastDragX = mouseXPos;
        lastDragY = mouseYPos;
    } else {
        targetMouseX = mouseXPos;
        targetMouseY = mouseYPos;
        // Decay velocity when not dragging
        panVelocityX *= 0.9;
        panVelocityY *= 0.9;
    }
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
    if (!isDragging) {
    targetMouseX = canvas.width / 2;
    targetMouseY = canvas.height / 2;
    }
}

// Mouse down handler (start drag or click emoji)
function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const clickedPoint = findPointAtMouse(mouseX, mouseY);
    
    // If emojis are aligned, any click anywhere should unalign them
    if (alignedEmojiIndex !== null) {
        unalignEmojis();
        e.preventDefault();
    } else if (clickedPoint && !isDragging) {
        // Normal click on emoji (only when nothing is aligned)
        handleEmojiClick(clickedPoint);
        e.preventDefault(); // Prevent drag when clicking emoji
    } else {
        isDragging = true;
        lastDragX = mouseX;
        lastDragY = mouseY;
        canvas.style.cursor = 'grabbing';
    }
}

// Mouse up handler (end drag)
function handleMouseUp() {
    isDragging = false;
    canvas.style.cursor = 'default';
    // Velocity will continue to apply inertia after drag ends
}

// Mouse wheel handler (zoom) - discrete levels
function handleWheel(e) {
    e.preventDefault();
    
    if (e.deltaY < 0) {
        // Zoom in - move to next higher level
        if (currentZoomIndex < zoomLevels.length - 1) {
            currentZoomIndex++;
            startZoomTransition();
        }
    } else {
        // Zoom out - move to next lower level
        if (currentZoomIndex > 0) {
            currentZoomIndex--;
            startZoomTransition();
        }
    }
}

// Start zoom transition with smooth fade
function startZoomTransition() {
    zoomTransitionStartLevel = globalZoomLevel;
    zoomTransitionTargetLevel = zoomLevels[currentZoomIndex];
    zoomTransitionStartTime = performance.now();
    isZoomTransitioning = true;
    targetZoomLevel = zoomTransitionTargetLevel;
}

// Add event listeners
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('wheel', handleWheel, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('mouseleave', handleMouseLeave);

// Parallax effect parameters
const parallaxStrength = 0.02; // How much points move
const layer1Speed = 1.0; // Speed for layer_1
const layer2Speed = 0.5; // Speed for layer_2 (slower for depth effect)

// Find point at mouse position for click detection
function findPointAtMouse(mouseX, mouseY) {
    // Account for camera zoom and pan when converting mouse coordinates
    // Canvas transform order: translate(-centerX, -centerY), scale(zoom), translate(centerX + panX, centerY + panY)
    // World to screen: (wx - cx) * zoom + cx + panX
    // Screen to world: (sx - cx - panX) / zoom + cx
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const effectiveZoom = globalZoomLevel; // Use current zoom level for accurate detection
    
    // Convert screen coordinates to world coordinates by reversing the transform
    const scaledMouseX = ((mouseX - centerX - cameraPanX) / effectiveZoom) + centerX;
    const scaledMouseY = ((mouseY - centerY - cameraPanY) / effectiveZoom) + centerY;
    
    // Calculate parallax offset for current mouse position
    const offsetX = (scaledMouseX - centerX) * parallaxStrength;
    const offsetY = (scaledMouseY - centerY) * parallaxStrength;
    
    // Check all points and return the closest one that is hovered
    // Check in reverse order so points drawn on top are checked first
    let closestPoint = null;
    let closestDistance = Infinity;
    
    for (let i = points.length - 1; i >= 0; i--) {
        const point = points[i];
        let x, y;
        
        if (point.isAligned) {
            x = point.currentAlignedX;
            y = point.currentAlignedY;
        } else {
            // Use layer-specific speed for parallax
            const speed = point.layer === 'layer_1' ? layer1Speed : layer2Speed;
            x = point.originalBaseX + (offsetX * speed);
            y = point.originalBaseY + (offsetY * speed);
        }
        
        // Use appropriate size based on layer and alignment
        let size;
        if (point.isAligned) {
            size = baseEmojiSize * alignedSizeMultiplier;
        } else {
            size = point.layer === 'layer_1' ? baseEmojiSize : baseEmojiSize * layer2SizeMultiplier;
        }
        
        // Check if mouse is within hit radius
        const distance = Math.sqrt(
            Math.pow(x - scaledMouseX, 2) + 
            Math.pow(y - scaledMouseY, 2)
        );
        const hitRadius = size / 2;
        
        if (distance < hitRadius && distance < closestDistance) {
            closestPoint = point;
            closestDistance = distance;
        }
    }
    
    return closestPoint;
}

// Unalign emojis - restore to original positions
function unalignEmojis() {
    if (alignedEmojiIndex === null) return;
    
    // Store aligned emojis before clearing array
    const emojisToUnalign = [...alignedEmojis];
    
    emojisToUnalign.forEach(p => {
        p.isAligned = false;
        p.targetX = p.originalBaseX;
        p.targetY = p.originalBaseY;
        // Reset target size to original size
        if (p.layer === 'layer_1') {
            p.targetSize = baseEmojiSize;
        } else {
            p.targetSize = baseEmojiSize * layer2SizeMultiplier;
        }
        // Initialize animation start values for smooth return
        p.startX = p.currentAlignedX;
        p.startY = p.currentAlignedY;
        p.startSize = p.currentSize;
        p.alignmentStartTime = performance.now();
    });
    
    alignedEmojis = [];
    alignedEmojiIndex = null;
    
    // Reset zoom to default (base level)
    currentZoomIndex = 2; // Base level index (1.0)
    startZoomTransition();
    
    // Reset opacity for all emojis
    points.forEach(p => {
        p.targetOpacity = 1.0;
    });
}

// Handle emoji click - align all emojis with same index
function handleEmojiClick(clickedPoint) {
    // Only handle alignment if nothing is currently aligned (unaligning is handled by mouseDown)
    // Align all emojis with same index
    alignedEmojiIndex = clickedPoint.emojiIndex;
    alignedEmojis = points.filter(p => p.emojiIndex === alignedEmojiIndex);
    
    // Check if mobile (screen width < 768px or touch device)
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    
    const alignedSize = baseEmojiSize * alignedSizeMultiplier;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const totalEmojis = alignedEmojis.length;
    const minSpacing = alignedSize * 1.2; // 20% padding between emojis
    
    if (isMobile) {
        // Mobile: Line up emojis vertically, fit to width
        const padding = 40; // Padding on each side (in screen coordinates)
        const availableScreenWidth = canvas.width - (padding * 2);
        
        // Calculate zoom to fit width - emojis should fit within available screen width
        // At base zoom (1.0), alignedSize fits in availableScreenWidth
        // We want: alignedSize * zoom <= availableScreenWidth
        // So: zoom <= availableScreenWidth / alignedSize
        const requiredZoomForWidth = availableScreenWidth / alignedSize;
        
        // Find the largest zoom level that ensures emojis fit width
        let bestIndex = 0;
        for (let i = zoomLevels.length - 1; i >= 0; i--) {
            if (zoomLevels[i] <= requiredZoomForWidth) {
                bestIndex = i;
                break;
            }
        }
        
        const selectedZoom = zoomLevels[bestIndex];
        
        // Calculate spacing between emojis vertically (fit to width, space vertically)
        const verticalSpacing = alignedSize * 1.2; // 20% padding between emojis vertically
        const totalHeight = (totalEmojis - 1) * verticalSpacing;
        const startY = centerY - totalHeight / 2; // Center all emojis vertically
        
        // Position emojis vertically (centered horizontally)
        alignedEmojis.forEach((point, index) => {
            point.isAligned = true;
            point.targetX = centerX; // All emojis centered horizontally
            point.targetY = startY + (index * verticalSpacing); // Stacked vertically
            point.targetSize = alignedSize;
            point.targetOpacity = 1.0;
            // Initialize animation start values
            point.startX = point.currentAlignedX;
            point.startY = point.currentAlignedY;
            point.startSize = point.currentSize;
            point.alignmentStartTime = performance.now();
        });
        
        currentZoomIndex = bestIndex;
        startZoomTransition();
        
        // Reset camera pan to center the vertical stack
        targetCameraPanX = 0;
        targetCameraPanY = 0;
    } else {
        // Desktop: Single horizontal line
        const totalWidth = (totalEmojis - 1) * minSpacing; // Width in world coordinates
        const startX = centerX - totalWidth / 2; // Center the line at canvas center (world coords)
        
        alignedEmojis.forEach((point, index) => {
            point.isAligned = true;
            point.targetX = startX + (index * minSpacing);
            point.targetY = centerY; // Horizontal line at center Y (world coords)
            point.targetSize = alignedSize; // Set target size for smooth transition
            point.targetOpacity = 1.0; // Selected emojis remain fully visible
            // Initialize animation start values
            point.startX = point.currentAlignedX;
            point.startY = point.currentAlignedY;
            point.startSize = point.currentSize;
            point.alignmentStartTime = performance.now();
        });
        
        // Calculate zoom level to fit the horizontal line width on screen
        const padding = 80; // Padding on each side (in screen coordinates)
        const totalSpanWidth = totalWidth + alignedSize; // Width from left edge of first emoji to right edge of last (world coords)
        const availableScreenWidth = canvas.width - (padding * 2);
        
        // When zoom = z, world coordinates are scaled by z: screenWidth = worldWidth * z
        // We want: totalSpanWidth * zoom <= availableScreenWidth
        // So: zoom <= availableScreenWidth / totalSpanWidth
        const requiredZoom = availableScreenWidth / totalSpanWidth;
        
        // Find the largest zoom level that ensures all emojis fit (zoom <= requiredZoom)
        let bestIndex = 0; // Start with smallest zoom
        for (let i = zoomLevels.length - 1; i >= 0; i--) {
            if (zoomLevels[i] <= requiredZoom) {
                // This zoom level fits, use it (pick largest that fits)
                bestIndex = i;
                break;
            }
        }
        
        currentZoomIndex = bestIndex;
        startZoomTransition();
        
        // Reset camera pan to center the aligned emojis
        targetCameraPanX = 0;
        targetCameraPanY = 0;
    }
    
    // Set opacity for non-selected emojis to fade to 0.1
    points.forEach(p => {
        if (p.emojiIndex !== alignedEmojiIndex) {
            p.targetOpacity = 0.1;
        }
    });
}

// Draw points with parallax and emojis
function draw() {
    // Smooth mouse position
    smoothMouseX += (targetMouseX - smoothMouseX) * 0.1;
    smoothMouseY += (targetMouseY - smoothMouseY) * 0.1;
    
    // Smooth camera zoom interpolation with 1.5 second fade
    if (isZoomTransitioning) {
        const elapsed = performance.now() - zoomTransitionStartTime;
        const progress = Math.min(elapsed / zoomTransitionDuration, 1.0);
        
        // Ease in-out for smooth transition
        const easeProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        globalZoomLevel = zoomTransitionStartLevel + (zoomTransitionTargetLevel - zoomTransitionStartLevel) * easeProgress;
        
        if (progress >= 1.0) {
            isZoomTransitioning = false;
            globalZoomLevel = zoomTransitionTargetLevel;
        }
    } else {
        globalZoomLevel = zoomLevels[currentZoomIndex];
    }
    
    // Smooth camera pan interpolation with inertia
    // Apply velocity-based inertia when not dragging
    if (!isDragging && (Math.abs(panVelocityX) > 0.01 || Math.abs(panVelocityY) > 0.01)) {
        const inertiaStrength = 8; // Multiplier for velocity
        targetCameraPanX += panVelocityX * inertiaStrength;
        targetCameraPanY += panVelocityY * inertiaStrength;
        // Decay velocity over time
        panVelocityX *= 0.92;
        panVelocityY *= 0.92;
    }
    
    // Smooth interpolation towards target
    cameraPanX += (targetCameraPanX - cameraPanX) * panSmoothness;
    cameraPanY += (targetCameraPanY - cameraPanY) * panSmoothness;
    
    // Clear canvas with black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw name in upper left corner (outside scaled context)
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('dat_girl', 20, 20);
    
    // Apply camera zoom and pan transform
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.save();
    ctx.translate(centerX + cameraPanX, centerY + cameraPanY);
    ctx.scale(globalZoomLevel, globalZoomLevel);
    ctx.translate(-centerX, -centerY);
    ctx.globalAlpha = 1.0; // Reset alpha for drawing within transform (will be set per-point)
    
    // Draw grid (25x25 pixels, white, opacity 0.3)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    const gridSize = 25;
    
    // Calculate visible area in world coordinates (after transform)
    const visibleLeft = centerX - canvas.width / (2 * globalZoomLevel);
    const visibleRight = centerX + canvas.width / (2 * globalZoomLevel);
    const visibleTop = centerY - canvas.height / (2 * globalZoomLevel);
    const visibleBottom = centerY + canvas.height / (2 * globalZoomLevel);
    
    // Draw vertical lines
    const startX = Math.floor(visibleLeft / gridSize) * gridSize;
    const endX = Math.ceil(visibleRight / gridSize) * gridSize;
    for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, visibleTop);
        ctx.lineTo(x, visibleBottom);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    const startY = Math.floor(visibleTop / gridSize) * gridSize;
    const endY = Math.ceil(visibleBottom / gridSize) * gridSize;
    for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(visibleLeft, y);
        ctx.lineTo(visibleRight, y);
        ctx.stroke();
    }
    
    // Calculate center offset for parallax
    const offsetX = (smoothMouseX - centerX) * parallaxStrength;
    const offsetY = (smoothMouseY - centerY) * parallaxStrength;
    
    // Cache mouse coordinates for hover detection (calculated once per frame)
    const scaledMouseXForHover = ((smoothMouseX - centerX - cameraPanX) / globalZoomLevel) + centerX;
    const scaledMouseYForHover = ((smoothMouseY - centerY - cameraPanY) / globalZoomLevel) + centerY;
    
    // Set text alignment and color for emojis (once)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    
    // Store previous font size to avoid redundant font changes
    let lastFontSize = -1;
    
    // Draw all points in a single loop (PERFORMANCE: was 2 loops, now 1)
    points.forEach(point => {
        const speed = point.layer === 'layer_1' ? layer1Speed : layer2Speed;
        
        // Animate opacity
        point.opacity += (point.targetOpacity - point.opacity) * opacitySmoothness;
        
        let x, y;
        let emojiSize;
        
        if (point.isAligned || (point.alignmentStartTime > 0 && !point.isAligned)) {
            // Time-based smooth animation with easing (1.25 seconds duration)
            const elapsed = performance.now() - point.alignmentStartTime;
            const progress = Math.min(elapsed / alignmentAnimationDuration, 1.0);
            
            // Smooth ease-out easing function (easeOutCubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate position and size
            point.currentAlignedX = point.startX + (point.targetX - point.startX) * easeProgress;
            point.currentAlignedY = point.startY + (point.targetY - point.startY) * easeProgress;
            point.currentSize = point.startSize + (point.targetSize - point.startSize) * easeProgress;
            
            // If aligned, use aligned position; otherwise transitioning back
            if (point.isAligned) {
                x = point.currentAlignedX;
                y = point.currentAlignedY;
                emojiSize = point.currentSize;
            } else {
                // Transitioning back to original - combine with parallax
                x = point.currentAlignedX + (offsetX * speed);
                y = point.currentAlignedY + (offsetY * speed);
                emojiSize = point.currentSize;
                // Reset animation start time when transition completes
                if (progress >= 1.0) {
                    point.alignmentStartTime = 0;
                    point.currentAlignedX = point.originalBaseX;
                    point.currentAlignedY = point.originalBaseY;
                }
            }
        } else {
            // Normal state - use original position with parallax
            x = point.originalBaseX + (offsetX * speed);
            y = point.originalBaseY + (offsetY * speed);
            
            // Smoothly animate size change
            point.currentSize += (point.targetSize - point.currentSize) * 0.1;
            
            // Check if hovered (using cached coordinates)
            const isHovered = isPointHovered(x, y, scaledMouseXForHover, scaledMouseYForHover, point.currentSize * hoverZoom / 2);
            const hoverSize = isHovered ? point.currentSize * hoverZoom : point.currentSize;
            emojiSize = hoverSize;
        }
        
        // PERFORMANCE: Only set font when size changes (avoid redundant font updates)
        if (Math.abs(emojiSize - lastFontSize) > 0.5) {
            ctx.font = `${emojiSize}px Arial`;
            lastFontSize = emojiSize;
        }
        
        // PERFORMANCE: Use globalAlpha directly (more efficient than save/restore)
        // Only change globalAlpha if it's different (optimization)
        if (Math.abs(ctx.globalAlpha - point.opacity) > 0.01) {
            ctx.globalAlpha = point.opacity;
        }
        ctx.fillText(point.emoji, x, y);
    });
    
    // Restore transform and reset globalAlpha after drawing
    ctx.restore();
    ctx.globalAlpha = 1.0;
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
