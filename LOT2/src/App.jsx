import { useEffect, useState, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';
const IMAGE_BASE = `${BASE}/img`;
/** GitHub Pages serves app under /4lights/ — never use root-absolute /data/... */
const PROJECTS_JSON_URL = `${BASE}/data/projects.json`;

function useProjects() {
  const [data, setData] = useState({ folders: [], imageBase: IMAGE_BASE });
  useEffect(() => {
    fetch(PROJECTS_JSON_URL)
      .then((r) => r.json())
      .then((json) =>
        setData({
          folders: Array.isArray(json?.folders) ? json.folders : [],
          imageBase: IMAGE_BASE,
        }),
      )
      .catch(() => setData({ folders: [], imageBase: IMAGE_BASE }));
  }, []);
  return data;
}

function imageUrl(folderPath, filename, thumb = false) {
  const prefix = thumb ? 'thumb/' : '';
  const path = `${prefix}${folderPath}/${filename}`;
  return `${IMAGE_BASE}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

const CATEGORY_LABELS = {
  stage: 'Stage design',
  installation: 'Installation',
  tech: 'Technical solutions',
  concept: 'Concepts',
  spatial: 'Spatial design',
};

function Home({ projects }) {
  const [lang, setLang] = useState('en');
  const [hoveredProject, setHoveredProject] = useState(null);
  const indexRef = useRef(null);
  const infoRef = useRef(null);

  const sortedFiltered = useMemo(() => {
    const yearNum = (y) => {
      const n = parseInt(String(y || '').trim(), 10);
      return Number.isFinite(n) ? n : null;
    };

    return [...projects].sort((a, b) => {
      // Descending year (newest first), like most portfolios and like the reference screenshot.
      const ay = yearNum(a.year);
      const by = yearNum(b.year);
      if (ay === null && by === null) return a.name.localeCompare(b.name);
      if (ay === null) return 1;
      if (by === null) return -1;
      if (by !== ay) return by - ay;
      return a.name.localeCompare(b.name);
    });
  }, [projects]);

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="layout layout-index">
      <header className="header ab-header">
        <Link to="/" className="logo" aria-label="LOT2 Home">
          LOT2
        </Link>
        <nav className="header-nav">
          <button type="button" className="header-link" onClick={() => scrollTo(indexRef)}>Index</button>
          <button type="button" className="header-link" onClick={() => scrollTo(infoRef)}>Info</button>
        </nav>
      </header>

      <main className="main index-main" ref={indexRef}>
        <div className="index-table-wrap">
          <div className="index-table-head">
            <div className="index-th index-th-project">Project</div>
            <div className="index-th index-th-categories">Categories</div>
            <div className="index-th index-th-location">Location</div>
            <div className="index-th index-th-year">Year</div>
          </div>
          <div className={`index-rows ${hoveredProject ? 'has-hover' : ''}`}>
            {sortedFiltered.map((project) => (
              <Link
                key={project.path}
                to={`/project/${encodeURIComponent(project.path)}`}
                className={`index-row ${hoveredProject?.path === project.path ? 'is-active' : ''}`}
                onMouseEnter={() => setHoveredProject(project)}
                onMouseLeave={() => setHoveredProject(null)}
                onFocus={() => setHoveredProject(project)}
                onBlur={() => setHoveredProject(null)}
              >
                <div className="index-cell index-cell-project">{project.name}</div>
                <div className="index-cell index-cell-categories">
                  {project.tags?.map((t) => CATEGORY_LABELS[t] || t).join(', ') || '—'}
                </div>
                <div className="index-cell index-cell-location">{project.city || project.location || '—'}</div>
                <div className="index-cell index-cell-year">{project.year || '—'}</div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {hoveredProject && (
        <div className="index-preview" aria-hidden>
          <img
            src={imageUrl(hoveredProject.path, hoveredProject.indexImage || hoveredProject.images[0], true)}
            alt=""
            onError={(e) => {
              e.target.src = imageUrl(hoveredProject.path, hoveredProject.indexImage || hoveredProject.images[0], false);
            }}
          />
        </div>
      )}

      <section className="info-section" ref={infoRef}>
        <div className="info-inner">
          <h2 className="info-heading">Info</h2>
          <div className="info-body">
            {lang === 'en' ? (
              <>
                <p><strong>We are</strong> — a Paris-based creative studio run by a community of contributors. We deliver spatial design through an all-in-one approach that connects acoustic design, architecture, interactive design, fabrication, light design, and video content.</p>
                <p><strong>We are</strong>: Ilyazd Duganov, Ali Tihonava, Lada LD, Skander Jabi.</p>
              </>
            ) : (
              <>
                <p><strong>We are</strong> — un studio créatif parisien animé par une communauté de contributeurs. Nous créons le design spatial grâce à une approche globale qui connecte design acoustique, architecture, design interactif, fabrication, design lumière et contenu vidéo.</p>
                <p><strong>We are</strong>: Ilyazd Duganov, Ali Tihonava, Lada LD, Skander Jabi.</p>
              </>
            )}
          </div>
          <div className="info-contact">
            <a href="mailto:hello@weare.io">hello@weare.io</a>
          </div>
          <div className="info-lang">
            <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <span className="info-lang-sep">/</span>
            <button type="button" className={lang === 'fr' ? 'active' : ''} onClick={() => setLang('fr')}>FR</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function parseAboutText(text) {
  if (!text || !text.trim()) return { name: '—', lines: [] };
  const parts = text.split('#');
  const nameBlock = parts[0].trim();
  const aboutBlock = parts.length >= 2 ? parts[1].trim() : text;
  let name = '—';
  const nameMatch = nameBlock.match(/(?:name|Name):\s*\(?([^)\n]+)\)?/i);
  if (nameMatch) name = nameMatch[1].trim();
  const lines = [];
  const labelMap = [
    { key: 'Project type', re: /project\s*type:\s*(?:\(([^)]+)\)|([^\n\r]+))/i },
    { key: 'Client', re: /client:\s*(?:\(([^)]+)\)|([^\n\r]+))/i },
    { key: 'Studio', re: /(?:studio|agency):\s*(?:\(([^)]+)\)|([^\n\r]+))/i },
    { key: 'Year', re: /year:\s*(?:\(([^)]+)\)|([^\n\r]+))/i },
    { key: 'Location', re: /location:\s*(?:\(([^)]+)\)|([^\n\r]+))/i },
    { key: 'Status', re: /status:\s*(?:\(([^)]+)\)|([^\n\r]+))/i },
    { key: 'Contributor', re: /contributor:\s*(?:\(([^)]+)\)|([^\n\r]+))/i },
  ];
  labelMap.forEach(({ key, re }) => {
    const m = aboutBlock.match(re);
    if (m) lines.push({ label: key, value: (m[1] || m[2] || '').trim() });
  });
  return { name, lines };
}

function ProjectDetail({ projects }) {
  const { pathEnc } = useParams();
  const navigate = useNavigate();
  const folderPath = pathEnc ? decodeURIComponent(pathEnc) : '';
  const project = useMemo(() => projects.find((p) => p.path === folderPath), [projects, folderPath]);
  const [about, setAbout] = useState(null);
  const [more, setMore] = useState(null);

  useEffect(() => {
    if (!project) return;
    const base = `${IMAGE_BASE}/${project.path.split('/').map(encodeURIComponent).join('/')}`;
    const loadMaybeText = async (name) => {
      try {
        const r = await fetch(`${base}/${name}`);
        if (!r.ok) return '';
        const ct = String(r.headers.get('content-type') || '').toLowerCase();
        const txt = await r.text();
        const trimmed = txt.trim();
        if (!trimmed) return '';
        // When file is missing, dev server can return the SPA HTML (200 OK).
        // Guard against injecting HTML into "more".
        if (ct.includes('text/html') || trimmed.startsWith('<!DOCTYPE html') || trimmed.includes('<html')) {
          return '';
        }
        return trimmed;
      } catch {
        return '';
      }
    };

    Promise.all([
      loadMaybeText('about.txt'),
      (async () => {
        // Some projects may use alternate file names.
        const candidates = ['more.txt', 'More.txt', 'MORE.txt', 'extra.txt'];
        for (const c of candidates) {
          const txt = await loadMaybeText(c);
          if (txt) return txt;
        }
        return '';
      })(),
    ]).then(([aboutText, moreText]) => {
      setAbout(parseAboutText(aboutText));
      setMore(moreText || null);
    });
  }, [project]);

  if (!project) {
    return (
      <div className="layout">
        <header className="header">
          <button type="button" className="back-link" onClick={() => navigate('/')}>← back</button>
        </header>
        <main className="main"><p>Project not found.</p></main>
      </div>
    );
  }

  return (
    <div className="layout project-detail-view">
      <header className="header">
        <button type="button" className="back-link" onClick={() => navigate('/')} aria-label="Back to projects">
          ← back
        </button>
      </header>
      <main className="main project-detail-main">
        <div className="project-detail-content">
          <aside className="project-info-panel">
            <h1 className="project-title">{about?.name || project.name}</h1>
            <dl className="project-meta">
              {about?.lines?.map(({ label, value }) => (
                <div key={label} className="meta-row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {more && (
              <div className="project-more">
                {more.split(/\r?\n/).filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </aside>
          <div className="project-gallery">
            {project.images.map((filename, i) => (
              <div key={filename} className="gallery-item">
                <img
                  src={imageUrl(project.path, filename)}
                  alt={`${project.name} ${i + 1}`}
                  loading={i < 4 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const { folders } = useProjects();
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home projects={folders} />} />
        <Route path="/project/:pathEnc" element={<ProjectDetail projects={folders} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
