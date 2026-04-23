import React, { useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Interactive } from '@react-three/xr'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface VRJogWheelProps {
  position: [number, number, number]
  deckIndex: number // 0 = A, 1 = B
  isPlaying: boolean
  bpm: number
  onScratch?: (delta: number) => void
  onPitchBend?: (delta: number) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const RADIUS = 0.3
const THICKNESS = 0.03
const PLATTER_RADIUS = 0.28
const PLATTER_THICKNESS = 0.008
const SPINDLE_RADIUS = 0.025
const SPINDLE_HEIGHT = 0.04
const GROOVE_COUNT = 12
const BEAT_MARKER_LENGTH = 0.24

const DECK_COLORS = {
  primary: ['#00e5ff', '#ff00e5'],
  dim: ['rgba(0, 229, 255, 0.25)', 'rgba(255, 0, 229, 0.25)'],
  highlight: ['rgba(0, 229, 255, 0.6)', 'rgba(255, 0, 229, 0.6)'],
}

// ---------------------------------------------------------------------------
// VRJogWheel
// ---------------------------------------------------------------------------
export function VRJogWheel({
  position,
  deckIndex,
  isPlaying,
  bpm,
  onScratch,
  onPitchBend,
}: VRJogWheelProps): JSX.Element {
  const color = DECK_COLORS.primary[deckIndex] ?? DECK_COLORS.primary[0]
  const colorDim = DECK_COLORS.dim[deckIndex] ?? DECK_COLORS.dim[0]
  const colorHighlight = DECK_COLORS.highlight[deckIndex] ?? DECK_COLORS.highlight[0]

  // Refs for animated meshes
  const platterRef = useRef<THREE.Group>(null)
  const outerRingRef = useRef<THREE.Mesh>(null)
  const beatMarkerRef = useRef<THREE.Mesh>(null)
  const spindleRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  // Interaction state
  const [isHovered, setIsHovered] = useState(false)
  const [isGrabbed, setIsGrabbed] = useState(false)
  const isGrabbedRef = useRef(false)
  const lastAngleRef = useRef<number | null>(null)
  const lastRadiusRef = useRef<number | null>(null)
  const rotationRef = useRef(0)
  const scratchDeltaRef = useRef(0)
  const pitchBendDeltaRef = useRef(0)

  // BPM-derived rotation speed (radians per second)
  const rps = useMemo(() => (bpm / 60) * 2 * Math.PI, [bpm])

  // --- Interaction handlers ------------------------------------------------
  const handleHover = useCallback(() => setIsHovered(true), [])
  const handleBlur = useCallback(() => setIsHovered(false), [])

  // Helper: compute angle and radius from intersection point relative to wheel center
  const computeAngleRadius = useCallback(
    (point: THREE.Vector3): { angle: number; radius: number } | null => {
      if (!groupRef.current) return null
      const worldPos = new THREE.Vector3()
      groupRef.current.getWorldPosition(worldPos)
      const dx = point.x - worldPos.x
      const dz = point.z - worldPos.z
      return { angle: Math.atan2(dz, dx), radius: Math.sqrt(dx * dx + dz * dz) }
    },
    [],
  )

  const handleSelectStart = useCallback(
    (event: any) => {
      setIsGrabbed(true)
      isGrabbedRef.current = true
      const point: THREE.Vector3 | undefined = event.intersection?.point
      if (point) {
        const result = computeAngleRadius(point)
        if (result) {
          lastAngleRef.current = result.angle
          lastRadiusRef.current = result.radius
        }
      }
    },
    [computeAngleRadius],
  )

  const handleSelectEnd = useCallback(() => {
    setIsGrabbed(false)
    isGrabbedRef.current = false
    lastAngleRef.current = null
    lastRadiusRef.current = null
  }, [])

  // Continuous tracking while grabbed – called each frame the pointer moves
  const handleMove = useCallback(
    (event: any) => {
      if (!isGrabbedRef.current) return
      const point: THREE.Vector3 | undefined = event.intersection?.point
      if (!point) return

      const result = computeAngleRadius(point)
      if (!result) return

      const { angle, radius } = result

      // Angular delta = scratch
      if (lastAngleRef.current !== null) {
        let delta = angle - lastAngleRef.current
        // Wrap to [-PI, PI]
        if (delta > Math.PI) delta -= 2 * Math.PI
        if (delta < -Math.PI) delta += 2 * Math.PI
        scratchDeltaRef.current += delta
        rotationRef.current += delta
      }

      // Radial delta = pitch bend
      if (lastRadiusRef.current !== null) {
        const radialDelta = radius - lastRadiusRef.current
        pitchBendDeltaRef.current += radialDelta
      }

      lastAngleRef.current = angle
      lastRadiusRef.current = radius
    },
    [computeAngleRadius],
  )

  // Frame loop – rotation, scratch tracking, glow pulse
  useFrame(({ clock }) => {
    if (!platterRef.current) return

    const t = clock.elapsedTime

    if (!isGrabbedRef.current) {
      // Auto-rotate at BPM speed when playing
      if (isPlaying) {
        rotationRef.current += rps * (1 / 60) // assume ~60fps tick
      }
    }

    // Apply rotation to the platter group
    platterRef.current.rotation.y = rotationRef.current

    // Fire scratch / pitch bend callbacks when grabbed
    if (isGrabbedRef.current && (scratchDeltaRef.current !== 0 || pitchBendDeltaRef.current !== 0)) {
      if (onScratch && scratchDeltaRef.current !== 0) onScratch(scratchDeltaRef.current)
      if (onPitchBend && pitchBendDeltaRef.current !== 0) onPitchBend(pitchBendDeltaRef.current)
      scratchDeltaRef.current = 0
      pitchBendDeltaRef.current = 0
    }

    // --- Beat glow pulse on the outer ring --------------------------------
    if (outerRingRef.current) {
      const beatPhase = (t * bpm) / 60
      const pulse = 0.3 + Math.abs(Math.sin(beatPhase * Math.PI)) * 0.7
      const mat = outerRingRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = pulse
    }

    // --- Spindle subtle pulse --------------------------------------------
    if (spindleRef.current) {
      const mat = spindleRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.15
    }
  })

  // --- Generate groove geometry -------------------------------------------
  const grooveRadii = useMemo(() => {
    const inner = SPINDLE_RADIUS + 0.02
    const outer = PLATTER_RADIUS - 0.02
    const step = (outer - inner) / GROOVE_COUNT
    return Array.from({ length: GROOVE_COUNT }, (_, i) => inner + step * i)
  }, [])

  return (
    <group ref={groupRef} position={position}>
      <Interactive
        onHover={handleHover}
        onBlur={handleBlur}
        onSelectStart={handleSelectStart}
        onSelectEnd={handleSelectEnd}
        onMove={handleMove}
      >
        {/* ---- Base: dark cylinder ----------------------------------------- */}
        <mesh position={[0, THICKNESS / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[RADIUS, RADIUS, THICKNESS, 48]} />
          <meshStandardMaterial
            color="#111111"
            metalness={0.95}
            roughness={0.12}
          />
        </mesh>

        {/* ---- Platter group (rotates) ------------------------------------- */}
        <group ref={platterRef} position={[0, THICKNESS + PLATTER_THICKNESS / 2 + 0.001, 0]}>
          {/* Vinyl disc */}
          <mesh castShadow>
            <cylinderGeometry args={[PLATTER_RADIUS, PLATTER_RADIUS, PLATTER_THICKNESS, 48]} />
            <meshStandardMaterial
              color="#0a0a0a"
              metalness={0.35}
              roughness={0.55}
            />
          </mesh>

          {/* Vinyl grooves – concentric torus rings */}
          {grooveRadii.map((r, i) => (
            <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, PLATTER_THICKNESS / 2 + 0.0005, 0]}>
              <torusGeometry args={[r, 0.0008, 4, 64]} />
              <meshStandardMaterial
                color="#1a1a1a"
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
          ))}

          {/* Center label (colored disc) */}
          <mesh position={[0, PLATTER_THICKNESS / 2 + 0.001, 0]} castShadow>
            <cylinderGeometry args={[SPINDLE_RADIUS + 0.03, SPINDLE_RADIUS + 0.03, 0.003, 32]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isHovered ? 0.8 : 0.4}
              metalness={0.4}
              roughness={0.5}
            />
          </mesh>

          {/* Beat marker line (from center to edge) */}
          <mesh
            ref={beatMarkerRef}
            position={[BEAT_MARKER_LENGTH / 2, PLATTER_THICKNESS / 2 + 0.002, 0]}
            rotation={[0, 0, 0]}
          >
            <boxGeometry args={[BEAT_MARKER_LENGTH, 0.002, 0.006]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={1.0}
              transparent
              opacity={0.9}
            />
          </mesh>

          {/* Second beat marker (180 deg) */}
          <mesh
            position={[-BEAT_MARKER_LENGTH / 2, PLATTER_THICKNESS / 2 + 0.002, 0]}
            rotation={[0, 0, 0]}
          >
            <boxGeometry args={[BEAT_MARKER_LENGTH, 0.002, 0.006]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              transparent
              opacity={0.4}
            />
          </mesh>

          {/* Hover highlight ring on platter surface */}
          {isHovered && (
            <mesh position={[0, PLATTER_THICKNESS / 2 + 0.003, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[PLATTER_RADIUS - 0.01, PLATTER_RADIUS, 64]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>

        {/* ---- Center spindle ---------------------------------------------- */}
        <mesh
          ref={spindleRef}
          position={[0, THICKNESS + PLATTER_THICKNESS + SPINDLE_HEIGHT / 2 + 0.002, 0]}
          castShadow
        >
          <cylinderGeometry args={[SPINDLE_RADIUS, SPINDLE_RADIUS * 0.8, SPINDLE_HEIGHT, 24]} />
          <meshStandardMaterial
            color="#cccccc"
            metalness={0.95}
            roughness={0.08}
            emissive={color}
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* ---- Outer glowing ring ------------------------------------------- */}
        <mesh
          ref={outerRingRef}
          position={[0, THICKNESS + 0.003, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[RADIUS + 0.005, 0.006, 12, 64]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.4}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* ---- Grabbed indicator: brighter ring ----------------------------- */}
        {isGrabbed && (
          <mesh position={[0, THICKNESS + 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[RADIUS + 0.015, 0.008, 8, 64]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.8}
              transparent
              opacity={0.6}
            />
          </mesh>
        )}
      </Interactive>

      {/* Deck label (A or B) */}
      <Text
        position={[0, -0.005, RADIUS + 0.04]}
        fontSize={0.035}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="/fonts/monospace.fnt"
      >
        {deckIndex === 0 ? 'A' : 'B'}
      </Text>
    </group>
  )
}
