#!/bin/bash
# Script to compress images in Imgae test directory
# Usage: ./compress_images.sh

echo "Starting image compression..."

cd "Imgae test " || exit 1

# Find and compress all JPG/JPEG files
find . -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) | while read -r img; do
    echo "Compressing: $img"
    sips -s format jpeg -s formatOptions 80 "$img" --out "$img.tmp" 2>/dev/null
    if [ -f "$img.tmp" ]; then
        mv "$img.tmp" "$img"
        echo "  ✓ Compressed: $img"
    else
        echo "  ✗ Failed: $img"
    fi
done

# Find and compress all PNG files
find . -type f -iname "*.png" | while read -r img; do
    echo "Compressing: $img"
    # Convert to JPEG for better compression (optional, or use PNG compression)
    # sips -s format jpeg -s formatOptions 80 "$img" --out "${img%.png}.jpg" 2>/dev/null
    
    # Or compress PNG directly (macOS doesn't have great PNG compression, but we can try)
    sips -s format png "$img" --out "$img.tmp" 2>/dev/null
    if [ -f "$img.tmp" ]; then
        # Use pngquant if available, otherwise keep original
        if command -v pngquant &> /dev/null; then
            pngquant --quality=65-80 --ext .png --force "$img.tmp" 2>/dev/null
        fi
        mv "$img.tmp" "$img"
        echo "  ✓ Processed: $img"
    else
        echo "  ✗ Failed: $img"
    fi
done

echo "Compression complete!"
echo ""
echo "Note: For better PNG compression, install pngquant:"
echo "  brew install pngquant"


