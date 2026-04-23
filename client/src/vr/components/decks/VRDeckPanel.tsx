import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Interactive } from '@react-three/xr'
import { VRJogWheel } from './VRJogWheel'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface VRDeckPanelProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  deckIndex: number // 0 = A, 1 = B
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PANEL_WIDTH = 0.5
const PANEL_DEPTH = 0.4
const PANEL_THICKNESS = 0.02

const DECK_COLORS = {
  primary: ['#00e5ff', '#ff00e5'],
  dim: ['rgba(0, 229, 255, 0.3)', 'rgba(255, 0, 229, 0.3)'],
  dark: ['#003844', '#3d0038'],
}

// ---------------------------------------------------------------------------
// Transport button component
// ---------------------------------------------------------------------------
interface TransportButtonProps {
  position: [number, number, number]
  label: string
  isActive: boolean
  color: string
  onPress: () => void
}

function TransportButton({ position, label, isActive, color, onPress }: TransportButtonProps) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)

  const handleSelect = useCallback(() => {
    onPress()
  }, [onPress])

  useFrame(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = isActive ? 0.7 : hovered ? 0.4 : 0.15
  })

  return (
    <Interactive onSelect={handleSelect} onHover={() => setHovered(true)} onBlur={() => setHovered(false)}>
      <mesh ref={meshRef} position={position} castShadow>
        <boxGeometry args={[0.06, 0.02, 0.06]} />
        <meshStandardMaterial
          color={isActive ? color : '#222222'}
          emissive={color}
          emissiveIntensity={isActive ? 0.7 : 0.15}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <Text
        position={[position[0], position[1] + 0.02, position[2]]}
        fontSize={0.015}
        color={isActive ? color : '#666666'}
        anchorX="center"
        anchorY="bottom"
        font="/fonts/monospace.fnt"
      >
        {label}
      </Text>
    </Interactive>
  )
}

// ---------------------------------------------------------------------------
// Waveform display (canvas texture)
// ---------------------------------------------------------------------------
interface WaveformDisplayProps {
  position: [number, number, number]
  color: string
}

function WaveformDisplay({ position, color }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const textureRef = useRef<THREE.CanvasTexture | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const prevDataRef = useRef<Float32Array>(new Float32Array(128))

  // Create canvas and texture once
  const [canvasTexture] = useState(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    canvasRef.current = canvas

    const ctx = canvas.getContext('2d')!
    // Initial dark fill
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    textureRef.current = tex
    return tex
  })

  // Animate waveform data
  useFrame(({ clock }) => {
    const canvas = canvasRef.current
    const tex = textureRef.current
    if (!canvas || !tex) return

    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height
    const t = clock.elapsedTime

    // Clear
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, w, h)

    // Generate pseudo waveform data (simulated audio)
    const data = prevDataRef.current
    for (let i = 0; i < data.length; i++) {
      // Smoothly blend toward new random audio-like value
      const target = 0.2 + Math.abs(Math.sin(t * 2 + i * 0.15)) * 0.6 +
        Math.abs(Math.sin(t * 5.3 + i * 0.08)) * 0.2
      data[i] += (target - data[i]) * 0.15
    }

    // Draw waveform
    const barWidth = w / data.length
    const centerY = h / 2

    // Upper half
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth
      const amplitude = data[i] * centerY * 0.8
      ctx.lineTo(x, centerY - amplitude)
    }
    ctx.lineTo(w, centerY)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.globalAlpha = 0.6
    ctx.fill()

    // Lower half (mirrored)
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth
      const amplitude = data[i] * centerY * 0.8
      ctx.lineTo(x, centerY + amplitude)
    }
    ctx.lineTo(w, centerY)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.globalAlpha = 0.3
    ctx.fill()

    // Center line
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(w, centerY)
    ctx.stroke()

    // Playhead (moving line)
    const playheadX = ((t * 40) % w)
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, h)
    ctx.stroke()

    ctx.globalAlpha = 1.0

    // Mark texture as needing update
    tex.needsUpdate = true
  })

  // Cleanup
  useEffect(() => {
    return () => {
      canvasTexture.dispose()
    }
  }, [canvasTexture])

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.42, 0.06, 0.003]} />
      <meshStandardMaterial
        map={canvasTexture}
        emissive={color}
        emissiveIntensity={0.1}
        metalness={0.2}
        roughness={0.8}
      />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// VRDeckPanel
// ---------------------------------------------------------------------------
export function VRDeckPanel({
  position,
  rotation = [0, 0, 0],
  deckIndex,
}: VRDeckPanelProps): JSX.Element {
  const color = DECK_COLORS.primary[deckIndex] ?? DECK_COLORS.primary[0]
  const colorDim = DECK_COLORS.dim[deckIndex] ?? DECK_COLORS.dim[0]
  const colorDark = DECK_COLORS.dark[deckIndex] ?? DECK_COLORS.dark[0]

  // Transport state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isCueActive, setIsCueActive] = useState(false)
  const [isLoopActive, setIsLoopActive] = useState(false)

  // Track info (could be passed as props; using defaults)
  const trackTitle = deckIndex === 0 ? 'Neon Dreams' : 'Cyber Pulse'
  const bpm = 128

  // Jog wheel callbacks
  const handleScratch = useCallback((delta: number) => {
    // Forward to audio engine
    console.log(`[Deck ${deckIndex === 0 ? 'A' : 'B'}] Scratch: ${delta}`)
  }, [deckIndex])

  const handlePitchBend = useCallback((delta: number) => {
    console.log(`[Deck ${deckIndex === 0 ? 'A' : 'B'}] Pitch bend: ${delta}`)
  }, [deckIndex])

  return (
    <group position={position} rotation={rotation}>
      {/* ---- Panel base: dark metallic box ----------------------------------- */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[PANEL_WIDTH, PANEL_THICKNESS, PANEL_DEPTH]} />
        <meshStandardMaterial
          color="#151515"
          metalness={0.92}
          roughness={0.15}
        />
      </mesh>

      {/* Panel edge glow strip (front) */}
      <mesh position={[0, 0.001, PANEL_DEPTH / 2 + 0.001]}>
        <boxGeometry args={[PANEL_WIDTH + 0.01, 0.004, 0.004]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Panel edge glow strip (left) */}
      <mesh position={[-PANEL_WIDTH / 2 - 0.001, 0.001, 0]}>
        <boxGeometry args={[0.004, 0.004, PANEL_DEPTH + 0.01]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Panel edge glow strip (right) */}
      <mesh position={[PANEL_WIDTH / 2 + 0.001, 0.001, 0]}>
        <boxGeometry args={[0.004, 0.004, PANEL_DEPTH + 0.01]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* ---- Waveform display (above jog wheel) ------------------------------ */}
      <WaveformDisplay
        position={[0, PANEL_THICKNESS + 0.01, -0.12]}
        color={color}
      />

      {/* Waveform label */}
      <Text
        position={[-0.19, PANEL_THICKNESS + 0.03, -0.12]}
        fontSize={0.012}
        color="#555555"
        anchorX="left"
        anchorY="bottom"
        font="/fonts/monospace.fnt"
      >
        WAVEFORM
      </Text>

      {/* ---- Jog wheel (center of panel) ------------------------------------- */}
      <VRJogWheel
        position={[0, PANEL_THICKNESS, 0.02]}
        deckIndex={deckIndex}
        isPlaying={isPlaying}
        bpm={bpm}
        onScratch={handleScratch}
        onPitchBend={handlePitchBend}
      />

      {/* ---- Transport controls (below jog wheel) --------------------------- */}
      <group position={[0, 0, 0.14]}>
        {/* Play/Pause */}
        <TransportButton
          position={[-0.08, PANEL_THICKNESS + 0.01, 0]}
          label="PLAY"
          isActive={isPlaying}
          color={color}
          onPress={() => setIsPlaying((p) => !p)}
        />

        {/* Cue */}
        <TransportButton
          position={[0, PANEL_THICKNESS + 0.01, 0]}
          label="CUE"
          isActive={isCueActive}
          color="#ff4444"
          onPress={() => setIsCueActive((c) => !c)}
        />

        {/* Loop */}
        <TransportButton
          position={[0.08, PANEL_THICKNESS + 0.01, 0]}
          label="LOOP"
          isActive={isLoopActive}
          color="#00ff88"
          onPress={() => setIsLoopActive((l) => !l)}
        />
      </group>

      {/* ---- BPM display (floating text) ------------------------------------ */}
      <Text
        position={[0.18, PANEL_THICKNESS + 0.05, -0.15]}
        fontSize={0.018}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="/fonts/monospace.fnt"
      >
        {`${bpm.toFixed(1)} BPM`}
      </Text>

      {/* BPM label */}
      <Text
        position={[0.18, PANEL_THICKNESS + 0.035, -0.15]}
        fontSize={0.01}
        color="#555555"
        anchorX="center"
        anchorY="middle"
        font="/fonts/monospace.fnt"
      >
        TEMPO
      </Text>

      {/* ---- Track info (floating text) -------------------------------------- */}
      <Text
        position={[-0.04, PANEL_THICKNESS + 0.05, -0.15]}
        fontSize={0.014}
        color="#aaaaaa"
        anchorX="left"
        anchorY="middle"
        maxWidth={0.25}
        overflowWrap="break-word"
        font="/fonts/monospace.fnt"
      >
        {trackTitle}
      </Text>

      {/* Track label */}
      <Text
        position={[-0.04, PANEL_THICKNESS + 0.035, -0.15]}
        fontSize={0.01}
        color="#555555"
        anchorX="left"
        anchorY="middle"
        font="/fonts/monospace.fnt"
      >
        TRACK
      </Text>

      {/* ---- Deck label ------------------------------------------------------- */}
      <Text
        position={[0, PANEL_THICKNESS + 0.001, -PANEL_DEPTH / 2 - 0.015]}
        fontSize={0.025}
        color={color}
        anchorX="center"
        anchorY="top"
        font="/fonts/monospace.fnt"
      >
        {deckIndex === 0 ? 'DECK A' : 'DECK B'}
      </Text>

      {/* ---- Corner accent dots ---------------------------------------------- */}
      {[
        [-PANEL_WIDTH / 2 + 0.01, PANEL_THICKNESS + 0.001, -PANEL_DEPTH / 2 + 0.01],
        [PANEL_WIDTH / 2 - 0.01, PANEL_THICKNESS + 0.001, -PANEL_DEPTH / 2 + 0.01],
        [-PANEL_WIDTH / 2 + 0.01, PANEL_THICKNESS + 0.001, PANEL_DEPTH / 2 - 0.01],
        [PANEL_WIDTH / 2 - 0.01, PANEL_THICKNESS + 0.001, PANEL_DEPTH / 2 - 0.01],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.004, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}
