import React, { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import BathroomMap2D from './BathroomMap2D';
import Bathroom3D from './Bathroom3D';
import './App.css';

const STYLES = [
  'Minimalist Modern',
  'Classic Luxury',
  'Japanese Zen',
  'Industrial Chic'
];

const FIXTURE_IMAGES = {
  faucet: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=700&q=80',
  shower: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=700&q=80',
  toilet: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=700&q=80',
  vanity: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=700&q=80'
};

const CATEGORIES = ['all', 'faucets', 'showers', 'toilets', 'vanities'];

export default function App() {
  const [is3DView, setIs3DView] = useState(false);
  const [width, setWidth] = useState(8);
  const [depth, setDepth] = useState(6);
  const [budget, setBudget] = useState(3000);
  const [style, setStyle] = useState(STYLES[0]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeSpecProduct, setActiveSpecProduct] = useState(null);

  // Full Catalog State
  const [catalog, setCatalog] = useState({ faucets: [], showers: [], toilets: [], vanities: [] });
  const [selectedCategory, setSelectedCategory] = useState('faucets');

  const cursorRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const bgImageRef = useRef(null);

  // 1. Fetch full catalog from backend with error handling
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/catalog')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const hasItems = Object.values(data || {}).some(arr => Array.isArray(arr) && arr.length > 0);
        if (hasItems) {
          setCatalog(data);
        } else {
          console.warn("Catalog API returned empty categories. Check products.json path in backend.");
        }
      })
      .catch((err) => {
        console.error("Could not fetch catalog from /api/catalog:", err);
      });
  }, []);

  // 2. Lenis, Follower Cursor, and Parallax
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const cursor = cursorRef.current;
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.18, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.18, ease: "power3" });

    const bgX = bgImageRef.current ? gsap.quickTo(bgImageRef.current, "x", { duration: 1.2, ease: "power2.out" }) : null;
    const bgY = bgImageRef.current ? gsap.quickTo(bgImageRef.current, "y", { duration: 1.2, ease: "power2.out" }) : null;

    const handleMouseMove = (e) => {
      xTo(e.clientX);
      yTo(e.clientY);

      if (bgX && bgY) {
        const xOffset = ((e.clientX / window.innerWidth) - 0.5) * -20;
        const yOffset = ((e.clientY / window.innerHeight) - 0.5) * -20;
        bgX(xOffset);
        bgY(yOffset);
      }
    };

    const handleMouseOver = (e) => {
      if (e.target.closest('button, input, select, .fixture-card, .clickable')) {
        cursor.classList.add('active');
      } else {
        cursor.classList.remove('active');
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveSpecProduct(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      lenis.destroy();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 3. Stagger Result Entrance Animation
  useEffect(() => {
    if (result && resultsContainerRef.current) {
      gsap.fromTo(
        ".stagger-card",
        { y: 35, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: "power3.out" }
      );
    }
  }, [result]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveSpecProduct(null);

    const payload = {
      width: Number(width),
      depth: Number(depth),
      budget: Number(budget),
      style: style
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate recommendations');
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Compile items according to active pill
  const displayedCatalogProducts = selectedCategory === 'all'
    ? Object.entries(catalog).flatMap(([catKey, items]) => (items || []).map(p => ({ ...p, categoryKey: catKey })))
    : (catalog[selectedCategory] || []).map(p => ({ ...p, categoryKey: selectedCategory }));

  return (
    <>
      <div className="custom-cursor" ref={cursorRef} />
      <div className="grain-overlay" />

      {/* Atmospheric Architectural Backdrop */}
      <div className="luxury-backdrop">
        <img 
          ref={bgImageRef}
          className="luxury-backdrop-img"
          src="https://plus.unsplash.com/premium_photo-1661902468735-eabf780f8ff6?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YmF0aHJvb218ZW58MHx8MHx8fDA%3D" 
          alt="Ambient Architectural Bathroom" 
        />
        <div className="luxury-backdrop-overlay" />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1150px', margin: '0 auto', padding: '3.5rem 1.5rem', fontFamily: 'sans-serif' }}>
        {/* Editorial Brand Header */}
        <header style={{ marginBottom: '2.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a059', fontWeight: 600 }}>
            Kohler Architectural Studio
          </span>
          <h1 style={{ margin: '0.5rem 0 0 0', color: '#f8fafc', fontSize: '2.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Generative Spatial Designer
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '1.05rem', fontWeight: 300 }}>
            Intelligent fixture curation, spatial blueprints & ecological metrics.
          </p>
        </header>

        {/* Studio Parameter Panel */}
        <form onSubmit={handleGenerate} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          background: 'rgba(18, 24, 38, 0.65)',
          backdropFilter: 'blur(16px)',
          padding: '1.75rem',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)'
        }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>Room Width: {width} ft</label>
            <input type="range" min="4" max="16" value={width} onChange={(e) => setWidth(e.target.value)} style={{ width: '100%', accentColor: '#c5a059' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>Room Depth: {depth} ft</label>
            <input type="range" min="4" max="14" value={depth} onChange={(e) => setDepth(e.target.value)} style={{ width: '100%', accentColor: '#c5a059' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>Budget Allocation ($):</label>
            <input 
              type="number" 
              step="100" 
              min="1000" 
              max="20000" 
              value={budget} 
              onChange={(e) => setBudget(e.target.value)} 
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.12)', background: '#0a0d14', color: '#f8fafc' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>Aesthetic Direction:</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)} style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.12)', background: '#0a0d14', color: '#f8fafc' }}>
              {STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%',
                padding: '0.95rem 1.5rem', 
                background: loading ? '#222d3d' : 'linear-gradient(135deg, #c5a059, #99732d)', 
                color: loading ? '#94a3b8' : '#080b10', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.04em'
              }}
            >
              {loading ? 'Consulting Gemini Spatial Engine...' : 'Generate Recommended Bundle'}
            </button>
          </div>
        </form>

        {/* Error Callout */}
        {error && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(127, 29, 29, 0.35)', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '8px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* AI Recommendations Section */}
        {result && (
          <section ref={resultsContainerRef} style={{ marginTop: '3.5rem', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '2.5rem', alignItems: 'start' }}>
            {/* Left Column: Product Cards & Architectural Rationale */}
            <div>
              <div className="stagger-card" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8' }}>Synthesis</span>
                  <h2 style={{ color: '#f8fafc', margin: '0.2rem 0' }}>Curated Suite</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8' }}>Valuation</span>
                  <div style={{ color: '#c5a059', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace' }}>${result.total_price}</div>
                </div>
              </div>

              {/* Product Visual Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {Object.entries(result.bundle || {}).map(([category, id]) => {
                  const detailed = (result.detailed_bundle && result.detailed_bundle[category]) || {};
                  const title = detailed.name || id;
                  const price = detailed.price || null;
                  const imgSrc = detailed.image_url || FIXTURE_IMAGES[category.toLowerCase()] || FIXTURE_IMAGES.faucet;

                  return (
                    <div 
                      key={category}
                      className="stagger-card fixture-card"
                      onClick={() => setActiveSpecProduct({
                        category,
                        id,
                        name: title,
                        price,
                        image_url: imgSrc,
                        finish: detailed.finish || 'Matte Architectural Finish',
                        flow_rate: detailed.flow_rate || 'Standard Conservation Tier',
                        footprint_in: detailed.footprint_in || { width: '--', depth: '--' },
                        features: detailed.features || ['Architectural Kohler grade', 'WaterSense certified']
                      })}
                      style={{
                        cursor: 'pointer',
                        background: 'rgba(18, 24, 38, 0.6)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.35s ease, border-color 0.35s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = '#c5a059';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0px)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      <div style={{ position: 'relative', height: '140px', width: '100%', overflow: 'hidden' }}>
                        <img src={imgSrc} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(8, 11, 16, 0.8)', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', fontSize: '0.65rem', color: '#cbd5e1' }}>
                          {category}
                        </span>
                        <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(197, 160, 89, 0.9)', color: '#080b10', fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                          INSPECT
                        </span>
                      </div>
                      <div style={{ padding: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '0.9rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                            {title}
                          </strong>
                          {price && <span style={{ color: '#c5a059', fontSize: '0.85rem', fontWeight: 600 }}>${price}</span>}
                        </div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>{id}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rationale Card */}
              <div className="stagger-card" style={{ background: 'rgba(15, 28, 46, 0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa', fontSize: '0.95rem', textTransform: 'uppercase' }}>Design Rationale & Ecology</h4>
                <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.65, color: '#cbd5e1' }}>{result.explanation}</p>
              </div>
            </div>

            {/* Right Column: Interactive 2D/3D Blueprint Toggle */}
            <div className="stagger-card" style={{ position: 'sticky', top: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8' }}>
                    Scale Projection
                  </span>
                  <h2 style={{ color: '#f8fafc', margin: '0.1rem 0 0 0' }}>
                    {is3DView ? '3D Spatial Volume' : 'Spatial Footprint'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIs3DView(!is3DView)}
                  style={{
                    background: is3DView ? '#c5a059' : 'rgba(197, 160, 89, 0.15)',
                    border: '1px solid #c5a059',
                    color: is3DView ? '#080b10' : '#c5a059',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.08em',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {is3DView ? 'SWITCH TO 2D' : 'EXPLORE IN 3D ↗'}
                </button>
              </div>

              {/* Viewport Switcher */}
              {is3DView ? (
                <Bathroom3D
                  width={Number(width)}
                  depth={Number(depth)}
                  bundle={result.bundle}
                  onClose={() => setIs3DView(false)}
                />
              ) : (
                <div
                  onClick={() => setIs3DView(true)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                  title="Click to launch 3D perspective"
                >
                  <BathroomMap2D 
                    width={Number(width)} 
                    depth={Number(depth)} 
                    bundle={result.bundle} 
                  />
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      background: 'rgba(8, 11, 16, 0.85)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(197, 160, 89, 0.5)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      color: '#c5a059',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      pointerEvents: 'none'
                    }}
                  >
                    Click map to enter 3D Orbit
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------- */}
        {/* KOHLER ARCHITECTURAL PRODUCT ARCHIVE SECTION         */}
        {/* ---------------------------------------------------- */}
        <section style={{ marginTop: '5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a059', fontWeight: 600 }}>
                Catalog Directory
              </span>
              <h2 style={{ margin: '0.3rem 0 0 0', color: '#f8fafc', fontSize: '2rem' }}>
                Kohler Collection Index
              </h2>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(10, 13, 20, 0.7)', padding: '0.35rem', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="clickable"
                  style={{
                    padding: '0.45rem 1rem',
                    border: 'none',
                    borderRadius: '20px',
                    background: selectedCategory === cat ? 'linear-gradient(135deg, #c5a059, #99732d)' : 'transparent',
                    color: selectedCategory === cat ? '#080b10' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Filtered Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {displayedCatalogProducts.map((product) => (
              <div
                key={product.id}
                className="fixture-card"
                onClick={() => setActiveSpecProduct({
                  category: product.categoryKey || selectedCategory,
                  ...product
                })}
                style={{
                  cursor: 'pointer',
                  background: 'rgba(18, 24, 38, 0.65)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = '#c5a059';
                  e.currentTarget.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ height: '170px', position: 'relative', overflow: 'hidden' }}>
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(8, 11, 16, 0.85)', color: '#c5a059', fontSize: '0.65rem', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    {product.style}
                  </span>
                  <span style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(8, 11, 16, 0.85)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                    ${product.price}
                  </span>
                </div>

                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem', color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>
                      {product.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>
                      Finish: {product.finish}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.65rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                      {product.id}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#c5a059', fontWeight: 600 }}>
                      View Specs →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Spec Sheet Modal Drawer */}
        {activeSpecProduct && (
          <div 
            onClick={() => setActiveSpecProduct(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              zIndex: 100001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0d1420',
                border: '1px solid rgba(197, 160, 89, 0.6)',
                borderRadius: '16px',
                maxWidth: '520px',
                width: '100%',
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
              }}
            >
              <div style={{ position: 'relative', height: '220px', width: '100%' }}>
                <img 
                  src={activeSpecProduct.image_url} 
                  alt={activeSpecProduct.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <button
                  onClick={() => setActiveSpecProduct(null)}
                  className="clickable"
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.65)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#c5a059', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.15em', fontWeight: 600 }}>
                    {activeSpecProduct.category} Specifications
                  </span>
                  <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {activeSpecProduct.id}
                  </span>
                </div>

                <h3 style={{ color: '#f8fafc', margin: '0.4rem 0 1.25rem 0', fontSize: '1.35rem' }}>
                  {activeSpecProduct.name}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem', background: '#151d2a', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>Finish</span>
                    <span style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{activeSpecProduct.finish}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>Efficiency</span>
                    <span style={{ color: '#34d399', fontSize: '0.85rem' }}>{activeSpecProduct.flow_rate}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>Dimensions</span>
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                      {activeSpecProduct.footprint_in ? `${activeSpecProduct.footprint_in.width}" W × ${activeSpecProduct.footprint_in.depth}" D` : 'Standard'}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>Unit Price</span>
                    <span style={{ color: '#c5a059', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace' }}>${activeSpecProduct.price}</span>
                  </div>
                </div>

                {activeSpecProduct.features && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      Engineered Features
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      {activeSpecProduct.features.map((feature, idx) => (
                        <li key={idx}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button 
                  onClick={() => setActiveSpecProduct(null)}
                  className="clickable"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: 'linear-gradient(135deg, #c5a059, #99732d)',
                    color: '#080b10',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}