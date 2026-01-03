#!/bin/bash
# Script to compress images in "Imgae test " directory
# Usage: ./compress_images.sh

echo "Starting image compression..."

cd "Imgae test " || exit 1

# Find and compress all JPG/JPEG files
find . -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) | while read -r img; do
    echo "Compressing: $img"
    sips -s format jpeg -s formatOptions 75 "$img" --out "$img.tmp" 2>/dev/null
    if [ -f "$img.tmp" ]; then
        # Check if compressed version is smaller
        original_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
        compressed_size=$(stat -f%z "$img.tmp" 2>/dev/null || stat -c%s "$img.tmp" 2>/dev/null)
        
        if [ "$compressed_size" -lt "$original_size" ]; then
            mv "$img.tmp" "$img"
            echo "  ✓ Compressed: $img ($original_size -> $compressed_size bytes)"
        else
            rm "$img.tmp"
            echo "  - Skipped: $img (compressed version larger)"
        fi
    else
        echo "  ✗ Failed: $img"
    fi
done

# Find and compress all PNG files
find . -type f -iname "*.png" | while read -r img; do
    echo "Compressing: $img"
    sips -s format png "$img" --out "$img.tmp" 2>/dev/null
    if [ -f "$img.tmp" ]; then
        # Use pngquant if available for better compression
        if command -v pngquant &> /dev/null; then
            pngquant --quality=65-80 --ext .png --force "$img.tmp" 2>/dev/null
        fi
        
        # Check if compressed version is smaller
        original_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
        compressed_size=$(stat -f%z "$img.tmp" 2>/dev/null || stat -c%s "$img.tmp" 2>/dev/null)
        
        if [ "$compressed_size" -lt "$original_size" ]; then
            mv "$img.tmp" "$img"
            echo "  ✓ Compressed: $img ($original_size -> $compressed_size bytes)"
        else
            rm "$img.tmp"
            echo "  - Skipped: $img (compressed version larger)"
        fi
    else
        echo "  ✗ Failed: $img"
    fi
done

cd ..

echo ""
echo "Compression complete!"
echo ""
echo "Note: For better PNG compression, install pngquant:"
echo "  brew install pngquant"
