import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html, Environment } from '@react-three/drei';

// --- Finish Library ---
const FINISH_PRESETS = {
  brass: { label: 'Moderne Brass', color: '#d4af37', metalness: 0.85, roughness: 0.22, swatch: '#d4af37' },
  matteBlack: { label: 'Matte Black', color: '#1a1f26', metalness: 0.2, roughness: 0.8, swatch: '#1a1f26' },
  chrome: { label: 'Polished Chrome', color: '#f1f5f9', metalness: 0.95, roughness: 0.08, swatch: '#cbd5e1' },
  titanium: { label: 'Titanium', color: '#64748b', metalness: 0.78, roughness: 0.32, swatch: '#64748b' }
};

// --- Architectural Lighting Environments ---
const LIGHTING_MODES = {
  daylight: {
    label: 'Natural Daylight',
    ambientColor: '#f8fafc',
    ambientIntensity: 0.5,
    sunColor: '#ffffff',
    sunIntensity: 1.4,
    sunPos: [10, 16, 10],
    wallColor: '#e2e8f0',
    floorColor: '#cbd5e1',
    mirrorLightColor: '#ffffff',
    mirrorIntensity: 0.4
  },
  warmEvening: {
    label: 'Warm Evening',
    ambientColor: '#fff7ed',
    ambientIntensity: 0.45,
    sunColor: '#fef3c7',
    sunIntensity: 1.2,
    sunPos: [8, 14, 8],
    wallColor: '#f1f5f9',
    floorColor: '#e2e8f0',
    mirrorLightColor: '#fde68a',
    mirrorIntensity: 0.9
  },
  spaNight: {
    label: 'Spa Glow',
    ambientColor: '#1e293b',
    ambientIntensity: 0.2,
    sunColor: '#38bdf8',
    sunIntensity: 0.5,
    sunPos: [0, 12, -6],
    wallColor: '#1e293b',
    floorColor: '#0f172a',
    mirrorLightColor: '#c5a059',
    mirrorIntensity: 1.8
  }
};

// --- Procedural Architectural Tile Generator ---
function createTileTexture({ tileSize = 256, groutWidth = 4, tileColor = '#e2e8f0', groutColor = '#94a3b8' }) {
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = tileColor;
  ctx.fillRect(0, 0, tileSize, tileSize);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * tileSize;
    const y = Math.random() * tileSize;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = groutColor;
  ctx.lineWidth = groutWidth;
  ctx.strokeRect(0, 0, tileSize, tileSize);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Camera Controller: Decoupled from room width & depth to eliminate slider jump/zoom
function CameraController({ cameraView }) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    if (cameraView === 'top') {
      camera.position.set(0, 26, 0.001);
      camera.lookAt(0, 0, 0);
    } else if (cameraView === 'eye') {
      camera.position.set(0, 4.6, 8.5);
      camera.lookAt(0, 2.5, 0);
    } else {
      camera.position.set(16, 9.5, 18);
      camera.lookAt(0, 1.5, 0);
    }
    camera.updateProjectionMatrix();
    invalidate();
  }, [cameraView, camera, invalidate]);

  return null;
}

function FixtureBadge({ text, isSelected, hasConflict, position = [0, 2.5, 0] }) {
  return (
    <Html position={position} center distanceFactor={16}>
      <div
        style={{
          background: hasConflict
            ? 'rgba(239, 68, 68, 0.96)'
            : isSelected
            ? 'rgba(197, 160, 89, 0.96)'
            : 'rgba(15, 23, 42, 0.92)',
          color: hasConflict || isSelected ? '#080b10' : '#f8fafc',
          border: hasConflict ? '1px solid #ef4444' : isSelected ? '1px solid #c5a059' : '1px solid rgba(255,255,255,0.2)',
          padding: '3px 10px',
          borderRadius: '14px',
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
        }}
      >
        {hasConflict ? `⚠️ CLEARANCE ENCROACHMENT` : text}
      </div>
    </Html>
  );
}

function InteractiveClearanceZone({
  width = 3.5,
  depth = 3.5,
  codeLabel = 'NKBA Standard',
  ruleText = '21" Front Clearance',
  isSelected = false,
  hasConflict = false
}) {
  const accentColor = hasConflict ? '#ef4444' : isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.25)';
  const bgOpacity = hasConflict ? 0.35 : isSelected ? 0.22 : 0.07;

  return (
    <group position={[0, 0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={accentColor} transparent opacity={bgOpacity} />
      </mesh>

      {(isSelected || hasConflict) && (
        <Html position={[0, 0.02, depth / 2 + 0.4]} center distanceFactor={14}>
          <div
            style={{
              background: hasConflict ? 'rgba(45, 10, 10, 0.96)' : 'rgba(8, 12, 20, 0.96)',
              border: `1px solid ${accentColor}`,
              borderRadius: '8px',
              padding: '4px 10px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {hasConflict ? '⚠️ CODE VIOLATION' : `✓ ${codeLabel}`}
            </div>
            <div style={{ fontSize: '9px', color: '#cbd5e1', marginTop: '1px' }}>
              {hasConflict ? 'Minimum 21" Egress Encroached' : ruleText}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function EntryDoor({ position, rotation = 0, finish = 'matteBlack', doorWidth = 2.8, doorHeight = 7.0 }) {
  const finishMat = FINISH_PRESETS[finish] || FINISH_PRESETS.matteBlack;
  const jambDepth = 0.25;
  const jambThickness = 0.08;
  const slabThickness = 0.12;

  return (
    <group position={position} rotation={[0, (rotation * Math.PI) / 180, 0]}>
      <mesh position={[doorWidth / 2, doorHeight + jambThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[doorWidth + jambThickness * 2, jambThickness, jambDepth]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>
      <mesh position={[-jambThickness / 2, doorHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[jambThickness, doorHeight, jambDepth]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>
      <mesh position={[doorWidth + jambThickness / 2, doorHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[jambThickness, doorHeight, jambDepth]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>

      <mesh position={[doorWidth / 2, 0.02, 0]}>
        <boxGeometry args={[doorWidth, 0.03, 0.35]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.2} />
      </mesh>

      <group position={[0, 0, 0]} rotation={[0, 0.26, 0]}>
        <mesh position={[doorWidth / 2, doorHeight / 2, slabThickness / 2]} castShadow receiveShadow>
          <boxGeometry args={[doorWidth, doorHeight, slabThickness]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>

        <group position={[doorWidth - 0.25, 3.2, slabThickness + 0.04]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
          </mesh>
          <mesh position={[0.18, 0, 0.04]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.42, 16]} />
            <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
          </mesh>
        </group>
      </group>

      <group position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[doorWidth - 0.04, doorWidth, 32, 1, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
      </group>

      <Html position={[doorWidth / 2, doorHeight + 0.5, 0]} center distanceFactor={16}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            letterSpacing: '0.06em',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          ENTRY DOOR (32")
        </div>
      </Html>
    </group>
  );
}

function Bathtub({ rotation = 0, finish, isSelected, hasConflict }) {
  const finishMat = FINISH_PRESETS[finish] || FINISH_PRESETS.brass;
  const porcelainColor = finish === 'matteBlack' ? '#181b22' : '#ffffff';

  return (
    <group rotation={[0, (rotation * Math.PI) / 180, 0]}>
      <InteractiveClearanceZone
        width={5.8}
        depth={3.4}
        codeLabel="NKBA Guideline 12"
        ruleText='Min. 21" Egress Clearance to Adjacent Wall'
        isSelected={isSelected}
        hasConflict={hasConflict}
      />

      <group position={[0, 0.75, 0]}>
        <mesh scale={[1.8, 1, 1]} castShadow receiveShadow>
          <cylinderGeometry args={[1.2, 0.95, 1.4, 48, 1, false]} />
          <meshPhysicalMaterial
            color={porcelainColor}
            roughness={0.08}
            metalness={0.02}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            emissive={hasConflict ? '#991b1b' : isSelected ? '#1e3a8a' : '#000000'}
            emissiveIntensity={hasConflict ? 0.45 : isSelected ? 0.25 : 0}
          />
        </mesh>

        <mesh position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.8, 1, 1]}>
          <torusGeometry args={[1.2, 0.08, 16, 48]} />
          <meshPhysicalMaterial color={porcelainColor} roughness={0.08} clearcoat={1.0} />
        </mesh>

        <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.7, 0.92, 1]}>
          <circleGeometry args={[1.1, 36]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transmission={0.88}
            roughness={0.04}
            ior={1.333}
            thickness={0.5}
          />
        </mesh>

        <mesh position={[0, -0.68, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
          <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
        </mesh>
      </group>

      <group position={[0, 0, -1.25]}>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.8, 16]} />
          <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
        </mesh>
        <mesh position={[0, 2.75, 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.6, 16]} />
          <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
        </mesh>
        <mesh position={[0, 2.65, 0.58]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 16]} />
          <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
        </mesh>
        <mesh position={[0.15, 2.5, 0]} rotation={[0, 0, -Math.PI / 3]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.35, 16]} />
          <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
        </mesh>
      </group>

      <FixtureBadge text={`FREESTANDING TUB (${rotation}°)`} isSelected={isSelected} hasConflict={hasConflict} position={[0, 2.3, 0]} />
    </group>
  );
}

function Vanity({ rotation = 0, finish, isSelected, hasConflict, mirrorLightColor, mirrorIntensity }) {
  const finishMat = FINISH_PRESETS[finish] || FINISH_PRESETS.brass;

  return (
    <group rotation={[0, (rotation * Math.PI) / 180, 0]}>
      <InteractiveClearanceZone
        width={3.8}
        depth={3.0}
        codeLabel="NKBA Guideline 6"
        ruleText='21" Walkway in Front of Lavatory Basin'
        isSelected={isSelected}
        hasConflict={hasConflict}
      />

      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.3, 2.0]} />
        <meshStandardMaterial color="#2d2218" roughness={0.6} metalness={0.05} />
      </mesh>

      <mesh position={[0, 1.1, 1.01]}>
        <planeGeometry args={[3.3, 0.02]} />
        <meshBasicMaterial color="#17110c" />
      </mesh>

      <mesh position={[0, 1.3, 1.04]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 16]} />
        <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
      </mesh>
      <mesh position={[0, 0.8, 1.04]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 16]} />
        <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
      </mesh>

      <mesh position={[0, 1.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 0.12, 2.1]} />
        <meshPhysicalMaterial color="#f8fafc" roughness={0.1} clearcoat={0.9} />
      </mesh>

      <mesh position={[0, 1.84, 0.1]} castShadow>
        <cylinderGeometry args={[0.75, 0.6, 0.22, 32]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.08} clearcoat={1.0} />
      </mesh>

      <group position={[0, 2.05, -0.6]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.55, 16]} />
          <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
        </mesh>
        <mesh position={[0, 0.3, 0.2]} rotation={[Math.PI / 3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.45, 16]} />
          <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
        </mesh>
      </group>

      <mesh position={[0, 4.0, -0.96]}>
        <boxGeometry args={[2.2, 3.2, 0.05]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.02} metalness={0.98} />
      </mesh>

      <pointLight position={[0, 4.0, -0.6]} intensity={mirrorIntensity} distance={4.5} color={mirrorLightColor} />
      <FixtureBadge text={`VANITY SUITE (${rotation}°)`} isSelected={isSelected} hasConflict={hasConflict} position={[0, 4.4, 0]} />
    </group>
  );
}

function SmartToilet({ rotation = 0, finish, isSelected, hasConflict }) {
  const finishMat = FINISH_PRESETS[finish] || FINISH_PRESETS.brass;
  const ceramicColor = finish === 'matteBlack' ? '#181b22' : '#ffffff';

  return (
    <group rotation={[0, (rotation * Math.PI) / 180, 0]}>
      <InteractiveClearanceZone
        width={3.0}
        depth={3.4}
        codeLabel="NKBA Guideline 7 / ADA 604.2"
        ruleText='15" Centerline to Wall • 21" Front Walkway'
        isSelected={isSelected}
        hasConflict={hasConflict}
      />

      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 1.2, 1.8]} />
        <meshPhysicalMaterial color={ceramicColor} roughness={0.12} clearcoat={0.9} />
      </mesh>

      <mesh position={[0, 1.05, 0.35]} castShadow>
        <cylinderGeometry args={[0.62, 0.52, 0.45, 32]} />
        <meshPhysicalMaterial color={ceramicColor} roughness={0.12} clearcoat={0.9} />
      </mesh>

      <mesh position={[0, 1.3, 0.32]} castShadow>
        <cylinderGeometry args={[0.64, 0.64, 0.05, 32]} />
        <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
      </mesh>

      <mesh position={[0, 2.2, -0.92]} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.04]} />
        <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
      </mesh>

      <FixtureBadge text={`SMART TOILET (${rotation}°)`} isSelected={isSelected} hasConflict={hasConflict} position={[0, 2.6, 0]} />
    </group>
  );
}

function ShowerEnclosure({ rotation = 0, finish, isSelected, hasConflict }) {
  const finishMat = FINISH_PRESETS[finish] || FINISH_PRESETS.brass;

  return (
    <group rotation={[0, (rotation * Math.PI) / 180, 0]}>
      <InteractiveClearanceZone
        width={4.4}
        depth={4.4}
        codeLabel="NKBA Guideline 9"
        ruleText='36" × 36" Min. Interior Floor Area'
        isSelected={isSelected}
        hasConflict={hasConflict}
      />

      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[3.8, 0.16, 3.8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.65} />
      </mesh>

      <mesh position={[0, 0.17, -1.4]}>
        <boxGeometry args={[2.4, 0.02, 0.2]} />
        <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
      </mesh>

      <mesh position={[-1.85, 3.6, 0]} receiveShadow>
        <boxGeometry args={[0.04, 7.0, 3.8]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.96}
          opacity={1}
          transparent={false}
          roughness={0.06}
          ior={1.52}
          thickness={0.3}
          specularIntensity={1.0}
        />
      </mesh>

      <mesh position={[-1.85, 7.1, 0]} castShadow>
        <boxGeometry args={[0.08, 0.08, 3.8]} />
        <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
      </mesh>

      <mesh position={[0, 4.8, -1.75]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 3.4, 16]} />
        <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
      </mesh>

      <mesh position={[0, 6.5, -0.9]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.7, 16]} />
        <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
      </mesh>

      <mesh position={[0, 6.45, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.08, 32]} />
        <meshStandardMaterial color={finishMat.color} metalness={finishMat.metalness} roughness={finishMat.roughness} />
      </mesh>

      <FixtureBadge text={`RAIN SHOWER (${rotation}°)`} isSelected={isSelected} hasConflict={hasConflict} position={[0, 7.3, 0]} />
    </group>
  );
}

function RoomShell({ width, depth, wallColor, floorColor }) {
  const w = Number(width);
  const d = Number(depth);
  const h = 8.5;
  const doorW = 2.8;
  const doorH = 7.0;
  const doorZOffset = d * 0.15;

  const floorTexture = useMemo(() => {
    const tex = createTileTexture({
      tileSize: 256,
      groutWidth: 4,
      tileColor: floorColor,
      groutColor: '#64748b'
    });
    tex.repeat.set(w / 2, d / 2);
    return tex;
  }, [w, d, floorColor]);

  const leftWallSegmentBackLength = Math.max(0.5, d / 2 + doorZOffset);
  const leftWallSegmentFrontLength = Math.max(0.5, d / 2 - (doorZOffset + doorW));

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshPhysicalMaterial
          map={floorTexture}
          roughness={0.18}
          metalness={0.05}
          clearcoat={0.75}
          clearcoatRoughness={0.15}
        />
      </mesh>

      <mesh position={[0, h / 2, -d / 2]} receiveShadow>
        <boxGeometry args={[w, h, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>

      <mesh
        position={[-w / 2, h / 2, -d / 2 + leftWallSegmentBackLength / 2]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[leftWallSegmentBackLength, h, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>

      <mesh
        position={[-w / 2, doorH + (h - doorH) / 2, doorZOffset + doorW / 2]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[doorW, h - doorH, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>

      {leftWallSegmentFrontLength > 0.1 && (
        <mesh
          position={[-w / 2, h / 2, d / 2 - leftWallSegmentFrontLength / 2]}
          rotation={[0, Math.PI / 2, 0]}
          receiveShadow
        >
          <boxGeometry args={[leftWallSegmentFrontLength, h, 0.2]} />
          <meshStandardMaterial color={wallColor} roughness={0.88} />
        </mesh>
      )}

      <mesh position={[0, 0.2, -d / 2 + 0.12]}>
        <boxGeometry args={[w, 0.4, 0.05]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
    </group>
  );
}

export default function Bathroom3D({ width = 16, depth = 14 }) {
  const containerRef = useRef(null);

  const [activeFinish, setActiveFinish] = useState('brass');
  const [activeCategory, setActiveCategory] = useState('bathtub');
  const [lightingPreset, setLightingPreset] = useState('warmEvening');
  const [cameraView, setCameraView] = useState('orbit');
  const [activeDraggingFixture, setActiveDraggingFixture] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const w = Math.max(Number(width) || 16, 8);
  const d = Math.max(Number(depth) || 14, 8);

  const [rotations, setRotations] = useState({
    toilet: 0,
    vanity: 0,
    shower: 0,
    bathtub: 0
  });

  // Default fixture centerlines anchored to static room dimensions to prevent jitter during slider adjustment
  const [positions, setPositions] = useState({
    vanity: [-4.8, 0, -4.2],
    shower: [4.8, 0, -4.2],
    toilet: [-5.0, 0, 3.8],
    bathtub: [3.8, 0, 3.5]
  });

  const conflicts = useMemo(() => {
    const list = Object.entries(positions);
    const flags = { bathtub: false, vanity: false, shower: false, toilet: false };
    const MIN_DISTANCE = 3.6;

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [catA, posA] = list[i];
        const [catB, posB] = list[j];
        const dist = Math.hypot(posA[0] - posB[0], posA[2] - posB[2]);
        if (dist < MIN_DISTANCE) {
          flags[catA] = true;
          flags[catB] = true;
        }
      }
    }
    return flags;
  }, [positions]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isExpanded]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const rotateFixture = (category) => {
    setRotations((prev) => ({
      ...prev,
      [category]: (prev[category] + 90) % 360
    }));
  };

  const handleFloorPointerMove = (e) => {
    if (!activeDraggingFixture) return;
    e.stopPropagation();

    const padX = w / 2 - 1.8;
    const padZ = d / 2 - 1.8;
    const targetX = Math.max(-padX, Math.min(padX, e.point.x));
    const targetZ = Math.max(-padZ, Math.min(padZ, e.point.z));

    setPositions((prev) => ({
      ...prev,
      [activeDraggingFixture]: [targetX, 0, targetZ]
    }));
  };

  const handlePointerUp = () => {
    if (activeDraggingFixture) {
      setActiveDraggingFixture(null);
    }
  };

  const lightConfig = LIGHTING_MODES[lightingPreset] || LIGHTING_MODES.warmEvening;

  const renderStudioCanvas = () => (
    <>
      {/* Top Viewport Header */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          zIndex: 30,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          gap: '6px'
        }}
      >
        <div style={{ background: 'rgba(7, 7, 7, 0.92)', padding: '3px 8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="font-mono" style={{ display: 'block', color: 'var(--accent-gold, #c5a059)', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
            {isExpanded ? 'FULL THEATER PROJECTION' : 'SPATIAL STUDIO'} [{w}' &times; {d}']
          </span>
        </div>

        {/* Viewport Toolbar */}
        <div style={{ display: 'flex', gap: '3px', pointerEvents: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', background: 'rgba(7, 7, 7, 0.92)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { id: 'orbit', label: '3D' },
              { id: 'top', label: 'Plan' },
              { id: 'eye', label: 'Eye' }
            ].map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setCameraView(view.id)}
                className="clickable font-mono"
                style={{
                  background: cameraView === view.id ? 'var(--accent-gold, #c5a059)' : 'transparent',
                  border: 'none',
                  color: cameraView === view.id ? '#070707' : '#888888',
                  padding: '3px 7px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {view.label}
              </button>
            ))}
          </div>

          {Object.entries(LIGHTING_MODES).map(([modeKey, config]) => {
            const isCurrent = lightingPreset === modeKey;
            return (
              <button
                key={modeKey}
                type="button"
                onClick={() => setLightingPreset(modeKey)}
                className="clickable font-mono"
                style={{
                  background: isCurrent ? 'rgba(197, 160, 89, 0.3)' : 'rgba(7, 7, 7, 0.92)',
                  border: isCurrent ? '1px solid #c5a059' : '1px solid rgba(255,255,255,0.1)',
                  color: isCurrent ? '#f8fafc' : '#888888',
                  padding: '3px 6px',
                  fontSize: '0.62rem',
                  cursor: 'pointer'
                }}
              >
                {modeKey === 'daylight' ? '☀️' : modeKey === 'warmEvening' ? '💡' : '🌙'}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="clickable font-mono"
            title={isExpanded ? 'Minimize Studio (Esc)' : 'Expand Full Theater View'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: isExpanded ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              border: isExpanded ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
              color: isExpanded ? '#fca5a5' : '#ffffff',
              padding: '3px 8px',
              fontSize: '0.62rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            {isExpanded ? '⤢ Exit' : '⤡ Expand'}
          </button>
        </div>
      </div>

      {/* Floating Bottom Toolbar */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          background: 'rgba(9, 9, 9, 0.96)',
          border: '1px solid rgba(197, 160, 89, 0.4)',
          borderRadius: '20px',
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
          maxWidth: '96%',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.12)', paddingRight: '6px' }}>
          <span className="font-mono" style={{ color: '#888888', fontSize: '0.58rem', textTransform: 'uppercase' }}>
            Orient:
          </span>
          {[
            { id: 'bathtub', label: 'Tub' },
            { id: 'toilet', label: 'Toilet' },
            { id: 'vanity', label: 'Vanity' },
            { id: 'shower', label: 'Shower' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveCategory(item.id);
                rotateFixture(item.id);
              }}
              className="clickable font-mono"
              style={{
                background: conflicts[item.id]
                  ? 'rgba(239, 68, 68, 0.3)'
                  : activeCategory === item.id
                  ? 'rgba(197, 160, 89, 0.25)'
                  : 'transparent',
                border: conflicts[item.id]
                  ? '1px solid #ef4444'
                  : activeCategory === item.id
                  ? '1px solid #c5a059'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                color: conflicts[item.id] ? '#fca5a5' : activeCategory === item.id ? '#c5a059' : '#a3a3a3',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '0.58rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              {conflicts[item.id] ? '⚠️' : '↻'} {item.label} ({rotations[item.id]}°)
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="font-mono" style={{ color: '#888888', fontSize: '0.58rem', textTransform: 'uppercase' }}>
            Finish:
          </span>
          {Object.entries(FINISH_PRESETS).map(([key, item]) => {
            const isActive = activeFinish === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFinish(key)}
                title={item.label}
                className="clickable font-mono"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #c5a059' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isActive ? 'rgba(197, 160, 89, 0.18)' : 'transparent',
                  color: isActive ? '#f5f5f5' : '#888888',
                  cursor: 'pointer',
                  fontSize: '0.58rem',
                  fontWeight: isActive ? 700 : 500
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: item.swatch,
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                />
                {item.label.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      <Canvas
        shadows
        frameloop="demand"
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15
        }}
        camera={{ position: [16, 9.5, 18], fov: 40, near: 0.1, far: 100 }}
        onPointerUp={handlePointerUp}
      >
        <CameraController cameraView={cameraView} />

        <ambientLight color={lightConfig.ambientColor} intensity={lightConfig.ambientIntensity} />

        <Environment preset="city" environmentIntensity={0.65} />

        <directionalLight
          position={lightConfig.sunPos}
          color={lightConfig.sunColor}
          intensity={lightConfig.sunIntensity}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        <pointLight position={[-w * 0.5, 6, d * 0.5]} intensity={0.4} color="#f8fafc" />

        <RoomShell
          width={w}
          depth={d}
          wallColor={lightConfig.wallColor}
          floorColor={lightConfig.floorColor}
        />

        <EntryDoor
          position={[-w / 2, 0, d * 0.15]}
          rotation={90}
          finish={activeFinish}
          doorWidth={2.8}
          doorHeight={7.0}
        />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.005, 0]}
          onPointerMove={handleFloorPointerMove}
          onPointerUp={handlePointerUp}
          visible={false}
        >
          <planeGeometry args={[w * 2, d * 2]} />
          <meshBasicMaterial />
        </mesh>

        {/* BATHTUB */}
        <group
          position={positions.bathtub}
          onPointerDown={(e) => {
            e.stopPropagation();
            setActiveCategory('bathtub');
            setActiveDraggingFixture('bathtub');
          }}
        >
          <mesh position={[0, 1.2, 0]} visible={false}>
            <boxGeometry args={[5.2, 2.5, 3.2]} />
            <meshBasicMaterial />
          </mesh>
          <Bathtub
            rotation={rotations.bathtub}
            finish={activeFinish}
            isSelected={activeCategory === 'bathtub'}
            hasConflict={conflicts.bathtub}
          />
        </group>

        {/* VANITY */}
        <group
          position={positions.vanity}
          onPointerDown={(e) => {
            e.stopPropagation();
            setActiveCategory('vanity');
            setActiveDraggingFixture('vanity');
          }}
        >
          <mesh position={[0, 2.5, 0]} visible={false}>
            <boxGeometry args={[4.0, 5.0, 2.5]} />
            <meshBasicMaterial />
          </mesh>
          <Vanity
            rotation={rotations.vanity}
            finish={activeFinish}
            isSelected={activeCategory === 'vanity'}
            hasConflict={conflicts.vanity}
            mirrorLightColor={lightConfig.mirrorLightColor}
            mirrorIntensity={lightConfig.mirrorIntensity}
          />
        </group>

        {/* SHOWER */}
        <group
          position={positions.shower}
          onPointerDown={(e) => {
            e.stopPropagation();
            setActiveCategory('shower');
            setActiveDraggingFixture('shower');
          }}
        >
          <mesh position={[0, 3.5, 0]} visible={false}>
            <boxGeometry args={[4.2, 7.0, 4.2]} />
            <meshBasicMaterial />
          </mesh>
          <ShowerEnclosure
            rotation={rotations.shower}
            finish={activeFinish}
            isSelected={activeCategory === 'shower'}
            hasConflict={conflicts.shower}
          />
        </group>

        {/* TOILET */}
        <group
          position={positions.toilet}
          onPointerDown={(e) => {
            e.stopPropagation();
            setActiveCategory('toilet');
            setActiveDraggingFixture('toilet');
          }}
        >
          <mesh position={[0, 1.5, 0]} visible={false}>
            <boxGeometry args={[2.5, 3.0, 2.5]} />
            <meshBasicMaterial />
          </mesh>
          <SmartToilet
            rotation={rotations.toilet}
            finish={activeFinish}
            isSelected={activeCategory === 'toilet'}
            hasConflict={conflicts.toilet}
          />
        </group>

        <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={Math.max(w, d) * 1.3} blur={1.5} far={4.0} />

        <OrbitControls
          key={cameraView}
          target={
            cameraView === 'top'
              ? [0, 0, 0]
              : cameraView === 'eye'
              ? [0, 2.5, 0]
              : [0, 1.5, 0]
          }
          enableDamping={false}
          enabled={!activeDraggingFixture}
          enablePan={!activeDraggingFixture}
          enableZoom={true}
          maxPolarAngle={cameraView === 'top' ? Math.PI / 2 : Math.PI / 2 - 0.05}
          minDistance={cameraView === 'top' ? 2 : 4}
          maxDistance={Math.max(w, d) * 3.2}
        />
      </Canvas>
    </>
  );

  return (
    <>
      {/* 1. Compact Default Studio Viewport */}
      <div
        ref={containerRef}
        data-lenis-prevent="true"
        style={{
          position: 'relative',
          width: '100%',
          height: '360px',
          overflow: 'hidden',
          border: '1px solid var(--hairline, rgba(255, 255, 255, 0.08))',
          background: '#070707',
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        {renderStudioCanvas()}
      </div>

      {/* 2. Full Theater Mode */}
      {isExpanded &&
        createPortal(
          <div
            data-lenis-prevent="true"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(5, 5, 5, 0.94)',
              padding: '24px',
              boxSizing: 'border-box'
            }}
            onClick={() => setIsExpanded(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '1440px',
                height: '92vh',
                overflow: 'hidden',
                border: '1px solid var(--hairline-hover, rgba(255, 255, 255, 0.2))',
                background: '#070707',
                boxShadow: '0 25px 90px rgba(0, 0, 0, 0.98)',
                userSelect: 'none',
                touchAction: 'none'
              }}
            >
              {renderStudioCanvas()}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}