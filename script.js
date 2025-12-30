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
const baseEmojiSize = 96; // Base size for layer_1 (4x larger: 24 * 4 = 96)
const layer2SizeMultiplier = 1 / 1.6; // Layer_2 is 1.6 times smaller
const hoverZoom = 2.0; // Zoom factor on hover
const alignmentAnimationDuration = 1250; // Animation duration in milliseconds (1.25 seconds)
const alignedSizeMultiplier = 7.0; // Size multiplier when aligned (7x larger)
const panSmoothness = 0.18; // Smoothness factor for camera pan interpolation (more responsive, less laggy)
const opacitySmoothness = 0.0334; // Smoothness for opacity transition (fade to 0.1 in 0.5 seconds: 2x faster than before)

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

// Store initial camera position for reset
const initialCameraPanX = 0;
const initialCameraPanY = 0;
const initialZoomIndex = 2; // Base zoom level index

// Alignment state
let alignedEmojiIndex = null; // null = no alignment, otherwise the emoji index to align
let alignedEmojis = []; // Array of emoji objects that are currently aligned

// Mobile vertical scroll state
let mobileScrollPosition = 0; // Current scroll position (0 = top, 1 = bottom)
let targetMobileScrollPosition = 0; // Target scroll position
let isMobileScrolling = false; // Whether user is currently scrolling
let scrollIndicatorVisible = false; // Whether scroll indicator is visible
let scrollIndicatorFadeTime = 0; // Time when scroll indicator should fade

// Image list - use images from "Imgae test " directory
const imagePaths = [
    'Imgae test /575104183_10234916968638578_3714106829795647330_n.jpg',
    'Imgae test /IMG_3088.PNG',
    'Imgae test /photo_2023-09-15_22-34-48.jpg',
    'Imgae test /Screenshot 2025-11-06 at 16.03.53.png',
    'Imgae test /Screenshot 2025-11-08 at 02.26.28.png',
    'Imgae test /Screenshot 2025-11-08 at 03.27.57.png',
    'Imgae test /Screenshot 2025-11-20 at 00.49.08.png',
    'Imgae test /Screenshot 2025-11-20 at 15.07.33.png',
    'Imgae test /Screenshot 2025-12-07 at 15.08.15.png',
    'Imgae test /Screenshot 2025-12-07 at 15.08.19.png',
    'Imgae test /Screenshot 2025-12-13 at 17.16.14.png',
    'Imgae test /Screenshot 2025-12-14 at 22.28.14.png',
    'Imgae test /Screenshot 2025-12-22 at 14.53.33.png'
];

// Image cache - stores loaded Image objects
const imageCache = {};
let imagesLoaded = 0;
let totalImages = 0;

// Load all images with better error handling
function loadImages() {
    const uniquePaths = [...new Set(imagePaths)]; // Remove duplicates
    const pathsToLoad = uniquePaths.slice(0, 100); // Limit to 100 images max
    totalImages = pathsToLoad.length;
    imagesLoaded = 0;
    
    if (pathsToLoad.length === 0) {
        console.warn('No image paths to load.');
        return;
    }
    
    pathsToLoad.forEach((path, index) => {
        const img = new Image();
        img.onload = () => {
            // Store image dimensions for aspect ratio calculation
            imageCache[path] = {
                img: img,
                width: img.naturalWidth,
                height: img.naturalHeight,
                aspectRatio: img.naturalWidth / img.naturalHeight
            };
            imagesLoaded++;
            console.log(`Loaded image ${imagesLoaded}/${totalImages}: ${path} (${img.naturalWidth}x${img.naturalHeight})`);
            if (imagesLoaded === totalImages) {
                console.log(`All ${imagesLoaded} images loaded successfully!`);
            }
        };
        img.onerror = () => {
            console.warn(`Failed to load image: ${path}`);
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                console.log(`Finished loading attempt: ${imagesLoaded}/${totalImages} images loaded`);
            }
        };
        // Don't set crossOrigin for local file:// protocol - it causes CORS errors
        // Only set it if using http/https protocol
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            img.crossOrigin = 'anonymous';
        }
        img.src = path;
    });
    
    console.log(`Attempting to load ${pathsToLoad.length} images from "Imgae test " directory...`);
}

// Start loading images
loadImages();

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
    
    // Group images by assigning same index to similar images
    const imageGroups = {};
    imagePaths.forEach((path, index) => {
        if (!imageGroups[path]) {
            imageGroups[path] = index; // Use image path as the group identifier
        }
    });
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let validPoint = false;
        let point;
        
        while (!validPoint && attempts < maxAttempts) {
            const imageIndex = Math.floor(Math.random() * imagePaths.length);
            const imagePath = imagePaths[imageIndex];
            point = {
                x: Math.random() * box.width + box.x,
                y: Math.random() * box.height + box.y,
                baseX: 0, // Will be set after generation
                baseY: 0, // Will be set after generation
                originalBaseX: 0, // Store original position (never modified)
                originalBaseY: 0, // Store original position (never modified)
                layer: (i % 2 === 0) ? 'layer_1' : 'layer_2', // odd points (1st, 3rd, 5th...) = layer_1, even points (2nd, 4th, 6th...) = layer_2
                imagePath: imagePath,
                emojiIndex: imageGroups[imagePath] || imageIndex, // Same index for identical images
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

// Mouse move handler (optimized for performance)
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;
    
    if (isDragging) {
        // Calculate drag delta and update camera pan target directly (more responsive)
        const deltaX = mouseXPos - lastDragX;
        const deltaY = mouseYPos - lastDragY;
        targetCameraPanX += deltaX;
        targetCameraPanY += deltaY;
        
        // Update velocity for inertia (only when dragging, use frame-based calculation)
        const currentTime = performance.now();
        const deltaTime = Math.max(16, currentTime - lastMoveTime); // Cap at ~60fps
        lastMoveTime = currentTime;
        panVelocityX = deltaX / deltaTime;
        panVelocityY = deltaY / deltaTime;
        
        lastDragX = mouseXPos;
        lastDragY = mouseYPos;
        
        // Directly update camera pan for immediate response (no smooth interpolation while dragging)
        cameraPanX = targetCameraPanX;
        cameraPanY = targetCameraPanY;
    } else {
        targetMouseX = mouseXPos;
        targetMouseY = mouseYPos;
        // Decay velocity when not dragging (only needed for inertia after drag ends)
        panVelocityX *= 0.85;
        panVelocityY *= 0.85;
    }
}

// Touch start handler for mobile scroll
let touchStartY = 0;
let touchStartScrollPosition = 0;

function handleTouchStart(e) {
    if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
        touchStartScrollPosition = mobileScrollPosition;
        
        // Check if we're in mobile aligned mode
        const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
        if (isMobile && alignedEmojiIndex !== null) {
            isMobileScrolling = true;
            scrollIndicatorVisible = true;
            scrollIndicatorFadeTime = performance.now() + 3000;
        }
    }
}

// Touch move handler
function handleTouchMove(e) {
    e.preventDefault();
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    
    if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touchY = e.touches[0].clientY - rect.top;
        
        // Handle mobile vertical scroll when emojis are aligned
        if (isMobile && alignedEmojiIndex !== null) {
            // Check if this is a vertical scroll gesture (if not already scrolling, detect it)
            if (!isMobileScrolling) {
                const deltaY = Math.abs(touchY - touchStartY);
                // If vertical movement is significant, start scrolling
                if (deltaY > 10) {
                    isMobileScrolling = true;
                    scrollIndicatorVisible = true;
                    scrollIndicatorFadeTime = performance.now() + 3000;
                }
            }
            
            if (isMobileScrolling) {
                const deltaY = touchY - touchStartY;
                const screenHeight = canvas.height;
                // Convert touch delta to scroll position (0 to 1) - more sensitive
                const scrollDelta = -deltaY / (screenHeight * 1.5); // More sensitive scrolling
                targetMobileScrollPosition = Math.max(0, Math.min(1, touchStartScrollPosition + scrollDelta));
                scrollIndicatorVisible = true;
                scrollIndicatorFadeTime = performance.now() + 3000;
            } else {
                // Normal touch movement for parallax
                targetMouseX = e.touches[0].clientX - rect.left;
                targetMouseY = e.touches[0].clientY - rect.top;
            }
        } else {
            // Desktop touch or no alignment - normal touch movement
        targetMouseX = e.touches[0].clientX - rect.left;
        targetMouseY = e.touches[0].clientY - rect.top;
    }
    }
}

// Touch end handler
function handleTouchEnd(e) {
    isMobileScrolling = false;
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
    
    // Allow navigation (dragging) when images are aligned
    if (alignedEmojiIndex !== null) {
        // If clicking on an aligned image, allow drag navigation
        if (clickedPoint && clickedPoint.isAligned) {
            // Start dragging for navigation
            isDragging = true;
            lastDragX = mouseX;
            lastDragY = mouseY;
            canvas.style.cursor = 'grabbing';
        } else {
            // Click on empty space - start dragging for navigation
            isDragging = true;
            lastDragX = mouseX;
            lastDragY = mouseY;
            canvas.style.cursor = 'grabbing';
        }
    } else if (clickedPoint && !isDragging) {
        // Normal click on image (only when nothing is aligned)
        handleEmojiClick(clickedPoint);
        e.preventDefault(); // Prevent drag when clicking image
    } else {
        // Start dragging for navigation
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
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // If in image selection mode, zoom relative to mouse position
    if (alignedEmojiIndex !== null) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Calculate world position under mouse cursor
        const worldX = ((mouseX - centerX - cameraPanX) / globalZoomLevel) + centerX;
        const worldY = ((mouseY - centerY - cameraPanY) / globalZoomLevel) + centerY;
        
        let newZoomIndex = currentZoomIndex;
        if (e.deltaY < 0) {
            // Zoom in - move to next higher level
            if (currentZoomIndex < zoomLevels.length - 1) {
                newZoomIndex = currentZoomIndex + 1;
            } else {
                return; // Already at max zoom
            }
        } else {
            // Zoom out - move to next lower level
            if (currentZoomIndex > 0) {
                newZoomIndex = currentZoomIndex - 1;
            } else {
                return; // Already at min zoom
            }
        }
        
        const newZoom = zoomLevels[newZoomIndex];
        
        // Calculate new camera pan to keep world position under mouse at same screen position
        const newPanX = mouseX - centerX - (worldX - centerX) * newZoom;
        const newPanY = mouseY - centerY - (worldY - centerY) * newZoom;
        
        // Update zoom and pan
        currentZoomIndex = newZoomIndex;
        targetCameraPanX = newPanX;
        targetCameraPanY = newPanY;
        startZoomTransition();
    } else {
        // Normal zoom (not in selection mode) - zoom from center
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
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
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
    
    // Reset mobile scroll state
    mobileScrollPosition = 0;
    targetMobileScrollPosition = 0;
    scrollIndicatorVisible = false;
    
    // Reset camera to original startup position
    targetCameraPanX = initialCameraPanX;
    targetCameraPanY = initialCameraPanY;
    cameraPanX = initialCameraPanX;
    cameraPanY = initialCameraPanY;
    panVelocityX = 0;
    panVelocityY = 0;
    
    // Reset mouse position to center (original screen space position)
    targetMouseX = canvas.width / 2;
    targetMouseY = canvas.height / 2;
    smoothMouseX = targetMouseX;
    smoothMouseY = targetMouseY;
    
    // Reset zoom to default (base level)
    currentZoomIndex = initialZoomIndex; // Base level index (1.0)
    startZoomTransition();
    
    // Reset opacity for all images
    points.forEach(p => {
        p.targetOpacity = 1.0;
    });
    
    // Update back button visibility
    updateBackButtonVisibility();
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
    // Desktop horizontal line: 35px gap between images, no overlap
    const horizontalGap = 35; // Gap in pixels (world coordinates)
    const minSpacing = alignedSize + horizontalGap; // Image size + gap = no overlap
    
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
        
        // Calculate spacing between images vertically (fit to width, space vertically)
        // Spacing = 70% of image size (max 30% overlap)
        const verticalSpacing = alignedSize * 0.7; // 70% spacing = max 30% overlap
        const totalHeight = (totalEmojis - 1) * verticalSpacing;
        
        // Position images vertically (centered horizontally)
        // Start from top with padding to focus on upper image
        const topPadding = 80; // Padding from top to focus on first image
        const startY = centerY - (totalHeight / 2) + topPadding; // Start higher to focus on first image
        
        alignedEmojis.forEach((point, index) => {
            point.isAligned = true;
            point.targetX = centerX; // All images centered horizontally
            point.targetY = startY + (index * verticalSpacing); // Stacked vertically from top
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
        
        // Focus camera on top image - adjust camera pan Y to center the first image
        const firstImageY = startY;
        const screenCenterY = canvas.height / 2;
        // Calculate offset needed to center first image on screen (in world coordinates)
        const worldOffsetY = (firstImageY - screenCenterY) * zoomLevels[bestIndex];
        targetCameraPanX = 0;
        targetCameraPanY = -worldOffsetY; // Negative because we want to move the view up
        mobileScrollPosition = 0;
        targetMobileScrollPosition = 0;
        
        // Show scroll indicator if content exceeds screen (in world coordinates, account for zoom)
        const totalContentHeight = totalHeight + (topPadding * 2);
        const screenHeight = canvas.height;
        const scaledContentHeight = totalContentHeight * zoomLevels[bestIndex]; // Account for zoom
        scrollIndicatorVisible = scaledContentHeight > screenHeight;
        if (scrollIndicatorVisible) {
            scrollIndicatorFadeTime = performance.now() + 3000; // Hide after 3 seconds of inactivity
        }
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
    
    // Set opacity for non-selected images to fade to 0.1
    points.forEach(p => {
        if (p.emojiIndex !== alignedEmojiIndex) {
            p.targetOpacity = 0.1;
        }
    });
    
    // Update back button visibility
    updateBackButtonVisibility();
}

// Draw points with parallax and emojis
function draw() {
    // Smooth mouse position (optimized - only when not dragging for better performance)
    if (!isDragging) {
    smoothMouseX += (targetMouseX - smoothMouseX) * 0.1;
    smoothMouseY += (targetMouseY - smoothMouseY) * 0.1;
    } else {
        // Direct update while dragging for better responsiveness
        smoothMouseX = targetMouseX;
        smoothMouseY = targetMouseY;
    }
    
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
    
    // Mobile vertical scroll interpolation (mobile only)
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    if (isMobile && alignedEmojiIndex !== null) {
        mobileScrollPosition += (targetMobileScrollPosition - mobileScrollPosition) * 0.15; // Smooth scroll
        
        // Calculate scroll offset and apply to camera pan Y
        // Calculate total height of aligned images in world coordinates
        const alignedSize = baseEmojiSize * alignedSizeMultiplier;
        // Spacing = 70% of image size (max 30% overlap)
        const verticalSpacing = alignedSize * 0.7; // 70% spacing = max 30% overlap
        const totalHeight = (alignedEmojis.length - 1) * verticalSpacing;
        const maxScrollOffset = Math.max(0, totalHeight - canvas.height + 300); // Max scroll distance
        const scrollOffset = mobileScrollPosition * maxScrollOffset;
        
        // Apply scroll offset to camera pan Y (negative because scrolling down moves content up)
        targetCameraPanY = -scrollOffset;
        cameraPanY += (targetCameraPanY - cameraPanY) * panSmoothness;
        
        // Update scroll indicator visibility
        if (performance.now() > scrollIndicatorFadeTime && !isMobileScrolling) {
            scrollIndicatorVisible = false;
        }
    } else {
        scrollIndicatorVisible = false;
        
        // Smooth camera pan interpolation with inertia (desktop only when not in mobile aligned mode)
        // Only apply smooth interpolation if not currently dragging (dragging uses direct update)
        if (!isDragging) {
            // Apply velocity-based inertia when not dragging (only if there's significant velocity)
            if (Math.abs(panVelocityX) > 0.1 || Math.abs(panVelocityY) > 0.1) {
                const inertiaStrength = 6; // Reduced multiplier for smoother, less aggressive inertia
                targetCameraPanX += panVelocityX * inertiaStrength;
                targetCameraPanY += panVelocityY * inertiaStrength;
                // Decay velocity over time
                panVelocityX *= 0.90;
                panVelocityY *= 0.90;
            }
            
            // Smooth interpolation towards target (only when not dragging)
            cameraPanX += (targetCameraPanX - cameraPanX) * panSmoothness;
            cameraPanY += (targetCameraPanY - cameraPanY) * panSmoothness;
        }
    }
    
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
    
    // Draw all points in a single loop (PERFORMANCE: was 2 loops, now 1)
    points.forEach(point => {
        const speed = point.layer === 'layer_1' ? layer1Speed : layer2Speed;
        
        // Animate opacity
        point.opacity += (point.targetOpacity - point.opacity) * opacitySmoothness;
        
        let x, y;
        let imageSize;
        
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
                imageSize = point.currentSize;
            } else {
                // Transitioning back to original - combine with parallax
                x = point.currentAlignedX + (offsetX * speed);
                y = point.currentAlignedY + (offsetY * speed);
                imageSize = point.currentSize;
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
            imageSize = hoverSize;
        }
        
        // Get image from cache
        const imageData = imageCache[point.imagePath];
        const img = imageData ? imageData.img : null;
        
        // PERFORMANCE: Use globalAlpha directly (more efficient than save/restore)
        // Only change globalAlpha if it's different (optimization)
        if (Math.abs(ctx.globalAlpha - point.opacity) > 0.01) {
            ctx.globalAlpha = point.opacity;
        }
        
        // Draw image if loaded, otherwise draw placeholder
        if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 && imageData) {
            // Calculate dimensions maintaining aspect ratio
            // Use imageSize as the base dimension (width or height, whichever is larger)
            let drawWidth, drawHeight;
            const aspectRatio = imageData.aspectRatio;
            
            if (aspectRatio >= 1) {
                // Landscape or square: use imageSize as width
                drawWidth = imageSize;
                drawHeight = imageSize / aspectRatio;
            } else {
                // Portrait: use imageSize as height
                drawHeight = imageSize;
                drawWidth = imageSize * aspectRatio;
            }
            
            const halfWidth = drawWidth / 2;
            const halfHeight = drawHeight / 2;
            
            try {
                ctx.drawImage(img, x - halfWidth, y - halfHeight, drawWidth, drawHeight);
            } catch (e) {
                // If drawImage fails, draw placeholder
                ctx.fillStyle = `rgba(255, 255, 255, ${point.opacity * 0.3})`;
                ctx.fillRect(x - halfWidth, y - halfHeight, drawWidth, drawHeight);
            }
        } else {
            // Fallback: draw a placeholder rectangle if image not loaded
            // Use square placeholder for missing images
            ctx.fillStyle = `rgba(255, 255, 255, ${point.opacity * 0.3})`;
            const halfSize = imageSize / 2;
            ctx.fillRect(x - halfSize, y - halfSize, imageSize, imageSize);
            
            // Draw a small "?" in the center to indicate missing image
            if (imageSize > 20) {
                ctx.fillStyle = `rgba(255, 255, 255, ${point.opacity * 0.5})`;
                ctx.font = `${Math.min(imageSize / 3, 20)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', x, y);
            }
        }
    });
    
    // Restore transform and reset globalAlpha after drawing
    ctx.restore();
    ctx.globalAlpha = 1.0;
    
    // Draw mobile scroll indicator (Apple-style, minimalistic, on the left)
    if (isMobile && alignedEmojiIndex !== null && scrollIndicatorVisible) {
        const indicatorWidth = 2.5; // Thin line
        const indicatorPadding = 8; // Padding from left edge
        const indicatorHeight = 60; // Height of the scroll indicator
        const indicatorMinY = 50; // Minimum Y position (top padding)
        const indicatorMaxY = canvas.height - 50 - indicatorHeight; // Maximum Y position
        
        // Calculate indicator position based on scroll position
        const indicatorY = indicatorMinY + (mobileScrollPosition * (indicatorMaxY - indicatorMinY));
        
        // Draw scroll indicator with fade effect (Apple-style: rounded corners, subtle)
        const fadeOpacity = Math.min(1.0, (scrollIndicatorFadeTime - performance.now()) / 1000);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * fadeOpacity})`; // Semi-transparent white, subtle
        
        // Draw rounded rectangle (Apple-style minimalistic) - simple rounded rect
        const radius = 1.25;
        ctx.beginPath();
        ctx.moveTo(indicatorPadding + radius, indicatorY);
        ctx.lineTo(indicatorPadding + indicatorWidth - radius, indicatorY);
        ctx.quadraticCurveTo(indicatorPadding + indicatorWidth, indicatorY, indicatorPadding + indicatorWidth, indicatorY + radius);
        ctx.lineTo(indicatorPadding + indicatorWidth, indicatorY + indicatorHeight - radius);
        ctx.quadraticCurveTo(indicatorPadding + indicatorWidth, indicatorY + indicatorHeight, indicatorPadding + indicatorWidth - radius, indicatorY + indicatorHeight);
        ctx.lineTo(indicatorPadding + radius, indicatorY + indicatorHeight);
        ctx.quadraticCurveTo(indicatorPadding, indicatorY + indicatorHeight, indicatorPadding, indicatorY + indicatorHeight - radius);
        ctx.lineTo(indicatorPadding, indicatorY + radius);
        ctx.quadraticCurveTo(indicatorPadding, indicatorY, indicatorPadding + radius, indicatorY);
        ctx.closePath();
        ctx.fill();
    }
}

// Animation loop
function animate() {
    draw();
    requestAnimationFrame(animate);
}

// Back button functionality
function updateBackButtonVisibility() {
    const backButton = document.getElementById('backButton');
    if (!backButton) return;
    
    // Show back button when images are aligned (both mobile and desktop)
    if (alignedEmojiIndex !== null) {
        backButton.style.display = 'flex';
    } else {
        backButton.style.display = 'none';
    }
}

// Initialize back button after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            unalignEmojis();
        });
    }
});

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
