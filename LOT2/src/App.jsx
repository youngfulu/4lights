import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';
const IMAGE_BASE = `${BASE}/img`;
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
  const p = `${prefix}${folderPath}/${filename}`;
  return `${IMAGE_BASE}/${p.split('/').map(encodeURIComponent).join('/')}`;
}

function sortByYear(projects) {
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

const CATEGORY_LABELS = {
  stage: 'Stage design',
  installation: 'Installation',
  tech: 'Technical solutions',
  concept: 'Concepts',
  spatial: 'Spatial design',
};

/* ------------------------------------------------------------------ */
/*  1. Preload all index preview images so they appear instantly      */
/* ------------------------------------------------------------------ */
function usePreloadIndexImages(projects) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!projects.length) return;
    let loaded = 0;
    const total = projects.length;
    const tick = () => { if (++loaded >= total) setReady(true); };

    projects.forEach((p) => {
      const img = new Image();
      img.onload = tick;
      img.onerror = tick;
      img.src = imageUrl(p.path, p.indexImage || p.images[0], true);
    });

    const timeout = setTimeout(() => setReady(true), 4000);
    return () => clearTimeout(timeout);
  }, [projects]);

  return ready || !projects.length;
}

/* ------------------------------------------------------------------ */
/*  2. View Transitions API wrapper for smooth page changes           */
/* ------------------------------------------------------------------ */
function useTransitionNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (to) => {
      if (!document.startViewTransition) {
        navigate(to);
        return;
      }
      document.startViewTransition(() => {
        flushSync(() => navigate(to));
      });
    },
    [navigate],
  );
}

function TransitionLink({ to, className, children, onMouseEnter, onMouseLeave, onFocus, onBlur }) {
  const go = useTransitionNavigate();
  const location = useLocation();
  const handleClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (location.pathname === to) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    go(to);
  };
  return (
    <Link
      to={to}
      className={className}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Swipe / trackpad gesture navigation                            */
/* ------------------------------------------------------------------ */
function useSwipeNavigation(onSwipeLeft, onSwipeRight) {
  const [indicator, setIndicator] = useState({ active: false, direction: null, progress: 0 });
  const stateRef = useRef({
    touchStartX: 0, touchStartY: 0, touchDelta: 0,
    locked: false, tracking: false,
    wheelAccum: 0, wheelTimer: null, wheelActive: false,
    cooldown: false,
  });

  useEffect(() => {
    const s = stateRef.current;
    const TOUCH_THRESHOLD = 28;
    const WHEEL_THRESHOLD = 50;
    const COOLDOWN_MS = 400;

    const setCooldown = () => {
      s.cooldown = true;
      setTimeout(() => { s.cooldown = false; }, COOLDOWN_MS);
    };

    const onTouchStart = (e) => {
      if (s.cooldown) return;
      s.touchStartX = e.touches[0].clientX;
      s.touchStartY = e.touches[0].clientY;
      s.touchDelta = 0;
      s.locked = false;
      s.tracking = true;
    };

    const onTouchMove = (e) => {
      if (!s.tracking) return;
      const dx = e.touches[0].clientX - s.touchStartX;
      const dy = e.touches[0].clientY - s.touchStartY;
      if (!s.locked) {
        if (Math.abs(dy) > Math.abs(dx) * 0.6) { s.tracking = false; return; }
        s.locked = true;
      }
      s.touchDelta = dx;
      const progress = Math.min(Math.abs(dx) / (TOUCH_THRESHOLD * 1.5), 1);
      setIndicator({ active: true, direction: dx > 0 ? 'right' : 'left', progress });
    };

    const onTouchEnd = () => {
      if (s.tracking && Math.abs(s.touchDelta) > TOUCH_THRESHOLD) {
        if (s.touchDelta < 0 && onSwipeLeft) { onSwipeLeft(); setCooldown(); }
        else if (s.touchDelta > 0 && onSwipeRight) { onSwipeRight(); setCooldown(); }
      }
      s.tracking = false;
      setIndicator({ active: false, direction: null, progress: 0 });
    };

    const onWheel = (e) => {
      if (s.cooldown) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2) return;
      if (Math.abs(e.deltaX) < 3) return;

      s.wheelAccum += e.deltaX;
      s.wheelActive = true;

      const progress = Math.min(Math.abs(s.wheelAccum) / (WHEEL_THRESHOLD * 1.5), 1);
      const direction = s.wheelAccum > 0 ? 'left' : 'right';
      setIndicator({ active: true, direction, progress });

      clearTimeout(s.wheelTimer);
      s.wheelTimer = setTimeout(() => {
        if (s.wheelActive && Math.abs(s.wheelAccum) > WHEEL_THRESHOLD) {
          if (s.wheelAccum > 0 && onSwipeLeft) { onSwipeLeft(); setCooldown(); }
          else if (s.wheelAccum < 0 && onSwipeRight) { onSwipeRight(); setCooldown(); }
        }
        s.wheelAccum = 0;
        s.wheelActive = false;
        setIndicator({ active: false, direction: null, progress: 0 });
      }, 100);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    window.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('wheel', onWheel);
      clearTimeout(s.wheelTimer);
    };
  }, [onSwipeLeft, onSwipeRight]);

  return indicator;
}

function SwipeIndicator({ indicator }) {
  const { active, direction, progress } = indicator;
  if (!active || !direction || progress < 0.05) return null;
  const isLeft = direction === 'left';
  return (
    <div
      className={`swipe-indicator swipe-indicator--${direction}`}
      style={{ opacity: 0.25 + progress * 0.6 }}
      aria-hidden
    >
      <div className="swipe-arrow" style={{ transform: `translateX(${isLeft ? '' : '-'}${(1 - progress) * 24}px) scale(${0.7 + progress * 0.3})` }}>
        <svg width="28" height="48" viewBox="0 0 28 48" fill="none">
          <path
            d={isLeft ? 'M8 4l16 20L8 44' : 'M20 4L4 24l16 20'}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared header — LOT2 + Index / Info on every page                 */
/* ------------------------------------------------------------------ */
function SiteHeader() {
  return (
    <header className="header ab-header">
      <TransitionLink to="/" className="logo" aria-label="LOT2 Home">LOT2</TransitionLink>
      <nav className="header-nav">
        <TransitionLink to="/" className="header-link">Index</TransitionLink>
        <TransitionLink to="/info" className="header-link">Info</TransitionLink>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Home (Index page)                                                 */
/* ------------------------------------------------------------------ */
function Home({ projects }) {
  const [hoveredProject, setHoveredProject] = useState(null);
  const imagesReady = usePreloadIndexImages(projects);

  return (
    <div className="layout layout-index">
      <SiteHeader />

      <main className={`main index-main ${imagesReady ? 'index-main--ready' : ''}`}>
        <div className="index-table-wrap">
          <div className="index-table-head">
            <div className="index-th index-th-project">Project</div>
            <div className="index-th index-th-categories">Categories</div>
            <div className="index-th index-th-location">Location</div>
            <div className="index-th index-th-year">Year</div>
          </div>
          <div className={`index-rows ${hoveredProject ? 'has-hover' : ''}`}>
            {projects.map((project) => (
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

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Info page (amsterdamberlin.com/info layout)                       */
/* ------------------------------------------------------------------ */
function InfoPage() {
  return (
    <div className="layout layout-info">
      <SiteHeader />
      <main className="main info-main">
        <p className="info-lead">
          LOT2 is an independent creative studio that designs and produces experiences.
          The cross-disciplinary team works at the intersection of spatial design,
          technology and storytelling to translate abstract narratives into tangible moments.
        </p>

        <div className="info-columns">
          <div className="info-col">
            <h3 className="info-col-heading">Services</h3>
            <ul className="info-col-list">
              <li>Spatial Design</li>
              <li>Stage Design</li>
              <li>Light Design</li>
              <li>Acoustic Design</li>
              <li>Interactive Design</li>
              <li>Architecture</li>
              <li>Fabrication</li>
              <li>Video Content</li>
              <li>Creative Direction</li>
              <li>Concept Development</li>
            </ul>
          </div>
        </div>

        <div className="info-footer-contact">
          <h3 className="info-col-heading">Contact</h3>
          <p className="info-address">44 Rue Beauregard, 75002 Paris, France</p>
          <a href="tel:+33623973028" className="info-phone">+33 6 23 97 30 28</a>
          <a href="mailto:hello@weare.io">hello@weare.io</a>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Project detail                                                    */
/* ------------------------------------------------------------------ */
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
  const goTo = useTransitionNavigate();
  const folderPath = pathEnc ? decodeURIComponent(pathEnc) : '';

  const currentIndex = useMemo(
    () => projects.findIndex((p) => p.path === folderPath),
    [projects, folderPath],
  );
  const project = currentIndex >= 0 ? projects[currentIndex] : null;
  const prevProject = currentIndex > 0 ? projects[currentIndex - 1] : null;
  const nextProject = currentIndex < projects.length - 1 ? projects[currentIndex + 1] : null;

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

  const handleSwipeLeft = useCallback(() => {
    if (nextProject) goTo(`/project/${encodeURIComponent(nextProject.path)}`);
  }, [nextProject, goTo]);

  const handleSwipeRight = useCallback(() => {
    if (prevProject) goTo(`/project/${encodeURIComponent(prevProject.path)}`);
    else goTo('/');
  }, [prevProject, goTo]);

  const swipe = useSwipeNavigation(
    nextProject ? handleSwipeLeft : null,
    handleSwipeRight,
  );

  if (!project) {
    return (
      <div className="layout">
        <SiteHeader />
        <main className="main"><p>Project not found.</p></main>
      </div>
    );
  }

  return (
    <div className="layout project-detail-view">
      <SiteHeader />
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
      <SwipeIndicator indicator={swipe} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App root                                                          */
/* ------------------------------------------------------------------ */
function App() {
  const { folders } = useProjects();
  const sorted = useMemo(() => sortByYear(folders), [folders]);
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home projects={sorted} />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="/project/:pathEnc" element={<ProjectDetail projects={sorted} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
