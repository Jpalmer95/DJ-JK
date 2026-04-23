import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VRPadGridProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  onPadTrigger?: (padIndex: number, velocity: number) => void;
  activeBank?: number;
}

// Neon color palette for pads (matching 2D MPCPadGrid)
const PAD_COLORS = [
  0xff0066, // Hot pink
  0xff3300, // Orange red
  0xff6600, // Orange
  0xffcc00, // Yellow
  0x99ff00, // Lime
  0x00ff66, // Spring green
  0x00ffcc, // Cyan/turquoise
  0x00ccff, // Light blue
  0x0066ff, // Blue
  0x3300ff, // Indigo
  0x6600ff, // Violet
  0x9900ff, // Purple
  0xff00cc, // Magenta
  0xff0099, // Pink
  0x00ff99, // Mint
  0x66ffcc, // Aqua
];

interface PadState {
  isPressed: boolean;
  isActive: boolean;
  glowIntensity: number;
  pressTime: number;
}

// Individual Pad component
function Pad({
  position,
  color,
  index,
  onTrigger
}: {
  position: [number, number, number];
  color: number;
  index: number;
  onTrigger: (index: number, velocity: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [state, setState] = useState<PadState>({
    isPressed: false,
    isActive: false,
    glowIntensity: 0,
    pressTime: 0,
  });
  
  const baseY = position[1] + 0.015;
  const pressedY = position[1] + 0.008;
  const colorObj = new THREE.Color(color);
  const timeRef = useRef(0);
  
  // Breathing animation and state management
  useFrame((_, delta) => {
    timeRef.current += delta;
    
    if (!meshRef.current || !glowRef.current) return;
    
    // Breathing glow animation when idle
    let targetGlow = 0.2 + 0.1 * Math.sin(timeRef.current * 2 + index * 0.5);
    
    if (state.isActive) {
      // Active flash animation
      const timeSincePress = timeRef.current - state.pressTime;
      if (timeSincePress < 0.5) {
        // Bright flash then decay
        targetGlow = 1.0 - (timeSincePress * 2);
      } else {
        // Return to idle
        setState(prev => ({ ...prev, isActive: false }));
      }
    }
    
    // Smooth glow interpolation
    const newGlow = THREE.MathUtils.lerp(state.glowIntensity, targetGlow, delta * 8);
    setState(prev => ({ ...prev, glowIntensity: newGlow }));
    
    // Update mesh position (press animation)
    const currentY = meshRef.current.position.y;
    const targetY = state.isPressed ? pressedY : baseY;
    meshRef.current.position.y = THREE.MathUtils.lerp(currentY, targetY, delta * 15);
    
    // Update materials
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = newGlow;
    
    // Glow ring
    const glowMaterial = glowRef.current.material as THREE.MeshStandardMaterial;
    glowMaterial.opacity = newGlow * 0.6;
  });
  
  const handlePointerDown = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPressed: true,
      isActive: true,
      pressTime: timeRef.current,
    }));
    onTrigger(index, 1.0);
  }, [index, onTrigger]);
  
  const handlePointerUp = useCallback(() => {
    setState(prev => ({ ...prev, isPressed: false }));
  }, []);
  
  const handlePointerLeave = useCallback(() => {
    setState(prev => ({ ...prev, isPressed: false }));
  }, []);
  
  return (
    <group position={position}>
      {/* Pad body */}
      <mesh
        ref={meshRef}
        position={[0, baseY, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial
          color={color}
          emissive={colorObj}
          emissiveIntensity={state.glowIntensity}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* Glow ring (appears around pad when active) */}
      <mesh
        ref={glowRef}
        position={[0, baseY + 0.001, 0]}
      >
        <boxGeometry args={[0.085, 0.002, 0.085]} />
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={0}
        />
      </mesh>
      
      {/* Pad shadow/base */}
      <mesh position={[0, position[1] + 0.002, 0]}>
        <boxGeometry args={[0.082, 0.003, 0.082]} />
        <meshStandardMaterial
          color={0x111111}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

// Bank indicator component
function BankIndicator({
  position,
  activeBank,
  totalBanks
}: {
  position: [number, number, number];
  activeBank: number;
  totalBanks: number;
}) {
  return (
    <group position={position}>
      {Array.from({ length: totalBanks }, (_, i) => {
        const isActive = i === activeBank;
        const x = (i - (totalBanks - 1) / 2) * 0.035;
        return (
          <mesh key={i} position={[x, 0, 0]}>
            <sphereGeometry args={[0.005, 8, 8]} />
            <meshStandardMaterial
              color={isActive ? 0x00ff88 : 0x333333}
              emissive={isActive ? 0x00ff88 : 0x000000}
              emissiveIntensity={isActive ? 0.8 : 0}
            />
          </mesh>
        );
      })}
      {/* Bank label */}
      <mesh position={[0, -0.015, 0]}>
        <boxGeometry args={[0.25, 0.008, 0.001]} />
        <meshStandardMaterial
          color={0x00ff88}
          emissive={0x00ff88}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

export default function VRPadGrid({
  position,
  rotation = [0, 0, 0],
  onPadTrigger,
  activeBank = 0
}: VRPadGridProps) {
  const totalBanks = 8;
  const padSize = 0.08;
  const gap = 0.01;
  const gridSize = 4;
  
  // Calculate grid offset to center
  const gridOffset = ((gridSize - 1) * (padSize + gap)) / 2;
  
  const handlePadTrigger = useCallback((index: number, velocity: number) => {
    onPadTrigger?.(index, velocity);
  }, [onPadTrigger]);
  
  return (
    <group position={position} rotation={rotation}>
      {/* Base plate */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.02, 0.4]} />
        <meshStandardMaterial
          color={0x0a0a0a}
          metalness={0.95}
          roughness={0.2}
        />
      </mesh>
      
      {/* Edge glow effect */}
      <mesh position={[0, -0.011, 0]}>
        <boxGeometry args={[0.405, 0.018, 0.405]} />
        <meshStandardMaterial
          color={0x111111}
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
      
      {/* Bank indicator */}
      <BankIndicator
        position={[0, 0.015, -0.16]}
        activeBank={activeBank}
        totalBanks={totalBanks}
      />
      
      {/* Pad grid */}
      {Array.from({ length: gridSize * gridSize }, (_, i) => {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const x = col * (padSize + gap) - gridOffset;
        const z = row * (padSize + gap) - gridOffset;
        
        return (
          <Pad
            key={i}
            position={[x, 0.01, z]}
            color={PAD_COLORS[i]}
            index={i}
            onTrigger={handlePadTrigger}
          />
        );
      })}
      
      {/* Grid lines (decorative) */}
      {Array.from({ length: gridSize + 1 }, (_, i) => {
        const pos = i * (padSize + gap) - gridOffset - gap / 2;
        return (
          <React.Fragment key={`lines-${i}`}>
            {/* Horizontal lines */}
            <mesh position={[0, 0.011, pos]}>
              <boxGeometry args={[0.36, 0.001, 0.002]} />
              <meshStandardMaterial
                color={0x222222}
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
            {/* Vertical lines */}
            <mesh position={[pos, 0.011, 0]}>
              <boxGeometry args={[0.002, 0.001, 0.36]} />
              <meshStandardMaterial
                color={0x222222}
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
          </React.Fragment>
        );
      })}
      
      {/* Corner accents */}
      {[
        [-0.18, 0, -0.18],
        [0.18, 0, -0.18],
        [-0.18, 0, 0.18],
        [0.18, 0, 0.18],
      ].map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.012, pos[2]]}>
          <boxGeometry args={[0.015, 0.002, 0.015]} />
          <meshStandardMaterial
            color={0x00ff88}
            emissive={0x00ff88}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}