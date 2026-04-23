import React from 'react';
import { Html, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VRHUDProps {
  mixer: any; // DJMixer type
  position: [number, number, number];
}

// Placeholder for DJMixer interface
interface DJMixer {
  deckA: {
    trackTitle: string;
    artist: string;
    bpm: number;
    key: string;
    currentTime: number;
    duration: number;
  };
  deckB: {
    trackTitle: string;
    artist: string;
    bpm: number;
    key: string;
    currentTime: number;
    duration: number;
  };
  crossfaderPosition: number;
  masterVolume: number;
  masterBpm: number;
}

// Format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Track info panel component
function TrackInfoPanel({
  position,
  trackTitle,
  artist,
  bpm,
  key,
  currentTime,
  duration,
  deckColor,
  deckName
}: {
  position: [number, number, number];
  trackTitle: string;
  artist: string;
  bpm: number;
  key: string;
  currentTime: number;
  duration: number;
  deckColor: string;
  deckName: string;
}) {
  return (
    <group position={position}>
      <Billboard>
        <Html
          transform
          occlude
          distanceFactor={2}
          style={{
            width: '200px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: `2px solid ${deckColor}`,
              borderRadius: '8px',
              padding: '12px 16px',
              boxShadow: `0 0 20px ${deckColor}40, inset 0 0 10px ${deckColor}20`,
              fontFamily: 'monospace',
              color: '#ffffff',
              textShadow: `0 0 5px ${deckColor}`,
            }}
          >
            {/* Deck name */}
            <div
              style={{
                color: deckColor,
                fontSize: '10px',
                fontWeight: 'bold',
                marginBottom: '8px',
                letterSpacing: '2px',
              }}
            >
              {deckName}
            </div>
            
            {/* Track info */}
            <div
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {trackTitle || 'No Track Loaded'}
            </div>
            
            <div
              style={{
                fontSize: '11px',
                color: '#aaaaaa',
                marginBottom: '10px',
              }}
            >
              {artist || 'Unknown Artist'}
            </div>
            
            {/* BPM and Key */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '12px',
              }}
            >
              <span>
                <span style={{ color: deckColor, fontWeight: 'bold' }}>BPM:</span>{' '}
                {bpm ? bpm.toFixed(1) : '---'}
              </span>
              <span>
                <span style={{ color: deckColor, fontWeight: 'bold' }}>KEY:</span>{' '}
                {key || '---'}
              </span>
            </div>
            
            {/* Time display */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            >
              <span style={{ color: deckColor }}>{formatTime(currentTime)}</span>
              <span style={{ color: '#666666' }}>/</span>
              <span>{formatTime(duration)}</span>
            </div>
            
            {/* Progress bar */}
            <div
              style={{
                marginTop: '8px',
                height: '4px',
                background: '#333333',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${deckColor}, ${deckColor}aa)`,
                  borderRadius: '2px',
                  boxShadow: `0 0 8px ${deckColor}`,
                }}
              />
            </div>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// Master info panel component
function MasterInfoPanel({
  position,
  masterBpm,
  crossfaderPosition,
  masterVolume
}: {
  position: [number, number, number];
  masterBpm: number;
  crossfaderPosition: number;
  masterVolume: number;
}) {
  // Determine crossfader label
  const getCrossfaderLabel = (pos: number): string => {
    if (pos < 0.1) return 'A';
    if (pos > 0.9) return 'B';
    const center = pos > 0.4 && pos < 0.6;
    return center ? 'CENTER' : pos < 0.5 ? `A ${Math.round((1 - pos) * 100)}%` : `B ${Math.round(pos * 100)}%`;
  };
  
  return (
    <group position={position}>
      <Billboard>
        <Html
          transform
          occlude
          distanceFactor={2}
          style={{
            width: '180px',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '2px solid #ffffff',
              borderRadius: '8px',
              padding: '12px 16px',
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.2), inset 0 0 10px rgba(255, 255, 255, 0.1)',
              fontFamily: 'monospace',
              color: '#ffffff',
              textAlign: 'center',
            }}
          >
            {/* Master label */}
            <div
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                marginBottom: '10px',
                letterSpacing: '3px',
                color: '#ffffff',
              }}
            >
              MASTER
            </div>
            
            {/* Master BPM */}
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '8px',
                textShadow: '0 0 10px #ffffff',
              }}
            >
              {masterBpm ? masterBpm.toFixed(1) : '---'}
              <span style={{ fontSize: '10px', marginLeft: '4px', color: '#888888' }}>BPM</span>
            </div>
            
            {/* Crossfader position */}
            <div
              style={{
                fontSize: '11px',
                marginBottom: '10px',
                color: '#aaaaaa',
              }}
            >
              <span style={{ color: '#00ffff' }}>A</span>
              <span style={{ margin: '0 6px', color: '#666666' }}>X-FADER</span>
              <span style={{ color: '#ff00ff' }}>B</span>
              <div
                style={{
                  marginTop: '4px',
                  height: '6px',
                  background: 'linear-gradient(90deg, #00ffff33, #333333, #ff00ff33)',
                  borderRadius: '3px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${crossfaderPosition * 100}%`,
                    top: '-2px',
                    width: '10px',
                    height: '10px',
                    background: '#ffffff',
                    borderRadius: '50%',
                    transform: 'translateX(-50%)',
                    boxShadow: '0 0 6px #ffffff',
                  }}
                />
              </div>
              <div style={{ marginTop: '2px', fontSize: '9px', color: '#888888' }}>
                {getCrossfaderLabel(crossfaderPosition)}
              </div>
            </div>
            
            {/* Master volume */}
            <div
              style={{
                fontSize: '11px',
                color: '#aaaaaa',
              }}
            >
              <span style={{ color: '#ffffff' }}>MASTER VOL</span>
              <div
                style={{
                  marginTop: '4px',
                  height: '8px',
                  background: '#222222',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${masterVolume * 100}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, #00ff88, ${masterVolume > 0.8 ? '#ff4444' : '#ffff00'})`,
                    borderRadius: '4px',
                    boxShadow: `0 0 8px ${masterVolume > 0.8 ? '#ff4444' : '#00ff88'}`,
                    transition: 'width 0.1s ease',
                  }}
                />
              </div>
              <div style={{ marginTop: '2px', fontSize: '9px', color: '#888888' }}>
                {Math.round(masterVolume * 100)}%
              </div>
            </div>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

export default function VRHUD({ mixer, position }: VRHUDProps) {
  // Default values if mixer is not fully populated
  const deckA = mixer?.deckA || {
    trackTitle: '',
    artist: '',
    bpm: 0,
    key: '',
    currentTime: 0,
    duration: 0,
  };
  
  const deckB = mixer?.deckB || {
    trackTitle: '',
    artist: '',
    bpm: 0,
    key: '',
    currentTime: 0,
    duration: 0,
  };
  
  const crossfaderPosition = mixer?.crossfaderPosition ?? 0.5;
  const masterVolume = mixer?.masterVolume ?? 0.8;
  const masterBpm = mixer?.masterBpm ?? 0;
  
  return (
    <group position={position}>
      {/* Deck A info panel (left) */}
      <TrackInfoPanel
        position={[-0.5, 0, 0]}
        trackTitle={deckA.trackTitle}
        artist={deckA.artist}
        bpm={deckA.bpm}
        key={deckA.key}
        currentTime={deckA.currentTime}
        duration={deckA.duration}
        deckColor="#00ffff"
        deckName="DECK A"
      />
      
      {/* Deck B info panel (right) */}
      <TrackInfoPanel
        position={[0.5, 0, 0]}
        trackTitle={deckB.trackTitle}
        artist={deckB.artist}
        bpm={deckB.bpm}
        key={deckB.key}
        currentTime={deckB.currentTime}
        duration={deckB.duration}
        deckColor="#ff00ff"
        deckName="DECK B"
      />
      
      {/* Master info panel (center) */}
      <MasterInfoPanel
        position={[0, 0, 0]}
        masterBpm={masterBpm}
        crossfaderPosition={crossfaderPosition}
        masterVolume={masterVolume}
      />
    </group>
  );
}