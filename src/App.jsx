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
  const sendEmailRef = useRef(null);

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

  // Scroll: progress line + floating email + cursor hue shift
  useEffect(() => {
    const mainEl = mainRef.current;
    const progressLine = scrollProgressRef.current;
    const emailBtn = sendEmailRef.current;
    const cursor = cursorRef.current;
    if (!mainEl) return;

    // Floating email state machine
    let isFloating = false;
    let floatTimer = null;

    function showFloating() {
      if (isFloating || !emailBtn) return;
      isFloating = true;
      clearTimeout(floatTimer);
      emailBtn.classList.add('is-transitioning-out');
      floatTimer = setTimeout(() => {
        emailBtn.classList.remove('is-transitioning-out');
        emailBtn.classList.add('is-floating');
        requestAnimationFrame(() => requestAnimationFrame(() => {
          emailBtn.classList.add('is-visible');
        }));
      }, 350);
    }

    function hideFloating() {
      if (!isFloating || !emailBtn) return;
      isFloating = false;
      clearTimeout(floatTimer);
      emailBtn.classList.remove('is-visible');
      emailBtn.classList.add('is-hiding');
      floatTimer = setTimeout(() => {
        emailBtn.classList.remove('is-floating', 'is-hiding');
      }, 350);
    }

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

      if (scrollTop > 80) showFloating();
      else hideFloating();

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
      clearTimeout(floatTimer);
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
      <Nav sendEmailRef={sendEmailRef} />
      <main ref={mainRef}>
        <Hero nameRef={nameRef} />
        <Projects hoverCardRef={hoverCardRef} cursorRef={cursorRef} />
        <Footer />
      </main>
    </>
  );
}
