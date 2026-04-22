import { useState } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #F5F0E8;
    --ink: #1A1612;
    --gold: #B8960C;
    --charcoal: #2C2520;
    --muted: #7A6E65;
    --border: rgba(184,150,12,0.2);
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'Jost', sans-serif;
    background: var(--cream);
    color: var(--ink);
    font-weight: 300;
    overflow-x: hidden;
  }

  .fondue-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.4rem 3rem;
    background: rgba(245,240,232,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 0.5px solid var(--border);
  }

  .nav-logo {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.1rem;
    letter-spacing: 0.15em;
    color: var(--ink);
    font-weight: 400;
  }
  .nav-logo span { color: var(--gold); }

  .nav-links { display: flex; gap: 2.5rem; list-style: none; }
  .nav-links a {
    font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--muted); text-decoration: none; transition: color 0.2s;
  }
  .nav-links a:hover { color: var(--ink); }

  .nav-cta {
    font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase;
    padding: 0.6rem 1.5rem; border: 0.5px solid var(--gold);
    color: var(--gold); text-decoration: none; transition: all 0.2s; background: transparent; cursor: pointer;
  }
  .nav-cta:hover { background: var(--gold); color: var(--cream); }

  .hero {
    min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr;
    align-items: center; padding-top: 5rem;
  }

  .hero-left {
    padding: 6rem 4rem 6rem 6rem;
    display: flex; flex-direction: column; justify-content: center;
  }

  .hero-eyebrow {
    font-size: 0.7rem; letter-spacing: 0.25em; text-transform: uppercase;
    color: var(--gold); margin-bottom: 1.8rem;
    display: flex; align-items: center; gap: 1rem;
  }
  .hero-eyebrow::before {
    content: ''; display: block; width: 2.5rem; height: 0.5px; background: var(--gold);
  }

  .hero-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(3.2rem, 5vw, 5rem); font-weight: 300;
    line-height: 1.08; color: var(--ink); margin-bottom: 0.4rem;
  }
  .hero-title em { font-style: italic; color: var(--gold); }

  .hero-chinese {
    font-family: 'Cormorant Garamond', serif; font-size: 1.5rem;
    font-weight: 300; color: var(--muted); letter-spacing: 0.3em; margin-bottom: 2.4rem;
  }

  .hero-desc {
    font-size: 0.9rem; line-height: 1.9; color: var(--muted);
    max-width: 38ch; margin-bottom: 3rem;
  }

  .hero-actions { display: flex; gap: 1rem; align-items: center; }

  .btn-primary {
    font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase;
    padding: 1rem 2.2rem; background: var(--ink); color: var(--cream);
    text-decoration: none; transition: all 0.25s; display: inline-block;
  }
  .btn-primary:hover { background: var(--charcoal); }

  .btn-ghost {
    font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase;
    padding: 1rem 2.2rem; border: 0.5px solid var(--ink); color: var(--ink);
    text-decoration: none; transition: all 0.25s; display: inline-block;
  }
  .btn-ghost:hover { background: var(--ink); color: var(--cream); }

  .hero-right { height: 100vh; position: relative; overflow: hidden; }

  .hero-img-container { width: 100%; height: 100%; position: relative; }
  .hero-img-container img {
    width: 100%; height: 100%; object-fit: cover;
    filter: brightness(0.88) contrast(1.05);
  }

  .hero-img-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to right, var(--cream) 0%, transparent 30%);
  }

  .hero-badge {
    position: absolute; bottom: 3rem; right: 3rem;
    width: 110px; height: 110px; border: 0.5px solid rgba(184,150,12,0.5);
    border-radius: 50%; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: rgba(245,240,232,0.85); backdrop-filter: blur(8px); text-align: center;
  }
  .hero-badge-stars { color: var(--gold); font-size: 0.9rem; letter-spacing: 2px; }
  .hero-badge-num { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 300; color: var(--ink); line-height: 1; }
  .hero-badge-label { font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-top: 2px; }

  .divider { display: flex; align-items: center; gap: 1.5rem; padding: 0 6rem; }
  .divider-line { flex: 1; height: 0.5px; background: var(--border); }
  .divider-icon { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; color: var(--gold); }

  .broths { padding: 7rem 6rem; }

  .section-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 4rem; }
  .section-eyebrow { font-size: 0.7rem; letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.8rem; }
  .section-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2.2rem, 3.5vw, 3rem); font-weight: 300; line-height: 1.1; color: var(--ink); }
  .section-sub { font-size: 0.85rem; color: var(--muted); max-width: 30ch; line-height: 1.7; text-align: right; }

  .broth-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: var(--border); border: 0.5px solid var(--border); }

  .broth-card { background: var(--cream); padding: 2rem 1.5rem; display: flex; flex-direction: column; gap: 0.8rem; transition: background 0.25s; cursor: default; }
  .broth-card:hover { background: var(--ink); }
  .broth-card:hover .broth-name,
  .broth-card:hover .broth-num { color: var(--cream); }
  .broth-card:hover .broth-dot { background: var(--gold); }
  .broth-card:hover .broth-desc { color: rgba(245,240,232,0.55); }
  .broth-num { font-family: 'Cormorant Garamond', serif; font-size: 0.75rem; color: var(--gold); letter-spacing: 0.1em; }
  .broth-dot { width: 28px; height: 1px; background: var(--gold); transition: background 0.25s; }
  .broth-name { font-family: 'Cormorant Garamond', serif; font-size: 1.25rem; font-weight: 400; color: var(--ink); line-height: 1.2; transition: color 0.25s; }
  .broth-desc { font-size: 0.75rem; color: var(--muted); line-height: 1.7; transition: color 0.25s; }

  .menu-section { padding: 6rem 6rem; background: var(--ink); color: var(--cream); }
  .menu-section .section-eyebrow { color: var(--gold); }
  .menu-section .section-title { color: var(--cream); }
  .menu-section .section-sub { color: rgba(245,240,232,0.4); }

  .menu-tabs { display: flex; gap: 0; margin-bottom: 3rem; border-bottom: 0.5px solid rgba(245,240,232,0.1); }
  .menu-tab {
    font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase;
    padding: 1rem 1.8rem; color: rgba(245,240,232,0.4); cursor: pointer;
    border: none; border-bottom: 1px solid transparent; margin-bottom: -0.5px;
    transition: all 0.2s; background: none; font-family: 'Jost', sans-serif;
  }
  .menu-tab.active { color: var(--gold); border-bottom-color: var(--gold); }
  .menu-tab:hover { color: rgba(245,240,232,0.7); }

  .menu-items { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .menu-item { display: flex; justify-content: space-between; align-items: baseline; padding: 1.4rem 0; border-bottom: 0.5px solid rgba(245,240,232,0.07); gap: 1rem; }
  .menu-item:nth-child(odd) { padding-right: 3rem; }
  .menu-item:nth-child(even) { padding-left: 3rem; }
  .menu-item-name { font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; font-weight: 400; color: var(--cream); letter-spacing: 0.02em; }
  .menu-item-dots { flex: 1; border-bottom: 0.5px dotted rgba(245,240,232,0.15); margin-bottom: 3px; }
  .menu-item-price { font-size: 0.8rem; letter-spacing: 0.05em; color: var(--gold); white-space: nowrap; }

  .info-strip { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 0.5px solid var(--border); border-bottom: 0.5px solid var(--border); }
  .info-cell { padding: 3rem 4rem; border-right: 0.5px solid var(--border); display: flex; flex-direction: column; gap: 0.6rem; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold); }
  .info-value { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 300; color: var(--ink); line-height: 1.3; }
  .info-sub { font-size: 0.78rem; color: var(--muted); line-height: 1.6; }

  .story { padding: 8rem 6rem; display: grid; grid-template-columns: 1fr 1.4fr; gap: 8rem; align-items: center; }
  .story-img-frame { border: 0.5px solid var(--border); padding: 1.2rem; position: relative; }
  .story-img-placeholder { width: 100%; aspect-ratio: 3/4; background: #E8E2D8; display: flex; align-items: center; justify-content: center; }
  .story-img-label { font-family: 'Cormorant Garamond', serif; font-size: 4rem; color: rgba(26,22,18,0.12); font-weight: 300; text-align: center; }
  .story-year { position: absolute; bottom: -1.5rem; right: -2rem; font-family: 'Cormorant Garamond', serif; font-size: 6rem; font-weight: 300; color: var(--border); line-height: 1; pointer-events: none; }
  .story-body { font-size: 0.9rem; line-height: 2; color: var(--muted); margin-bottom: 2.5rem; }
  .story-highlight { border-left: 1px solid var(--gold); padding-left: 1.5rem; font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-style: italic; font-weight: 300; color: var(--ink); line-height: 1.5; }

  .fondue-footer { background: var(--charcoal); color: var(--cream); padding: 4rem 6rem 2.5rem; display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 4rem; }
  .footer-brand { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 300; letter-spacing: 0.05em; color: var(--cream); margin-bottom: 1rem; }
  .footer-brand span { color: var(--gold); }
  .footer-tagline { font-size: 0.78rem; color: rgba(245,240,232,0.4); line-height: 1.8; max-width: 28ch; margin-bottom: 2rem; }
  .footer-cta-link { font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; transition: gap 0.2s; }
  .footer-cta-link:hover { gap: 1rem; }
  .footer-col-title { font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(245,240,232,0.3); margin-bottom: 1.2rem; }
  .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 0.7rem; }
  .footer-col ul li, .footer-col ul a { font-size: 0.85rem; color: rgba(245,240,232,0.6); text-decoration: none; transition: color 0.2s; }
  .footer-col ul a:hover { color: var(--cream); }
  .footer-bottom { grid-column: 1/-1; border-top: 0.5px solid rgba(245,240,232,0.08); padding-top: 2rem; display: flex; justify-content: space-between; align-items: center; }
  .footer-copy { font-size: 0.72rem; color: rgba(245,240,232,0.25); letter-spacing: 0.05em; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .hero-left > * { animation: fadeUp 0.7s ease both; }
  .hero-left > *:nth-child(1) { animation-delay: 0.1s; }
  .hero-left > *:nth-child(2) { animation-delay: 0.22s; }
  .hero-left > *:nth-child(3) { animation-delay: 0.34s; }
  .hero-left > *:nth-child(4) { animation-delay: 0.46s; }
  .hero-left > *:nth-child(5) { animation-delay: 0.58s; }
`;

const MENU_DATA = {
  chef: [
    { name: "American Wagyu Short Rib", price: "$25.99" },
    { name: "Australia Wagyu Chuck Eye Roll", price: "$17.99" },
    { name: "American Wagyu Brisket", price: "$16.99" },
    { name: "American Choice Chuck Tail Flap", price: "$16.99" },
    { name: "Australia Wagyu Chuck Tail Flap", price: "$18.99" },
    { name: "USDA Prime Ribeye End", price: "$15.99" },
    { name: "USDA Prime Top Blade", price: "$12.99" },
    { name: "USDA Prime Brisket", price: "$12.99" },
  ],
  snacks: [
    { name: "Fried Oyster", price: "$12.99" },
    { name: "Tempura Shrimp", price: "$9.99" },
    { name: "Braised Beef Shank", price: "$9.99" },
    { name: "Sweet Brown Sugar Sticky Rice", price: "$10.99" },
    { name: "House-Made Fried Pork Belly", price: "$9.99" },
  ],
  veggie: [
    { name: "Spinach", price: "$6.99" },
    { name: "Tongho", price: "$4.99" },
    { name: "Baby Cabbage", price: "$4.99" },
    { name: "Napa Cabbage", price: "$4.99" },
    { name: "Lettuce", price: "$4.99" },
  ],
  rice: [
    { name: "Fried Rice with Egg", price: "$9.99" },
    { name: "Glass Noodles", price: "$4.99" },
    { name: "Yam Pasta", price: "$6.99" },
    { name: "Handmade Noodle", price: "$3.99" },
    { name: "Hot Pot Dumplings", price: "$9.99" },
  ],
};

const BROTHS = [
  { num: "01", name: "Classic Chicken Broth", desc: "A light, golden base that lets your ingredients speak." },
  { num: "02", name: "Spicy Sichuan Broth", desc: "Numbing peppercorn heat meets deep, slow-rendered tallow." },
  { num: "03", name: "Herbal Mushroom Broth", desc: "Earthy and restorative, built on forest mushrooms and herbs." },
  { num: "04", name: "Tomato Broth", desc: "Bright acidity balanced with a touch of natural sweetness." },
  { num: "05", name: "Bone Marrow Broth", desc: "Rich, gelatinous, and deeply savory. Our most indulgent base." },
];

const TABS = [
  { id: "chef", label: "Chef's Picks" },
  { id: "snacks", label: "Snacks" },
  { id: "veggie", label: "Veggie" },
  { id: "rice", label: "Rice & Noodle" },
];

export default function FondueRestaurant() {
  const [activeTab, setActiveTab] = useState("chef");

  return (
    <>
      <style>{styles}</style>

      {/* NAV */}
      <nav className="fondue-nav">
        <div className="nav-logo">千王府 <span>·</span> Fondue Chinoise</div>
        <ul className="nav-links">
          <li><a href="#broths">Broths</a></li>
          <li><a href="#menu">Menu</a></li>
          <li><a href="#story">Our Story</a></li>
          <li><a href="#visit">Visit</a></li>
        </ul>
        <a
          href="https://www.yelp.com/reservations/fondue-chinoise-san-francisco"
          className="nav-cta"
          target="_blank"
          rel="noreferrer"
        >
          Reserve a Table
        </a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow">San Francisco's First Authentic Chongqing Hot Pot</div>
          <h1 className="hero-title">
            Fire. Broth.<br /><em>Ritual.</em>
          </h1>
          <div className="hero-chinese">千王府</div>
          <p className="hero-desc">
            Authentic Chongqing 9-Grid beef tallow hot pot, crafted from scratch with Wagyu beef
            and generations of culinary heritage — in the heart of San Francisco.
          </p>
          <div className="hero-actions">
            <a href="http://pos.chowbus.com/online-ordering/store/Fondue-Chinoise/21813" className="btn-primary" target="_blank" rel="noreferrer">
              Order Now
            </a>
            <a href="https://www.yelp.com/reservations/fondue-chinoise-san-francisco" className="btn-ghost" target="_blank" rel="noreferrer">
              Make a Reservation
            </a>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-container">
            <img
              src="https://img1.wsimg.com/isteam/ip/9855ef43-7657-4962-acf4-09b3c32c03a6/o-24d5f54.jpg"
              alt="Chongqing hot pot at 千王府"
            />
            <div className="hero-img-overlay" />
          </div>
          <div className="hero-badge">
            <div className="hero-badge-stars">★★★★★</div>
            <div className="hero-badge-num">5.0</div>
            <div className="hero-badge-label">Guest Rating</div>
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="divider">
        <div className="divider-line" />
        <div className="divider-icon">⬡</div>
        <div className="divider-line" />
      </div>

      {/* BROTHS */}
      <section className="broths" id="broths">
        <div className="section-header">
          <div>
            <div className="section-eyebrow">The Foundation</div>
            <h2 className="section-title">Choose Your<br />Signature Broth</h2>
          </div>
          <p className="section-sub">
            Each broth simmers for hours before your arrival. Select your vessel, then fill it with the finest cuts.
          </p>
        </div>
        <div className="broth-grid">
          {BROTHS.map((b) => (
            <div className="broth-card" key={b.num}>
              <div className="broth-num">{b.num}</div>
              <div className="broth-dot" />
              <div className="broth-name">{b.name}</div>
              <div className="broth-desc">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MENU */}
      <section className="menu-section" id="menu">
        <div className="section-header" style={{ marginBottom: "2.5rem" }}>
          <div>
            <div className="section-eyebrow">The Kitchen</div>
            <h2 className="section-title" style={{ color: "var(--cream)" }}>Curated Selection</h2>
          </div>
          <p className="section-sub">Sourced with intention,<br />prepared with precision.</p>
        </div>

        <div className="menu-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`menu-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="menu-items">
          {MENU_DATA[activeTab].map((item, i) => (
            <div className="menu-item" key={i}>
              <span className="menu-item-name">{item.name}</span>
              <div className="menu-item-dots" />
              <span className="menu-item-price">{item.price}</span>
            </div>
          ))}
        </div>
      </section>

      {/* INFO STRIP */}
      <section className="info-strip" id="visit">
        <div className="info-cell">
          <div className="info-label">Location</div>
          <div className="info-value">430 Broadway<br />San Francisco</div>
          <div className="info-sub">CA 94133 · North Beach</div>
        </div>
        <div className="info-cell">
          <div className="info-label">Hours</div>
          <div className="info-value">12:00 PM – 12:00 AM</div>
          <div className="info-sub">Open Daily · Last seating at 11:00 PM</div>
        </div>
        <div className="info-cell">
          <div className="info-label">Reservations</div>
          <div className="info-value">(415) 217-8888</div>
          <div className="info-sub">Walk-ins welcome based on availability</div>
        </div>
      </section>

      {/* STORY */}
      <section className="story" id="story">
        <div className="story-left">
          <div className="story-img-frame">
            <div className="story-img-placeholder">
              <div className="story-img-label">千王府</div>
            </div>
          </div>
          <div className="story-year">九格</div>
        </div>
        <div className="story-right">
          <div className="section-eyebrow">Our Philosophy</div>
          <h2 className="section-title" style={{ marginBottom: "2rem", fontSize: "clamp(2rem, 3vw, 2.8rem)" }}>
            Tradition Carried<br />Across an Ocean
          </h2>
          <p className="story-body">
            千王府 was founded on a single belief: that the most meaningful meals are shared around a communal flame.
            Our 9-grid Chongqing hot pot is not simply a dish — it is a ritual, a conversation, an invitation to slow down.
          </p>
          <p className="story-body">
            We render our beef tallow in-house. Our Wagyu is selected for marbling, texture, and provenance.
            Every dipping sauce is made from scratch each morning. Nothing here is accidental.
          </p>
          <div className="story-highlight">
            "The broth remembers everything the cook put into it."
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="fondue-footer">
        <div>
          <div className="footer-brand">千王府 <span>·</span> Fondue Chinoise</div>
          <p className="footer-tagline">
            San Francisco's first authentic Chongqing 9-Grid beef tallow hot pot experience.
          </p>
          <a
            href="http://pos.chowbus.com/online-ordering/store/Fondue-Chinoise/21813"
            className="footer-cta-link"
            target="_blank"
            rel="noreferrer"
          >
            Order Online →
          </a>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Navigate</div>
          <ul>
            <li><a href="#broths">Our Broths</a></li>
            <li><a href="#menu">Full Menu</a></li>
            <li><a href="#story">Our Story</a></li>
            <li><a href="#visit">Visit Us</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Contact</div>
          <ul>
            <li>430 Broadway, SF CA 94133</li>
            <li>(415) 217-8888</li>
            <li>12:00 PM – Midnight Daily</li>
          </ul>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2025 千王府 · Fondue Chinoise · All rights reserved</div>
          <div className="footer-copy">Chongqing Hot Pot · San Francisco</div>
        </div>
      </footer>
    </>
  );
}
