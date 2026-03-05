import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Image folder: project root or public/ (same as compress-images.js for CI)
const IMG_SOURCE =
  (() => {
    const root = path.resolve(process.cwd(), 'Imgae test ');
    const pub = path.resolve(process.cwd(), 'public', 'Imgae test ');
    if (fs.existsSync(root)) return root;
    if (fs.existsSync(pub)) return pub;
    return pub; // default for build
  })();

export default defineConfig(({ command }) => {
  const isProd = command === 'build';
  const base = isProd ? './' : '/';
  return {
  base,
  plugins: [
      react(),
      // Dev: serve "Imgae test " at /img/ so imagePaths work locally
      {
        name: 'serve-img-folder',
        configureServer(server) {
          if (!fs.existsSync(IMG_SOURCE)) return;
          server.middlewares.use('/img', (req, res, next) => {
            // req.url is e.g. /img/2gis%20%23spatial/14.png or /img/thumb/... — strip /img/ prefix
            const raw = (req.url || '').replace(/^\//, '').replace(/^img\/?/, '');
            const urlPath = raw.split('/').map(segment => decodeURIComponent(segment)).join(path.sep).replace(/%23/g, '#');
            const imgBase = path.resolve(IMG_SOURCE);
            let filePath = path.resolve(path.join(IMG_SOURCE, urlPath));
            if (!filePath.startsWith(imgBase)) return next();
            // If requesting thumb/... and file missing, serve full-size image so grid works without thumb folder
            const thumbPrefix = /^thumb[/\\]/;
            if (thumbPrefix.test(urlPath) && !fs.existsSync(filePath)) {
              const withoutThumb = urlPath.replace(/^thumb[/\\]?/, '');
              const fallbackPath = path.resolve(path.join(IMG_SOURCE, withoutThumb));
              if (fallbackPath.startsWith(imgBase) && fs.existsSync(fallbackPath)) filePath = fallbackPath;
            }
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end();
              return;
            }
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
              res.statusCode = 404;
              res.end();
              return;
            }
            fs.readFile(filePath, (err, data) => {
              if (err) return next();
              const ext = path.extname(filePath).toLowerCase();
              const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.txt': 'text/plain' };
              res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
              res.end(data);
            });
          });
        },
      },
      // Build: copy public/Imgae test to dist/img so img/... works when deployed
      {
        name: 'copy-img-to-dist',
        closeBundle() {
          try {
            const outDir = path.resolve(process.cwd(), 'dist');
            const imgDest = path.join(outDir, 'img');
            if (!fs.existsSync(IMG_SOURCE)) return;
            // Encode # as %23 in names so URL path (with double-encoded #) matches filesystem
            function safeName(name) {
              return name.replace(/#/g, '%23');
            }
            function copyRecursive(src, dest) {
              fs.mkdirSync(dest, { recursive: true });
              for (const e of fs.readdirSync(src, { withFileTypes: true })) {
                const s = path.join(src, e.name);
                const d = path.join(dest, safeName(e.name));
                if (e.isDirectory()) copyRecursive(s, d);
                else fs.copyFileSync(s, d);
              }
            }
            copyRecursive(IMG_SOURCE, imgDest);
          } catch (err) {
            console.warn('copy-img-to-dist:', err.message);
          }
        },
      },
    ],
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});
