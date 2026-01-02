/**
 * Unit tests for point system
 * Run with: npm test or node test runner
 */

import { generatePoints, getBoundingBox, isPointHovered, initializePointSizes } from '../js/pointSystem.js';
import { CONFIG } from '../js/config.js';

// Mock test framework (simple assertion library)
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`✗ ${name}: ${error.message}`);
    }
}

// Tests
console.log('Running point system tests...\n');

test('getBoundingBox calculates correct margins', () => {
    const box = getBoundingBox(1920, 1080);
    assert(box.y === 216, 'Top margin should be 1/5 of height (1080/5 = 216)');
    assert(box.height === 648, 'Height should be 3/5 of screen (1080 - 432 = 648)');
    assert(box.width === 1920, 'Width should match screen width');
});

test('generatePoints creates correct number of points', () => {
    const imagePaths = ['test1.jpg', 'test2.jpg'];
    const points = generatePoints(10, 50, 1920, 1080, imagePaths);
    assert(points.length === 10, 'Should generate 10 points');
});

test('generatePoints enforces minimum distance', () => {
    const imagePaths = ['test1.jpg'];
    const points = generatePoints(5, 100, 1920, 1080, imagePaths);
    
    // Check all point pairs
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const dx = points[i].x - points[j].x;
            const dy = points[i].y - points[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            assert(dist >= 50, `Points should be at least 50px apart, got ${dist}`);
        }
    }
});

test('generatePoints assigns layers correctly', () => {
    const imagePaths = ['test1.jpg'];
    const points = generatePoints(10, 50, 1920, 1080, imagePaths);
    
    // First point (index 0) should be layer_1, second (index 1) should be layer_2
    assert(points[0].layer === 'layer_1', 'First point should be layer_1');
    assert(points[1].layer === 'layer_2', 'Second point should be layer_2');
    assert(points[2].layer === 'layer_1', 'Third point should be layer_1');
});

test('isPointHovered detects hover correctly', () => {
    assert(isPointHovered(100, 100, 105, 105, 20) === true, 'Should detect hover within radius');
    assert(isPointHovered(100, 100, 200, 200, 20) === false, 'Should not detect hover outside radius');
});

test('initializePointSizes sets correct sizes', () => {
    const points = [
        { layer: 'layer_1', opacity: 0, targetOpacity: 0 },
        { layer: 'layer_2', opacity: 0, targetOpacity: 0 }
    ];
    
    initializePointSizes(points);
    
    assert(points[0].currentSize === CONFIG.image.baseSize, 'Layer 1 should have base size');
    assert(points[1].currentSize === CONFIG.image.baseSize * CONFIG.image.layer2SizeMultiplier, 
           'Layer 2 should have reduced size');
});

console.log('\nAll tests completed!');


