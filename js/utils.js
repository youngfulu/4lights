/**
 * Utility functions for coordinate transformations and helper functions
 */

/**
 * Convert screen coordinates to world coordinates
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {number} centerX - World center X
 * @param {number} centerY - World center Y
 * @param {number} zoomLevel - Current zoom level
 * @param {number} panX - Camera pan X offset
 * @param {number} panY - Camera pan Y offset
 * @returns {{x: number, y: number}} World coordinates
 */
export function screenToWorld(screenX, screenY, centerX, centerY, zoomLevel, panX, panY) {
    return {
        x: ((screenX - centerX - panX) / zoomLevel) + centerX,
        y: ((screenY - centerY - panY) / zoomLevel) + centerY
    };
}

/**
 * Convert world coordinates to screen coordinates
 * @param {number} worldX - World X coordinate
 * @param {number} worldY - World Y coordinate
 * @param {number} centerX - World center X
 * @param {number} centerY - World center Y
 * @param {number} zoomLevel - Current zoom level
 * @param {number} panX - Camera pan X offset
 * @param {number} panY - Camera pan Y offset
 * @returns {{x: number, y: number}} Screen coordinates
 */
export function worldToScreen(worldX, worldY, centerX, centerY, zoomLevel, panX, panY) {
    return {
        x: (worldX - centerX) * zoomLevel + centerX + panX,
        y: (worldY - centerY) * zoomLevel + centerY + panY
    };
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance
 */
export function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Ease-out cubic easing function
 * @param {number} t - Progress (0 to 1)
 * @returns {number} Eased progress
 */
export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease-in-out easing function
 * @param {number} t - Progress (0 to 1)
 * @returns {number} Eased progress
 */
export function easeInOut(t) {
    return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0 to 1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Detect if device is mobile
 * @param {number} breakpoint - Breakpoint width in pixels
 * @param {boolean} useTouchDetection - Whether to use touch detection
 * @returns {boolean} True if mobile
 */
export function isMobile(breakpoint = 768, useTouchDetection = true) {
    const widthCheck = window.innerWidth < breakpoint;
    const touchCheck = useTouchDetection && ('ontouchstart' in window);
    return widthCheck || touchCheck;
}

/**
 * Smooth interpolation towards target value
 * @param {number} current - Current value
 * @param {number} target - Target value
 * @param {number} smoothness - Smoothness factor (0 to 1)
 * @returns {number} New interpolated value
 */
export function smoothInterpolate(current, target, smoothness) {
    return current + (target - current) * smoothness;
}

/**
 * Extract filename from path
 * @param {string} path - File path
 * @returns {string} Filename without extension
 */
export function extractFilename(path) {
    let filename = path;
    // Remove directory path
    const lastSlash = filename.lastIndexOf('/');
    if (lastSlash !== -1) {
        filename = filename.substring(lastSlash + 1);
    }
    // Remove file extension
    const lastDot = filename.lastIndexOf('.');
    if (lastDot !== -1) {
        filename = filename.substring(0, lastDot);
    }
    return filename;
}


