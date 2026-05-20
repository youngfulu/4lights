# 4lights refactored

Git repository containing the **refactored 4lights** web pipeline (build scripts, image compression, distribution layout) and **LOT2**, an alternate React + React Router front-end that consumes the parent build’s `dist/img` data.

## Key parts

| Path | Description |
|------|-------------|
| `LOT2/` | Vite 5 + React 18 site — grid + project detail routes; see **`LOT2/README.md`** for setup, GitHub Pages base (`/LOT2/`), and data generation from `../dist/img`. |
| `dist/img/` | Built gallery tree with per-project folders, `about.txt` / `more.txt` pattern used across iterations. |
| Root build tooling | Scripts for images and deployment vary by branch — inspect `package.json` at repo root when working on the classic pipeline. |

## Relationship to `web folio/4lights/`

`web folio` hosts an actively iterated public-facing variant with extensive audit docs. This repo is the **refactored / LOT2** line; keep behavioral parity intentional, not accidental — compare routes and asset bases before merging strategies.

## Adjacent creative-tech assets

SuperCollider and TD Python helpers now centralize under **`../creative-music-tech/`** at the dev root.
