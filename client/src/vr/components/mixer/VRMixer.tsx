import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

interface VRMixerProps {
  position: [number, number, number];
  onCrossfaderChange?: (value: number) => void;
  onVolumeChange?: (deck: number, value: number) => void;
  onEQChange?: (deck: number, band: string, value: number) => void;
}

// VU Meter segment component
function VUMeterSegment({ 
  level, 
  maxHeight, 
  index, 
  totalSegments,
  baseY 
}: { 
  level: number; 
  maxHeight: number; 
  index: number; 
  totalSegments: number;
  baseY: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const threshold = index / totalSegments;
  const isActive = level > threshold;
  
  // Color gradient: green -> yellow -> red
  const getColor = useCallback(() => {
    const ratio = index / totalSegments;
    if (ratio < 0.6) return new THREE.Color(0x00ff88); // Green
    if (ratio < 0.85) return new THREE.Color(0xffff00); // Yellow
    return new THREE.Color(0xff4444); // Red
  }, [index, totalSegments]);
  
  const color = getColor();
  const segmentHeight = maxHeight / totalSegments;
  const y = baseY + (index * segmentHeight) + segmentHeight / 2;
  
  return (
    <mesh ref={meshRef} position={[0, y, 0]}>
      <boxGeometry args={[0.01, segmentHeight * 0.9, 0.01]} />
      <meshStandardMaterial
        color={isActive ? color : new THREE.Color(0x333333)}
        emissive={isActive ? color : new THREE.Color(0x000000)}
        emissiveIntensity={isActive ? 0.8 : 0}
      />
    </mesh>
  );
}

// VU Meter component
function VUMeter({ 
  position, 
  level 
}: { 
  position: [number, number, number]; 
  level: number;
}) {
  const segments = 12;
  const height = 0.12;
  
  return (
    <group position={position}>
      {/* Background bar */}
      <mesh>
        <boxGeometry args={[0.015, height, 0.015]} />
        <meshStandardMaterial color={0x111111} />
      </mesh>
      {/* Segments */}
      {Array.from({ length: segments }, (_, i) => (
        <VUMeterSegment
          key={i}
          level={level}
          maxHeight={height}
          index={i}
          totalSegments={segments}
          baseY={-height / 2}
        />
      ))}
    </group>
  );
}

// Volume Fader component
function VolumeFader({
  position,
  value,
  deck,
  onChange,
  glowColor
}: {
  position: [number, number, number];
  value: number;
  deck: number;
  onChange: (deck: number, value: number) => void;
  glowColor: THREE.Color;
}) {
  const handleRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const controllers = useXR((s) => s.inputSourceStates)
    .map((s) => {
      const controller = (s as { controller?: THREE.Object3D }).controller;
      return controller ? { controller } : null;
    })
    .filter((x): x is { controller: THREE.Object3D } => x !== null);
  
  const channelHeight = 0.18;
  const minY = -channelHeight / 2;
  const maxY = channelHeight / 2;
  const handleY = minY + value * (maxY - minY);
  
  useFrame(() => {
    if (isDragging && controllers.length > 0) {
      const controller = controllers[0];
      if (controller) {
        const worldPos = new THREE.Vector3();
        controller.controller.getWorldPosition(worldPos);
        const localY = worldPos.y - position[1];
        const newValue = Math.max(0, Math.min(1, (localY - minY) / (maxY - minY)));
        onChange(deck, newValue);
      }
    }
  });
  
  return (
    <group position={position}>
      {/* Channel groove */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.025, channelHeight, 0.008]} />
        <meshStandardMaterial color={0x222222} />
      </mesh>
      
      {/* dB markings */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0.018, minY + i * (channelHeight / 5), 0]}>
          <boxGeometry args={[0.008, 0.001, 0.003]} />
          <meshStandardMaterial color={0x555555} />
        </mesh>
      ))}
      
      {/* Handle */}
      <mesh
        ref={handleRef}
        position={[0, handleY, 0.006]}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
      >
        <boxGeometry args={[0.035, 0.015, 0.012]} />
        <meshStandardMaterial
          color={isDragging ? glowColor : 0x888888}
          emissive={isDragging ? glowColor : 0x000000}
          emissiveIntensity={isDragging ? 0.6 : 0}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Deck label */}
      <mesh position={[0, -channelHeight / 2 - 0.015, 0]}>
        <boxGeometry args={[0.015, 0.008, 0.001]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// Crossfader component
function Crossfader({
  position,
  value,
  onChange
}: {
  position: [number, number, number];
  value: number;
  onChange: (value: number) => void;
}) {
  const handleRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const controllers = useXR((s) => s.inputSourceStates)
    .map((s) => {
      const controller = (s as { controller?: THREE.Object3D }).controller;
      return controller ? { controller } : null;
    })
    .filter((x): x is { controller: THREE.Object3D } => x !== null);
  
  const channelWidth = 0.12;
  const minX = -channelWidth / 2;
  const maxX = channelWidth / 2;
  const handleX = minX + value * (maxX - minX);
  
  useFrame(() => {
    if (isDragging && controllers.length > 0) {
      const controller = controllers[0];
      if (controller) {
        const worldPos = new THREE.Vector3();
        controller.controller.getWorldPosition(worldPos);
        const localX = worldPos.x - position[0];
        const newValue = Math.max(0, Math.min(1, (localX - minX) / (maxX - minX)));
        onChange(newValue);
      }
    }
  });
  
  return (
    <group position={position}>
      {/* Channel groove */}
      <mesh>
        <boxGeometry args={[channelWidth + 0.01, 0.015, 0.008]} />
        <meshStandardMaterial color={0x1a1a1a} />
      </mesh>
      
      {/* Handle */}
      <mesh
        ref={handleRef}
        position={[handleX, 0, 0.006]}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
      >
        <boxGeometry args={[0.025, 0.02, 0.015]} />
        <meshStandardMaterial
          color={isDragging ? 0x00ffff : 0xaaaaaa}
          emissive={isDragging ? 0x00ffff : 0x000000}
          emissiveIntensity={isDragging ? 0.8 : 0}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Label A (left) */}
      <mesh position={[-channelWidth / 2 - 0.012, 0, 0]}>
        <boxGeometry args={[0.01, 0.01, 0.001]} />
        <meshStandardMaterial
          color={0x00ffff}
          emissive={0x00ffff}
          emissiveIntensity={0.4}
        />
      </mesh>
      
      {/* Label B (right) */}
      <mesh position={[channelWidth / 2 + 0.012, 0, 0]}>
        <boxGeometry args={[0.01, 0.01, 0.001]} />
        <meshStandardMaterial
          color={0xff00ff}
          emissive={0xff00ff}
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

// EQ Knob component
function EQKnob({
  position,
  value,
  deck,
  band,
  onChange,
  glowColor
}: {
  position: [number, number, number];
  value: number;
  deck: number;
  band: string;
  onChange: (deck: number, band: string, value: number) => void;
  glowColor: THREE.Color;
}) {
  const knobRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const controllers = useXR((s) => s.inputSourceStates)
    .map((s) => {
      const controller = (s as { controller?: THREE.Object3D }).controller;
      return controller ? { controller } : null;
    })
    .filter((x): x is { controller: THREE.Object3D } => x !== null);
  const lastAngle = useRef(0);
  
  // Map value to rotation (-135 to 135 degrees)
  const rotation = (-135 + value * 270) * (Math.PI / 180);
  
  useFrame(() => {
    if (knobRef.current) {
      knobRef.current.rotation.y = rotation;
    }
    
    if (isDragging && controllers.length > 0) {
      const controller = controllers[0];
      if (controller) {
        const worldPos = new THREE.Vector3();
        controller.controller.getWorldPosition(worldPos);
        const dx = worldPos.x - position[0];
        const dy = worldPos.y - position[1];
        const angle = Math.atan2(dy, dx);
        const deltaAngle = angle - lastAngle.current;
        lastAngle.current = angle;
        
        const deltaValue = deltaAngle / (Math.PI * 1.5);
        const newValue = Math.max(0, Math.min(1, value + deltaValue));
        onChange(deck, band, newValue);
      }
    }
  });
  
  return (
    <group position={position}>
      {/* Knob body */}
      <mesh
        ref={knobRef}
        onPointerDown={(e) => {
          setIsDragging(true);
          const localPoint = e.point;
          lastAngle.current = Math.atan2(
            localPoint.y - position[1],
            localPoint.x - position[0]
          );
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
      >
        <cylinderGeometry args={[0.012, 0.014, 0.015, 16]} />
        <meshStandardMaterial
          color={isDragging ? glowColor : 0x444444}
          emissive={isDragging ? glowColor : 0x000000}
          emissiveIntensity={isDragging ? 0.5 : 0}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Knob indicator line */}
      <mesh position={[0, 0.008, 0.01]}>
        <boxGeometry args={[0.002, 0.001, 0.006]} />
        <meshStandardMaterial
          color={isDragging ? glowColor : 0xaaaaaa}
          emissive={isDragging ? glowColor : 0x444444}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Band label */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.015, 0.005, 0.001]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

// Master Volume Fader
function MasterFader({
  position,
  value,
  onChange
}: {
  position: [number, number, number];
  value: number;
  onChange: (value: number) => void;
}) {
  const handleRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const controllers = useXR((s) => s.inputSourceStates)
    .map((s) => {
      const controller = (s as { controller?: THREE.Object3D }).controller;
      return controller ? { controller } : null;
    })
    .filter((x): x is { controller: THREE.Object3D } => x !== null);
  
  const channelHeight = 0.22;
  const minY = -channelHeight / 2;
  const maxY = channelHeight / 2;
  const handleY = minY + value * (maxY - minY);
  
  useFrame(() => {
    if (isDragging && controllers.length > 0) {
      const controller = controllers[0];
      if (controller) {
        const worldPos = new THREE.Vector3();
        controller.controller.getWorldPosition(worldPos);
        const localY = worldPos.y - position[1];
        const newValue = Math.max(0, Math.min(1, (localY - minY) / (maxY - minY)));
        onChange(newValue);
      }
    }
  });
  
  return (
    <group position={position}>
      {/* Channel groove - wider for master */}
      <mesh>
        <boxGeometry args={[0.035, channelHeight, 0.01]} />
        <meshStandardMaterial color={0x1a1a1a} />
      </mesh>
      
      {/* dB markings */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[0.022, minY + i * (channelHeight / 7), 0]}>
          <boxGeometry args={[0.01, 0.001, 0.004]} />
          <meshStandardMaterial color={0x666666} />
        </mesh>
      ))}
      
      {/* Handle - larger for master */}
      <mesh
        ref={handleRef}
        position={[0, handleY, 0.007]}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
      >
        <boxGeometry args={[0.045, 0.02, 0.015]} />
        <meshStandardMaterial
          color={isDragging ? 0xffffff : 0xcccccc}
          emissive={isDragging ? 0xffffff : 0x444444}
          emissiveIntensity={isDragging ? 0.6 : 0}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Master label */}
      <mesh position={[0, -channelHeight / 2 - 0.015, 0]}>
        <boxGeometry args={[0.025, 0.008, 0.001]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

export default function VRMixer({
  position,
  onCrossfaderChange,
  onVolumeChange,
  onEQChange
}: VRMixerProps) {
  const [crossfaderValue, setCrossfaderValue] = useState(0.5);
  const [deckAVolume, setDeckAVolume] = useState(0.75);
  const [deckBVolume, setDeckBVolume] = useState(0.75);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [deckAEQ, setDeckAEQ] = useState({ low: 0.5, mid: 0.5, high: 0.5 });
  const [deckBEQ, setDeckBEQ] = useState({ low: 0.5, mid: 0.5, high: 0.5 });
  const [vuLevelA, setVuLevelA] = useState(0.6);
  const [vuLevelB, setVuLevelB] = useState(0.5);
  
  // Animation for VU meters
  const vuAnimationRef = useRef(0);
  useFrame((_, delta) => {
    vuAnimationRef.current += delta;
    // Simulate VU meter fluctuation
    setVuLevelA(deckAVolume * (0.7 + 0.3 * Math.sin(vuAnimationRef.current * 3)));
    setVuLevelB(deckBVolume * (0.7 + 0.3 * Math.sin(vuAnimationRef.current * 2.5 + 1)));
  });
  
  const handleCrossfaderChange = useCallback((value: number) => {
    setCrossfaderValue(value);
    onCrossfaderChange?.(value);
  }, [onCrossfaderChange]);
  
  const handleVolumeChange = useCallback((deck: number, value: number) => {
    if (deck === 1) {
      setDeckAVolume(value);
    } else {
      setDeckBVolume(value);
    }
    onVolumeChange?.(deck, value);
  }, [onVolumeChange]);
  
  const handleEQChange = useCallback((deck: number, band: string, value: number) => {
    if (deck === 1) {
      setDeckAEQ(prev => ({ ...prev, [band]: value }));
    } else {
      setDeckBEQ(prev => ({ ...prev, [band]: value }));
    }
    onEQChange?.(deck, band, value);
  }, [onEQChange]);
  
  const handleMasterChange = useCallback((value: number) => {
    setMasterVolume(value);
  }, []);
  
  const cyanColor = new THREE.Color(0x00ffff);
  const magentaColor = new THREE.Color(0xff00ff);
  
  return (
    <group position={position} rotation={[-0.3, 0, 0]}>
      {/* Panel base */}
      <mesh>
        <boxGeometry args={[0.4, 0.02, 0.35]} />
        <meshStandardMaterial
          color={0x1a1a1a}
          metalness={0.9}
          roughness={0.3}
        />
      </mesh>
      
      {/* Panel border glow */}
      <mesh position={[0, -0.011, 0]}>
        <boxGeometry args={[0.405, 0.018, 0.355]} />
        <meshStandardMaterial
          color={0x0a0a0a}
          metalness={0.95}
          roughness={0.2}
        />
      </mesh>
      
      {/* Deck A Volume Fader + VU Meter (left side) */}
      <group position={[-0.14, 0.02, 0.05]}>
        <VolumeFader
          position={[0, 0, 0]}
          value={deckAVolume}
          deck={1}
          onChange={handleVolumeChange}
          glowColor={cyanColor}
        />
        <VUMeter position={[0.04, 0, 0]} level={vuLevelA} />
      </group>
      
      {/* Deck B Volume Fader + VU Meter (right side) */}
      <group position={[0.14, 0.02, 0.05]}>
        <VolumeFader
          position={[0, 0, 0]}
          value={deckBVolume}
          deck={2}
          onChange={handleVolumeChange}
          glowColor={magentaColor}
        />
        <VUMeter position={[0.04, 0, 0]} level={vuLevelB} />
      </group>
      
      {/* Master Volume (center) */}
      <MasterFader
        position={[0, 0.02, 0.05]}
        value={masterVolume}
        onChange={handleMasterChange}
      />
      
      {/* Crossfader */}
      <Crossfader
        position={[0, 0.015, -0.12]}
        value={crossfaderValue}
        onChange={handleCrossfaderChange}
      />
      
      {/* Deck A EQ Knobs */}
      <group position={[-0.14, 0.025, -0.04]}>
        <EQKnob
          position={[-0.025, 0, 0]}
          value={deckAEQ.low}
          deck={1}
          band="low"
          onChange={handleEQChange}
          glowColor={cyanColor}
        />
        <EQKnob
          position={[0, 0, 0]}
          value={deckAEQ.mid}
          deck={1}
          band="mid"
          onChange={handleEQChange}
          glowColor={cyanColor}
        />
        <EQKnob
          position={[0.025, 0, 0]}
          value={deckAEQ.high}
          deck={1}
          band="high"
          onChange={handleEQChange}
          glowColor={cyanColor}
        />
        {/* EQ Labels */}
        <mesh position={[-0.025, -0.025, 0]}>
          <boxGeometry args={[0.012, 0.004, 0.001]} />
          <meshStandardMaterial color={cyanColor} emissive={cyanColor} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, -0.025, 0]}>
          <boxGeometry args={[0.012, 0.004, 0.001]} />
          <meshStandardMaterial color={cyanColor} emissive={cyanColor} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.025, -0.025, 0]}>
          <boxGeometry args={[0.012, 0.004, 0.001]} />
          <meshStandardMaterial color={cyanColor} emissive={cyanColor} emissiveIntensity={0.3} />
        </mesh>
      </group>
      
      {/* Deck B EQ Knobs */}
      <group position={[0.14, 0.025, -0.04]}>
        <EQKnob
          position={[-0.025, 0, 0]}
          value={deckBEQ.low}
          deck={2}
          band="low"
          onChange={handleEQChange}
          glowColor={magentaColor}
        />
        <EQKnob
          position={[0, 0, 0]}
          value={deckBEQ.mid}
          deck={2}
          band="mid"
          onChange={handleEQChange}
          glowColor={magentaColor}
        />
        <EQKnob
          position={[0.025, 0, 0]}
          value={deckBEQ.high}
          deck={2}
          band="high"
          onChange={handleEQChange}
          glowColor={magentaColor}
        />
        {/* EQ Labels */}
        <mesh position={[-0.025, -0.025, 0]}>
          <boxGeometry args={[0.012, 0.004, 0.001]} />
          <meshStandardMaterial color={magentaColor} emissive={magentaColor} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, -0.025, 0]}>
          <boxGeometry args={[0.012, 0.004, 0.001]} />
          <meshStandardMaterial color={magentaColor} emissive={magentaColor} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.025, -0.025, 0]}>
          <boxGeometry args={[0.012, 0.004, 0.001]} />
          <meshStandardMaterial color={magentaColor} emissive={magentaColor} emissiveIntensity={0.3} />
        </mesh>
      </group>
      
      {/* Section dividers */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.38, 0.001, 0.002]} />
        <meshStandardMaterial color={0x333333} />
      </mesh>
      <mesh position={[-0.07, 0.012, -0.08]}>
        <boxGeometry args={[0.002, 0.001, 0.28]} />
        <meshStandardMaterial color={0x333333} />
      </mesh>
      <mesh position={[0.07, 0.012, -0.08]}>
        <boxGeometry args={[0.002, 0.001, 0.28]} />
        <meshStandardMaterial color={0x333333} />
      </mesh>
    </group>
  );
}