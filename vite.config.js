import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const IMG_SOURCE = path.resolve(process.cwd(), 'public', 'Imgae test ');

export default defineConfig(({ command }) => {
  const isProd = command === 'build';
  const base = isProd ? '/4lights/' : '/'; // GitHub Pages subpath only in production; dev at root

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
            const raw = (req.url || '').replace(/^\//, '');
            const urlPath = raw.split('/').map(segment => decodeURIComponent(segment)).join(path.sep);
            const filePath = path.resolve(path.join(IMG_SOURCE, urlPath));
            if (!filePath.startsWith(path.resolve(IMG_SOURCE)) || !fs.existsSync(filePath)) {
              return next();
            }
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) return next();
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
      // Build: copy public/Imgae test to dist/img so /4lights/img/... works on GitHub Pages
      {
        name: 'copy-img-to-dist',
        closeBundle() {
          const outDir = path.resolve(process.cwd(), 'dist');
          const imgDest = path.join(outDir, 'img');
          if (!fs.existsSync(IMG_SOURCE)) return;
          function copyRecursive(src, dest) {
            fs.mkdirSync(dest, { recursive: true });
            for (const e of fs.readdirSync(src, { withFileTypes: true })) {
              const s = path.join(src, e.name);
              const d = path.join(dest, e.name);
              if (e.isDirectory()) copyRecursive(s, d);
              else fs.copyFileSync(s, d);
            }
          }
          copyRecursive(IMG_SOURCE, imgDest);
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
