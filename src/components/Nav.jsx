import { useState, useEffect } from 'react';

const MENU_ITEMS = [
  { ordinal: '01', label: 'LinkedIn', href: 'https://linkedin.com', external: true },
  { ordinal: '02', label: 'Get in Touch', href: 'mailto:tosin@example.com', external: false },
];

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      <nav className="nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1001,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '28px 48px',
      }}>
        <span className="nav-name" style={{
          fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: '#eaeaea', fontWeight: 300,
        }}>
          Tosin Folorunso
        </span>

        <button
          className={`menu-toggle${isOpen ? ' open' : ''}`}
          onClick={() => setIsOpen(o => !o)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          <span className="menu-toggle-line" />
          <span className="menu-toggle-line" />
        </button>
      </nav>

      {/* Full-screen overlay */}
      <div className={`menu-overlay${isOpen ? ' open' : ''}`} role="dialog" aria-modal="true">
        <div className="menu-overlay-links">
          {MENU_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="menu-overlay-link"
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              onClick={() => setIsOpen(false)}
            >
              <span className="menu-overlay-ordinal">{item.ordinal}</span>
              <span className="menu-overlay-label">{item.label}</span>
              <span className="menu-overlay-arrow">↗</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
