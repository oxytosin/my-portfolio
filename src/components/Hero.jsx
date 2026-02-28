// Space char between "Tosin" and "Folorunso" gets explicit right margin
// to match the letter-spacing: 0.8em layout from the design
const CHARS = ['T','o','s','i','n',' ','F','o','l','o','r','u','n','s','o'];

export default function Hero({ nameRef }) {
  return (
    <section className="hero">
      <div className="hero-decoration" />
      <h1 className="hero-name" ref={nameRef}>
        {CHARS.map((char, i) => (
          <span
            key={i}
            className="letter"
            style={char === ' ' ? { marginRight: '0.8em' } : undefined}
          >
            {char}
          </span>
        ))}
      </h1>
      <div className="hero-meta">
        <span>Senior UX Designer</span>
        <span>Currently at Thomson Reuters</span>
      </div>
      <div className="hero-decoration-bottom" />
      <div className="scroll-hint">SCROLL TO EXPLORE</div>
    </section>
  );
}
