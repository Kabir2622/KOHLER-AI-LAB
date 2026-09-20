import ArchitecturalMetrics from './ArchitecturalMetrics';
import React, { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import Bathroom3D from './Bathroom3D';
import './App.css';
import { exportDesignPackagePDF } from './generateBOM';
import IntroSplash from './IntroSplash';

const STYLES = [
  'Minimalist Modern',
  'Classic Luxury',
  'Japanese Zen',
  'Industrial Chic'
];

const FIXTURE_IMAGES = {
  faucet: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  shower: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=800&q=80',
  toilet: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=800&q=80',
  vanity: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
  bathtub: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80'
};

const CATEGORIES = ['all', 'faucets', 'showers', 'toilets', 'vanities', 'bathtubs'];

const QUICK_COPILOT_DIRECTIVES = [
  '♿ Zero-threshold shower & ADA comfort-height',
  '🌱 Target ultra-low flow rates & LEED metrics',
  '✨ Shift hardware to Moderne Brass & soaking tub',
  '🏢 Maximize vanity counter space & compact clearances'
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleEnterStudio = () => {
    setShowSplash(false);
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [width, setWidth] = useState(16);
  const [depth, setDepth] = useState(14);
  const [budget, setBudget] = useState(12000);
  const [style, setStyle] = useState(STYLES[0]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeSpecProduct, setActiveSpecProduct] = useState(null);
  const [activeTier, setActiveTier] = useState('curated');

  const [copilotDirective, setCopilotDirective] = useState('');
  const [appliedDirective, setAppliedDirective] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const [catalog, setCatalog] = useState({ faucets: [], showers: [], toilets: [], vanities: [], bathtubs: [] });
  const [selectedCategory, setSelectedCategory] = useState('faucets');

  const cursorRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const bgImageRef = useRef(null);

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
        }
      })
      .catch((err) => {
        console.error("Could not fetch catalog from /api/catalog:", err);
      });
  }, []);

  useEffect(() => {
    // Only initialize smooth scrolling and global listeners after splash is dismissed or generally
    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9
    });

    const updateLenis = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    const cursor = cursorRef.current;
    const xTo = cursor ? gsap.quickTo(cursor, "x", { duration: 0.15, ease: "power3" }) : () => {};
    const yTo = cursor ? gsap.quickTo(cursor, "y", { duration: 0.15, ease: "power3" }) : () => {};

    const bgX = bgImageRef.current ? gsap.quickTo(bgImageRef.current, "x", { duration: 0.8, ease: "power2.out" }) : null;
    const bgY = bgImageRef.current ? gsap.quickTo(bgImageRef.current, "y", { duration: 0.8, ease: "power2.out" }) : null;

    const handleMouseMove = (e) => {
      xTo(e.clientX);
      yTo(e.clientY);

      if (bgX && bgY) {
        const xOffset = ((e.clientX / window.innerWidth) - 0.5) * -12;
        const yOffset = ((e.clientY / window.innerHeight) - 0.5) * -12;
        bgX(xOffset);
        bgY(yOffset);
      }
    };

    const handleMouseOver = (e) => {
      if (!cursor) return;
      if (e.target.closest('button, input, select, textarea, .fixture-card, .clickable')) {
        cursor.classList.add('active');
      } else {
        cursor.classList.remove('active');
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveSpecProduct(null);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (result && resultsContainerRef.current) {
      gsap.fromTo(
        ".stagger-card",
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power3.out" }
      );
    }
  }, [result, activeTier]);

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
      if (data.tiers && data.tiers.curated) {
        setActiveTier('curated');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCopilotRevision = async (e) => {
    e.preventDefault();
    const currentDirectiveText = copilotDirective.trim();
    if (!currentDirectiveText) return;

    setIsRefining(true);
    try {
      const currentActiveBundle = currentTierData.bundle || {};
      const payload = {
        current_bundle: currentActiveBundle,
        directive: currentDirectiveText,
        style: style,
        budget: Number(budget),
        width: Number(width),
        depth: Number(depth)
      };

      const response = await fetch('http://127.0.0.1:5000/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const refinedTier = await response.json();
      if (!response.ok || refinedTier.error) {
        throw new Error(refinedTier.error || 'Failed to adapt specification');
      }

      setAppliedDirective(currentDirectiveText);

      setResult((prev) => ({
        ...prev,
        tiers: {
          ...prev.tiers,
          copilot: refinedTier
        }
      }));

      setActiveTier('copilot');
    } catch (err) {
      alert(`Copilot revision error: ${err.message}`);
    } finally {
      setIsRefining(false);
    }
  };

  const currentTierData = result?.tiers?.[activeTier] || {
    bundle: result?.bundle || {},
    detailed_bundle: result?.detailed_bundle || {},
    total_price: result?.total_price || 0,
    explanation: result?.explanation || '',
    title: 'Curated Suite'
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setIsExportingPDF(true);
    try {
      await exportDesignPackagePDF({
        result: currentTierData,
        width: Number(width),
        depth: Number(depth),
        style: `${style} (${activeTier.toUpperCase()})`,
        budget: Number(budget)
      });
    } catch (err) {
      console.error('Failed to export PDF package:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const displayedCatalogProducts = selectedCategory === 'all'
    ? Object.entries(catalog).flatMap(([catKey, items]) => (items || []).map(p => ({ ...p, categoryKey: catKey })))
    : (catalog[selectedCategory] || []).map(p => ({ ...p, categoryKey: selectedCategory }));

  return (
    <>
      {showSplash && <IntroSplash onEnter={handleEnterStudio} />}

      {/* Main Studio content only mounts or activates after intro */}
      {!showSplash && (
        <div style={{ animation: 'fadeIn 0.8s ease forwards' }}>
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

          {/* Global Top Bar */}
          <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--hairline)', background: 'rgba(7, 7, 7, 0.94)', backdropFilter: 'blur(10px)', padding: '0.9rem 2.5rem' }}>
            <div style={{ maxWidth: '1480px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-main)' }}>
                  KOHLER ARCHITECTURAL
                </span>
                <span style={{ height: '12px', width: '1px', background: 'var(--hairline)' }} />
                <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
                  EDITION 2026.01
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <a href="#studio-section" className="font-mono clickable" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.74rem', letterSpacing: '0.12em' }}>
                  01 &bull; STUDIO
                </a>
                <a href="#catalog-section" className="font-mono clickable" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.74rem', letterSpacing: '0.12em' }}>
                  02 &bull; ARCHIVE [{Object.values(catalog).flat().length || 10}]
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  <span className="font-mono" style={{ fontSize: '0.68rem', color: '#10b981', letterSpacing: '0.08em' }}>
                    LIVE
                  </span>
                </div>
              </div>
            </div>
          </nav>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '1480px', margin: '0 auto', padding: '3.5rem 2.5rem' }}>
            
            {/* Editorial Title Block */}
            <header id="studio-section" style={{ marginBottom: '3.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem', borderBottom: '1px solid var(--hairline)', paddingBottom: '2.5rem' }}>
                <div>
                  <span className="font-mono" style={{ fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent-gold)', display: 'block', marginBottom: '0.5rem' }}>
                    SPATIAL CURATION ENGINE &bull; GEMINI 2.5 FLASH
                  </span>
                  <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: '4.2rem', lineHeight: 0.98 }}>
                    Generative Spatial Studio
                  </h1>
                </div>
                <div style={{ maxWidth: '440px', textAlign: 'left' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.94rem', lineHeight: 1.6, fontWeight: 300 }}>
                    Translates physical room envelopes and budgets into verified Kohler collections with real-time clearance validation.
                  </p>
                </div>
              </div>
            </header>

            {/* Commerce-UI Split Studio */}
            <div style={{ display: 'grid', gridTemplateColumns: '580px 1fr', gap: '2.5rem', alignItems: 'start', marginBottom: '7rem' }}>
              
              {/* Left Column: Parameters & Synthesis */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                
                {/* Control Console Plate */}
                <form 
                  onSubmit={handleGenerate}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--hairline)',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline)', paddingBottom: '0.85rem' }}>
                    <span className="font-mono" style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      01 / SPATIAL PARAMETERS
                    </span>
                    <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--accent-gold)' }}>
                      {width * depth} SQ FT
                    </span>
                  </div>

                  {/* Clean Width & Length Sliders */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                        <label className="font-mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                          Width
                        </label>
                        <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{width} FT</span>
                      </div>
                      <input type="range" min="6" max="28" value={width} onChange={(e) => setWidth(e.target.value)} style={{ width: '100%' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                        <label className="font-mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                          Length
                        </label>
                        <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{depth} FT</span>
                      </div>
                      <input type="range" min="6" max="24" value={depth} onChange={(e) => setDepth(e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label className="font-mono" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                        Budget Ceiling ($)
                      </label>
                      <input 
                        type="number" 
                        step="100" 
                        min="1000" 
                        max="40000" 
                        value={budget} 
                        onChange={(e) => setBudget(e.target.value)} 
                        className="font-mono"
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          border: '1px solid var(--hairline)',
                          background: 'var(--bg-core)',
                          color: 'var(--text-main)',
                          fontSize: '0.92rem',
                          outline: 'none'
                        }} 
                      />
                    </div>

                    <div>
                      <label className="font-mono" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                        Aesthetic Mood
                      </label>
                      <select 
                        value={style} 
                        onChange={(e) => setStyle(e.target.value)} 
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          border: '1px solid var(--hairline)',
                          background: 'var(--bg-core)',
                          color: 'var(--text-main)',
                          fontSize: '0.88rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {STYLES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="clickable font-mono"
                    style={{ 
                      width: '100%',
                      padding: '1.05rem', 
                      background: loading ? '#1a1a1a' : 'var(--text-main)', 
                      color: loading ? '#525252' : '#070707', 
                      border: 'none', 
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      marginTop: '0.4rem',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {loading ? 'Synthesizing...' : 'Generate Bundle →'}
                  </button>
                </form>

                {error && (
                  <div className="font-mono" style={{ padding: '0.9rem 1.1rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5', fontSize: '0.78rem' }}>
                    ERR: {error}
                  </div>
                )}

                {/* Results Section */}
                {result && (
                  <div ref={resultsContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    
                    {/* 4-Tier Commerce Tab Plate */}
                    {result.tiers && (
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${result.tiers.copilot ? 4 : 3}, 1fr)`, gap: '1px', background: 'var(--hairline)', border: '1px solid var(--hairline)' }}>
                        {[
                          { id: 'essential', label: 'ESSENTIAL', price: result.tiers.essential?.total_price },
                          { id: 'curated', label: 'CURATED', price: result.tiers.curated?.total_price },
                          { id: 'signature', label: 'SIGNATURE', price: result.tiers.signature?.total_price },
                          ...(result.tiers.copilot ? [{ id: 'copilot', label: 'COPILOT', price: result.tiers.copilot?.total_price }] : [])
                        ].map((t) => {
                          const isSelected = activeTier === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setActiveTier(t.id)}
                              className="clickable font-mono"
                              style={{
                                padding: '0.95rem 0.5rem',
                                border: 'none',
                                background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                                color: isSelected ? 'var(--text-main)' : 'var(--text-dim)',
                                cursor: 'pointer',
                                textAlign: 'center',
                                borderBottom: isSelected ? '2px solid var(--accent-gold)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '0.68rem', letterSpacing: '0.14em', display: 'block', color: isSelected ? 'var(--accent-gold)' : 'var(--text-dim)' }}>
                                {t.label}
                              </span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                                ${t.price}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Valuation & PDF Export Bar */}
                    <div className="stagger-card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--hairline)', padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block' }}>
                          {currentTierData.title || 'Curated Suite'}
                        </span>
                        <span className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                          ${currentTierData.total_price}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        disabled={isExportingPDF}
                        className="clickable font-mono"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--hairline-hover)',
                          color: 'var(--text-main)',
                          padding: '8px 16px',
                          fontSize: '0.72rem',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          cursor: isExportingPDF ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isExportingPDF ? 'Exporting...' : 'PDF Spec Sheet →'}
                      </button>
                    </div>

                    {/* Prominent Architectural Copilot Console */}
                    <form
                      onSubmit={handleApplyCopilotRevision}
                      className="stagger-card"
                      style={{
                        background: 'var(--bg-surface)',
                        border: isRefining ? '1px solid #38bdf8' : '1px solid var(--accent-gold)',
                        padding: '1.65rem',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--accent-gold)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
                          ⚡ IN-STUDIO COPILOT REFINEMENT
                        </span>
                        <span className="font-mono" style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                          GEMINI FLASH
                        </span>
                      </div>

                      {isRefining ? (
                        <div className="font-mono" style={{ padding: '0.9rem', background: 'rgba(56, 189, 248, 0.08)', color: '#38bdf8', fontSize: '0.78rem' }}>
                          &gt; Synthesizing custom revision against room envelope...
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            value={copilotDirective}
                            onChange={(e) => setCopilotDirective(e.target.value)}
                            placeholder="e.g., Shift to Moderne Brass, zero-threshold shower..."
                            style={{
                              flex: 1,
                              padding: '0.75rem 0.95rem',
                              background: 'var(--bg-core)',
                              border: '1px solid var(--hairline)',
                              color: 'var(--text-main)',
                              fontSize: '0.88rem',
                              outline: 'none'
                            }}
                          />
                          <button
                            type="submit"
                            disabled={isRefining || !copilotDirective.trim()}
                            className="clickable font-mono"
                            style={{
                              padding: '0.75rem 1.35rem',
                              background: isRefining ? '#1f1f1f' : 'var(--accent-gold)',
                              color: isRefining ? '#525252' : '#070707',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              cursor: isRefining ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Apply
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.9rem' }}>
                        {QUICK_COPILOT_DIRECTIVES.map((directive) => (
                          <button
                            key={directive}
                            type="button"
                            onClick={() => setCopilotDirective(directive)}
                            className="clickable font-mono"
                            style={{
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid var(--hairline)',
                              color: 'var(--text-muted)',
                              padding: '5px 10px',
                              fontSize: '0.68rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {directive}
                          </button>
                        ))}
                      </div>
                    </form>

                    {/* Rationale & Metrics Card */}
                    <div className="stagger-card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--hairline)', padding: '1.5rem' }}>
                      <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                        02 / RATIONALE & METRICS
                      </span>
                      <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--text-muted)' }}>
                        {currentTierData.explanation}
                      </p>
                    </div>

                    <ArchitecturalMetrics
                      width={Number(width)}
                      depth={Number(depth)}
                      currentTierData={currentTierData}
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Compact 3D Viewport + Enlarged Fixture Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', position: 'sticky', top: '5rem' }}>
                
                <div style={{ border: '1px solid var(--hairline)', background: 'var(--bg-surface)' }}>
                  <div style={{ padding: '0.65rem 1.1rem', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                      SPATIAL PREVIEW [{width}&apos; &times; {depth}&apos;]
                    </span>
                    <span className="font-mono" style={{ fontSize: '0.64rem', color: 'var(--accent-gold)' }}>
                      CLEARANCE TOLERANCE: 21 IN
                    </span>
                  </div>
                  
                  <Bathroom3D width={Number(width)} depth={Number(depth)} />
                </div>

                {/* Specified Fixtures: Spacious 2x2 Grid */}
                {result && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span className="font-mono" style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        SPECIFIED FIXTURE STACK
                      </span>
                      <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        [04 ASSETS]
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {Object.entries(currentTierData.bundle || {}).map(([category, id]) => {
                        const detailed = (currentTierData.detailed_bundle && currentTierData.detailed_bundle[category]) || {};
                        const title = detailed.name || id;
                        const price = detailed.price || null;
                        const fallbackImg = FIXTURE_IMAGES[category.toLowerCase()] || FIXTURE_IMAGES.faucet;
                        const imgSrc = detailed.image_url || fallbackImg;

                        return (
                          <div 
                            key={`${activeTier}-${category}`}
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
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--hairline)',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              transition: 'border-color 0.2s ease, transform 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--hairline-hover)';
                              e.currentTarget.style.transform = 'translateY(-3px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--hairline)';
                              e.currentTarget.style.transform = 'translateY(0px)';
                            }}
                          >
                            <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                              <img 
                                src={imgSrc} 
                                alt={title} 
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = fallbackImg;
                                }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                              <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(7, 7, 7, 0.9)', padding: '2px 7px', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.1em', color: '#a3a3a3' }}>
                                {category}
                              </span>
                              <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--accent-gold)', color: '#070707', padding: '2px 6px', fontSize: '0.62rem', fontWeight: 700 }}>
                                INSPECT
                              </span>
                            </div>
                            <div style={{ padding: '0.95rem' }}>
                              <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                {title}
                              </strong>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                                  {id}
                                </span>
                                {price && <span className="font-mono" style={{ color: 'var(--accent-gold)', fontSize: '0.88rem', fontWeight: 700 }}>${price}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* COMMERCE-UI ARCHITECTURAL CATALOG ARCHIVE            */}
            {/* ---------------------------------------------------- */}
            <section 
              id="catalog-section"
              style={{ borderTop: '1px solid var(--hairline)', paddingTop: '4.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '3rem' }}>
                <div>
                  <span className="font-mono" style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent-gold)', display: 'block', marginBottom: '0.4rem' }}>
                    INDEX / DIRECTORY
                  </span>
                  <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '3.4rem', lineHeight: 1 }}>
                    Kohler Collection Index
                  </h2>
                </div>

                {/* Category Filter Pills */}
                <div style={{ display: 'flex', gap: '1px', background: 'var(--hairline)', border: '1px solid var(--hairline)' }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className="clickable font-mono"
                      style={{
                        padding: '0.65rem 1.25rem',
                        border: 'none',
                        background: selectedCategory === cat ? 'var(--text-main)' : 'var(--bg-surface)',
                        color: selectedCategory === cat ? '#070707' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        cursor: 'pointer'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-Column Editorial Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
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
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--hairline)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s ease, transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--hairline-hover)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--hairline)';
                      e.currentTarget.style.transform = 'translateY(0px)';
                    }}
                  >
                    <div style={{ height: '260px', position: 'relative', overflow: 'hidden', background: '#050505' }}>
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FIXTURE_IMAGES[product.categoryKey || selectedCategory] || FIXTURE_IMAGES.faucet;
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(7, 7, 7, 0.9)', color: 'var(--accent-gold)', fontSize: '0.66rem', fontWeight: 600, padding: '3px 9px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        {product.style}
                      </span>
                      <span className="font-mono" style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(7, 7, 7, 0.92)', color: '#fff', fontSize: '0.92rem', fontWeight: 700, padding: '3px 9px' }}>
                        ${product.price}
                      </span>
                    </div>

                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', color: 'var(--text-main)', lineHeight: 1.25 }}>
                          {product.name}
                        </h3>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'block', marginBottom: '1rem' }}>
                          Finish: <span style={{ color: 'var(--text-muted)' }}>{product.finish}</span>
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--hairline)', paddingTop: '0.9rem' }}>
                        <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                          {product.id}
                        </span>
                        <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--accent-gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          Specs &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Spec Sheet Modal */}
            {activeSpecProduct && (
              <div 
                onClick={() => setActiveSpecProduct(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(5, 5, 5, 0.92)',
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
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--hairline-hover)',
                    maxWidth: '560px',
                    width: '100%',
                    overflow: 'hidden',
                    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.95)'
                  }}
                >
                  <div style={{ position: 'relative', height: '240px', width: '100%' }}>
                    <img 
                      src={activeSpecProduct.image_url} 
                      alt={activeSpecProduct.name} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FIXTURE_IMAGES[activeSpecProduct.category] || FIXTURE_IMAGES.faucet;
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <button
                      onClick={() => setActiveSpecProduct(null)}
                      className="clickable font-mono"
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '32px',
                        height: '32px',
                        background: 'rgba(7, 7, 7, 0.85)',
                        color: '#fff',
                        border: '1px solid var(--hairline)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ padding: '2.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-mono" style={{ color: 'var(--accent-gold)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.18em' }}>
                        {activeSpecProduct.category}
                      </span>
                      <span className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        {activeSpecProduct.id}
                      </span>
                    </div>

                    <h3 style={{ color: 'var(--text-main)', margin: '0.5rem 0 1.5rem 0', fontSize: '1.85rem' }}>
                      {activeSpecProduct.name}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', marginBottom: '1.75rem', background: 'var(--bg-core)', padding: '1.15rem', border: '1px solid var(--hairline)' }}>
                      <div>
                        <span className="font-mono" style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Finish</span>
                        <span style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{activeSpecProduct.finish}</span>
                      </div>
                      <div>
                        <span className="font-mono" style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Flow / Volume</span>
                        <span style={{ color: '#34d399', fontSize: '0.92rem' }}>{activeSpecProduct.flow_rate}</span>
                      </div>
                      <div>
                        <span className="font-mono" style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Dimensions</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                          {activeSpecProduct.footprint_in ? `${activeSpecProduct.footprint_in.width}" W × ${activeSpecProduct.footprint_in.depth}" D` : 'Standard'}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono" style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Price</span>
                        <span className="font-mono" style={{ color: 'var(--accent-gold)', fontSize: '1.05rem', fontWeight: 700 }}>${activeSpecProduct.price}</span>
                      </div>
                    </div>

                    {activeSpecProduct.features && (
                      <div style={{ marginBottom: '2rem' }}>
                        <span className="font-mono" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '0.6rem' }}>
                          Features
                        </span>
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.65 }}>
                          {activeSpecProduct.features.map((feature, idx) => (
                            <li key={idx}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button 
                      onClick={() => setActiveSpecProduct(null)}
                      className="clickable font-mono"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'var(--text-main)',
                        color: '#070707',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        cursor: 'pointer'
                      }}
                    >
                      Close &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}