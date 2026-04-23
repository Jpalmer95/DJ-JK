import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import { VRScene } from './VRScene'
import { DJMixer } from '@/lib/djAudio'
import { PadSampler } from '@/lib/padSampler'
import { StepSequencer } from '@/lib/stepSequencer'

// ---------------------------------------------------------------------------
// Audio Engine Context
// ---------------------------------------------------------------------------
export interface VRAudioEngine {
  mixer: DJMixer
  padSampler: PadSampler
  stepSequencer: StepSequencer
}

const VRAudioContext = createContext<VRAudioEngine | null>(null)

export function useVRAudio(): VRAudioEngine {
  const ctx = useContext(VRAudioContext)
  if (!ctx) throw new Error('useVRAudio must be used inside <VRAudioContext.Provider>')
  return ctx
}

// ---------------------------------------------------------------------------
// XR Store Configuration
// ---------------------------------------------------------------------------
const xrStore = createXRStore({
  // Hand tracking is preferred when the headset supports it
  hand: true,
  // Fallback to controllers (Quest / generic OpenXR)
  controller: true,
  // Use local-floor so the user can stand and walk around the DJ booth
  referenceSpace: 'local-floor',
})

// ---------------------------------------------------------------------------
// VRApp – root component
// ---------------------------------------------------------------------------
export function VRApp(): JSX.Element {
  // Audio engines – created once and shared across the scene graph
  const mixer = useMemo(() => new DJMixer(), [])
  const padSampler = useMemo(() => new PadSampler(), [])
  const stepSequencer = useMemo(() => new StepSequencer(), [])

  // Whether the user is currently inside a VR session
  const [inVR, setInVR] = useState(false)

  // Track XR session state via the store
  useEffect(() => {
    const session = xrStore
    // The store exposes state but we can track via DOM event listeners on the XR session
    // For the 2D fallback UI we default to not-in-VR
    return () => {
      // Cleanup on unmount
    }
  }, [])

  // Enter VR handler
  const handleEnterVR = useCallback(async () => {
    try {
      await xrStore.enterVR()
      setInVR(true)
    } catch (err) {
      console.error('[VRApp] Failed to enter VR:', err)
      alert('Could not start VR session. Make sure your headset is connected and the browser supports WebXR.')
    }
  }, [])

  // Enter AR handler (for passthrough headsets like Quest 3)
  const handleEnterAR = useCallback(async () => {
    try {
      await xrStore.enterAR()
      setInVR(true)
    } catch (err) {
      console.error('[VRApp] Failed to enter AR:', err)
      alert('Could not start AR session. Make sure your headset supports passthrough.')
    }
  }, [])

  return (
    <VRAudioContext.Provider value={{ mixer, padSampler, stepSequencer }}>
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        {/* R3F Canvas with XR session */}
        <Canvas
          camera={{ position: [0, 1.6, 2], fov: 60, near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          style={{ background: '#0a0a0a' }}
        >
          <XR store={xrStore}>
            <VRScene />
          </XR>
        </Canvas>

        {/* 2D Fallback UI – visible when NOT in VR */}
        {!inVR && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
                padding: '2rem 3rem',
                borderRadius: '1rem',
                background: 'rgba(10, 10, 10, 0.85)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <h1
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: '#00e5ff',
                  textShadow: '0 0 30px rgba(0, 229, 255, 0.6)',
                  margin: 0,
                }}
              >
                DJ-JK VR
              </h1>
              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                Immersive 3D DJ Experience
              </p>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  onClick={handleEnterVR}
                  style={{
                    padding: '0.85rem 2rem',
                    fontSize: '1.1rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: '#000',
                    background: '#00e5ff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 229, 255, 0.7)'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.4)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  Enter VR
                </button>

                <button
                  onClick={handleEnterAR}
                  style={{
                    padding: '0.85rem 2rem',
                    fontSize: '1.1rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: '#fff',
                    background: 'transparent',
                    border: '1px solid #ff00e5',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    boxShadow: '0 0 15px rgba(255, 0, 229, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 0, 229, 0.6)'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 229, 0.3)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  Enter AR
                </button>
              </div>

              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.35)',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                Use mouse to orbit the 3D preview while on desktop
              </p>
            </div>
          </div>
        )}
      </div>
    </VRAudioContext.Provider>
  )
}
