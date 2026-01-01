/**
 * Image loading and caching system
 * Handles async image loading with proper error handling
 */

import { CONFIG } from './config.js';

/**
 * Image cache storage
 */
const imageCache = {};
let imagesLoaded = 0;
let totalImages = 0;
let loadCallbacks = [];

/**
 * Load a single image
 * @param {string} path - Image path
 * @returns {Promise<Object>} Promise resolving to image data
 */
function loadSingleImage(path) {
    return new Promise((resolve, reject) => {
        // Skip if already cached
        if (imageCache[path]) {
            resolve(imageCache[path]);
            return;
        }

        const img = new Image();
        
        img.onload = () => {
            const imageData = {
                img: img,
                width: img.naturalWidth,
                height: img.naturalHeight,
                aspectRatio: img.naturalWidth / img.naturalHeight,
                path: path
            };
            
            imageCache[path] = imageData;
            imagesLoaded++;
            
            console.log(`Loaded image ${imagesLoaded}/${totalImages}: ${path} (${img.naturalWidth}x${img.naturalHeight})`);
            
            // Notify callbacks
            loadCallbacks.forEach(callback => callback(imagesLoaded, totalImages));
            
            resolve(imageData);
        };
        
        img.onerror = () => {
            console.warn(`Failed to load image: ${path}`);
            imagesLoaded++;
            
            // Notify callbacks even on error
            loadCallbacks.forEach(callback => callback(imagesLoaded, totalImages));
            
            reject(new Error(`Failed to load image: ${path}`));
        };
        
        // Set crossOrigin only for http/https protocols
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            img.crossOrigin = 'anonymous';
        }
        
        img.src = path;
    });
}

/**
 * Load all images
 * @param {Function} progressCallback - Optional callback for progress updates (loaded, total)
 * @returns {Promise<void>} Promise that resolves when all images are loaded or failed
 */
export async function loadImages(progressCallback = null) {
    if (progressCallback) {
        loadCallbacks.push(progressCallback);
    }
    
    const uniquePaths = [...new Set(CONFIG.imagePaths)]; // Remove duplicates
    const pathsToLoad = uniquePaths.slice(0, CONFIG.image.maxImages);
    totalImages = pathsToLoad.length;
    imagesLoaded = 0;
    
    if (pathsToLoad.length === 0) {
        console.warn('No image paths to load.');
        return;
    }
    
    console.log(`Attempting to load ${pathsToLoad.length} images...`);
    
    // Load all images in parallel
    const loadPromises = pathsToLoad.map(path => 
        loadSingleImage(path).catch(error => {
            // Continue even if individual images fail
            return null;
        })
    );
    
    await Promise.all(loadPromises);
    
    const successful = Object.keys(imageCache).length;
    console.log(`Finished loading: ${successful}/${totalImages} images loaded successfully`);
}

/**
 * Get image from cache
 * @param {string} path - Image path
 * @returns {Object|null} Image data or null if not loaded
 */
export function getImage(path) {
    return imageCache[path] || null;
}

/**
 * Check if image is loaded
 * @param {string} path - Image path
 * @returns {boolean} True if image is loaded
 */
export function isImageLoaded(path) {
    const imageData = imageCache[path];
    return imageData && imageData.img && imageData.img.complete && imageData.img.naturalWidth > 0;
}

/**
 * Get loading progress
 * @returns {{loaded: number, total: number, percentage: number}} Loading progress
 */
export function getLoadingProgress() {
    return {
        loaded: imagesLoaded,
        total: totalImages,
        percentage: totalImages > 0 ? (imagesLoaded / totalImages) * 100 : 0
    };
}

/**
 * Clear image cache (for testing/cleanup)
 */
export function clearCache() {
    Object.keys(imageCache).forEach(key => delete imageCache[key]);
    imagesLoaded = 0;
    totalImages = 0;
    loadCallbacks = [];
}

