import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    // Serve "Imgae test " folder at /img/ to avoid path/encoding issues in browser
    {
      name: 'serve-img-folder',
      configureServer(server) {
        const imgDir = path.resolve(process.cwd(), 'public', 'Imgae test ');
        if (!fs.existsSync(imgDir)) return;
        server.middlewares.use('/img', (req, res, next) => {
          const raw = (req.url || '').replace(/^\//, '');
          const urlPath = raw.split('/').map(segment => decodeURIComponent(segment)).join(path.sep);
          const filePath = path.resolve(path.join(imgDir, urlPath));
          if (!filePath.startsWith(path.resolve(imgDir)) || !fs.existsSync(filePath)) {
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
  ],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
