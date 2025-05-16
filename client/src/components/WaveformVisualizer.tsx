import { useEffect, useRef, useState } from 'react';

interface WaveformVisualizerProps {
  audioUrl: string;
  color?: string;
  height?: number;
  animated?: boolean;
  playing?: boolean;
}

export default function WaveformVisualizer({
  audioUrl,
  color = '#3b82f6',
  height = 60,
  animated = true,
  playing = false
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize the audio context and analyzer
  useEffect(() => {
    if (!audioUrl) return;

    const initAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create audio context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 256;

        // Fetch and decode audio data
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        try {
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          
          // Create a buffer with the waveform data
          const waveform = new Float32Array(analyzerRef.current.frequencyBinCount);
          const channelData = audioBuffer.getChannelData(0);
          
          // Downsample the audio data to fit our visualization
          const blockSize = Math.floor(channelData.length / waveform.length);
          for (let i = 0; i < waveform.length; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(channelData[i * blockSize + j] || 0);
            }
            waveform[i] = sum / blockSize;
          }
          
          setWaveformData(waveform);
          drawWaveform(waveform);
          setIsLoading(false);
        } catch (decodeError) {
          console.error('Error decoding audio data:', decodeError);
          setError('Unable to decode audio format');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing audio visualizer:', err);
        setError('Failed to load audio data');
        setIsLoading(false);
      }
    };

    initAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  // Handle play state changes
  useEffect(() => {
    if (!analyzerRef.current || !audioContextRef.current || !waveformData) return;

    if (playing && animated) {
      startAnimatedWaveform();
    } else {
      // If not playing or not animated, just draw the static waveform
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      drawWaveform(waveformData);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playing, animated, waveformData]);

  const startAnimatedWaveform = () => {
    if (!analyzerRef.current || !canvasRef.current) return;

    // Animation function for live visualization
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyzerRef.current!.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzerRef.current!.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Adjust for retina/high DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);

      const width = canvas.clientWidth;
      const barHeight = canvas.clientHeight;
      const barWidth = width / bufferLength;
      let x = 0;

      // Create gradient for the waveform
      const gradient = ctx.createLinearGradient(0, 0, 0, barHeight);
      const baseColor = color || '#3b82f6';
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, adjustColor(baseColor, -30));
      ctx.fillStyle = gradient;

      // Draw animated frequency bars
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.clientHeight * 0.8;
        
        ctx.fillRect(
          x, 
          canvas.clientHeight - barHeight, 
          barWidth - 1, 
          barHeight
        );
        
        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start the animation
    animate();
  };

  const drawWaveform = (waveform: Float32Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Adjust for retina/high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const barWidth = width / waveform.length;
    let x = 0;

    // Create gradient for the waveform
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const baseColor = color || '#3b82f6';
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, adjustColor(baseColor, -30));
    ctx.fillStyle = gradient;

    // Draw waveform bars
    const maxAmplitude = Math.max(...Array.from(waveform));
    const scaleFactor = maxAmplitude > 0 ? 1 / maxAmplitude : 1;

    for (let i = 0; i < waveform.length; i++) {
      const amplitude = waveform[i] * scaleFactor;
      const barHeight = amplitude * height * 0.8; // 80% of canvas height max
      
      ctx.fillRect(
        x, 
        height / 2 - barHeight / 2, // Center the bar vertically
        barWidth - 1, 
        barHeight
      );
      
      x += barWidth;
    }
  };

  // Helper function to adjust a color's brightness
  const adjustColor = (color: string, amount: number): string => {
    // Convert hex to RGB
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);

    // Adjust brightness
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return (
    <div className="w-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-50 rounded-md">
          <div className="animate-pulse text-sm text-gray-500">Loading waveform...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-30 rounded-md">
          <div className="text-sm text-red-500">{error}</div>
        </div>
      )}
      
      <canvas 
        ref={canvasRef} 
        className={`w-full rounded-md ${error ? 'opacity-30' : ''}`}
        style={{ height: `${height}px` }} 
      />
    </div>
  );
}