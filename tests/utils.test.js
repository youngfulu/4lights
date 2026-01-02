/**
 * Unit tests for utility functions
 */

import { distance, clamp, lerp, easeOutCubic, screenToWorld, worldToScreen, extractFilename } from '../js/utils.js';

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

console.log('Running utility tests...\n');

test('distance calculates correctly', () => {
    const dist = distance(0, 0, 3, 4);
    assert(Math.abs(dist - 5) < 0.001, 'Distance should be 5 for (0,0) to (3,4)');
});

test('clamp works correctly', () => {
    assert(clamp(5, 0, 10) === 5, 'Value within range should remain unchanged');
    assert(clamp(-5, 0, 10) === 0, 'Value below min should be clamped to min');
    assert(clamp(15, 0, 10) === 10, 'Value above max should be clamped to max');
});

test('lerp interpolates correctly', () => {
    assert(lerp(0, 10, 0.5) === 5, 'Lerp at 0.5 should be midpoint');
    assert(lerp(0, 10, 0) === 0, 'Lerp at 0 should be start');
    assert(lerp(0, 10, 1) === 10, 'Lerp at 1 should be end');
});

test('easeOutCubic works correctly', () => {
    assert(Math.abs(easeOutCubic(0) - 0) < 0.001, 'Ease at 0 should be 0');
    assert(Math.abs(easeOutCubic(1) - 1) < 0.001, 'Ease at 1 should be 1');
    assert(easeOutCubic(0.5) > 0.5, 'Ease at 0.5 should be > 0.5 (accelerating)');
});

test('screenToWorld converts correctly', () => {
    const world = screenToWorld(100, 100, 500, 500, 2.0, 0, 0);
    // At zoom 2.0, screen 100 -> world -150 (because center is 500)
    // (100 - 500 - 0) / 2.0 + 500 = -400 / 2 + 500 = -200 + 500 = 300
    assert(Math.abs(world.x - 300) < 1, 'Screen to world X conversion');
    assert(Math.abs(world.y - 300) < 1, 'Screen to world Y conversion');
});

test('worldToScreen converts correctly', () => {
    const screen = worldToScreen(300, 300, 500, 500, 2.0, 0, 0);
    // At zoom 2.0, world 300 -> screen (300 - 500) * 2 + 500 = -200 * 2 + 500 = -400 + 500 = 100
    assert(Math.abs(screen.x - 100) < 1, 'World to screen X conversion');
    assert(Math.abs(screen.y - 100) < 1, 'World to screen Y conversion');
});

test('extractFilename removes path and extension', () => {
    assert(extractFilename('path/to/file.jpg') === 'file', 'Should extract filename without extension');
    assert(extractFilename('file.jpg') === 'file', 'Should work with just filename');
    assert(extractFilename('file') === 'file', 'Should work without extension');
});

console.log('\nAll utility tests completed!');


