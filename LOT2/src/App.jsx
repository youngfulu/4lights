import { useEffect, useLayoutEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
  useLocation,
  resolvePath,
} from 'react-router-dom';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';
const IMAGE_BASE = `${BASE}/img`;
/** GitHub Pages serves app under /4lights/ — never use root-absolute /data/... */
const PROJECTS_JSON_URL = `${BASE}/data/projects.json`;

function sortProjectsByYear(projects) {
  const yearNum = (y) => {
    const n = parseInt(String(y || '').trim(), 10);
    return Number.isFinite(n) ? n : null;
  };
  return [...projects].sort((a, b) => {
    const ay = yearNum(a.year);
    const by = yearNum(b.year);
    if (ay === null && by === null) return a.name.localeCompare(b.name);
    if (ay === null) return 1;
    if (by === null) return -1;
    if (by !== ay) return by - ay;
    return a.name.localeCompare(b.name);
  });
}

function startNavTransition(run) {
  if (typeof document !== 'undefined' && document.startViewTransition) {
    document.startViewTransition(run);
  } else {
    run();
  }
}

function TransitionLink({ to, className, children, ...rest }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Link
      to={to}
      className={className}
      {...rest}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const target = resolvePath(to, location.pathname).pathname;
        if (target === location.pathname) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        e.preventDefault();
        startNavTransition(() => navigate(to));
      }}
    />
  );
}

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

function useIndexThumbnailsPreload(projects) {
  const sorted = useMemo(() => sortProjectsByYear(projects), [projects]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sorted.length === 0) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const urls = sorted.map((p) => imageUrl(p.path, p.indexImage || p.images[0], true));
    Promise.all(
      urls.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [sorted]);

  return { sorted, ready };
}

function Home({ projects }) {
  const [hoveredProject, setHoveredProject] = useState(null);
  const indexRef = useRef(null);
  const infoRef = useRef(null);
  const { sorted: sortedFiltered, ready: indexImagesReady } = useIndexThumbnailsPreload(projects);

  const scrollTo = (ref) => {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(() => {
      el.classList.remove('section-enter');
      void el.offsetWidth;
      el.classList.add('section-enter');
      window.setTimeout(() => el.classList.remove('section-enter'), 650);
    });
  };

  return (
    <div className="layout layout-index">
      <header className="header ab-header">
        <TransitionLink to="/" className="logo" aria-label="LOT2 Home">
          LOT2
        </TransitionLink>
        <nav className="header-nav">
          <button type="button" className="header-link" onClick={() => scrollTo(indexRef)}>
            Index
          </button>
          <button type="button" className="header-link" onClick={() => scrollTo(infoRef)}>
            Info
          </button>
        </nav>
      </header>

      <main
        className={`main index-main ${indexImagesReady ? 'index-main--ready' : ''}`}
        ref={indexRef}
      >
        <div className="index-table-wrap">
          <div className="index-table-head">
            <div className="index-th index-th-project">Project</div>
            <div className="index-th index-th-categories">Categories</div>
            <div className="index-th index-th-location">Location</div>
            <div className="index-th index-th-year">Year</div>
          </div>
          <div className={`index-rows ${hoveredProject ? 'has-hover' : ''}`}>
            {sortedFiltered.map((project) => (
              <TransitionLink
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
              </TransitionLink>
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
          <div className="info-contact">
            <a href="mailto:hello@weare.io">hello@weare.io</a>
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

function SwipeArrow({ dir }) {
  return (
    <svg className="swipe-arrow-svg" viewBox="0 0 48 48" aria-hidden>
      {dir === 'prev' ? (
        <path fill="rgba(255,255,255,0.88)" d="M30 8 L14 24 L30 40 L26 44 L6 24 L26 4 Z" />
      ) : (
        <path fill="rgba(255,255,255,0.88)" d="M18 8 L34 24 L18 40 L22 44 L42 24 L22 4 Z" />
      )}
    </svg>
  );
}

function ProjectDetail({ projects }) {
  const { pathEnc } = useParams();
  const navigate = useNavigate();
  const folderPath = pathEnc ? decodeURIComponent(pathEnc) : '';
  const project = useMemo(() => projects.find((p) => p.path === folderPath), [projects, folderPath]);
  const sorted = useMemo(() => sortProjectsByYear(projects), [projects]);
  const idx = useMemo(
    () => sorted.findIndex((p) => p.path === folderPath),
    [sorted, folderPath],
  );
  const prevProject = idx > 0 ? sorted[idx - 1] : null;
  const nextProject = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

  const [about, setAbout] = useState(null);
  const [more, setMore] = useState(null);
  const [swipeHint, setSwipeHint] = useState(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const wheelAccum = useRef(0);
  const wheelTimer = useRef(null);
  const detailRootRef = useRef(null);

  const goProject = useCallback(
    (p) => {
      if (!p) return;
      const path = `/project/${encodeURIComponent(p.path)}`;
      startNavTransition(() => navigate(path));
    },
    [navigate],
  );

  const goHome = useCallback(() => {
    startNavTransition(() => navigate('/'));
  }, [navigate]);

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

  useLayoutEffect(() => {
    if (!project) return undefined;

    const onTouchStart = (e) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setSwipeHint(null);
    };

    const onTouchMove = (e) => {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - touchStart.current.x;
      const dy = y - touchStart.current.y;
      if (Math.abs(dx) < 24 || Math.abs(dy) > Math.abs(dx) * 0.85) {
        setSwipeHint(null);
        return;
      }
      if (dx > 28 && prevProject) setSwipeHint('prev');
      else if (dx < -28 && nextProject) setSwipeHint('next');
      else setSwipeHint(null);
    };

    const onTouchEnd = (e) => {
      const x = e.changedTouches[0].clientX;
      const y = e.changedTouches[0].clientY;
      const dx = x - touchStart.current.x;
      const dy = y - touchStart.current.y;
      setSwipeHint(null);
      if (Math.abs(dx) < 56 || Math.abs(dy) > Math.abs(dx) * 0.85) return;
      if (dx > 0 && prevProject) goProject(prevProject);
      else if (dx < 0 && nextProject) goProject(nextProject);
    };

    const el = detailRootRef.current;
    if (!el) return undefined;
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [project, prevProject, nextProject, goProject]);

  useLayoutEffect(() => {
    if (!project) return undefined;

    const onWheel = (e) => {
      if (Math.abs(e.deltaX) < 18 || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      e.preventDefault();
      wheelAccum.current += e.deltaX;
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => {
        const acc = wheelAccum.current;
        wheelAccum.current = 0;
        if (acc > 72 && nextProject) {
          setSwipeHint('next');
          window.setTimeout(() => setSwipeHint(null), 280);
          goProject(nextProject);
        } else if (acc < -72 && prevProject) {
          setSwipeHint('prev');
          window.setTimeout(() => setSwipeHint(null), 280);
          goProject(prevProject);
        }
      }, 80);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
    };
  }, [project, prevProject, nextProject, goProject]);

  if (!project) {
    return (
      <div className="layout">
        <header className="header">
          <button type="button" className="back-link" onClick={goHome}>
            ← back
          </button>
        </header>
        <main className="main">
          <p>Project not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div ref={detailRootRef} className="layout project-detail-view">
      <div
        className={`swipe-edge-hint swipe-edge-hint--prev ${swipeHint === 'prev' ? 'is-visible' : ''}`}
        aria-hidden
      >
        <SwipeArrow dir="prev" />
      </div>
      <div
        className={`swipe-edge-hint swipe-edge-hint--next ${swipeHint === 'next' ? 'is-visible' : ''}`}
        aria-hidden
      >
        <SwipeArrow dir="next" />
      </div>

      <header className="header">
        <button type="button" className="back-link" onClick={goHome} aria-label="Back to projects">
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
