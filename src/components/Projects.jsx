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

  // Mobile scroll-activation — continuously tracks which project is
  // closest to viewport centre and drives both the hover effect and
  // the project card preview
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) return;

    const nodes = nodesRef.current.filter(Boolean);
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    let activeIndex = -1;
    let rafId = null;

    const update = () => {
      rafId = null;
      const viewH = window.innerHeight;
      const center = viewH / 2;

      let closest = -1;
      let closestDist = Infinity;

      nodes.forEach((node, i) => {
        const rect = node.getBoundingClientRect();
        const dist = Math.abs(center - (rect.top + rect.height / 2));
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });

      const newActive = closestDist < viewH * 0.42 ? closest : -1;
      if (newActive === activeIndex) return;

      if (activeIndex >= 0 && nodes[activeIndex]) {
        nodes[activeIndex].classList.remove('is-active');
      }

      activeIndex = newActive;

      if (newActive >= 0 && nodes[newActive]) {
        nodes[newActive].classList.add('is-active');
      }
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    mainEl.addEventListener('scroll', onScroll, { passive: true });
    update(); // run once on mount

    return () => {
      mainEl.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
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
