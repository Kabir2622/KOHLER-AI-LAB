import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';

function RoomShell({ width, depth }) {
  const w = Number(width) || 8;
  const d = Number(depth) || 6;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#1a2230" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 4, -d / 2]} receiveShadow>
        <boxGeometry args={[w, 8, 0.2]} />
        <meshStandardMaterial color="#0f1724" roughness={0.8} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-w / 2, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[d, 8, 0.2]} />
        <meshStandardMaterial color="#151e2e" roughness={0.8} />
      </mesh>
    </group>
  );
}

function FixtureBlock({ position, size, color, label }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
}

export default function Bathroom3D({ width = 8, depth = 6, bundle = {}, onClose }) {
  const w = Number(width) || 8;
  const d = Number(depth) || 6;

  return (
    <div style={{ position: 'relative', width: '100%', height: '420px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #c5a059', background: '#090d14' }}>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
            background: 'rgba(0,0,0,0.65)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            letterSpacing: '0.05em'
          }}
        >
          ✕ 2D BLUEPRINT
        </button>
      )}

      <span style={{ position: 'absolute', top: '12px', left: '14px', zIndex: 10, color: '#c5a059', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', pointerEvents: 'none' }}>
        Interactive 3D Viewport • Drag to Orbit
      </span>

      <Canvas shadows camera={{ position: [w * 1.1, 8, d * 1.3], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#38bdf8" />

        <Suspense fallback={null}>
          <RoomShell width={w} depth={d} />

          {/* Vanity & Basin */}
          <FixtureBlock
            position={[-w / 3, 1.5, -d / 3]}
            size={[2.6, 2.8, 1.8]}
            color="#38bdf8"
            label="Vanity"
          />

          {/* Shower Enclosure */}
          <FixtureBlock
            position={[w / 3.2, 3.5, -d / 3.4]}
            size={[3, 7, 3]}
            color="#818cf8"
            label="Shower"
          />

          {/* Toilet Suite */}
          <FixtureBlock
            position={[-w / 3.2, 1.2, d / 3.5]}
            size={[1.6, 2.4, 2.2]}
            color="#34d399"
            label="Toilet"
          />

          <ContactShadows position={[0, 0, 0]} opacity={0.65} scale={15} blur={1.5} far={4} />
        </Suspense>

        <OrbitControls enablePan={true} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={4} maxDistance={25} />
      </Canvas>
    </div>
  );
}