// Image configuration - update this file with your image paths
const imageCategories = {
    installations: [
        'images/installations/',
        // Add your image filenames here, e.g.:
        // 'images/installations/img1.jpg',
        // 'images/installations/img2.jpg',
    ],
    stage_design: [
        'images/stage_design/',
        // Add your image filenames here
    ],
    interactive: [
        'images/interactive/',
        // Add your image filenames here
    ],
    tech: [
        'images/tech/',
        // Add your image filenames here
    ],
    concept: [
        'images/concept/',
        // Add your image filenames here
    ],
    LOR: [
        'images/LOR/',
        // Add your image filenames here
    ]
};

// Flatten all categories into a single array
function getAllImages() {
    const allImages = [];
    Object.keys(imageCategories).forEach(category => {
        // Skip the folder path entry (first item) and get actual images
        imageCategories[category].forEach(img => {
            if (img !== `images/${category}/` && !img.endsWith('/')) {
                allImages.push({
                    src: img,
                    category: category
                });
            }
        });
    });
    return allImages;
}



