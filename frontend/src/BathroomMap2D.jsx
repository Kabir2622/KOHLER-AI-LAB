import React from 'react';

export default function BathroomMap2D({ width = 8, depth = 6, bundle }) {
  const scale = 40; // 40px per foot
  const roomWidthPx = width * scale;
  const roomDepthPx = depth * scale;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        background: '#0d1420',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #243044',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
      }}>
        <svg
          width={roomWidthPx}
          height={roomDepthPx}
          style={{
            background: '#151d2a',
            border: '4px solid #475569',
            borderRadius: '4px',
            overflow: 'visible'
          }}
        >
          <defs>
            <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
              <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#1e293b" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Vanity */}
          <g transform="translate(10, 10)">
            <rect
              width={Math.min(3 * scale, Math.max(roomWidthPx - 20, 20))}
              height={1.8 * scale}
              fill="#1e3a5f"
              stroke="#38bdf8"
              strokeWidth="2"
              rx="4"
            />
            <text x="10" y="24" fill="#38bdf8" fontSize="12" fontWeight="600">
              Vanity & Sink
            </text>
            <text x="10" y="42" fill="#94a3b8" fontSize="10">
              {bundle?.vanity || 'VAN-001'}
            </text>
          </g>

          {/* Toilet */}
          <g transform={`translate(10, ${Math.max(roomDepthPx - 2.2 * scale - 10, 2.2 * scale)})`}>
            <rect
              width={1.6 * scale}
              height={0.8 * scale}
              fill="#064e3b"
              stroke="#34d399"
              strokeWidth="2"
              rx="3"
            />
            <ellipse
              cx={0.8 * scale}
              cy={1.5 * scale}
              rx={0.6 * scale}
              ry={0.7 * scale}
              fill="#064e3b"
              stroke="#34d399"
              strokeWidth="2"
            />
            <text x="8" y="22" fill="#34d399" fontSize="11" fontWeight="600">
              {bundle?.toilet || 'Toilet'}
            </text>
          </g>

          {/* Shower */}
          <g transform={`translate(${Math.max(roomWidthPx - 3 * scale - 10, 3.2 * scale)}, 10)`}>
            <rect
              width={3 * scale}
              height={3.5 * scale}
              fill="#2e1065"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="4 2"
              rx="4"
            />
            <circle
              cx={1.5 * scale}
              cy={1.75 * scale}
              r="6"
              fill="#a855f7"
            />
            <text x="12" y="24" fill="#c084fc" fontSize="12" fontWeight="600">
              Shower Enclosure
            </text>
            <text x="12" y="42" fill="#cbd5e1" fontSize="10">
              {bundle?.shower || 'SHW-001'}
            </text>
          </g>
        </svg>
      </div>

      <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#94a3b8' }}>
        Room Footprint: <strong>{width} ft</strong> × <strong>{depth} ft</strong>
      </div>
    </div>
  );
}