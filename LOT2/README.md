# 4lights LOT2

Alternative version of the 4lights portfolio site. **Does not modify the original project** — it reads data and images from the parent project’s `dist/img` (or copies them on build).

## Stack

- **Vite 5** + **React 18** + **React Router 6**
- CSS variables, `clamp()`, `dvh`, `content-visibility` for performance
- Amsterdam Berlin–inspired layout: project grid with filters, project detail with sidebar + gallery
- Lazy loading and eager loading for above-the-fold cards
- Mobile-first responsive layout

## Setup

1. **Build the original project first** (so `../dist/img` exists with images and optional `thumb`):
   ```bash
   cd "/Users/ilyaduganov/Desktop/4lights refactored"
   npm run build
   ```

2. **Install and run LOT2**:
   ```bash
   cd LOT2
   npm install
   npm run dev
   ```
   Dev server serves images from `../dist/img` (no copy). Open http://localhost:5173

3. **Build for production**:
   ```bash
   npm run build
   ```
   This runs `build-data` (generates `public/data/projects.json` from `../dist/img`) then Vite build. Images are **copied** from `../dist/img` into `LOT2/dist/img` so the built site is self-contained.

## Data

- `scripts/build-data.js` scans `../dist/img` (original project’s output), collects folders and images, and writes `public/data/projects.json`.
- Project detail text is loaded at runtime from `about.txt` and `more.txt` in each folder (same format as the original).

## Routes

- `/` — Home: grid of projects with category filters and “We are” panel
- `/project/:pathEnc` — Project detail: sticky info (parsed from about.txt) + image gallery

Original folder is never written to; LOT2 only reads (dev) or copies on build.
