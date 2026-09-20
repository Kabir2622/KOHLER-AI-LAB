import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function IntroSplash({ onEnter }) {
  const [showButton, setShowButton] = useState(false);
  const containerRef = useRef(null);
  const lettersRef = useRef([]);
  const buttonRef = useRef(null);
  const subtitleRef = useRef(null);

  useEffect(() => {
    // Prevent scrolling while intro sequence is playing
    document.body.style.overflow = 'hidden';

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Animate K-O-H-L-E-R letters staggered across 2 seconds with GPU acceleration
      tl.fromTo(
        lettersRef.current,
        {
          opacity: 0,
          y: 20,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          stagger: 0.28,
          ease: 'power3.out',
        }
      )
      // Subtitle fade-in slightly overlapping the end
      .fromTo(
        subtitleRef.current,
        { opacity: 0, letterSpacing: '0.6em' },
        { opacity: 1, letterSpacing: '0.35em', duration: 0.5, ease: 'power2.out' },
        '-=0.2'
      )
      .call(() => {
        setShowButton(true);
      });
    }, containerRef);

    return () => {
      ctx.revert();
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Reveal unified CTA button once the sequence finishes
  useEffect(() => {
    if (showButton && buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [showButton]);

  const handleDismiss = () => {
    gsap.to(containerRef.current, {
      opacity: 0,
      scale: 1.02,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: () => {
        document.body.style.overflow = 'auto';
        if (onEnter) onEnter();
      },
    });
  };

  const letters = ['K', 'O', 'H', 'L', 'E', 'R'];

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'radial-gradient(circle at center, #1b2434 0%, #0c1017 65%, #05070a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        userSelect: 'none',
        // Hardware acceleration layer enforcement
        willChange: 'opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(197, 160, 89, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          transform: 'translateZ(0)',
        }}
      />

      {/* Main Logo Container */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <h1
          style={{
            margin: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: '0.35rem',
            fontFamily: "'Cinzel', 'Playfair Display', 'Times New Roman', Georgia, serif",
            fontSize: 'clamp(3.5rem, 9vw, 6.5rem)',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: '#ffffff',
            textShadow: '0 0 40px rgba(255, 255, 255, 0.18)',
          }}
        >
          {letters.map((char, index) => (
            <span
              key={index}
              ref={(el) => (lettersRef.current[index] = el)}
              style={{
                display: 'inline-block',
                willChange: 'transform, opacity',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
              }}
            >
              {char}
            </span>
          ))}
        </h1>

        <div
          ref={subtitleRef}
          style={{
            marginTop: '0.6rem',
            fontSize: 'clamp(0.65rem, 1.4vw, 0.85rem)',
            textTransform: 'uppercase',
            color: '#c5a059',
            fontWeight: 600,
            opacity: 0,
            transform: 'translateZ(0)',
          }}
        >
          Architectural Studio & Spatial AI
        </div>
      </div>

      {/* Single Consolidated Action */}
      <div
        style={{
          marginTop: '3.2rem',
          minHeight: '50px',
          zIndex: 2,
          visibility: showButton ? 'visible' : 'hidden',
        }}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={handleDismiss}
          className="clickable"
          style={{
            background: 'linear-gradient(135deg, #c5a059, #99732d)',
            color: '#080b10',
            border: 'none',
            borderRadius: '30px',
            padding: '0.9rem 2.4rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 10px 28px rgba(197, 160, 89, 0.3)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            transform: 'translateZ(0)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) translateZ(0)';
            e.currentTarget.style.boxShadow = '0 14px 34px rgba(197, 160, 89, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) translateZ(0)';
            e.currentTarget.style.boxShadow = '0 10px 28px rgba(197, 160, 89, 0.3)';
          }}
        >
          Enter Design Studio →
        </button>
      </div>
    </div>
  );
}