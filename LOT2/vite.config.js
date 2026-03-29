import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// LOT2: serve/copy images only from final images.
const IMAGE_SOURCE = path.resolve(process.cwd(), '..', 'final images');
const ENTRANCE_SOURCE = path.resolve(process.cwd(), '..', 'Entrance GIF');
const SKIP_EXT = new Set(['.tiff', '.psd', '.mov', '.mp4', '.avi', '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw', '.bmp', '.pdf']);

export default defineConfig(({ command }) => {
  const isProd = command === 'build';
  return {
    base: isProd ? '/lot2/' : '/',
    plugins: [
      react(),
      {
        name: 'lot2-serve-original-img',
        configureServer(server) {
          server.middlewares.use('/img', (req, res, next) => {
            let raw = (req.url || '').split('?')[0].replace(/^\//, '');
            const segments = raw.split('/').map(s => {
              try { return decodeURIComponent(s.replace(/%2523/g, '%23')); } catch { return s; }
            });
            const urlPath = segments.join(path.sep).replace(/%23/g, '#');
            let filePath = path.join(IMAGE_SOURCE, urlPath);
            if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
              const noThumb = urlPath.replace(/^thumb[/\\]/, '');
              if (noThumb !== urlPath) filePath = path.join(IMAGE_SOURCE, noThumb);
            }
            const resolved = path.normalize(path.resolve(filePath));
            if (!resolved.startsWith(path.resolve(IMAGE_SOURCE)) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
              return next();
            }
            const ext = path.extname(resolved).toLowerCase();
            if (SKIP_EXT.has(ext)) return next();
            const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.txt': 'text/plain' };
            res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
            fs.createReadStream(resolved).pipe(res);
          });

          // Mobile start-screen frames
          server.middlewares.use('/entrance', (req, res, next) => {
            if (!fs.existsSync(ENTRANCE_SOURCE)) return next();
            const raw = (req.url || '').split('?')[0].replace(/^\//, '');
            const segments = raw.split('/').map((s) => {
              try { return decodeURIComponent(s); } catch { return s; }
            });
            const urlPath = segments.join(path.sep);
            const filePath = path.join(ENTRANCE_SOURCE, urlPath);
            const resolved = path.normalize(path.resolve(filePath));
            if (!resolved.startsWith(path.resolve(ENTRANCE_SOURCE)) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
              return next();
            }
            const ext = path.extname(resolved).toLowerCase();
            if (SKIP_EXT.has(ext)) return next();
            const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
            res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
            fs.createReadStream(resolved).pipe(res);
          });
        },
        closeBundle() {
          if (!isProd || !fs.existsSync(IMAGE_SOURCE)) return;
          const outImg = path.resolve(process.cwd(), 'dist', 'img');
          const outEntrance = path.resolve(process.cwd(), 'dist', 'entrance');
          const origThumb = path.join(IMAGE_SOURCE, 'thumb');
          function copyRecursive(src, dest) {
            fs.mkdirSync(dest, { recursive: true });
            for (const e of fs.readdirSync(src, { withFileTypes: true })) {
              if (e.name === '.DS_Store') continue;
              const s = path.join(src, e.name);
              const d = path.join(dest, e.name);
              if (e.isDirectory()) copyRecursive(s, d);
              else if (!SKIP_EXT.has(path.extname(e.name).toLowerCase())) fs.copyFileSync(s, d);
            }
          }
          copyRecursive(IMAGE_SOURCE, outImg);
          if (fs.existsSync(origThumb)) copyRecursive(origThumb, path.join(outImg, 'thumb'));
          if (fs.existsSync(ENTRANCE_SOURCE)) copyRecursive(ENTRANCE_SOURCE, outEntrance);
          console.log('LOT2: image source =', IMAGE_SOURCE);
          console.log('LOT2: copied image source to dist/img');
        },
      },
    ],
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'] },
        },
      },
    },
  };
});
