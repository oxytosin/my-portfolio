import { useEffect } from 'react';

export default function useButterflyCanvas(canvasRef, nameRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    const onMouseMove = (e) => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener('mousemove', onMouseMove);

    const sprinkles = [];
    const colors = ['#ff6ec7','#ffd700','#7efff5','#b388ff','#ff8a65','#69f0ae','#40c4ff','#f06292'];

    let waypoints = [];
    let t = 0;
    let wingFlap = 0;
    let done = false;
    let started = false;

    function buildWaypoints() {
      const nameEl = nameRef.current;
      if (!nameEl) return;
      const rect = nameEl.getBoundingClientRect();
      const text = 'TOSIN FOLORUNSO';
      const totalW = rect.width;
      const charW = totalW / text.length;

      const startX = rect.left + charW * 0.5;
      const startY = rect.top + rect.height * 0.3;
      const endX = rect.left + charW * 14.7;
      const endY = rect.top + rect.height * 0.55 - 28;
      const midX = (startX + endX) / 2;

      waypoints = [
        { x: startX,                            y: startY },
        { x: startX + (endX - startX) * 0.15,  y: startY - 60 },
        { x: midX - 80,                          y: rect.top - 40 },
        { x: midX,                               y: rect.top + rect.height * 0.2 },
        { x: midX + 80,                          y: rect.bottom - 20 },
        { x: endX - (endX - startX) * 0.15,     y: endY + 50 },
        { x: endX,                               y: endY },
      ];
    }

    function catmullRom(p0, p1, p2, p3, t) {
      const t2 = t * t, t3 = t2 * t;
      return {
        x: 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y: 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
      };
    }

    function getPoint(progress) {
      const pts = waypoints;
      const segments = pts.length - 1;
      const scaled = progress * segments;
      const seg = Math.min(Math.floor(scaled), segments - 1);
      const localT = scaled - seg;
      const p0 = pts[Math.max(0, seg - 1)];
      const p1 = pts[seg];
      const p2 = pts[Math.min(pts.length - 1, seg + 1)];
      const p3 = pts[Math.min(pts.length - 1, seg + 2)];
      return catmullRom(p0, p1, p2, p3, localT);
    }

    const letterTimers = new Map();

    function splashLetters(x, y, color) {
      if (!nameRef.current) return;
      const letterEls = nameRef.current.querySelectorAll('.letter');
      letterEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
        if (dist < 38) {
          el.style.color = color;
          el.style.textShadow = `0 0 12px ${color}`;
          if (letterTimers.has(el)) clearTimeout(letterTimers.get(el));
          const tid = setTimeout(() => {
            el.style.color = '#eaeaea';
            el.style.textShadow = 'none';
            letterTimers.delete(el);
          }, 600);
          letterTimers.set(el, tid);
        }
      });
    }

    function spawnSprinkle(x, y) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      splashLetters(x, y, color);
      for (let i = 0; i < 3; i++) {
        sprinkles.push({
          x, y,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3 - 1,
          r: Math.random() * 3 + 1,
          color,
          life: 1,
          decay: Math.random() * 0.02 + 0.01,
        });
      }
    }

    function drawButterfly(x, y, flap, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const wingSpread = 18 + Math.sin(flap) * 10;
      const wingH = 12;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-wingSpread, -wingH, -wingSpread * 1.2, wingH * 0.5, 0, wingH * 0.3);
      ctx.fillStyle = 'rgba(180,120,255,0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,160,255,0.6)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-wingSpread * 0.8, wingH * 0.5, -wingSpread * 0.6, wingH * 1.5, 0, wingH * 0.6);
      ctx.fillStyle = 'rgba(255,180,80,0.75)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(wingSpread, -wingH, wingSpread * 1.2, wingH * 0.5, 0, wingH * 0.3);
      ctx.fillStyle = 'rgba(100,220,255,0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,240,255,0.6)';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(wingSpread * 0.8, wingH * 0.5, wingSpread * 0.6, wingH * 1.5, 0, wingH * 0.6);
      ctx.fillStyle = 'rgba(255,120,180,0.75)';
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, wingH * 0.3, 2, wingH * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-2, -2); ctx.lineTo(-8, -14);
      ctx.moveTo(2, -2);  ctx.lineTo(8, -14);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-8, -14, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, -14, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();

      ctx.restore();
    }

    let lastX = 0, lastY = 0, frameCount = 0;
    let animId;

    const startTimer = setTimeout(() => {
      buildWaypoints();
      if (waypoints.length > 0) started = true;
    }, 2500);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = sprinkles.length - 1; i >= 0; i--) {
        const s = sprinkles[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.08;
        s.life -= s.decay;
        if (s.life <= 0) { sprinkles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.restore();
      }

      if (started && !done) {
        t += 0.004;
        if (t >= 1) { t = 1; done = true; }
        const pos = getPoint(t);
        wingFlap += 0.25;
        const dx = pos.x - lastX;
        const dy = pos.y - lastY;
        const angle = Math.atan2(dy, dx);
        frameCount++;
        if (frameCount % 3 === 0) spawnSprinkle(pos.x, pos.y);
        drawButterfly(pos.x, pos.y, wingFlap, angle);
        lastX = pos.x;
        lastY = pos.y;
      }

      if (done) {
        const restPos = waypoints[waypoints.length - 1];
        const restX = restPos.x;
        const restY = restPos.y - 22;
        const mdx = mouseX - restX;
        const mdy = mouseY - restY;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        let restAngle = 0;
        if (dist < 180) {
          restAngle = Math.atan2(mdy, mdx);
          wingFlap += 0.12;
        } else {
          wingFlap += 0.04;
        }
        drawButterfly(restX, restY, wingFlap, restAngle);
      }

      animId = requestAnimationFrame(animate);
    }

    animate();

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildWaypoints();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(startTimer);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
    };
  }, [canvasRef, nameRef]);
}
