/**
 * Configuration constants for the 4lights gallery
 * All magic numbers and configuration values centralized here
 */

export const CONFIG = {
    // Image settings
    image: {
        baseSize: 96,                    // Base size for layer_1 images
        layer2SizeMultiplier: 1 / 1.6,   // Layer_2 is 1.6 times smaller
        hoverZoom: 2.0,                  // Zoom factor on hover
        alignedSizeMultiplier: 7.0,      // Size multiplier when aligned (7x larger)
        maxImages: 100,                  // Maximum number of images to load
    },
    
    // Animation settings
    animation: {
        alignmentDuration: 1250,         // Alignment animation duration (ms)
        opacitySmoothness: 0.0334,       // Opacity transition smoothness
        panSmoothness: 0.18,             // Camera pan interpolation smoothness
        velocityDecay: 0.85,             // Velocity decay when not dragging
        inertiaStrength: 6,              // Inertia strength multiplier
        sizeInterpolationSpeed: 0.1,     // Size change interpolation speed
        mobileScrollSmoothness: 0.15,    // Mobile scroll interpolation
        zoomSmoothness: 0.15,            // Zoom interpolation smoothness
    },
    
    // Camera settings
    camera: {
        zoomLevels: [0.5, 0.75, 1.0, 1.5, 2.0, 3.0],
        defaultZoomIndex: 2,             // Base zoom level index (1.0)
        minZoom: 0.5,
        maxZoom: 3.0,
        zoomTransitionDuration: 1500,    // Zoom transition duration (ms)
        zoomSensitivity: 0.01,           // Mouse wheel zoom sensitivity
        initialPanX: 0,
        initialPanY: 0,
    },
    
    // Point generation settings
    point: {
        count: 100,                      // Number of points to generate
        minDistance: 50,                 // Minimum distance between points (px)
        maxGenerationAttempts: 1000,     // Max attempts per point
        boundingBoxMargin: 1 / 5,        // Margin from top/bottom (1/5 of screen)
    },
    
    // Parallax settings
    parallax: {
        strength: 0.02,                  // Parallax movement strength
        layer1Speed: 1.0,                // Layer 1 parallax speed
        layer2Speed: 0.5,                // Layer 2 parallax speed (slower for depth)
        mouseSmoothness: 0.1,            // Mouse position smoothing
    },
    
    // Layout settings
    layout: {
        desktopHorizontalGap: 35,        // Gap between images on desktop (px)
        mobilePadding: 40,               // Mobile padding (px)
        mobileTopPadding: 80,            // Mobile top padding (px)
        mobileVerticalSpacing: 0.7,      // Mobile vertical spacing (70% of image size)
        desktopPadding: 80,              // Desktop padding (px)
        textSpacing: 10,                 // Text spacing below images (px)
        textSize: 18,                    // Text font size (px)
        textLineHeight: 1.2,             // Text line height multiplier
    },
    
    // Grid settings
    grid: {
        size: 25,                        // Grid cell size (px)
        opacity: 0.3,                    // Grid line opacity
        color: '#ffffff',                // Grid line color
    },
    
    // UI settings
    ui: {
        username: 'dat_girl',            // Username displayed in corner
        usernameSize: 16,                // Username font size (px)
        usernameX: 20,                   // Username X position (px)
        usernameY: 20,                   // Username Y position (px)
        scrollIndicatorWidth: 2.5,       // Scroll indicator width (px)
        scrollIndicatorPadding: 8,       // Scroll indicator padding (px)
        scrollIndicatorHeight: 60,       // Scroll indicator height (px)
        scrollIndicatorMinY: 50,         // Scroll indicator min Y (px)
        scrollIndicatorOpacity: 0.4,     // Scroll indicator opacity
        scrollIndicatorFadeDuration: 3000, // Scroll indicator fade duration (ms)
        scrollThreshold: 10,             // Scroll detection threshold (px)
        scrollSensitivity: 1.5,          // Mobile scroll sensitivity
    },
    
    // Mobile detection
    mobile: {
        breakpoint: 768,                 // Mobile breakpoint width (px)
        touchDetection: true,            // Use touch detection for mobile
    },
    
    // Image paths (fixed typo: "Imgae test" -> "Image test")
    imagePaths: [
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
    ]
};

