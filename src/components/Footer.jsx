import { useEffect, useRef } from 'react';

const LINE_1_WORDS = ['I', 'design', 'the', 'space', 'between', 'human'];
const LINE_2_WORDS = ['intent', '&', 'system', 'response.'];

const RULE_PATH = "M0,10.4 C18,9.1 34,11.8 54,10.2 C74,8.6 88,11.9 110,10.3 C132,8.7 148,12.0 172,10.1 C196,8.2 212,11.6 240,10.0 C268,8.4 284,11.7 314,10.2 C344,8.7 360,11.5 392,9.9 C424,8.3 440,11.8 474,10.3 C508,8.8 522,11.4 556,10.0 C590,8.6 606,11.7 640,10.2 C674,8.7 690,11.3 724,9.8 C758,8.3 772,11.6 806,10.1 C840,8.6 856,11.5 890,9.9 C924,8.3 940,11.7 974,10.2 C1008,8.7 1022,11.4 1056,9.9 C1090,8.4 1104,11.6 1138,10.1 C1172,8.6 1186,11.3 1220,9.8 C1254,8.3 1268,10.6 1280,10";

export default function Footer() {
  const wrapperRef = useRef(null);
  const ruleRef = useRef(null);
  const pathRef = useRef(null);
  const bottomRef = useRef(null);
  const wordRefs = useRef([]);
  const wiggleRAFRef = useRef(null);

  // Intersection observer — reveal on scroll into view
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const rule = ruleRef.current;
    const bottom = bottomRef.current;
    const words = wordRefs.current.filter(Boolean);
    if (!wrapper || !rule || !bottom) return;

    let triggered = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;

          // 1. Draw in the SVG rule
          rule.classList.add('visible');

          // 2. Cascade word reveals
          words.forEach((w, i) => {
            setTimeout(() => {
              w.classList.add('revealed', 'lit');
              setTimeout(() => w.classList.remove('lit'), 500);
            }, 200 + i * 60);
          });

          // 3. Bottom row fade in
          const totalWordDelay = 200 + words.length * 60;
          setTimeout(() => bottom.classList.add('visible'), totalWordDelay + 300);

          // 4. Settle text to static state
          setTimeout(() => {
            words.forEach(w => {
              w.style.transition = 'opacity 0.6s ease, transform 0.6s ease, color 0.6s ease';
              w.style.opacity = '1';
              w.style.transform = 'translateY(0)';
              w.style.color = '#eaeaea';
            });
          }, totalWordDelay + 900);

          observer.disconnect();
        }
      });
    }, { threshold: 0.2 });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // Rule hover — redraw path + wiggle words (desktop only)
  useEffect(() => {
    const rule = ruleRef.current;
    const path = pathRef.current;
    const words = wordRefs.current.filter(Boolean);
    if (!rule || !path) return;

    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    const onEnter = () => {
      path.style.transition = 'none';
      path.style.strokeDashoffset = '3000';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        path.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1) 0s';
        path.style.strokeDashoffset = '0';
        path.style.stroke = 'rgba(255,255,255,0.5)';
      }));

      if (isTouch) return;

      let wiggleStart = null;
      function wiggleWords(ts) {
        if (!wiggleStart) wiggleStart = ts;
        const elapsed = (ts - wiggleStart) / 1000;
        words.forEach((w, i) => {
          const phase = i * 0.45;
          const s = Math.sin(elapsed * Math.PI * 3 + phase);
          const c = Math.cos(elapsed * Math.PI * 2.5 + phase * 0.7);
          const bright = 200 + Math.round(s * 54);
          w.style.transition = 'none';
          w.style.transform = `translateY(${s * 6}px) skewX(${c * 4}deg)`;
          w.style.color = `rgb(${bright},${bright},${bright})`;
          w.style.letterSpacing = `${0.06 + c * 0.03}em`;
        });
        wiggleRAFRef.current = requestAnimationFrame(wiggleWords);
      }
      wiggleRAFRef.current = requestAnimationFrame(wiggleWords);
    };

    const onLeave = () => {
      path.style.stroke = 'rgba(255,255,255,0.18)';
      if (isTouch) return;
      cancelAnimationFrame(wiggleRAFRef.current);
      words.forEach(w => {
        w.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1), color 0.5s ease, letter-spacing 0.5s ease';
        w.style.transform = 'translateY(0) skewX(0deg)';
        w.style.color = '#eaeaea';
        w.style.letterSpacing = '0.06em';
      });
    };

    rule.addEventListener('mouseenter', onEnter);
    rule.addEventListener('mouseleave', onLeave);
    return () => {
      rule.removeEventListener('mouseenter', onEnter);
      rule.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(wiggleRAFRef.current);
    };
  }, []);

  // Proximity word scaling
  useEffect(() => {
    const words = wordRefs.current.filter(Boolean);
    const RADIUS = 120;

    const onMove = (e) => {
      words.forEach(w => {
        const rect = w.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
        if (dist < RADIUS) {
          const scale = 1 + (1 - dist / RADIUS) * 0.18;
          w.style.transform = `scale(${scale.toFixed(3)})`;
          w.style.transition = 'transform 0.15s ease-out';
        } else {
          w.style.transform = 'scale(1)';
          w.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
        }
      });
    };

    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  // Build flat word index across both lines
  let wordIdx = 0;

  return (
    <footer>
      <div className="about-wrapper" ref={wrapperRef}>

        {/* Animated SVG rule */}
        <div className="about-rule" ref={ruleRef}>
          <svg
            viewBox="0 0 1280 20"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '20px', display: 'block', overflow: 'visible' }}
          >
            <path
              ref={pathRef}
              className="about-rule-path"
              d={RULE_PATH}
              style={{
                stroke: 'rgba(255,255,255,0.18)',
                strokeWidth: '1.2',
                fill: 'none',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeDasharray: '3000',
                strokeDashoffset: '3000',
                transition: 'stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1) 0.2s',
              }}
            />
          </svg>
        </div>

        {/* Editorial statement */}
        <p className="about-statement">
          {LINE_1_WORDS.map(word => {
            const i = wordIdx++;
            return (
              <span key={word + i} className="word" ref={el => wordRefs.current[i] = el}>
                {word}
              </span>
            );
          })}
          <span className="line-2">
            {LINE_2_WORDS.map(word => {
              const i = wordIdx++;
              return (
                <span key={word + i} className="word" ref={el => wordRefs.current[i] = el}>
                  {word}
                </span>
              );
            })}
          </span>
        </p>

        {/* Bottom row */}
        <div className="about-bottom" ref={bottomRef}>
          <div className="about-copy">© 2024 Tosin Folorunso</div>
        </div>

      </div>
    </footer>
  );
}
