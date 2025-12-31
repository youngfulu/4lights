# How to Run the Gallery

## Problem: CORS Error with file:// protocol

When you open `index.html` directly from the file system, browsers block image loading due to CORS security policies.

## Solution: Use a Local Web Server

### Option 1: Python HTTP Server (Recommended)

1. Open Terminal
2. Navigate to the project directory:
   ```bash
   cd "/Users/ilyaduganov/Desktop/web folio/4lights"
   ```

3. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

4. Open your browser and go to:
   ```
   http://localhost:8000
   ```

5. To stop the server, press `Ctrl+C` in the terminal

### Option 2: Node.js HTTP Server

If you have Node.js installed:

```bash
npx http-server -p 8000
```

Then open: `http://localhost:8000`

### Option 3: VS Code Live Server

If you're using VS Code:
1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 4: PHP Server

If you have PHP installed:

```bash
php -S localhost:8000
```

---

**Note:** Once you're running through a web server (http://localhost), the images should load correctly!


