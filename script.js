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
const hoverZoom = 1.0 + (2.0 - 1.0) / 3.0; // Zoom factor on hover (smaller zoom in: 1.33x instead of 2.0x)
const hoverZoomTransitionDuration = 500; // Transition duration in milliseconds (0.5 seconds)
const alignmentAnimationDuration = 1250; // Animation duration in milliseconds (1.25 seconds)
const alignedSizeMultiplier = 7.0; // Size multiplier when aligned (7x larger)
const panSmoothness = 0.18; // Smoothness factor for camera pan interpolation (more responsive, less laggy)
// Opacity transition: fade to 0 (invisible) in 1 second
// Exponential decay: current += (target - current) * smoothness
// To reach ~0.01 in 1 second (60 frames): (1 - smoothness)^60 ≈ 0.01
// smoothness ≈ 0.075 for approximately 1 second fade
const opacitySmoothness = 0.08; // Fades to ~0 in approximately 1 second at 60fps

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

// Filter state
let currentFilterTag = null; // null = no filter, otherwise the tag to filter by
let filteredImages = []; // Array of filtered image points
let isFilterMode = false; // Whether we're in filter mode
let isWeAreMode = false; // Whether we're in "We are" mode

// Zoom focal point (for mouse-relative zoom)
let zoomFocalPointX = 0; // Screen X coordinate of zoom focal point
let zoomFocalPointY = 0; // Screen Y coordinate of zoom focal point

// Mobile vertical scroll state
let mobileScrollPosition = 0; // Current scroll position (0 = top, 1 = bottom)
let targetMobileScrollPosition = 0; // Target scroll position
let isMobileScrolling = false; // Whether user is currently scrolling
let scrollIndicatorVisible = false; // Whether scroll indicator is visible
let scrollIndicatorFadeTime = 0; // Time when scroll indicator should fade

// Image list - use images from "Imgae test " directory (all unique images)
const imagePaths = [
    'Imgae test /2gis/14.png',
    'Imgae test /2gis/45.png',
    'Imgae test /2gis/53.png',
    'Imgae test /Concepts/photo_2022-09-11_21-38-30.jpg',
    'Imgae test /Concepts/photo_2022-09-11_21-38-31.jpg',
    'Imgae test /Justice/21.png',
    'Imgae test /Justice/Screenshot 2024-09-20 at 12.34.55.png',
    'Imgae test /Justice/Screenshot 2024-09-20 at 12.50.27.png',
    'Imgae test /Justice/Screenshot 2024-09-20 at 13.11.11-2.png',
    'Imgae test /Justice/Screenshot 2024-11-24 at 20.39.01-2.png',
    'Imgae test /Justice/Screenshot 2024-11-24 at 20.40.26-2.png',
    'Imgae test /Kedrina/kedr.jpg',
    'Imgae test /Kedrina/kedr2.jpg',
    'Imgae test /Kedrina/kedr3.jpg',
    'Imgae test /Kedrina/photo_2021-08-07_21-17-07.jpg',
    'Imgae test /Mirage Cinema/pasted-image-2.png',
    'Imgae test /Mirage Cinema/pasted-image.png',
    'Imgae test /Mirage Cinema/photo_2627@28-07-2021_12-20-48.jpg',
    'Imgae test /Mirage Cinema/photo_2659@07-08-2021_22-14-26.jpg',
    'Imgae test /New star camp/25.png',
    'Imgae test /New star camp/37.png',
    'Imgae test /New star camp/fin4.png',
    'Imgae test /New star camp/fin6.png',
    'Imgae test /Nina kravitz/god_rays11.png',
    'Imgae test /Nina kravitz/god_rays6.png',
    'Imgae test /Nina kravitz/photo_2022-11-11_15-44-50.jpg',
    'Imgae test /Nina kravitz/photo_2022-11-11_15-45-01.jpg',
    'Imgae test /Nina kravitz/photo_2022-11-11_15-45-02.jpg',
    'Imgae test /Nina kravitz/photo_2022-11-11_15-45-04.jpg',
    'Imgae test /Nina kravitz/photo_2022-11-12_14-26-35.jpg',
    'Imgae test /Nina kravitz/photo_2022-11-12_18-19-42.jpg',
    'Imgae test /Nina kravitz/photo_3809@11-11-2022_13-44-50.jpg',
    'Imgae test /Nina kravitz/photo_3812@11-11-2022_13-45-04_thumb.jpg',
    'Imgae test /Nina kravitz/photo_3814@12-11-2022_12-26-35.jpg',
    'Imgae test /Potato head bali/oli1 (2)-filtered.png',
    'Imgae test /Potato head bali/photo_3830@13-11-2022_17-43-34-filtered.jpeg',
    'Imgae test /Spatial design koridor/photo_2022-06-17_15-23-43.jpg',
    'Imgae test /Spatial design koridor/photo_2022-06-17_15-23-51.jpg',
    'Imgae test /Spatial design koridor/taktik0001.jpg',
    'Imgae test /Spatial design koridor/taktik0003.jpg',
    'Imgae test /Spatial design koridor/taktik0004.jpg',
    'Imgae test /Telegraph/13-denoise.png',
    'Imgae test /Telegraph/Screenshot 2024-02-29 at 19.46.48.png',
    'Imgae test /belgium institution ? /photo_2022-08-25_12-45-14.jpg',
    'Imgae test /belgium institution ? /photo_2022-08-25_12-45-28.jpg',
    'Imgae test /belgium institution ? /photo_2022-08-25_12-45-30.jpg',
    'Imgae test /belgium institution ? /photo_2022-08-25_16-07-59.jpg',
    'Imgae test /belgium institution ? /photo_2022-08-26_12-24-51.jpg',
    'Imgae test /fixtures decoratif/photo_2022-09-11_20-12-15.jpg',
    'Imgae test /gate/Screenshot 2024-11-24 at 20.45.22.png',
    'Imgae test /gate/Screenshot 2024-11-24 at 20.47.07.png',
    'Imgae test /gula merah/gula2.jpg',
    'Imgae test /gula merah/photo_2022-08-12_13-03-47.jpg',
    'Imgae test /gula merah/photo_2022-08-12_13-03-54.jpg',
    'Imgae test /la fleurs/fleurs4.png',
    'Imgae test /la fleurs/hhhpng.png',
    'Imgae test /la fleurs/ppp4.png',
    'Imgae test /la fleurs/ppp5.png',
    'Imgae test /mirag club/photo_2022-08-04_18-43-59.jpg',
    'Imgae test /missoni/11.png',
    'Imgae test /missoni/17.png',
    'Imgae test /missoni/19.png',
    'Imgae test /missoni/20.png',
    'Imgae test /missoni/4.png',
    'Imgae test /port/blue-lockers1.png',
    'Imgae test /port/full_farsh copy.png',
    'Imgae test /port/port - stage 3.jpg',
    'Imgae test /port/port - stage 6.jpg',
    'Imgae test /port/port - stage 7 .jpg',
    'Imgae test /port/port - stage2.jpg',
    'Imgae test /port/port stage 9 .jpg',
    'Imgae test /port/port-stage 8 .jpg',
    'Imgae test /port/port-stage.jpg',
    'Imgae test /port/red_min.png',
    'Imgae test /port/stage concept.jpg',
    'Imgae test /thresholds/Screenshot 2024-11-24 at 22.18.45.png',
    'Imgae test /thresholds/Screenshot 2024-11-24 at 22.21.12.png',
    'Imgae test /thresholds/liminal8.png',
    'Imgae test /torus/Screenshot 2024-06-07 at 03.09.29.png',
    'Imgae test /torus/Screenshot 2024-06-07 at 03.36.29.png',
    'Imgae test /torus/untitled11.png',
    'Imgae test /torus/untitled16.png',
    'Imgae test /torus/untitled18.png',
    'Imgae test /torus/untitled19.png',
    'Imgae test /tower building/19.png',
    'Imgae test /tower building/2.png',
    'Imgae test /tower building/22.jpg',
    'Imgae test /tower building/4.png',
    'Imgae test /tower building/5.png',
    'Imgae test /tower building/v2_smallCube_lights.png',
    'Imgae test /wish circles/Screenshot 2024-11-24 at 20.45.35.png',
    'Imgae test /wish circles/Screenshot 2024-11-24 at 22.02.56.png',
    'Imgae test /yndx interactive zone/11.png',
    'Imgae test /yndx interactive zone/14.png',
    'Imgae test /yndx interactive zone/2.png'
];

// Image cache - stores loaded Image objects
const imageCache = {};
let imagesLoaded = 0;
let totalImages = 0;

// Loading text variables
let allWordsVisible = false;
let visibleWordsCount = 0;
let totalWords = 0;

// Initialize loading text animation
function initLoadingText() {
    const loadingTextEl = document.getElementById('loadingText');
    if (!loadingTextEl) {
        console.error('loadingText element not found!');
        return;
    }
    
    const text = "Welcome to Spatial Playground";
    // Split by space - ВАЖНО: не фильтруем, просто разбиваем
    const words = text.split(' ');
    // Убираем пустые строки ТОЛЬКО после split
    const filteredWords = words.filter(w => w.length > 0);
    totalWords = filteredWords.length;
    visibleWordsCount = 0;
    allWordsVisible = false;
    
    console.log('Initializing loading text:', text);
    console.log('Total words:', totalWords);
    console.log('Filtered words array:', filteredWords);
    console.log('Original split:', words);
    
    // Clear and prepare container
    loadingTextEl.innerHTML = '';
    
    // Create word elements - КАЖДОЕ слово отдельно, ВКЛЮЧАЯ "Spatial"
    filteredWords.forEach((word, index) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        wordSpan.textContent = word;
        // НЕ устанавливаем inline opacity - используем только CSS
        loadingTextEl.appendChild(wordSpan);
        
        console.log(`Created word ${index + 1}/${totalWords}: "${word}"`);
        
        // Animate word appearance with 0.6s delay per word
        setTimeout(() => {
            // Добавляем класс visible - CSS transition сработает
            wordSpan.classList.add('visible');
            visibleWordsCount++;
            
            console.log(`Word ${index + 1}/${totalWords} "${word}" - class "visible" added, count: ${visibleWordsCount}/${totalWords}`);
            
            // Check if all words are now visible
            if (visibleWordsCount >= totalWords) {
                // Даем время для CSS transition (0.6s)
                setTimeout(() => {
                    allWordsVisible = true;
                    console.log('All words are now visible!', { totalWords, visibleWordsCount, allWords: filteredWords });
                    checkIfReadyToShowImages();
                }, 650); // Немного больше чем transition duration
            }
        }, index * 600); // 0.6 seconds per word
    });
}

// Check if ready to show images (both words and images must be ready)
function checkIfReadyToShowImages() {
    if (allWordsVisible && imagesLoaded >= totalImages) {
        hideLoadingIndicator();
    }
}

// Hide loading indicator and show canvas
let loadingComplete = false;
function hideLoadingIndicator() {
    if (loadingComplete) return;
    loadingComplete = true;
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
        setTimeout(() => {
            if (loadingIndicator.parentNode) {
                loadingIndicator.parentNode.removeChild(loadingIndicator);
            }
        }, 1000);
    }
    
    if (canvas) {
        canvas.classList.add('images-loaded');
    }
}

// Load all images with better error handling
function loadImages() {
    // Start loading text animation FIRST
    initLoadingText();
    const uniquePaths = [...new Set(imagePaths)]; // Remove duplicates
    const pathsToLoad = uniquePaths; // Load all images, no limit
    totalImages = pathsToLoad.length;
    imagesLoaded = 0;
    
    if (pathsToLoad.length === 0) {
        console.warn('No image paths to load.');
        return;
    }
    
    pathsToLoad.forEach((path, index) => {
        const loadImage = (retryCount = 0) => {
            const img = new Image();
            img.onload = () => {
                // Store image dimensions for aspect ratio calculation
                imageCache[path] = {
                    img: img,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    aspectRatio: img.naturalWidth / img.naturalHeight,
                    error: false
                };
                imagesLoaded++;
                console.log(`Loaded image ${imagesLoaded}/${totalImages}: ${path} (${img.naturalWidth}x${img.naturalHeight})`);
                if (imagesLoaded >= totalImages) {
                    const successful = Object.values(imageCache).filter(c => c && !c.error).length;
                    console.log(`All images processed: ${successful}/${totalImages} loaded successfully, ${totalImages - successful} failed`);
                    checkIfReadyToShowImages();
                }
            };
            img.onerror = (error) => {
                if (retryCount < 2) {
                    // Retry up to 2 times
                    console.warn(`Retrying load (${retryCount + 1}/2): ${path}`);
                    setTimeout(() => loadImage(retryCount + 1), 500);
                } else {
                    // Final failure - don't store in cache, just skip it
                    console.error(`Failed to load image after 3 attempts: ${path}`);
                    // Don't add to cache - this way failed images won't be drawn
                    imagesLoaded++;
                    if (imagesLoaded >= totalImages) {
                        const successful = Object.values(imageCache).filter(c => c && !c.error).length;
                        console.log(`Finished loading: ${successful}/${totalImages} images loaded successfully, ${totalImages - successful} failed`);
                        checkIfReadyToShowImages();
                    }
                }
            };
            // Don't set crossOrigin for local file:// protocol - it causes CORS errors
            // Only set it if using http/https protocol
            if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
                img.crossOrigin = 'anonymous';
            }
            img.src = path;
        };
        loadImage();
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
    
    // Create a shuffled array of unique images to avoid duplicates
    const shuffledImages = [...imagePaths];
    // Fisher-Yates shuffle
    for (let i = shuffledImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
    }
    
    let imageIndexCounter = 0; // Track which image we're using
    const usedImages = new Set(); // Track which images have been successfully placed
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let validPoint = false;
        let point;
        let currentImagePath = null;
        
        while (!validPoint && attempts < maxAttempts) {
            // Find next unused image (skip ones already used)
            let imageIndex;
            let attemptsToFindImage = 0;
            do {
                imageIndex = imageIndexCounter % shuffledImages.length;
                currentImagePath = shuffledImages[imageIndex];
                imageIndexCounter++;
                attemptsToFindImage++;
                // If we've checked all images and they're all used, reset and start over
                if (attemptsToFindImage > shuffledImages.length) {
                    usedImages.clear();
                    attemptsToFindImage = 0;
                    imageIndexCounter = 0;
                    imageIndex = 0;
                    currentImagePath = shuffledImages[0];
                    imageIndexCounter++;
                }
            } while (usedImages.has(currentImagePath) && attemptsToFindImage <= shuffledImages.length);
            
            const imagePath = currentImagePath;
            
            // Get folder path for grouping (handle images in root folder)
            let folderPath = imagePath.substring(0, imagePath.lastIndexOf('/'));
            // If no '/' found, it's in root - use 'Imgae test ' as folder
            if (folderPath === imagePath || folderPath === '') {
                folderPath = 'Imgae test ';
            }
            point = {
                x: Math.random() * box.width + box.x,
                y: Math.random() * box.height + box.y,
                baseX: 0, // Will be set after generation
                baseY: 0, // Will be set after generation
                originalBaseX: 0, // Store original position (never modified)
                originalBaseY: 0, // Store original position (never modified)
                layer: (i % 2 === 0) ? 'layer_1' : 'layer_2', // odd points (1st, 3rd, 5th...) = layer_1, even points (2nd, 4th, 6th...) = layer_2
                imagePath: imagePath,
                folderPath: folderPath, // Store folder path for grouping
                emojiIndex: imageIndexCounter, // Unique index for each point
                isAligned: false,
                isFiltered: false,
                filteredFolder: null,
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
                startSize: 0, // Starting size for animation
                hoverSize: 1.0, // Current hover size multiplier (animated)
                isHovered: false, // Current hover state
                hoverStartTime: 0 // Start time for hover zoom transition
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
        
        if (validPoint && currentImagePath) {
            // Mark this image as used to prevent duplicates
            usedImages.add(currentImagePath);
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
    point.hoverSize = 1.0;
    point.isHovered = false;
    point.hoverStartTime = 0;
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
    
    // Handle clicks in filter mode
    if (isFilterMode) {
        if (clickedPoint && clickedPoint.isFiltered) {
            handleFilteredImageClick(clickedPoint);
            e.preventDefault();
            return;
        } else if (!clickedPoint) {
            // Allow dragging in filter mode when clicking empty space
            isDragging = true;
            lastDragX = mouseX;
            lastDragY = mouseY;
            canvas.style.cursor = 'grabbing';
            return;
        }
    }
    
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
        // Normal click on image (only when nothing is aligned or filtered)
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

// Mouse wheel handler (zoom) - smooth, gradual, mouse-relative zoom in selection/filter mode
function handleWheel(e) {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Store zoom focal point for smooth interpolation in draw loop
    zoomFocalPointX = mouseX;
    zoomFocalPointY = mouseY;
    
    // If in image selection mode or filter mode, use smooth gradual zoom towards mouse position
    if (alignedEmojiIndex !== null || isFilterMode) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Calculate world position under mouse cursor (using current zoom)
        const worldX = ((mouseX - centerX - cameraPanX) / globalZoomLevel) + centerX;
        const worldY = ((mouseY - centerY - cameraPanY) / globalZoomLevel) + centerY;
        
        // Smooth gradual zoom: use exponential scaling based on scroll delta
        // Negative deltaY = zoom in, positive = zoom out
        // Use a smaller factor for more gradual zoom
        const zoomSensitivity = 0.01; // Adjust for zoom speed (higher = more responsive)
        const zoomDelta = -e.deltaY * zoomSensitivity;
        
        // Calculate target zoom level (exponential scaling for natural feel)
        let newTargetZoom = targetZoomLevel * (1.0 + zoomDelta);
        
        // Clamp to min/max zoom
        newTargetZoom = Math.max(minZoom, Math.min(maxZoom, newTargetZoom));
        
        // If zoom didn't change (hit limit), don't update
        if (Math.abs(newTargetZoom - targetZoomLevel) < 0.001) {
            return;
        }
        
        // Update target zoom (will be smoothly interpolated in draw loop)
        targetZoomLevel = newTargetZoom;
        isZoomTransitioning = false; // Disable discrete zoom transition, use smooth interpolation
        
        // Calculate target camera pan to keep world position under mouse at same screen position
        // This will be smoothly interpolated as zoom changes
        const targetPanX = mouseX - centerX - (worldX - centerX) * newTargetZoom;
        const targetPanY = mouseY - centerY - (worldY - centerY) * newTargetZoom;
        
        // Update target pan (will be smoothly interpolated)
        targetCameraPanX = targetPanX;
        targetCameraPanY = targetPanY;
        
        // Update currentZoomIndex to closest discrete level (for compatibility)
        let closestIndex = 0;
        let minDiff = Math.abs(zoomLevels[0] - newTargetZoom);
        for (let i = 1; i < zoomLevels.length; i++) {
            const diff = Math.abs(zoomLevels[i] - newTargetZoom);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }
        currentZoomIndex = closestIndex;
    } else {
        // Normal zoom (not in selection mode) - discrete levels from center
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
        
        if (point.isAligned || point.isFiltered) {
            x = point.isFiltered ? point.currentAlignedX : point.currentAlignedX;
            y = point.isFiltered ? point.currentAlignedY : point.currentAlignedY;
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

// Handle emoji click - align all emojis from same folder
function handleEmojiClick(clickedPoint) {
    // Only handle alignment if nothing is currently aligned (unaligning is handled by mouseDown)
    // Align all emojis from the same folder
    let clickedFolderPath = clickedPoint.folderPath;
    if (!clickedFolderPath) {
        clickedFolderPath = clickedPoint.imagePath.substring(0, clickedPoint.imagePath.lastIndexOf('/'));
        // If no '/' found, it's in root - use 'Imgae test ' as folder
        if (clickedFolderPath === clickedPoint.imagePath || clickedFolderPath === '') {
            clickedFolderPath = 'Imgae test ';
        }
    }
    
    alignedEmojiIndex = clickedPoint.emojiIndex; // Keep for compatibility
    alignedEmojis = points.filter(p => {
        let pFolder = p.folderPath;
        if (!pFolder) {
            pFolder = p.imagePath.substring(0, p.imagePath.lastIndexOf('/'));
            // If no '/' found, it's in root - use 'Imgae test ' as folder
            if (pFolder === p.imagePath || pFolder === '') {
                pFolder = 'Imgae test ';
            }
        }
        return pFolder === clickedFolderPath;
    });
    
    // Also find all images from the folder that might not be in points yet
    // (in case we have more images than points)
    const allImagesFromFolder = imagePaths.filter(path => {
        let pathFolder = path.substring(0, path.lastIndexOf('/'));
        if (pathFolder === path || pathFolder === '') {
            pathFolder = 'Imgae test ';
        }
        return pathFolder === clickedFolderPath;
    });
    
    // Add any images from folder that aren't in points yet
    allImagesFromFolder.forEach(path => {
        const alreadyInPoints = points.some(p => p.imagePath === path);
        if (!alreadyInPoints) {
            // Create a temporary point for this image (will be added to alignedEmojis but not points)
            const tempPoint = {
                imagePath: path,
                folderPath: clickedFolderPath,
                isAligned: true,
                currentAlignedX: 0,
                currentAlignedY: 0,
                currentSize: baseEmojiSize * alignedSizeMultiplier,
                targetX: 0,
                targetY: 0,
                targetSize: baseEmojiSize * alignedSizeMultiplier,
                targetOpacity: 1.0,
                originalBaseX: 0,
                originalBaseY: 0,
                emojiIndex: -1
            };
            alignedEmojis.push(tempPoint);
        }
    });
    
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
        // Desktop: Check if images fit in one line, otherwise use grid
        const padding = 80; // Padding on each side (in screen coordinates)
        const availableScreenWidth = canvas.width - (padding * 2);
        const totalEmojisAfterFolder = alignedEmojis.length;
        const totalWidthForLine = (totalEmojisAfterFolder - 1) * minSpacing + alignedSize;
        const requiredZoomForLine = availableScreenWidth / totalWidthForLine;
        
        // Check if all images fit in one line (check if smallest zoom level fits)
        const canFitInLine = requiredZoomForLine >= zoomLevels[0];
        
        if (canFitInLine) {
            // Single horizontal line - fits on screen
            const totalWidthAfterFolder = (totalEmojisAfterFolder - 1) * minSpacing;
            const startXAfterFolder = centerX - totalWidthAfterFolder / 2;
            
            alignedEmojis.forEach((point, index) => {
                point.isAligned = true;
                point.targetX = startXAfterFolder + (index * minSpacing);
                point.targetY = centerY; // Horizontal line at center Y (world coords)
                point.targetSize = alignedSize; // Set target size for smooth transition
                point.targetOpacity = 1.0; // Selected emojis remain fully visible
                // Initialize animation start values
                if (point.startX === undefined) {
                    point.startX = point.currentAlignedX || point.originalBaseX || 0;
                    point.startY = point.currentAlignedY || point.originalBaseY || 0;
                    point.startSize = point.currentSize || baseEmojiSize;
                    point.currentAlignedX = point.startX;
                    point.currentAlignedY = point.startY;
                    point.currentSize = point.startSize;
                } else {
                    point.startX = point.currentAlignedX;
                    point.startY = point.currentAlignedY;
                    point.startSize = point.currentSize;
                }
                point.alignmentStartTime = performance.now();
            });
            
            // Calculate zoom level to fit the horizontal line width on screen
            const totalSpanWidth = totalWidthAfterFolder + alignedSize;
            const requiredZoom = availableScreenWidth / totalSpanWidth;
            
            // Find the largest zoom level that ensures all emojis fit
            let bestIndex = 0;
            for (let i = zoomLevels.length - 1; i >= 0; i--) {
                if (zoomLevels[i] <= requiredZoom) {
                    bestIndex = i;
                    break;
                }
            }
            
            currentZoomIndex = bestIndex;
            startZoomTransition();
            targetCameraPanX = 0;
            targetCameraPanY = 0;
        } else {
            // Grid layout - too many images for one line
            const gridCols = Math.ceil(Math.sqrt(totalEmojisAfterFolder));
            const gridRows = Math.ceil(totalEmojisAfterFolder / gridCols);
            const gap = 50; // Gap between images
            const totalGridWidth = (gridCols - 1) * (alignedSize + gap);
            const totalGridHeight = (gridRows - 1) * (alignedSize + gap);
            const startXGrid = centerX - totalGridWidth / 2;
            const startYGrid = centerY - totalGridHeight / 2;
            
            alignedEmojis.forEach((point, index) => {
                const row = Math.floor(index / gridCols);
                const col = index % gridCols;
                
                point.isAligned = true;
                point.targetX = startXGrid + col * (alignedSize + gap);
                point.targetY = startYGrid + row * (alignedSize + gap);
                point.targetSize = alignedSize;
                point.targetOpacity = 1.0;
                // Initialize animation start values
                if (point.startX === undefined) {
                    point.startX = point.currentAlignedX || point.originalBaseX || 0;
                    point.startY = point.currentAlignedY || point.originalBaseY || 0;
                    point.startSize = point.currentSize || baseEmojiSize;
                    point.currentAlignedX = point.startX;
                    point.currentAlignedY = point.startY;
                    point.currentSize = point.startSize;
                } else {
                    point.startX = point.currentAlignedX;
                    point.startY = point.currentAlignedY;
                    point.startSize = point.currentSize;
                }
                point.alignmentStartTime = performance.now();
            });
            
            // Calculate zoom to fit grid
            const maxSpan = Math.max(totalGridWidth + alignedSize, totalGridHeight + alignedSize);
            const availableSpace = Math.min(canvas.width - padding * 2, canvas.height - padding * 2);
            const requiredZoom = availableSpace / maxSpan;
            
            // Find the largest zoom level that ensures grid fits
            let bestIndex = 0;
            for (let i = zoomLevels.length - 1; i >= 0; i--) {
                if (zoomLevels[i] <= requiredZoom) {
                    bestIndex = i;
                    break;
                }
            }
            
            currentZoomIndex = bestIndex;
            startZoomTransition();
            targetCameraPanX = 0;
            targetCameraPanY = 0;
        }
    }
    
    // Set opacity for non-selected images to fade to 0 (completely invisible) in 1 second
    points.forEach(p => {
        let pFolder = p.folderPath;
        if (!pFolder) {
            pFolder = p.imagePath.substring(0, p.imagePath.lastIndexOf('/'));
            if (pFolder === p.imagePath || pFolder === '') {
                pFolder = 'Imgae test ';
            }
        }
        if (pFolder !== clickedFolderPath) {
            p.targetOpacity = 0.0; // Fade to completely invisible
        } else {
            p.targetOpacity = 1.0; // Ensure images from same folder are fully visible
        }
    });
    
    // Update back button visibility
    updateBackButtonVisibility();
}

// Filter functions
function filterByTag(tag) {
    // Clear any existing alignment first
    if (alignedEmojiIndex !== null) {
        unalignEmojis();
    }
    
    if (currentFilterTag === tag) {
        // If clicking the same tag, clear filter
        clearFilter();
        return;
    }
    
    currentFilterTag = tag;
    isFilterMode = true;
    
    // Find all images matching the tag
    // Tags can be in filename or folder name
    filteredImages = points.filter(point => {
        const pathLower = point.imagePath.toLowerCase();
        const folderLower = (point.folderPath || '').toLowerCase();
        
        // Check for tag patterns: _stage, _install, _tech, _concept
        // Also check folder names and filenames containing tag words
        const tagPattern = `_${tag}`;
        const tagWord = tag === 'stage' ? 'stage' : 
                       tag === 'install' ? 'install' : 
                       tag === 'tech' ? 'tech' : 
                       tag === 'concept' ? 'concept' : tag;
        
        return pathLower.includes(tagPattern) || 
               pathLower.includes(tagWord) || 
               folderLower.includes(tagWord);
    });
    
    if (filteredImages.length === 0) {
        console.warn(`No images found with tag: ${tag}`);
        clearFilter();
        return;
    }
    
    // Calculate grid layout
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const gridCols = Math.ceil(Math.sqrt(filteredImages.length));
    const gridRows = Math.ceil(filteredImages.length / gridCols);
    
    const imageSize = baseEmojiSize;
    const gap = 50; // Gap between images
    const totalWidth = (gridCols - 1) * (imageSize + gap);
    const totalHeight = (gridRows - 1) * (imageSize + gap);
    
    const startX = centerX - totalWidth / 2;
    const startY = centerY - totalHeight / 2;
    
    // Position filtered images in grid
    filteredImages.forEach((point, index) => {
        const row = Math.floor(index / gridCols);
        const col = index % gridCols;
        
        point.isFiltered = true;
        point.targetX = startX + col * (imageSize + gap);
        point.targetY = startY + row * (imageSize + gap);
        point.targetSize = imageSize;
        point.targetOpacity = 1.0;
        point.startX = point.currentAlignedX || point.originalBaseX;
        point.startY = point.currentAlignedY || point.originalBaseY;
        point.startSize = point.currentSize;
        point.alignmentStartTime = performance.now();
        point.filteredFolder = point.imagePath.substring(0, point.imagePath.lastIndexOf('/'));
    });
    
    // Fade out non-filtered images
    points.forEach(p => {
        if (!filteredImages.includes(p)) {
            p.targetOpacity = 0.0; // Fade to completely invisible
            p.isFiltered = false;
        }
    });
    
    // Calculate zoom to fit grid
    const padding = 80;
    const maxSpan = Math.max(totalWidth + imageSize, totalHeight + imageSize);
    const availableSpace = Math.min(canvas.width - padding * 2, canvas.height - padding * 2);
    const requiredZoom = availableSpace / maxSpan;
    
    // Find best zoom level
    let bestIndex = 0;
    for (let i = zoomLevels.length - 1; i >= 0; i--) {
        if (zoomLevels[i] <= requiredZoom) {
            bestIndex = i;
            break;
        }
    }
    
    currentZoomIndex = bestIndex;
    targetZoomLevel = zoomLevels[bestIndex];
    startZoomTransition();
    
    // Center camera
    targetCameraPanX = 0;
    targetCameraPanY = 0;
    
    // Update button states
    updateFilterButtons();
    updateBackButtonVisibility();
}

function clearFilter() {
    if (!isFilterMode) return;
    
    currentFilterTag = null;
    isFilterMode = false;
    
    // Restore all points to original positions
    filteredImages.forEach(point => {
        point.isFiltered = false;
        point.targetX = point.originalBaseX;
        point.targetY = point.originalBaseY;
        point.targetSize = point.layer === 'layer_1' ? baseEmojiSize : baseEmojiSize * layer2SizeMultiplier;
        point.targetOpacity = 1.0;
        point.startX = point.currentAlignedX;
        point.startY = point.currentAlignedY;
        point.startSize = point.currentSize;
        point.alignmentStartTime = performance.now();
    });
    
    filteredImages = [];
    
    // Restore opacity for all images
    points.forEach(p => {
        p.targetOpacity = 1.0;
    });
    
    // Reset camera
    currentZoomIndex = initialZoomIndex;
    startZoomTransition();
    targetCameraPanX = initialCameraPanX;
    targetCameraPanY = initialCameraPanY;
    cameraPanX = initialCameraPanX;
    cameraPanY = initialCameraPanY;
    
    updateFilterButtons();
    updateBackButtonVisibility();
}

function handleFilteredImageClick(clickedPoint) {
    if (!isFilterMode || !clickedPoint.isFiltered) return;
    
    // Get all images from the same folder
    const folderPath = clickedPoint.filteredFolder || clickedPoint.imagePath.substring(0, clickedPoint.imagePath.lastIndexOf('/'));
    const folderImages = points.filter(p => {
        const pFolder = p.imagePath.substring(0, p.imagePath.lastIndexOf('/'));
        return pFolder === folderPath;
    });
    
    if (folderImages.length === 0) return;
    
    // Clear current filter and align folder images
    clearFilter();
    
    // Align folder images (similar to handleEmojiClick)
    alignedEmojiIndex = clickedPoint.imageIndex;
    alignedEmojis = folderImages;
    
    const alignedSize = baseEmojiSize * alignedSizeMultiplier;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const totalEmojis = alignedEmojis.length;
    const horizontalGap = 35;
    const minSpacing = alignedSize + horizontalGap;
    const totalWidth = (totalEmojis - 1) * minSpacing;
    const startX = centerX - totalWidth / 2;
    
    alignedEmojis.forEach((point, index) => {
        point.isAligned = true;
        point.targetX = startX + (index * minSpacing);
        point.targetY = centerY;
        point.targetSize = alignedSize;
        point.targetOpacity = 1.0;
        point.startX = point.currentAlignedX || point.originalBaseX;
        point.startY = point.currentAlignedY || point.originalBaseY;
        point.startSize = point.currentSize;
        point.alignmentStartTime = performance.now();
    });
    
    // Set opacity for non-selected images (group by folder)
    const clickedFolderForAlignment = clickedPoint.folderPath || clickedPoint.imagePath.substring(0, clickedPoint.imagePath.lastIndexOf('/'));
    points.forEach(p => {
        const pFolder = p.folderPath || p.imagePath.substring(0, p.imagePath.lastIndexOf('/'));
        if (pFolder !== clickedFolderForAlignment) {
            p.targetOpacity = 0.0; // Fade to completely invisible
        } else {
            p.targetOpacity = 1.0;
        }
    });
    
    // Calculate zoom
    const padding = 80;
    const totalSpanWidth = totalWidth + alignedSize;
    const availableScreenWidth = canvas.width - (padding * 2);
    const requiredZoom = availableScreenWidth / totalSpanWidth;
    
    let bestIndex = 0;
    for (let i = zoomLevels.length - 1; i >= 0; i--) {
        if (zoomLevels[i] <= requiredZoom) {
            bestIndex = i;
            break;
        }
    }
    
    currentZoomIndex = bestIndex;
    startZoomTransition();
    targetCameraPanX = 0;
    targetCameraPanY = 0;
    
    updateBackButtonVisibility();
}

function updateFilterButtons() {
    const buttons = document.querySelectorAll('.filter-button');
    buttons.forEach(btn => {
        if (btn.id === 'weAreButton') return;
        const tag = btn.getAttribute('data-tag');
        if (tag === currentFilterTag) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function positionFilterButtons() {
    const buttons = document.querySelectorAll('.filter-button:not(#weAreButton)');
    const screenWidth = window.innerWidth;
    
    // Create a temporary canvas to measure text width
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = '14px Arial'; // Match button font
    
    // Measure spacebar and dash widths
    const spaceWidth = tempCtx.measureText(' ').width;
    const threeSpacesWidth = spaceWidth * 3; // 3 spacebars
    const dashText = '––––––––––'; // 8 dashes
    const dashWidth = tempCtx.measureText(dashText).width;
    const totalSpacingWidth = threeSpacesWidth + dashWidth + threeSpacesWidth; // 3 spaces + 8 dashes + 3 spaces
    
    // Find "stage design" button - it's the first one, at 1/3 from left
    const stageDesignBtn = Array.from(buttons).find(btn => btn.textContent.trim().toLowerCase() === 'stage design');
    const weAreBtn = document.getElementById('weAreButton');
    
    // Position "stage design" and other buttons starting at 1/3 from left (don't move them)
    let currentX = screenWidth / 3;
    
    buttons.forEach((btn) => {
        btn.style.left = `${currentX}px`;
        btn.style.position = 'absolute';
        btn.style.transform = 'translateX(0)';
        
        // Measure button text width and add one space for next button
        const textWidth = tempCtx.measureText(btn.textContent).width;
        currentX += textWidth + spaceWidth; // Button width + one space
    });
    
    // Position "we are" button to the left of "stage design" with: 3 spaces + 8 dashes + 3 spaces
    if (stageDesignBtn && weAreBtn) {
        const stageDesignLeft = screenWidth / 3; // Stage design is at 1/3 from left
        const weAreTextWidth = tempCtx.measureText(weAreBtn.textContent).width;
        // Position we are button so that total spacing (3 spaces + 8 dashes + 3 spaces) fits between it and stage design
        const weAreLeft = stageDesignLeft - totalSpacingWidth - weAreTextWidth;
        weAreBtn.style.left = `${weAreLeft}px`;
        weAreBtn.style.position = 'absolute';
        weAreBtn.style.right = 'auto';
        
        // Create separator element with 3 spaces + 8 dashes + 3 spaces
        const existingDash = document.getElementById('dashSeparator');
        if (existingDash) {
            existingDash.remove();
        }
        const separatorSpan = document.createElement('span');
        separatorSpan.id = 'dashSeparator';
        separatorSpan.className = 'filter-button';
        separatorSpan.textContent = '\u00A0\u00A0\u00A0' + dashText + '\u00A0\u00A0\u00A0'; // 3 non-breaking spaces + 8 dashes + 3 non-breaking spaces
        separatorSpan.style.position = 'absolute';
        separatorSpan.style.left = `${weAreLeft + weAreTextWidth}px`;
        separatorSpan.style.pointerEvents = 'none'; // Don't allow clicks on separator
        separatorSpan.style.opacity = '1';
        separatorSpan.style.color = '#fff';
        separatorSpan.style.fontSize = '14px';
        separatorSpan.style.fontFamily = 'Arial, sans-serif';
        separatorSpan.style.textTransform = 'lowercase';
        document.getElementById('filterButtons').appendChild(separatorSpan);
    }
}

// Show "We are" about text
function showWeAreAbout() {
    // Clear any existing filter/alignment first
    if (isFilterMode) {
        clearFilter();
    }
    if (alignedEmojiIndex !== null) {
        unalignEmojis();
    }
    
    // Fade out all images in 1 second
    points.forEach(p => {
        p.targetOpacity = 0.0;
    });
    
    isWeAreMode = true;
    
    // Display about text from embedded constant
    const aboutTextEl = document.getElementById('aboutText');
    if (aboutTextEl && typeof ABOUT_TEXT !== 'undefined') {
        // Format text: preserve line breaks
        aboutTextEl.innerHTML = ABOUT_TEXT.split('\n').map(line => {
            if (line.trim() === '') {
                return '<br>';
            }
            return `<p>${line}</p>`;
        }).join('');
        aboutTextEl.style.display = 'block';
        aboutTextEl.style.opacity = '0';
        // Fade in after images fade out (1 second)
        setTimeout(() => {
            aboutTextEl.style.opacity = '1';
        }, 1000);
    } else {
        console.error('About text not available or element not found');
    }
    
    // Show back button
    updateBackButtonVisibility();
}

// Clear "We are" mode
function clearWeAreMode() {
    if (!isWeAreMode) return;
    
    isWeAreMode = false;
    
    const aboutTextEl = document.getElementById('aboutText');
    if (aboutTextEl) {
        aboutTextEl.style.opacity = '0';
        setTimeout(() => {
            aboutTextEl.style.display = 'none';
        }, 500);
    }
    
    // Restore images opacity
    points.forEach(p => {
        p.targetOpacity = 1.0;
    });
    
    updateBackButtonVisibility();
}

// Draw points with parallax and emojis
function draw() {
    // IMPORTANT: Don't draw images until all words have appeared
    if (!allWordsVisible) {
        // Only draw black background while words are loading
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    // Smooth mouse position (optimized - only when not dragging for better performance)
    if (!isDragging) {
    smoothMouseX += (targetMouseX - smoothMouseX) * 0.1;
    smoothMouseY += (targetMouseY - smoothMouseY) * 0.1;
    } else {
        // Direct update while dragging for better responsiveness
        smoothMouseX = targetMouseX;
        smoothMouseY = targetMouseY;
    }
    
    // Smooth camera zoom interpolation
    if (isZoomTransitioning) {
        // Discrete zoom transition (for non-selection mode)
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
    } else if (alignedEmojiIndex !== null || isFilterMode) {
        // Smooth gradual zoom interpolation in selection/filter mode (towards mouse focal point)
        const zoomSmoothness = 0.15; // Smooth interpolation factor (adjust for speed: lower = slower/smoother)
        globalZoomLevel += (targetZoomLevel - globalZoomLevel) * zoomSmoothness;
        
        // Smoothly interpolate camera pan to keep zoom focal point fixed
        // Use stored zoom focal point (from wheel event) instead of smoothed mouse position
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Use zoom focal point (actual mouse position from wheel event)
        const focalX = zoomFocalPointX || smoothMouseX;
        const focalY = zoomFocalPointY || smoothMouseY;
        
        // Calculate world position under focal point (using current zoom)
        const worldX = ((focalX - centerX - cameraPanX) / globalZoomLevel) + centerX;
        const worldY = ((focalY - centerY - cameraPanY) / globalZoomLevel) + centerY;
        
        // Calculate target pan for current zoom level to keep focal point fixed
        const desiredPanX = focalX - centerX - (worldX - centerX) * globalZoomLevel;
        const desiredPanY = focalY - centerY - (worldY - centerY) * globalZoomLevel;
        
        // Smoothly interpolate pan
        cameraPanX += (desiredPanX - cameraPanX) * zoomSmoothness;
        cameraPanY += (desiredPanY - cameraPanY) * zoomSmoothness;
        targetCameraPanX = desiredPanX;
        targetCameraPanY = desiredPanY;
    } else {
        // Default: use discrete zoom level
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
    
    // Calculate center offset for parallax (centerX and centerY already defined above at line 1473)
    const offsetX = (smoothMouseX - centerX) * parallaxStrength;
    const offsetY = (smoothMouseY - centerY) * parallaxStrength;
    
    // Cache mouse coordinates for hover detection (calculated once per frame)
    const scaledMouseXForHover = ((smoothMouseX - centerX - cameraPanX) / globalZoomLevel) + centerX;
    const scaledMouseYForHover = ((smoothMouseY - centerY - cameraPanY) / globalZoomLevel) + centerY;
    const currentTime = performance.now(); // Cache current time to avoid repeated calls
    
    // Draw all points in a single loop (PERFORMANCE: was 2 loops, now 1)
    points.forEach(point => {
        const speed = point.layer === 'layer_1' ? layer1Speed : layer2Speed;
        
        // Animate opacity (optimized: skip if already at target)
        if (Math.abs(point.opacity - point.targetOpacity) > 0.001) {
            point.opacity += (point.targetOpacity - point.opacity) * opacitySmoothness;
        } else {
            point.opacity = point.targetOpacity;
        }
        
        let x, y;
        let imageSize;
        
        if (point.isAligned || point.isFiltered || (point.alignmentStartTime > 0 && !point.isAligned && !point.isFiltered)) {
            // Time-based smooth animation with easing (1.25 seconds duration)
            const elapsed = currentTime - point.alignmentStartTime; // Use cached time
            const progress = Math.min(elapsed / alignmentAnimationDuration, 1.0);
            
            // Smooth ease-out easing function (easeOutCubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate position and size
            point.currentAlignedX = point.startX + (point.targetX - point.startX) * easeProgress;
            point.currentAlignedY = point.startY + (point.targetY - point.startY) * easeProgress;
            point.currentSize = point.startSize + (point.targetSize - point.startSize) * easeProgress;
            
            // If aligned or filtered, use target position; otherwise transitioning back
            if (point.isAligned || point.isFiltered) {
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
                    point.isFiltered = false;
                }
            }
        } else {
            // Normal state - use original position with parallax
            x = point.originalBaseX + (offsetX * speed);
            y = point.originalBaseY + (offsetY * speed);
            
            // Smoothly animate size change
            point.currentSize += (point.targetSize - point.currentSize) * 0.1;
            
            // Check if hovered (using cached coordinates)
            const isHovered = isPointHovered(x, y, scaledMouseXForHover, scaledMouseYForHover, point.currentSize / 2);
            
            // Smooth hover zoom transition (0.5 seconds)
            if (isHovered !== point.isHovered) {
                // Hover state changed - start transition
                point.isHovered = isHovered;
                point.hoverStartTime = performance.now();
            }
            
            if (point.hoverStartTime > 0) {
                const elapsed = currentTime - point.hoverStartTime; // Use cached time
                const progress = Math.min(elapsed / hoverZoomTransitionDuration, 1.0);
                
                if (progress >= 1.0) {
                    // Transition complete
                    point.hoverSize = point.isHovered ? hoverZoom : 1.0;
                    point.hoverStartTime = 0; // Reset to avoid future calculations
                } else {
                    // Smooth ease-out easing
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    
                    if (point.isHovered) {
                        // Zooming in
                        point.hoverSize = 1.0 + (hoverZoom - 1.0) * easeProgress;
                    } else {
                        // Zooming out
                        point.hoverSize = hoverZoom + (1.0 - hoverZoom) * easeProgress;
                    }
                }
            } else {
                // Initial state - only set if changed
                const targetHoverSize = point.isHovered ? hoverZoom : 1.0;
                if (Math.abs(point.hoverSize - targetHoverSize) > 0.001) {
                    point.hoverSize = targetHoverSize;
                }
            }
            
            imageSize = point.currentSize * point.hoverSize;
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
        if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 && imageData && !imageData.error) {
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
            // Don't draw anything if image not loaded - just skip it
            // This prevents grey rectangles from appearing
        }
    });
    
    // Restore transform and reset globalAlpha after drawing
    ctx.restore();
    ctx.globalAlpha = 1.0;
    
    // Draw text blocks under aligned images (on top layer, after transform)
    if (alignedEmojiIndex !== null) {
        alignedEmojis.forEach(point => {
            if (point.isAligned) {
                // Get image dimensions
                const imageData = imageCache[point.imagePath];
                let drawWidth, drawHeight;
                
                if (imageData && imageData.img && imageData.img.complete) {
                    const aspectRatio = imageData.aspectRatio;
                    const imageSize = point.currentSize;
                    
                    if (aspectRatio >= 1) {
                        drawWidth = imageSize;
                        drawHeight = imageSize / aspectRatio;
                    } else {
                        drawHeight = imageSize;
                        drawWidth = imageSize * aspectRatio;
                    }
                } else {
                    // Fallback for missing images
                    drawWidth = point.currentSize;
                    drawHeight = point.currentSize;
                }
                
                // Calculate screen position of aligned image
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const screenX = (point.currentAlignedX - centerX) * globalZoomLevel + centerX + cameraPanX;
                const screenY = (point.currentAlignedY - centerY) * globalZoomLevel + centerY + cameraPanY;
                
                // Calculate text position (below image)
                const imageBottomY = screenY + (drawHeight / 2) * globalZoomLevel;
                const textY = imageBottomY + 10; // 10px fixed spacing below image (not scaled)
                
                // Extract text from image path (filename without extension)
                let text = point.imagePath;
                // Remove directory path
                const lastSlash = text.lastIndexOf('/');
                if (lastSlash !== -1) {
                    text = text.substring(lastSlash + 1);
                }
                // Remove file extension
                const lastDot = text.lastIndexOf('.');
                if (lastDot !== -1) {
                    text = text.substring(0, lastDot);
                }
                
                // Draw text with width equal to image width (fixed 18px, left-aligned, wraps to new lines)
                ctx.save();
                ctx.globalAlpha = 1.0;
                ctx.fillStyle = '#fff';
                
                // Fixed text size (NOT scaled) - always 18px regardless of zoom
                const textSize = 18;
                ctx.font = `${textSize}px Arial`;
                ctx.textAlign = 'left'; // Left alignment
                ctx.textBaseline = 'top';
                
                // Use actual image width in world coordinates for wrapping (not zoomed)
                // Text wraps at the same point relative to image regardless of zoom level
                const imageWorldWidth = drawWidth;
                
                // Image width in screen coordinates (for positioning)
                const imageScreenWidth = drawWidth * globalZoomLevel;
                
                // Calculate left edge of text (aligned to left edge of image)
                const textLeftX = screenX - (imageScreenWidth / 2);
                
                // Word wrap text to fit within image width (use world width converted to screen pixels)
                // Since text is fixed 18px, we need to convert world width to screen pixels for comparison
                const maxTextWidth = imageWorldWidth * globalZoomLevel;
                
                const words = text.split(' ');
                const lines = [];
                let currentLine = '';
                
                words.forEach(word => {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const metrics = ctx.measureText(testLine);
                    
                    if (metrics.width <= maxTextWidth || currentLine === '') {
                        // Word fits on current line, or it's the first word
                        currentLine = testLine;
                    } else {
                        // Word doesn't fit, start new line
                        if (currentLine) {
                            lines.push(currentLine);
                        }
                        currentLine = word;
                    }
                });
                
                // Add the last line
                if (currentLine) {
                    lines.push(currentLine);
                }
                
                // Draw each line (left-aligned, fixed 18px size)
                const lineHeight = textSize * 1.2; // Line spacing
                lines.forEach((line, index) => {
                    ctx.fillText(line, textLeftX, textY + (index * lineHeight));
                });
                
                ctx.restore();
            }
        });
    }
    
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
    
    // Show back button when images are aligned, filtered, or in "We are" mode
    if (alignedEmojiIndex !== null || isFilterMode || isWeAreMode) {
        backButton.style.display = 'flex';
    } else {
        backButton.style.display = 'none';
    }
}

// Initialize back button and filter buttons after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            if (isWeAreMode) {
                clearWeAreMode();
            } else if (isFilterMode) {
                clearFilter();
            } else {
                unalignEmojis();
            }
        });
    }
    
    // Setup filter buttons
    positionFilterButtons();
    window.addEventListener('resize', () => {
        positionFilterButtons();
    });
    
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(btn => {
        if (btn.id === 'weAreButton') {
            // Handle "we are" button - show about text
            btn.addEventListener('click', () => {
                showWeAreAbout();
            });
        } else {
            const tag = btn.getAttribute('data-tag');
            btn.addEventListener('click', () => {
                filterByTag(tag);
            });
        }
    });
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
