import React, { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Grid, Text, RoundedBox } from '@react-three/drei'
import { useXR } from '@react-three/xr'
import { useVRAudio } from './VRApp'

// ---------------------------------------------------------------------------
// Neon colour constants
// ---------------------------------------------------------------------------
const CYAN = '#00e5ff'
const MAGENTA = '#ff00e5'
const PURPLE = '#8b5cf6'
const DARK_BG = '#0d0d0d'
const BOOTH_COLOR = '#1a1a1a'
const BOOTH_METAL = '#222222'

// ---------------------------------------------------------------------------
// Placeholder components (will be replaced by real VRDeck, VRMixer, etc.)
// ---------------------------------------------------------------------------

function VRDeckPlaceholder({ label, position }: { label: string; position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Turntable platter */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.04, 32]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Vinyl disc */}
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.005, 32]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Center label */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.003, 32]} />
        <meshStandardMaterial color={label.includes('A') ? CYAN : MAGENTA} emissive={label.includes('A') ? CYAN : MAGENTA} emissiveIntensity={0.6} />
      </mesh>
      {/* Pitch slider */}
      <mesh position={[0.42, 0.08, 0]} boxGeometry={}>
        <boxGeometry args={[0.03, 0.2, 0.03]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.42, 0.08, 0]}>
        <boxGeometry args={[0.015, 0.06, 0.06]} />
        <meshStandardMaterial color={label.includes('A') ? CYAN : MAGENTA} emissive={label.includes('A') ? CYAN : MAGENTA} emissiveIntensity={0.4} />
      </mesh>
      {/* Label */}
      <Text
        position={[0, 0.18, 0.3]}
        fontSize={0.06}
        color={label.includes('A') ? CYAN : MAGENTA}
        anchorX="center"
        anchorY="middle"
        font="/fonts/monospace.fnt"
      >
        {label}
      </Text>
    </group>
  )
}

function VRMixerPlaceholder() {
  return (
    <group>
      {/* Mixer body */}
      <RoundedBox args={[0.6, 0.08, 0.6]} radius={0.01} smoothness={4} position={[0, 0.04, 0]}>
        <meshStandardMaterial color="#151515" metalness={0.85} roughness={0.2} />
      </RoundedBox>
      {/* Channel faders (A & B) */}
      {[-0.15, 0.15].map((x, i) => (
        <group key={i} position={[x, 0.09, -0.15]}>
          <mesh>
            <boxGeometry args={[0.03, 0.01, 0.2]} />
            <meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.03, 0.04]}>
            <boxGeometry args={[0.04, 0.04, 0.02]} />
            <meshStandardMaterial color={i === 0 ? CYAN : MAGENTA} emissive={i === 0 ? CYAN : MAGENTA} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      {/* Crossfader */}
      <mesh position={[0, 0.06, 0.2]}>
        <boxGeometry args={[0.2, 0.02, 0.04]} />
        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.08, 0.2]}>
        <boxGeometry args={[0.06, 0.025, 0.025]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.3} />
      </mesh>
      {/* EQ knobs row */}
      {[-0.2, 0, 0.2].map((z, ki) => (
        <mesh key={ki} position={[-0.22, 0.09, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.015, 16]} />
          <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {[-0.2, 0, 0.2].map((z, ki) => (
        <mesh key={ki} position={[0.22, 0.09, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.015, 16]} />
          <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {/* Master VU meters */}
      {[-0.04, 0.04].map((x, i) => (
        <group key={i} position={[x, 0.1, -0.24]}>
          {[0, 1, 2, 3, 4].map((seg) => (
            <mesh key={seg} position={[0, seg * 0.012, 0]}>
              <boxGeometry args={[0.02, 0.008, 0.008]} />
              <meshStandardMaterial
                color={seg < 3 ? '#00ff88' : seg < 4 ? '#ffff00' : '#ff4444'}
                emissive={seg < 3 ? '#00ff88' : seg < 4 ? '#ffff00' : '#ff4444'}
                emissiveIntensity={0.7}
              />
            </mesh>
          ))}
        </group>
      ))}
      <Text position={[0, 0.14, 0]} fontSize={0.04} color={PURPLE} anchorX="center">
        MIXER
      </Text>
    </group>
  )
}

function VRPadGridPlaceholder() {
  const rows = 4
  const cols = 4
  const padSize = 0.06
  const gap = 0.008
  const colors = [CYAN, MAGENTA, PURPLE, '#00ff88']

  return (
    <group rotation={[Math.PI / 6, 0, 0]}>
      {/* Pad surface */}
      <RoundedBox
        args={[cols * (padSize + gap) + 0.04, 0.03, rows * (padSize + gap) + 0.04]}
        radius={0.005}
        smoothness={4}
        position={[0, -0.01, 0]}
      >
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </RoundedBox>
      {/* Individual pads */}
      {Array.from({ length: rows * cols }).map((_, idx) => {
        const row = Math.floor(idx / cols)
        const col = idx % cols
        const x = (col - (cols - 1) / 2) * (padSize + gap)
        const z = (row - (rows - 1) / 2) * (padSize + gap)
        const color = colors[row]
        return (
          <mesh key={idx} position={[x, 0.01, z]}>
            <boxGeometry args={[padSize, 0.015, padSize]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.5} roughness={0.4} />
          </mesh>
        )
      })}
      <Text position={[0, 0.06, 0.2]} fontSize={0.035} color="#fff" anchorX="center">
        PADS
      </Text>
    </group>
  )
}

// ---------------------------------------------------------------------------
// BPM / Info floating panel
// ---------------------------------------------------------------------------
function FloatingInfoPanel({ position, label, value }: { position: [number, number, number]; label: string; value: string }) {
  const panelRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (panelRef.current) {
      // Gentle floating animation
      panelRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.2) * 0.015
    }
  })

  return (
    <group ref={panelRef} position={position}>
      <RoundedBox args={[0.4, 0.15, 0.02]} radius={0.01} smoothness={4}>
        <meshStandardMaterial
          color="#0a0a0a"
          transparent
          opacity={0.85}
          metalness={0.5}
          roughness={0.3}
        />
      </RoundedBox>
      {/* Neon border glow */}
      <mesh position={[0, 0, 0.012]}>
        <boxGeometry args={[0.42, 0.17, 0.001]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.15} transparent opacity={0.2} />
      </mesh>
      <Text position={[0, 0.025, 0.015]} fontSize={0.025} color="rgba(255,255,255,0.5)" anchorX="center">
        {label}
      </Text>
      <Text position={[0, -0.015, 0.015]} fontSize={0.045} color={CYAN} anchorX="center">
        {value}
      </Text>
    </group>
  )
}

// ---------------------------------------------------------------------------
// DJ Booth – main structure
// ---------------------------------------------------------------------------
function DJBooth() {
  return (
    <group position={[0, 0, -1.5]}>
      {/* Main countertop */}
      <RoundedBox args={[3, 0.06, 0.8]} radius={0.01} smoothness={4} position={[0, 0.9, 0]}>
        <meshStandardMaterial color={BOOTH_METAL} metalness={0.92} roughness={0.12} />
      </RoundedBox>

      {/* Front panel (vertical face) */}
      <RoundedBox args={[3, 0.82, 0.03]} radius={0.005} smoothness={4} position={[0, 0.49, 0.385]}>
        <meshStandardMaterial color={BOOTH_COLOR} metalness={0.85} roughness={0.2} />
      </RoundedBox>

      {/* Back panel */}
      <RoundedBox args={[3, 0.3, 0.03]} radius={0.005} smoothness={4} position={[0, 1.05, -0.385]}>
        <meshStandardMaterial color={BOOTH_COLOR} metalness={0.85} roughness={0.2} />
      </RoundedBox>

      {/* Side wing panels (angled) */}
      {/* Left wing */}
      <group position={[-1.55, 0.65, 0]} rotation={[0, 0.2, 0]}>
        <RoundedBox args={[0.4, 1.2, 0.03]} radius={0.005} smoothness={4} position={[0, 0, 0]}>
          <meshStandardMaterial color={BOOTH_COLOR} metalness={0.88} roughness={0.15} />
        </RoundedBox>
      </group>
      {/* Right wing */}
      <group position={[1.55, 0.65, 0]} rotation={[0, -0.2, 0]}>
        <RoundedBox args={[0.4, 1.2, 0.03]} radius={0.005} smoothness={4} position={[0, 0, 0]}>
          <meshStandardMaterial color={BOOTH_COLOR} metalness={0.88} roughness={0.15} />
        </RoundedBox>
      </group>

      {/* ---- Neon edge strips ---- */}
      {/* Front edge glow strip */}
      <mesh position={[0, 0.935, 0.4]}>
        <boxGeometry args={[3.02, 0.008, 0.008]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={1.2} />
      </mesh>
      {/* Left edge */}
      <mesh position={[-1.5, 0.935, 0]}>
        <boxGeometry args={[0.008, 0.008, 0.82]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={1.0} />
      </mesh>
      {/* Right edge */}
      <mesh position={[1.5, 0.935, 0]}>
        <boxGeometry args={[0.008, 0.008, 0.82]} />
        <meshStandardMaterial color={MAGENTA} emissive={MAGENTA} emissiveIntensity={1.0} />
      </mesh>

      {/* Front panel neon line */}
      <mesh position={[0, 0.88, 0.405]}>
        <boxGeometry args={[2.8, 0.004, 0.004]} />
        <meshStandardMaterial color={PURPLE} emissive={PURPLE} emissiveIntensity={1.5} />
      </mesh>

      {/* Wing edge neon strips */}
      <mesh position={[-1.72, 1.2, 0]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.004, 0.6, 0.004]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[1.72, 1.2, 0]} rotation={[0, -0.2, 0]}>
        <boxGeometry args={[0.004, 0.6, 0.004]} />
        <meshStandardMaterial color={MAGENTA} emissive={MAGENTA} emissiveIntensity={0.8} />
      </mesh>

      {/* ---- Component placements ---- */}
      {/* Deck A – left */}
      <group position={[-0.85, 0.94, 0]}>
        <VRDeckPlaceholder label="DECK A" position={[0, 0, 0]} />
      </group>

      {/* Deck B – right */}
      <group position={[0.85, 0.94, 0]}>
        <VRDeckPlaceholder label="DECK B" position={[0, 0, 0]} />
      </group>

      {/* Mixer – center */}
      <group position={[0, 0.94, -0.05]}>
        <VRMixerPlaceholder />
      </group>

      {/* Pad grid – below mixer, angled toward user */}
      <group position={[0, 0.94, 0.25]}>
        <VRPadGridPlaceholder />
      </group>

      {/* Support legs */}
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 0.44, 0]}>
          <boxGeometry args={[0.06, 0.88, 0.6]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Stage environment
// ---------------------------------------------------------------------------
function StageEnvironment() {
  // Animated grid reference
  const gridRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    // Subtle grid pulse effect
    if (gridRef.current) {
      const pulse = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.1
      gridRef.current.children.forEach((child) => {
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
          mat.emissiveIntensity = pulse
        }
      })
    }
  })

  return (
    <>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#080808" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Neon grid overlay */}
      <group ref={gridRef} position={[0, 0.001, 0]}>
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor={CYAN}
          sectionSize={5}
          sectionThickness={1}
          sectionColor={CYAN}
          fadeDistance={15}
          fadeStrength={1}
          infiniteGrid
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </group>

      {/* Starfield background */}
      <Stars
        radius={50}
        depth={80}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
function SceneLighting() {
  const spotRef = useRef<THREE.SpotLight>(null)
  const cyanPointRef = useRef<THREE.PointLight>(null)
  const magentaPointRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    // Subtle pulsing lights
    const t = clock.elapsedTime
    if (cyanPointRef.current) {
      cyanPointRef.current.intensity = 2 + Math.sin(t * 1.5) * 0.5
    }
    if (magentaPointRef.current) {
      magentaPointRef.current.intensity = 2 + Math.sin(t * 1.5 + Math.PI) * 0.5
    }
  })

  return (
    <>
      {/* Very dim ambient */}
      <ambientLight intensity={0.05} color="#111122" />

      {/* Main spot from above, illuminating the booth */}
      <spotLight
        ref={spotRef}
        position={[0, 4, -1]}
        angle={0.5}
        penumbra={0.8}
        intensity={3}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        target-position={[0, 0.9, -1.5]}
      />

      {/* Cyan accent light (left) */}
      <pointLight
        ref={cyanPointRef}
        position={[-2.5, 2.5, -1]}
        intensity={2}
        color={CYAN}
        distance={8}
        decay={2}
      />

      {/* Magenta accent light (right) */}
      <pointLight
        ref={magentaPointRef}
        position={[2.5, 2.5, -1]}
        intensity={2}
        color={MAGENTA}
        distance={8}
        decay={2}
      />

      {/* Purple overhead */}
      <pointLight
        position={[0, 3.5, 0]}
        intensity={1.5}
        color={PURPLE}
        distance={10}
        decay={2}
      />

      {/* Fill light under booth */}
      <pointLight
        position={[0, 0.3, -1.5]}
        intensity={0.5}
        color={CYAN}
        distance={3}
        decay={2}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Overhead floating info panels
// ---------------------------------------------------------------------------
function FloatingUIPanels() {
  return (
    <group position={[0, 0, -1.5]}>
      {/* BPM display */}
      <FloatingInfoPanel position={[-0.9, 2.0, -0.3]} label="BPM" value="128.00" />

      {/* Track info (Deck A) */}
      <FloatingInfoPanel position={[-0.9, 1.75, -0.3]} label="DECK A" value="Neon Dreams" />

      {/* Track info (Deck B) */}
      <FloatingInfoPanel position={[0.9, 1.75, -0.3]} label="DECK B" value="Cyber Pulse" />

      {/* Master output */}
      <FloatingInfoPanel position={[0, 2.2, -0.3]} label="MASTER" value="-3.2 dB" />

      {/* Time elapsed */}
      <FloatingInfoPanel position={[0.9, 2.0, -0.3]} label="TIME" value="03:42" />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Decorative elements
// ---------------------------------------------------------------------------
function Decorations() {
  return (
    <group position={[0, 0, -1.5]}>
      {/* Speaker stacks on sides */}
      {[-2.5, 2.5].map((x, i) => (
        <group key={i} position={[x, 0.6, -1]}>
          {[0, 0.5, 1.0].map((y, j) => (
            <RoundedBox key={j} args={[0.5, 0.45, 0.4]} radius={0.02} smoothness={4} position={[0, y, 0]}>
              <meshStandardMaterial color="#111" metalness={0.7} roughness={0.3} />
            </RoundedBox>
          ))}
          {/* Speaker cone (decorative) */}
          {[0, 0.5, 1.0].map((y, j) => (
            <mesh key={`cone-${j}`} position={[0, y, 0.21]} rotation={[0, 0, 0]}>
              <circleGeometry args={[0.12, 32]} />
              <meshStandardMaterial color="#222" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Sub woofer on floor */}
      {[-2.5, 2.5].map((x, i) => (
        <RoundedBox key={i} args={[0.5, 0.35, 0.45]} radius={0.02} smoothness={4} position={[x, 0.175, -1.6]}>
          <meshStandardMaterial color="#0d0d0d" metalness={0.8} roughness={0.2} />
        </RoundedBox>
      ))}

      {/* Overhead truss / light bar */}
      <mesh position={[0, 3.5, -1.5]}>
        <boxGeometry args={[6, 0.06, 0.06]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Truss verticals */}
      {[-3, 3].map((x) => (
        <mesh key={x} position={[x, 1.75, -1.5]}>
          <boxGeometry args={[0.06, 3.5, 0.06]} />
          <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* LED bar on truss */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = (i - 5.5) * 0.5
        const hue = i / 12
        const color = new THREE.Color().setHSL(hue, 1, 0.5)
        return (
          <mesh key={i} position={[x, 3.45, -1.5]}>
            <boxGeometry args={[0.3, 0.02, 0.02]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.8}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// ---------------------------------------------------------------------------
// VRScene – main export
// ---------------------------------------------------------------------------
export function VRScene(): JSX.Element {
  const isPresenting = useXR((s) => s.session)
  const audio = useVRAudio()

  return (
    <>
      {/* Orbit controls for 2D development (disabled in VR) */}
      {!isPresenting && (
        <OrbitControls
          target={[0, 1.2, -1.5]}
          minDistance={1}
          maxDistance={8}
          maxPolarAngle={Math.PI / 2 + 0.1}
          enableDamping
          dampingFactor={0.05}
        />
      )}

      {/* Scene fog for depth */}
      <fog attach="fog" args={['#0a0a0a', 8, 30]} />

      {/* Environment */}
      <StageEnvironment />

      {/* Lighting */}
      <SceneLighting />

      {/* DJ Booth structure with components */}
      <DJBooth />

      {/* Floating UI panels */}
      <FloatingUIPanels />

      {/* Decorative elements (speakers, truss, lights) */}
      <Decorations />
    </>
  )
}
