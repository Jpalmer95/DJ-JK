import { useRef, useEffect, useCallback, useState } from 'react';
import { DJDeck } from '@/lib/djAudio';

interface JogWheelProps {
  deck: DJDeck;
  size?: number;
  label: string;
  isPlaying: boolean;
  currentTime: number;
  bpm: number;
}

type InteractionMode = 'none' | 'scratch' | 'pitchbend';

export default function JogWheel({
  deck,
  size = 200,
  label,
  isPlaying,
  currentTime,
  bpm,
}: JogWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const interactionRef = useRef<InteractionMode>('none');
  const lastAngleRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const wasPlayingBeforeScratchRef = useRef<boolean>(false);
  const beatPulseRef = useRef<number>(0);
  const idlePhaseRef = useRef<number>(0);

  const [isScratching, setIsScratching] = useState(false);

  const isDeckA = label.includes('A');
  const accentColor = isDeckA ? '#00e5ff' : '#ff00ff';
  const accentColorDim = isDeckA ? 'rgba(0,229,255,0.3)' : 'rgba(255,0,255,0.3)';
  const accentColorGlow = isDeckA ? 'rgba(0,229,255,0.15)' : 'rgba(255,0,255,0.15)';

  const hasTrack = deck.trackInfo !== null;
  const waveformData = deck.trackInfo?.waveformData ?? [];
  const duration = deck.duration || 1;

  const getAngle = useCallback(
    (clientX: number, clientY: number): number => {
      const canvas = canvasRef.current;
      if (!canvas) return 0;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return Math.atan2(clientY - cy, clientX - cx);
    },
    []
  );

  const getZone = useCallback(
    (clientX: number, clientY: number): 'outer' | 'inner' | 'center' | 'none' => {
      const canvas = canvasRef.current;
      if (!canvas) return 'none';
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = size / 2;
      const outerR = maxR * 0.85;
      const innerR = maxR * 0.4;
      if (dist > outerR || dist > maxR) return 'none';
      if (dist > outerR * 0.85) return 'outer';
      if (dist > innerR) return 'inner';
      return 'center';
    },
    [size]
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!hasTrack) return;
      e.preventDefault();
      const touch = 'touches' in e ? e.touches[0] : e;
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      const zone = getZone(clientX, clientY);
      if (zone === 'center' || zone === 'none') return;

      const angle = getAngle(clientX, clientY);
      lastAngleRef.current = angle;

      if (zone === 'inner') {
        interactionRef.current = 'scratch';
        wasPlayingBeforeScratchRef.current = isPlaying;
        if (isPlaying) deck.pause();
        setIsScratching(true);
      } else if (zone === 'outer') {
        interactionRef.current = 'pitchbend';
      }
    },
    [hasTrack, getAngle, getZone, isPlaying, deck]
  );

  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (interactionRef.current === 'none') return;
      const touch = 'touches' in e ? e.touches[0] : e;
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      const angle = getAngle(clientX, clientY);

      let delta = angle - lastAngleRef.current;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      lastAngleRef.current = angle;
      velocityRef.current = delta;

      if (interactionRef.current === 'scratch') {
        // Apply scratch: seek proportionally to angle delta
        const scratchAmount = (delta / (2 * Math.PI)) * duration * 0.05;
        const newTime = Math.max(0, Math.min(duration, deck.currentTime + scratchAmount));
        rotationRef.current += delta;
        // Directly manipulate internal time via seek
        deck.seek(newTime);
      } else if (interactionRef.current === 'pitchbend') {
        // Pitch bend: outer ring adjusts pitch temporarily
        const bendAmount = delta * 0.5;
        const newRate = Math.max(0.5, Math.min(1.5, 1.0 + bendAmount));
        deck.setPitchRate(newRate);
        rotationRef.current += delta * 0.3;
      }
    },
    [getAngle, deck, duration]
  );

  const handlePointerUp = useCallback(() => {
    if (interactionRef.current === 'scratch') {
      if (wasPlayingBeforeScratchRef.current) {
        deck.play();
      }
      setIsScratching(false);
    } else if (interactionRef.current === 'pitchbend') {
      deck.setPitchRate(1.0);
    }
    interactionRef.current = 'none';
    velocityRef.current = 0;
  }, [deck]);

  // Global mouse/touch listeners during drag
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (interactionRef.current !== 'none') {
        e.preventDefault();
        handlePointerMove(e);
      }
    };
    const handleUp = () => handlePointerUp();

    window.addEventListener('mousemove', handleMove as EventListener);
    window.addEventListener('touchmove', handleMove as EventListener, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove as EventListener);
      window.removeEventListener('touchmove', handleMove as EventListener);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let running = true;

    const render = (now: number) => {
      if (!running) return;
      const dt = (now - (lastTimeRef.current || now)) / 1000;
      lastTimeRef.current = now;

      const w = size;
      const h = size;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = w / 2;

      ctx.clearRect(0, 0, w, h);

      // Update rotation
      if (interactionRef.current === 'none') {
        if (isPlaying && hasTrack) {
          const rps = bpm > 0 ? bpm / 60 : 0.5;
          const speed = rps * 0.15;
          rotationRef.current += speed * dt * Math.PI * 2;
        } else if (!hasTrack) {
          idlePhaseRef.current += dt * 0.3;
        } else {
          idlePhaseRef.current += dt * 0.5;
          rotationRef.current += Math.sin(idlePhaseRef.current) * 0.001;
        }
      }

      // Beat pulse decay
      beatPulseRef.current = Math.max(0, beatPulseRef.current - dt * 4);

      const rot = rotationRef.current;

      // === Background glow ===
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      bgGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
      bgGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
      bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // === Outer ring ===
      const outerR = maxR * 0.88;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Outer ring glow
      const ringGlow = ctx.createRadialGradient(0, 0, outerR * 0.9, 0, 0, outerR);
      ringGlow.addColorStop(0, 'transparent');
      ringGlow.addColorStop(0.8, accentColorGlow);
      ringGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = ringGlow;
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 4, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring stroke
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = isScratching ? '#ffcc00' : accentColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isScratching ? '#ffcc00' : accentColor;
      ctx.shadowBlur = isScratching ? 18 : 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Tick marks on outer ring
      for (let i = 0; i < 72; i++) {
        const angle = (i / 72) * Math.PI * 2;
        const isMain = i % 18 === 0;
        const isSecondary = i % 6 === 0;
        const len = isMain ? 10 : isSecondary ? 6 : 3;
        const r1 = outerR - len;
        const r2 = outerR;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
        ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
        ctx.strokeStyle = isMain
          ? accentColor
          : isSecondary
          ? accentColorDim
          : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = isMain ? 2 : 1;
        ctx.stroke();
      }

      // === Beat markers ===
      if (hasTrack && bpm > 0) {
        const beatInterval = 60 / bpm;
        const numBeats = 16;
        const markerR = outerR + 2;

        for (let i = 0; i < numBeats; i++) {
          const beatTime = currentTime - (currentTime % beatInterval) + (i - numBeats / 2) * beatInterval;
          if (beatTime < 0 || beatTime > duration) continue;

          const beatFrac = ((beatTime - currentTime) / beatInterval) / numBeats + 0.5;
          const markerAngle = rot + beatFrac * Math.PI * 2;

          const isOnBeat = i === Math.floor(numBeats / 2);
          const pulse = isOnBeat ? 1 + beatPulseRef.current * 0.3 : 1;
          const dotR = (isOnBeat ? 4 : 2.5) * pulse;

          const dx = Math.cos(markerAngle) * markerR;
          const dy = Math.sin(markerAngle) * markerR;

          ctx.beginPath();
          ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = isOnBeat ? accentColor : accentColorDim;
          if (isOnBeat) {
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 12;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // === Waveform disc ===
      const innerR = maxR * 0.38;
      const waveR = maxR * 0.7;

      // Disc background
      ctx.beginPath();
      ctx.arc(0, 0, waveR, 0, Math.PI * 2);
      const discGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, waveR);
      discGrad.addColorStop(0, 'rgba(15,15,25,0.95)');
      discGrad.addColorStop(0.6, 'rgba(10,10,20,0.9)');
      discGrad.addColorStop(1, 'rgba(20,20,35,0.85)');
      ctx.fillStyle = discGrad;
      ctx.fill();

      // Disc border
      ctx.beginPath();
      ctx.arc(0, 0, waveR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Render waveform as circular visualization
      if (hasTrack && waveformData.length > 0) {
        const numSamples = waveformData.length;
        const progress = currentTime / duration;
        const startSample = Math.floor(progress * numSamples);

        for (let i = 0; i < 180; i++) {
          const sampleIdx = (startSample + i - 90 + numSamples) % numSamples;
          const amplitude = Math.abs(waveformData[sampleIdx] || 0);
          const angle = rot + (i / 180) * Math.PI * 2 - Math.PI;

          const barH = amplitude * (waveR - innerR - 4) * 0.8;
          const r1 = innerR + 2;
          const r2 = r1 + barH;

          const proximity = Math.abs(i - 90) / 90;
          const alpha = 0.2 + (1 - proximity) * 0.6;

          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
          ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);

          const waveColor = isScratching
            ? `rgba(255,204,0,${alpha})`
            : `rgba(${isDeckA ? '0,229,255' : '255,0,255'},${alpha})`;
          ctx.strokeStyle = waveColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else if (hasTrack) {
        // Skeleton waveform placeholder
        for (let i = 0; i < 120; i++) {
          const angle = rot + (i / 120) * Math.PI * 2;
          const amplitude = (Math.sin(i * 0.3 + idlePhaseRef.current) * 0.5 + 0.5) * 0.3;
          const barH = amplitude * (waveR - innerR - 4) * 0.5;
          const r1 = innerR + 2;
          const r2 = r1 + barH;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
          ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
          ctx.strokeStyle = accentColorDim;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // === Playhead indicator ===
      if (hasTrack) {
        const playAngle = -Math.PI / 2; // Fixed at top
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(
          Math.cos(playAngle) * (innerR - 2),
          Math.sin(playAngle) * (innerR - 2)
        );
        ctx.lineTo(
          Math.cos(playAngle) * (outerR + 6),
          Math.sin(playAngle) * (outerR + 6)
        );
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();

        // Playhead dot
        ctx.beginPath();
        ctx.arc(
          Math.cos(playAngle) * (outerR + 2),
          Math.sin(playAngle) * (outerR + 2),
          3.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // === Center label ===
      const centerR = innerR - 4;
      ctx.save();
      ctx.translate(cx, cy);

      // Center circle
      ctx.beginPath();
      ctx.arc(0, 0, centerR, 0, Math.PI * 2);
      const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, centerR);
      centerGrad.addColorStop(0, 'rgba(30,30,50,0.95)');
      centerGrad.addColorStop(1, 'rgba(15,15,30,0.98)');
      ctx.fillStyle = centerGrad;
      ctx.fill();

      // Center ring border
      ctx.beginPath();
      ctx.arc(0, 0, centerR, 0, Math.PI * 2);
      ctx.strokeStyle = isScratching ? 'rgba(255,204,0,0.6)' : accentColorDim;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label text
      if (hasTrack) {
        const title = deck.trackInfo?.title || 'Unknown';
        const artist = deck.trackInfo?.artist || 'Unknown';

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Title
        ctx.font = `bold ${Math.max(9, centerR * 0.22)}px system-ui, sans-serif`;
        ctx.fillStyle = '#ffffff';
        const titleTrunc = title.length > 14 ? title.slice(0, 13) + '...' : title;
        ctx.fillText(titleTrunc, 0, -centerR * 0.18);

        // Artist
        ctx.font = `${Math.max(8, centerR * 0.17)}px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        const artistTrunc = artist.length > 16 ? artist.slice(0, 15) + '...' : artist;
        ctx.fillText(artistTrunc, 0, centerR * 0.08);

        // BPM
        ctx.font = `600 ${Math.max(8, centerR * 0.16)}px monospace`;
        ctx.fillStyle = accentColor;
        ctx.fillText(`${bpm.toFixed(1)} BPM`, 0, centerR * 0.35);
      } else {
        // No track loaded
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `600 ${Math.max(10, centerR * 0.22)}px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillText(label, 0, -8);
        ctx.font = `${Math.max(9, centerR * 0.18)}px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillText('No Track', 0, 10);
      }

      ctx.restore();

      // === Scratch indicator ===
      if (isScratching) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 8;
        ctx.fillText('SCRATCH', 0, maxR - 10);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    size,
    isPlaying,
    hasTrack,
    bpm,
    currentTime,
    duration,
    waveformData,
    isScratching,
    accentColor,
    accentColorDim,
    accentColorGlow,
    isDeckA,
    deck,
  ]);

  // Beat detection pulse
  useEffect(() => {
    if (isPlaying && bpm > 0) {
      const beatMs = (60 / bpm) * 1000;
      const interval = setInterval(() => {
        beatPulseRef.current = 1;
      }, beatMs);
      return () => clearInterval(interval);
    }
  }, [isPlaying, bpm]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, cursor: hasTrack ? 'grab' : 'default' }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      className="select-none touch-none"
      aria-label={`Jog wheel for ${label}`}
    />
  );
}
