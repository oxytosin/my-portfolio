import { useRef, useEffect } from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Projects from './components/Projects';
import HoverCard from './components/HoverCard';
import Footer from './components/Footer';
import useFluidCanvas from './hooks/useFluidCanvas';
import useButterflyCanvas from './hooks/useButterflyCanvas';
import './App.css';

export default function App() {
  const fluidCanvasRef = useRef(null);
  const butterflyCanvasRef = useRef(null);
  const cursorRef = useRef(null);
  const hoverCardRef = useRef(null);
  const nameRef = useRef(null);
  const mainRef = useRef(null);
  const scrollProgressRef = useRef(null);

  useFluidCanvas(fluidCanvasRef);
  useButterflyCanvas(butterflyCanvasRef, nameRef);

  // Cursor position
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const onMove = (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Scroll: progress line + cursor hue shift
  useEffect(() => {
    const mainEl = mainRef.current;
    const progressLine = scrollProgressRef.current;
    const cursor = cursorRef.current;
    if (!mainEl) return;

    // Cursor hue shift — lerps between section accent colours
    const sections = [
      { selector: '.hero',               hue: '255,255,255' },
      { selector: '.projects-container', hue: '200,210,255' },
      { selector: 'footer',              hue: '180,230,255' },
    ];
    let currentHue = '255,255,255';
    let targetHue  = '255,255,255';
    let hueRAF = null;

    function parseHue(s) { return s.split(',').map(Number); }
    function lerpHue(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }

    function animateHue() {
      const a = parseHue(currentHue);
      const b = parseHue(targetHue);
      const lerped = lerpHue(a, b, 0.04);
      currentHue = lerped.join(',');
      if (cursor) cursor.style.background = `rgb(${currentHue})`;
      const done = lerped.every((v, i) => Math.abs(v - b[i]) <= 1);
      if (!done) hueRAF = requestAnimationFrame(animateHue);
    }

    const onScroll = () => {
      const scrollTop = mainEl.scrollTop;
      const scrollHeight = mainEl.scrollHeight - mainEl.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

      if (progressLine) progressLine.style.height = progress + '%';

      // Determine active section for hue
      if (cursor) {
        const scrollMid = scrollTop + window.innerHeight / 2;
        let best = sections[0];
        sections.forEach(s => {
          const el = document.querySelector(s.selector);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const elTop = scrollTop + rect.top;
          if (scrollMid >= elTop) best = s;
        });
        if (best.hue !== targetHue) {
          targetHue = best.hue;
          cancelAnimationFrame(hueRAF);
          hueRAF = requestAnimationFrame(animateHue);
        }
      }
    };

    mainEl.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mainEl.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(hueRAF);
    };
  }, []);

  return (
    <>
      <div className="scroll-progress-line" ref={scrollProgressRef} />
      <HoverCard ref={hoverCardRef} />
      <canvas ref={fluidCanvasRef} id="fluid-canvas" />
      <canvas ref={butterflyCanvasRef} id="butterfly-canvas" />
      <div ref={cursorRef} className="cursor" id="cursor" />
      <Nav />
      <main ref={mainRef}>
        <Hero nameRef={nameRef} />
        <Projects hoverCardRef={hoverCardRef} cursorRef={cursorRef} />
        <Footer />
      </main>
    </>
  );
}
