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
const ENTRANCE_FRAMES_URL = `${BASE}/data/entrance.json`;
const ENTRANCE_BASE = `${BASE}/entrance`;

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

function useEntranceFrames() {
  const [frames, setFrames] = useState([]);
  useEffect(() => {
    fetch(ENTRANCE_FRAMES_URL)
      .then((r) => (r.ok ? r.json() : { frames: [] }))
      .then((j) => setFrames(Array.isArray(j?.frames) ? j.frames : []))
      .catch(() => setFrames([]));
  }, []);
  return frames;
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

function isExcludedFromIndex(project) {
  const raw = String(project?.rawName || '');
  if (raw.startsWith('0_')) return true;
  const pathParts = String(project?.path || '').split('/');
  const leaf = pathParts[pathParts.length - 1] || '';
  return leaf.startsWith('0_');
}

/** True when viewport is phone-sized and primary input is touch (desktop unchanged). */
function useMobileTouchIndex() {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px) and (hover: none)');
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return matches;
}

function StartScreen({ onDismiss }) {
  const frames = useEntranceFrames();
  const [frameIdx, setFrameIdx] = useState(0);
  const [bgOn, setBgOn] = useState(false);
  const startRef = useRef({ y0: 0, active: false });
  const [dragY, setDragY] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const dragYRef = useRef(0);
  const touchT0Ref = useRef(0);
  const dismissDirRef = useRef(-1); // -1 = swipe up, +1 = swipe down

  useEffect(() => {
    const el = document.documentElement;
    const prevOverflow = el.style.overflow;
    const prevOverscroll = el.style.overscrollBehavior;
    const bodyPrevOverflow = document.body.style.overflow;
    const bodyPrevTouchAction = document.body.style.touchAction;
    el.style.overflow = 'hidden';
    el.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    el.classList.add('lot2-start-lock');
    return () => {
      el.style.overflow = prevOverflow;
      el.style.overscrollBehavior = prevOverscroll;
      document.body.style.overflow = bodyPrevOverflow;
      document.body.style.touchAction = bodyPrevTouchAction;
      el.classList.remove('lot2-start-lock');
    };
  }, []);

  useEffect(() => {
    // LOT takes 2s. Then "2" appears after +0.5s.
    // Background should start after "2" finishes => ~2.5s total.
    const t = setTimeout(() => setBgOn(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!bgOn || !frames.length) return;
    const id = setInterval(() => setFrameIdx((i) => (i + 1) % frames.length), 200);
    return () => clearInterval(id);
  }, [bgOn, frames.length]);

  const frameSrc = frames.length
    ? `${ENTRANCE_BASE}/${encodeURIComponent(frames[frameIdx])}`
    : '';

  const dismiss = () => {
    try { sessionStorage.setItem('lot2_start_seen', '1'); } catch {}
    onDismiss?.();
  };

  const onTouchStart = (e) => {
    startRef.current = { y0: e.touches[0].clientY, active: true };
    setDragY(0);
    dragYRef.current = 0;
    touchT0Ref.current = Date.now();
  };
  const onTouchMove = (e) => {
    if (!startRef.current.active) return;
    const dy = e.touches[0].clientY - startRef.current.y0;
    dragYRef.current = dy;
    dismissDirRef.current = dy < 0 ? -1 : 1;
    setDragY(dy);
  };
  const onTouchEnd = () => {
    startRef.current.active = false;
    const dy = dragYRef.current;
    setDragY(0);
    // Requested: swipe page down to enter.
    const halfScreen = (typeof window !== 'undefined' ? window.innerHeight : 800) / 2;
    // iPhone-like: allow smaller drag and also use velocity.
    // dy is negative when finger moves up.
    const enterDistance = Math.max(90, halfScreen * 0.25);
    const dt = Math.max(16, Date.now() - touchT0Ref.current);
    const velocityY = dy / dt; // px per ms
    const fastEnter = velocityY < -0.6;
    const shouldEnter = dy < -enterDistance || fastEnter;

    if ((shouldEnter || dy > halfScreen) && !dismissing) {
      setDismissing(true);
      window.setTimeout(() => dismiss(), 420);
    }
  };

  const progress = dismissing ? 1 : Math.min(Math.max(dragY, 0) / 180, 1);
  const opacity = 1 - progress * 0.85;
  const blur = progress * 14;
  const translateY = dismissing ? (dismissDirRef.current < 0 ? -220 : 220) : dragY;

  return (
    <div
      className="start-screen"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: `translateY(${translateY}px)`, opacity, filter: `blur(${blur}px)` }}
      role="dialog"
      aria-label="Start screen"
      aria-modal="true"
    >
      {bgOn && frameSrc && <img className="start-screen__bg" src={frameSrc} alt="" decoding="async" />}
      <div className="start-screen__fade" />
      <div className="start-screen__logo" aria-hidden>
        <span className="start-screen__lot">LOT</span>
        <span className="start-screen__two">2</span>
      </div>
      <div className="start-screen__hint" aria-hidden>Swipe to enter</div>
    </div>
  );
}

const CATEGORY_LABELS = {
  stage: 'Stage design',
  installation: 'Installation',
  tech: 'Technical solutions',
  concept: 'Concepts',
  spatial: 'Spatial design',
};

/* ------------------------------------------------------------------ */
/*  1. Preload index hover images (thumb then full — same as <img>)  */
/* ------------------------------------------------------------------ */
function preloadOneUrl(src, high = false) {
  return new Promise((resolve) => {
    const img = new Image();
    if (high && 'fetchPriority' in img) img.fetchPriority = 'high';
    const done = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(resolve).catch(resolve);
      } else {
        resolve();
      }
    };
    img.onload = done;
    img.onerror = () => resolve();
    img.src = src;
  });
}

/** Same URL strategy as hover preview: thumb first, then full size. */
function preloadIndexPreviewForProject(p, high = false) {
  const file = p.indexImage || p.images[0];
  const thumb = imageUrl(p.path, file, true);
  const full = imageUrl(p.path, file, false);
  return preloadOneUrl(thumb, high).then(() => {
    // Warm full size too so onError path and sharper cache hits are instant.
    if (full !== thumb) return preloadOneUrl(full, false);
  });
}

function usePreloadIndexImages(projects) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!projects.length) return;
    let cancelled = false;

    const headLinks = [];
    const PRIORITY_PRELOADS = 8;
    for (let i = 0; i < Math.min(PRIORITY_PRELOADS, projects.length); i++) {
      const p = projects[i];
      const file = p.indexImage || p.images[0];
      const href = imageUrl(p.path, file, true);
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);
      headLinks.push(link);
    }

    (async () => {
      await Promise.all(
        projects.map((p, i) => preloadIndexPreviewForProject(p, i < PRIORITY_PRELOADS)),
      );
      if (!cancelled) setReady(true);
    })();

    const timeout = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 12000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      headLinks.forEach((el) => el.remove());
    };
  }, [projects]);

  return ready || !projects.length;
}

/** Desktop only: LOT2 fades in 0.5s, stays until index images preloaded, fades out 0.25s. */
function DesktopIndexLoader({ imagesReady, onComplete }) {
  const [entered, setEntered] = useState(false);
  const [enterDone, setEnterDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setEnterDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!imagesReady || !enterDone || exiting) return;
    setExiting(true);
  }, [imagesReady, enterDone, exiting]);

  useEffect(() => {
    if (!exiting) return;
    let mq;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    if (!mq.matches) return;
    const t = window.setTimeout(finish, 80);
    return () => clearTimeout(t);
  }, [exiting, finish]);

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(finish, 800);
    return () => clearTimeout(t);
  }, [exiting, finish]);

  const onTransitionEnd = (e) => {
    if (e.propertyName !== 'opacity' || !exiting) return;
    finish();
  };

  return (
    <div
      className={`desktop-index-loader ${entered ? 'desktop-index-loader--entered' : ''} ${exiting ? 'desktop-index-loader--exit' : ''}`}
      onTransitionEnd={onTransitionEnd}
      role="status"
      aria-live="polite"
      aria-label="Loading index"
    >
      <span className="desktop-index-loader__logo">LOT2</span>
    </div>
  );
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

function TransitionLink({ to, className, children, onMouseEnter, onMouseLeave, onFocus, onBlur, onClick }) {
  const go = useTransitionNavigate();
  const location = useLocation();
  const handleClick = (e) => {
    onClick?.(e);
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
function IndexRowCells({ project }) {
  const cat = project.tags?.map((t) => CATEGORY_LABELS[t] || t).join(', ') || '—';
  return (
    <>
      <div className="index-cell index-cell-project">{project.name}</div>
      <div className="index-cell index-cell-categories">{cat}</div>
      <div className="index-cell index-cell-location">{project.city || project.location || '—'}</div>
      <div className="index-cell index-cell-year">{project.year || '—'}</div>
    </>
  );
}

function Home({ projects }) {
  const mobileTouch = useMobileTouchIndex();
  const goTo = useTransitionNavigate();
  const [hoveredProject, setHoveredProject] = useState(null);
  const imagesReady = usePreloadIndexImages(projects);
  const [desktopLoaderDone, setDesktopLoaderDone] = useState(false);
  const [showStart, setShowStart] = useState(() => {
    try {
      const navEntries = performance.getEntriesByType('navigation');
      const navType = navEntries?.[0]?.type || '';
      // If user reloads, treat it as re-entering the website.
      if (navType === 'reload') return true;
      return !sessionStorage.getItem('lot2_start_seen');
    } catch {
      return true;
    }
  });
  const firstCardRef = useRef(null);

  const dismissStart = useCallback(() => {
    setShowStart(false);
    requestAnimationFrame(() => {
      firstCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const handleSwipeIndexToInfo = useCallback(() => goTo('/info'), [goTo]);
  const swipeFromIndexEnabled =
    (!mobileTouch && desktopLoaderDone) || (mobileTouch && !showStart);
  const swipeFromIndex = useSwipeNavigation(
    swipeFromIndexEnabled ? handleSwipeIndexToInfo : null,
    null,
  );

  if (mobileTouch) {
    return (
      <div className="layout layout-index layout-index--touch">
        {!showStart && <SiteHeader />}

        <main className={`main index-main ${imagesReady ? 'index-main--ready' : ''}`}>
          <div className="mobile-index-cards">
            {projects.map((p, i) => {
              const file = p.indexImage || p.images[0];
              const typeKey = p.tags?.[0] || '';
              const typeLabel = typeKey ? CATEGORY_LABELS[typeKey] || typeKey : '—';
              return (
                <TransitionLink
                  key={p.path}
                  to={`/project/${encodeURIComponent(p.path)}`}
                  className="mobile-index-card"
                  onClick={() => {
                    try { sessionStorage.setItem('lot2_start_seen', '1'); } catch {}
                  }}
                >
                  <img
                    ref={i === 0 ? firstCardRef : undefined}
                    className="mobile-index-card__img"
                    src={imageUrl(p.path, file, false)}
                    alt=""
                    loading={i < 3 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchpriority={i < 3 ? 'high' : undefined}
                    onError={(e) => {
                      e.currentTarget.src = imageUrl(p.path, file, true);
                    }}
                  />
                  <div className="mobile-index-card__text">
                    <div className="mobile-index-card__name">{p.name}</div>
                    <div className="mobile-index-card__type">{typeLabel}</div>
                  </div>
                </TransitionLink>
              );
            })}
          </div>
        </main>

        <footer className="mobile-index-footer" aria-label="Contact">
          <div className="mobile-index-footer__line">44 Rue Beauregard, 75002 Paris, France</div>
          <div className="mobile-index-footer__line">
            <a className="mobile-index-footer__link" href="tel:+33623973028">
              +33 6 23 97 30 28
            </a>
          </div>
          <div className="mobile-index-footer__line">
            <a className="mobile-index-footer__link" href="mailto:hello@weare.io">
              hello@weare.io
            </a>
          </div>
        </footer>

        {showStart && <StartScreen onDismiss={dismissStart} />}

        <SwipeIndicator indicator={swipeFromIndex} />
      </div>
    );
  }

  const indexReady = imagesReady && desktopLoaderDone;

  return (
    <div className="layout layout-index">
      <SiteHeader />

      <main className={`main index-main ${indexReady ? 'index-main--ready' : ''}`}>
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
                <IndexRowCells project={project} />
              </TransitionLink>
            ))}
          </div>
        </div>
      </main>

      {hoveredProject && (
        <div key={hoveredProject.path} className="index-preview" aria-hidden>
          <img
            src={imageUrl(hoveredProject.path, hoveredProject.indexImage || hoveredProject.images[0], true)}
            alt=""
            decoding="async"
            fetchpriority="high"
            onError={(e) => {
              e.target.src = imageUrl(hoveredProject.path, hoveredProject.indexImage || hoveredProject.images[0], false);
            }}
          />
        </div>
      )}

      {!desktopLoaderDone && (
        <DesktopIndexLoader imagesReady={imagesReady} onComplete={() => setDesktopLoaderDone(true)} />
      )}

      <SwipeIndicator indicator={swipeFromIndex} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Info page (amsterdamberlin.com/info layout)                       */
/* ------------------------------------------------------------------ */
function InfoPage() {
  const goTo = useTransitionNavigate();
  const handleSwipeInfoToIndex = useCallback(() => goTo('/'), [goTo]);
  const swipeFromInfo = useSwipeNavigation(null, handleSwipeInfoToIndex);

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
          <div className="info-col">
            <h3 className="info-col-heading">We are</h3>
            <ul className="info-col-list">
              <li>Alex Alnx</li>
              <li>Alinna Tikhonova</li>
              <li>Ilyaz Duganov</li>
              <li>Skander Ben Yahia</li>
            </ul>
          </div>
        </div>

        <div className="info-footer-contact">
          <p className="info-address">44 Rue Beauregard, 75002 Paris, France</p>
          <a href="tel:+33623973028" className="info-phone">+33 6 23 97 30 28</a>
          <a href="mailto:hello@weare.io">hello@weare.io</a>
        </div>
      </main>

      <SwipeIndicator indicator={swipeFromInfo} />
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

/* v7_relativeSplatPath: silence Router warning. v7_startTransition stays false so location
   updates commit synchronously — required for View Transitions + flushSync to capture DOM. */
const ROUTER_FUTURE = {
  v7_startTransition: false,
  v7_relativeSplatPath: true,
};

/* ------------------------------------------------------------------ */
/*  App root                                                          */
/* ------------------------------------------------------------------ */
function App() {
  const { folders } = useProjects();
  const sorted = useMemo(
    () => sortByYear((folders || []).filter((p) => !isExcludedFromIndex(p))),
    [folders],
  );
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL} future={ROUTER_FUTURE}>
      <Routes>
        <Route path="/" element={<Home projects={sorted} />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="/project/:pathEnc" element={<ProjectDetail projects={sorted} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
