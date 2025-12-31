# 4lights Gallery

A modern image gallery with parallax scrolling effects and smooth hover interactions.

## Features

- **Image Grid Layout**: Responsive 3-column grid (adapts to 2 columns on tablets, 1 column on mobile)
- **Hover Effects**: Smooth scale and brightness transitions on image hover
- **Parallax Scrolling**: Downward parallax movement using SimpleParallax library
- **Modern Design**: Clean, minimal aesthetic with dark theme

## Image Folders

Images are organized into the following categories:
- `images/installations/` - Installation works
- `images/stage_design/` - Stage design projects
- `images/interactive/` - Interactive projects
- `images/tech/` - Technical projects
- `images/concept/` - Concept designs
- `images/LOR/` - LOR projects

## Adding Images

1. Add your images to the appropriate folder (installations, stage_design, interactive, tech, concept, or LOR)
2. Update `images.js` to include your image paths:

```javascript
const imageCategories = {
    installations: [
        'images/installations/your-image1.jpg',
        'images/installations/your-image2.jpg',
    ],
    // ... other categories
};
```

## Setup

1. Add your images to the respective folders
2. Update `images.js` with your image paths
3. Open `index.html` in a browser

## Parallax Effect

The parallax effect is implemented using SimpleParallax:

```javascript
var image = document.getElementsByClassName('thumbnail');
new simpleParallax(image, {
    delay: 1,
    scale: 1.5,
    transition: 'cubic-bezier(0,0,0,1)'
});
```

## Customization

- Adjust grid columns in `style.css` (`.gallery`)
- Modify hover effects in `.gallery-item:hover` styles
- Change parallax parameters in the JavaScript section




