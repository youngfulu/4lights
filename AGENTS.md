# AGENTS.md - AI Agent Instructions

This document provides guidance for AI agents working on the **4lights Gallery** project.

## Project Overview

4lights Gallery is an interactive canvas-based image gallery built with vanilla JavaScript. It features:
- Parallax effects on mouse/touch movement
- Zoom and pan navigation with smooth animations
- Image alignment system (click to align images from the same folder)
- Filter system by category tags
- Mobile-responsive touch controls
- Grid background with configurable opacity

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5 Canvas, CSS
- **No build tools**: Direct browser execution
- **No framework**: Pure canvas-based rendering

## Project Structure

```
/workspace/
├── index.html           # Main HTML entry point
├── script.js            # Main application logic (2000+ lines)
├── style.css            # Stylesheet
├── images.js            # Image path configuration
├── about.js             # About text content
├── js/                  # Modular JavaScript (partial refactoring)
│   ├── config.js        # Configuration constants (ES modules)
│   ├── utils.js         # Utility functions
│   ├── imageLoader.js   # Image loading system
│   └── pointSystem.js   # Point generation logic
├── tests/               # Unit tests
│   ├── pointSystem.test.js
│   └── utils.test.js
├── images/              # Organized image folders (placeholder structure)
└── Imgae test /         # Actual test images (note: intentional typo in name)
```

## Key Files

### `script.js` (Main Application)
The monolithic main file containing:
- Canvas setup and resize handling
- Point/image generation system
- Camera controls (zoom, pan, drag)
- Mouse/touch event handlers
- Parallax effect calculation
- Alignment animation system
- Filter mode logic
- Drawing/render loop

### `js/config.js` (Configuration)
ES module with centralized configuration:
- Image sizes and multipliers
- Animation durations and smoothness values
- Camera zoom levels
- Layout settings (gaps, padding)
- UI settings

### `index.html`
Simple HTML structure with:
- Loading indicator
- Canvas element
- Back button (hidden by default)
- About text container
- Filter buttons

## Development Setup

### Running Locally
```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve

# Then open http://localhost:8000
```

### Running Tests
```bash
node tests/pointSystem.test.js
node tests/utils.test.js
```

## Code Conventions

### Naming
- Variables: `camelCase`
- Constants: `camelCase` or `UPPER_SNAKE_CASE` for true constants
- Functions: `camelCase`, verb-prefixed (`handleClick`, `drawPoint`, `calculateOffset`)

### Important Variables in script.js
- `points[]` - Array of all image point objects
- `alignedEmojis[]` - Currently aligned images (legacy name, actually images)
- `alignedEmojiIndex` - Index of currently aligned image (null if none)
- `isFilterMode` - Boolean for filter state
- `globalZoomLevel` - Current camera zoom
- `cameraPanX/Y` - Camera pan offset
- `targetCameraPanX/Y` - Target pan for smooth interpolation

### Point Object Structure
```javascript
{
    x, y,                    // Current position
    baseX, baseY,            // Base position (modified during alignment)
    originalBaseX, originalBaseY, // Original position (never modified)
    layer: 'layer_1' | 'layer_2', // Parallax layer
    imagePath: string,       // Full path to image
    folderPath: string,      // Folder for grouping
    isAligned: boolean,      // Currently aligned
    isFiltered: boolean,     // Currently filtered
    targetX, targetY,        // Animation target position
    currentAlignedX, currentAlignedY, // Interpolated position
    targetSize, currentSize, // Size animation
    opacity, targetOpacity,  // Opacity animation
    alignmentStartTime,      // Animation start timestamp
    hoverSize, isHovered     // Hover state
}
```

## Known Issues & Gotchas

### 1. Directory Name Typo
The image directory is intentionally named `"Imgae test "` (with space at end). Do NOT rename it - paths throughout the codebase reference this exact name.

### 2. Legacy Naming
Variables like `emojiIndex`, `alignedEmojis` are legacy names from when the project used emojis. They now handle images but keep the old names for compatibility.

### 3. Coordinate Systems
The code uses two coordinate systems:
- **Screen coordinates**: Raw mouse/touch position
- **World coordinates**: Transformed by zoom/pan

Use these patterns:
```javascript
// Screen to World
const worldX = ((screenX - centerX - cameraPanX) / globalZoomLevel) + centerX;

// World to Screen  
const screenX = (worldX - centerX) * globalZoomLevel + centerX + cameraPanX;
```

### 4. Animation System
All animations use time-based interpolation with `performance.now()`:
```javascript
const elapsed = performance.now() - startTime;
const progress = Math.min(elapsed / duration, 1.0);
const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
```

### 5. Mobile Detection
```javascript
const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
```
This is checked frequently - consider caching if adding new code.

### 6. Image Loading
Images are loaded asynchronously. The `imageCache` object stores loaded images:
```javascript
imageCache[path] = {
    img: Image,
    width, height,
    aspectRatio,
    error: boolean
};
```

## Making Changes

### Adding New Features
1. Check if similar functionality exists in `script.js`
2. Consider if it should go in `js/` modules (preferred for new code)
3. Follow existing patterns for animations and state management
4. Test on both desktop and mobile

### Modifying Animations
- Durations are in milliseconds
- Smoothness values (0-1) control interpolation speed
- Use `alignmentAnimationDuration` (1250ms) as reference

### Adding Filter Tags
1. Add button in `index.html` with `data-tag` attribute
2. Images match if path/folder contains tag word
3. Update `filterByTag()` if custom matching needed

### Camera/Zoom Changes
- `zoomLevels` array defines discrete zoom stops
- `minZoom/maxZoom` constrain smooth zoom
- Selection mode uses smooth zoom, normal mode uses discrete

## Testing Checklist

Before submitting changes:
- [ ] Test zoom in/out (mouse wheel)
- [ ] Test pan/drag navigation
- [ ] Test image click alignment
- [ ] Test back button functionality
- [ ] Test filter buttons
- [ ] Test "We are" about display
- [ ] Test on mobile viewport (< 768px)
- [ ] Verify no console errors
- [ ] Run unit tests if modified relevant code

## Performance Considerations

- The render loop runs at 60fps via `requestAnimationFrame`
- Avoid adding DOM queries inside the `draw()` function
- Use cached values for mouse position and time
- Grid drawing is optimized with viewport culling
- Consider spatial partitioning for hit detection if adding more images

## Related Documentation

- `README.md` - User-facing documentation
- `CODE_REVIEW.md` - Detailed code analysis and improvement suggestions
- `IMPROVEMENT_REPORT.md` - Quality metrics and improvement tracking
- `SERVER_INSTRUCTIONS.md` - Server setup details
