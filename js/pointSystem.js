/**
 * Point generation and management system
 * Handles point creation with minimum distance constraints
 */

import { CONFIG } from './config.js';
import { distance } from './utils.js';

/**
 * Calculate bounding box for point generation
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @returns {{x: number, y: number, width: number, height: number}} Bounding box
 */
export function getBoundingBox(screenWidth, screenHeight) {
    const margin = screenHeight * CONFIG.point.boundingBoxMargin;
    return {
        x: 0,
        y: margin,
        width: screenWidth,
        height: screenHeight - (margin * 2)
    };
}

/**
 * Generate points with minimum distance constraint
 * @param {number} count - Number of points to generate
 * @param {number} minDistance - Minimum distance between points
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @param {Array<string>} imagePaths - Available image paths
 * @returns {Array<Object>} Array of point objects
 */
export function generatePoints(count, minDistance, screenWidth, screenHeight, imagePaths) {
    const box = getBoundingBox(screenWidth, screenHeight);
    const points = [];
    const maxAttempts = CONFIG.point.maxGenerationAttempts;
    
    // Group images by path for consistent indexing
    const imageGroups = {};
    imagePaths.forEach((path, index) => {
        if (!imageGroups[path]) {
            imageGroups[path] = index;
        }
    });
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let validPoint = false;
        let point = null;
        
        while (!validPoint && attempts < maxAttempts) {
            const imageIndex = Math.floor(Math.random() * imagePaths.length);
            const imagePath = imagePaths[imageIndex];
            
            point = {
                x: Math.random() * box.width + box.x,
                y: Math.random() * box.height + box.y,
                baseX: 0,           // Will be set after validation
                baseY: 0,           // Will be set after validation
                originalBaseX: 0,   // Original position (never modified)
                originalBaseY: 0,   // Original position (never modified)
                layer: (i % 2 === 0) ? 'layer_1' : 'layer_2',
                imagePath: imagePath,
                imageIndex: imageGroups[imagePath] || imageIndex,
                isAligned: false,
                targetX: 0,
                targetY: 0,
                currentAlignedX: 0,
                currentAlignedY: 0,
                targetSize: 0,
                currentSize: 0,
                opacity: 1.0,
                targetOpacity: 1.0,
                alignmentStartTime: 0,
                startX: 0,
                startY: 0,
                startSize: 0
            };
            
            validPoint = true;
            
            // Check distance to all existing points
            for (let j = 0; j < points.length; j++) {
                const dist = distance(point.x, point.y, points[j].x, points[j].y);
                if (dist < minDistance) {
                    validPoint = false;
                    break;
                }
            }
            
            attempts++;
        }
        
        if (validPoint && point) {
            // Store base position and original position
            point.baseX = point.x;
            point.baseY = point.y;
            point.originalBaseX = point.x;
            point.originalBaseY = point.y;
            point.currentAlignedX = point.x;
            point.currentAlignedY = point.y;
            point.alignmentStartTime = 0;
            point.startX = point.x;
            point.startY = point.y;
            point.startSize = 0; // Will be set after initialization
            points.push(point);
        }
    }
    
    return points;
}

/**
 * Initialize point sizes based on layer
 * @param {Array<Object>} points - Array of point objects
 */
export function initializePointSizes(points) {
    points.forEach(point => {
        if (point.layer === 'layer_1') {
            point.targetSize = CONFIG.image.baseSize;
            point.currentSize = CONFIG.image.baseSize;
            point.startSize = CONFIG.image.baseSize;
        } else {
            const layer2Size = CONFIG.image.baseSize * CONFIG.image.layer2SizeMultiplier;
            point.targetSize = layer2Size;
            point.currentSize = layer2Size;
            point.startSize = layer2Size;
        }
        point.opacity = 1.0;
        point.targetOpacity = 1.0;
    });
}

/**
 * Check if a point is hovered
 * @param {number} pointX - Point X coordinate
 * @param {number} pointY - Point Y coordinate
 * @param {number} mouseX - Mouse X coordinate
 * @param {number} mouseY - Mouse Y coordinate
 * @param {number} size - Point size
 * @returns {boolean} True if hovered
 */
export function isPointHovered(pointX, pointY, mouseX, mouseY, size) {
    return distance(pointX, pointY, mouseX, mouseY) < size / 2;
}

/**
 * Find point at mouse position (for click detection)
 * @param {number} mouseX - Mouse X coordinate (world space)
 * @param {number} mouseY - Mouse Y coordinate (world space)
 * @param {Array<Object>} points - Array of points
 * @param {number} parallaxStrength - Parallax strength
 * @param {number} layer1Speed - Layer 1 parallax speed
 * @param {number} layer2Speed - Layer 2 parallax speed
 * @param {number} centerX - World center X
 * @param {number} centerY - World center Y
 * @param {number} smoothMouseX - Smooth mouse X (screen space)
 * @param {number} smoothMouseY - Smooth mouse Y (screen space)
 * @param {number} baseSize - Base image size
 * @param {number} layer2SizeMultiplier - Layer 2 size multiplier
 * @param {number} alignedSizeMultiplier - Aligned size multiplier
 * @returns {Object|null} Closest point or null
 */
export function findPointAtMouse(
    mouseX, mouseY, points, parallaxStrength, layer1Speed, layer2Speed,
    centerX, centerY, smoothMouseX, smoothMouseY,
    baseSize, layer2SizeMultiplier, alignedSizeMultiplier
) {
    const offsetX = (smoothMouseX - centerX) * parallaxStrength;
    const offsetY = (smoothMouseY - centerY) * parallaxStrength;
    
    let closestPoint = null;
    let closestDistance = Infinity;
    
    // Check in reverse order so topmost points are checked first
    for (let i = points.length - 1; i >= 0; i--) {
        const point = points[i];
        let x, y;
        
        if (point.isAligned) {
            x = point.currentAlignedX;
            y = point.currentAlignedY;
        } else {
            const speed = point.layer === 'layer_1' ? layer1Speed : layer2Speed;
            x = point.originalBaseX + (offsetX * speed);
            y = point.originalBaseY + (offsetY * speed);
        }
        
        // Determine size
        let size;
        if (point.isAligned) {
            size = baseSize * alignedSizeMultiplier;
        } else {
            size = point.layer === 'layer_1' ? baseSize : baseSize * layer2SizeMultiplier;
        }
        
        const dist = distance(x, y, mouseX, mouseY);
        const hitRadius = size / 2;
        
        if (dist < hitRadius && dist < closestDistance) {
            closestPoint = point;
            closestDistance = dist;
        }
    }
    
    return closestPoint;
}


