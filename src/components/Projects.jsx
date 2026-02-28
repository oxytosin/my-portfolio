import { useEffect, useRef } from 'react';
import digitaImg from '../assets/project cards/Digita.png';
import unionBankImg from '../assets/project cards/Union bank.png';
import deepviewImg from '../assets/project cards/Deepview.png';
import indeedLogoUrl from '../assets/Indeed/Indeed_Logo_0.svg';

const PROJECTS = [
  {
    ordinal: '01',
    title: 'Digita',
    meta: ['Tax software'],
    description: 'Designing a tax software for the UK market',
    image: digitaImg,
  },
  {
    ordinal: '02',
    title: 'Union Bank',
    meta: ['Mobile banking'],
    description: 'Redesigning the mobile banking experience',
    image: unionBankImg,
  },
  {
    ordinal: '03',
    title: 'Deepview',
    meta: ['Website design'],
    description: 'Website design',
    image: deepviewImg,
  },
  {
    ordinal: '04',
    title: 'Indeed AD',
    meta: ['UX research'],
    description: 'UX research for the Adcentral to Salesforce migration',
    image: indeedLogoUrl,
    isLogo: true,
  },
];

export default function Projects({ hoverCardRef, cursorRef }) {
  const nodesRef = useRef([]);

  // Mobile scroll-driven animation — continuous interpolation so colour
  // flows smoothly between projects as you scroll (no binary snap).
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) return;

    const nodes = nodesRef.current.filter(Boolean);
    if (!nodes.length) return;

    let rafId = null;

    // smoothstep: s-curve easing for a natural feel
    const smoothstep = t => t * t * (3 - 2 * t);

    const update = () => {
      rafId = null;
      const viewH = window.innerHeight;
      const center = viewH / 2;
      // Activity falls to 0 when a node centre is this far from viewport centre
      const threshold = viewH * 0.45;

      nodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        const dist = Math.abs(center - (rect.top + rect.height / 2));
        const raw = Math.max(0, 1 - dist / threshold);
        const t = smoothstep(raw); // 0 = fully inactive, 1 = fully active

        const title = node.querySelector('.project-title');
        const arrow = node.querySelector('.project-arrow');
        const meta  = node.querySelectorAll('.project-meta p');

        if (title) {
          // Colour: faint → white
          const alpha = 0.25 + t * 0.75;
          title.style.color = `rgba(255,255,255,${alpha.toFixed(3)})`;
          // Letter-spacing: gentle expansion so it doesn't overflow
          const ls = 0.1 + t * 0.12;
          title.style.letterSpacing = `${ls.toFixed(3)}em`;
        }

        if (arrow) {
          // Arrow only appears in the final 30% of the activity range
          const arrowT = Math.max(0, (t - 0.7) / 0.3);
          arrow.style.opacity = arrowT.toFixed(3);
        }

        meta.forEach(p => {
          const a = 0.25 + t * 0.35;
          p.style.color = `rgba(255,255,255,${a.toFixed(3)})`;
        });
      });
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    // scroll on main + touchmove on window for iOS Safari reliability
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchmove', onScroll, { passive: true });
    update(); // set initial state

    return () => {
      if (mainEl) mainEl.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchmove', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
      // Reset inline styles
      nodes.forEach(node => {
        const title = node.querySelector('.project-title');
        const arrow = node.querySelector('.project-arrow');
        const meta  = node.querySelectorAll('.project-meta p');
        if (title) { title.style.color = ''; title.style.letterSpacing = ''; }
        if (arrow) arrow.style.opacity = '';
        meta.forEach(p => { p.style.color = ''; });
      });
    };
  }, [hoverCardRef]);

  useEffect(() => {
    const nodes = nodesRef.current;
    const hoverCard = hoverCardRef.current;
    const cursor = cursorRef.current;
    if (!hoverCard || !cursor) return;

    const imgEl = hoverCard.querySelector('#hover-card-img');
    const titleEl = hoverCard.querySelector('#hover-card-title');
    const metaEl = hoverCard.querySelector('#hover-card-meta');

    const handlers = nodes.map((node, index) => {
      if (!node) return null;

      const onEnter = () => {
        cursor.classList.add('hovered');
        imgEl.src = node.dataset.image;
        imgEl.classList.toggle('logo-mode', !!PROJECTS[index]?.isLogo);
        // Strip the arrow glyph from the displayed title
        titleEl.textContent = node.querySelector('.project-title').textContent.replace('↗', '').trim();
        metaEl.textContent = PROJECTS[index]?.description ?? '';

        const rect = node.getBoundingClientRect();
        const cardWidth = 260;
        const cardHeight = 230;
        const isRight = index % 2 !== 0;

        // Use viewport-percentage positions matching the design
        const x = isRight ? window.innerWidth * 0.72 : window.innerWidth * 0.08;
        const y = rect.top + (rect.height / 2) - 110;

        // Clamp on smaller viewports so card never clips edges
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const MARGIN = Math.min(16, vw * 0.03);
        const finalX = vw < 1024
          ? Math.min(Math.max(x, MARGIN), vw - cardWidth - MARGIN)
          : x;
        const finalY = vw < 1024
          ? Math.min(Math.max(y, MARGIN), vh - cardHeight - MARGIN)
          : y;

        hoverCard.style.left = finalX + 'px';
        hoverCard.style.top = finalY + 'px';
        hoverCard.classList.add('visible');
      };

      const onLeave = () => {
        cursor.classList.remove('hovered');
        hoverCard.classList.remove('visible');
      };

      node.addEventListener('mouseenter', onEnter);
      node.addEventListener('mouseleave', onLeave);
      return { node, onEnter, onLeave };
    });

    return () => {
      handlers.forEach(h => {
        if (!h) return;
        h.node.removeEventListener('mouseenter', h.onEnter);
        h.node.removeEventListener('mouseleave', h.onLeave);
      });
    };
  }, [hoverCardRef, cursorRef]);

  return (
    <section className="projects-container">
      <div className="section-label">Selected Works</div>
      {PROJECTS.map((project, i) => (
        <div
          key={project.title}
          className="project-node"
          data-image={project.image}
          ref={el => nodesRef.current[i] = el}
        >
          <span className="project-ordinal">{project.ordinal}</span>
          <h2 className="project-title">
            {project.title}
            <span className="project-arrow">↗</span>
          </h2>
          <div className="project-meta">
            {project.meta.map(m => <p key={m}>{m}</p>)}
          </div>
        </div>
      ))}
    </section>
  );
}
