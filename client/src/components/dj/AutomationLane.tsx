import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AutomationEngine, AutomationLane, AutomationPoint } from '../../lib/automationLanes';

interface AutomationLaneProps {
  engine: AutomationEngine;
  bpm: number;
  totalBeats: number;
  compact?: boolean;
}

// Preset parameter targets for the lane selector
const PARAMETER_TARGETS = [
  { id: 'deckA.eq.low', label: 'Deck A EQ Low', color: '#00e5ff' },
  { id: 'deckA.eq.mid', label: 'Deck A EQ Mid', color: '#00b8d4' },
  { id: 'deckA.eq.high', label: 'Deck A EQ High', color: '#0097a7' },
  { id: 'deckA.filter.frequency', label: 'Deck A Filter', color: '#00838f' },
  { id: 'deckA.reverb.wet', label: 'Deck A Reverb', color: '#006064' },
  { id: 'deckA.delay.wet', label: 'Deck A Delay', color: '#00acc1' },
  { id: 'deckA.volume', label: 'Deck A Volume', color: '#26c6da' },
  { id: 'deckB.eq.low', label: 'Deck B EQ Low', color: '#e040fb' },
  { id: 'deckB.eq.mid', label: 'Deck B EQ Mid', color: '#d500f9' },
  { id: 'deckB.eq.high', label: 'Deck B EQ High', color: '#aa00ff' },
  { id: 'deckB.filter.frequency', label: 'Deck B Filter', color: '#7c4dff' },
  { id: 'deckB.reverb.wet', label: 'Deck B Reverb', color: '#651fff' },
  { id: 'deckB.delay.wet', label: 'Deck B Delay', color: '#b388ff' },
  { id: 'deckB.volume', label: 'Deck B Volume', color: '#ea80fc' },
];

const BEAT_GRID_SUBDIVISIONS = [
  { label: '4 Bars', beats: 16 },
  { label: '8 Bars', beats: 32 },
  { label: '16 Bars', beats: 64 },
  { label: '32 Bars', beats: 128 },
];

interface DragState {
  laneId: string;
  pointIndex: number;
  offsetX: number;
  offsetY: number;
}

export default function AutomationLaneView({
  engine,
  bpm,
  totalBeats,
  compact = false,
}: AutomationLaneProps) {
  const [zoom, setZoom] = useState(16); // bars to show
  const [scrollOffset, setScrollOffset] = useState(0); // beat offset
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [lanes, setLanes] = useState<AutomationLane[]>([]);
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showLaneSelector, setShowLaneSelector] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleBeats = zoom * 4; // each bar = 4 beats
  const canvasHeight = compact ? 120 : 200;
  const laneHeight = lanes.length > 0 ? canvasHeight / Math.max(lanes.length, 1) : canvasHeight;
  const pointRadius = compact ? 4 : 6;

  // Sync state from engine
  const refreshLanes = useCallback(() => {
    setLanes(engine.getAllAutomationLanes());
  }, [engine]);

  // Poll playback state
  useEffect(() => {
    const interval = setInterval(() => {
      const state = engine.getPlaybackState();
      setIsPlaying(state.isPlaying);
      setCurrentBeat(state.currentBeat);
      setIsRecording(engine.isRecording());
      refreshLanes();
    }, 50);
    return () => clearInterval(interval);
  }, [engine, refreshLanes]);

  // Beat <-> pixel conversion
  const beatToX = useCallback(
    (beat: number): number => {
      if (!containerRef.current) return 0;
      const width = containerRef.current.clientWidth;
      return ((beat - scrollOffset) / visibleBeats) * width;
    },
    [scrollOffset, visibleBeats]
  );

  const xToBeat = useCallback(
    (x: number): number => {
      if (!containerRef.current) return 0;
      const width = containerRef.current.clientWidth;
      return scrollOffset + (x / width) * visibleBeats;
    },
    [scrollOffset, visibleBeats]
  );

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, canvasHeight);

    // Beat grid lines
    const beatsPerBar = 4;
    const startBar = Math.floor(scrollOffset / beatsPerBar);
    const endBar = Math.ceil((scrollOffset + visibleBeats) / beatsPerBar);

    for (let bar = startBar; bar <= endBar; bar++) {
      const beat = bar * beatsPerBar;
      const x = beatToX(beat);
      if (x < 0 || x > width) continue;

      // Bar line
      ctx.strokeStyle = bar % 4 === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = bar % 4 === 0 ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();

      // Bar number
      if (bar % 4 === 0 && !compact) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px monospace';
        ctx.fillText(`${bar}`, x + 3, 12);
      }

      // Sub-beat lines
      if (!compact) {
        for (let sub = 1; sub < beatsPerBar; sub++) {
          const subBeat = beat + sub;
          const sx = beatToX(subBeat);
          if (sx < 0 || sx > width) continue;
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, canvasHeight);
          ctx.stroke();
        }
      }
    }

    // Draw each lane
    lanes.forEach((lane, laneIndex) => {
      const yTop = laneIndex * laneHeight;
      const yMid = yTop + laneHeight / 2;
      const yBot = yTop + laneHeight;

      // Lane background
      const isSelected = selectedLane === lane.id;
      ctx.fillStyle = isSelected
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(255,255,255,0.015)';
      ctx.fillRect(0, yTop, width, laneHeight);

      // Lane border
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, yBot);
      ctx.lineTo(width, yBot);
      ctx.stroke();

      // Center line
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, yMid);
      ctx.lineTo(width, yMid);
      ctx.stroke();
      ctx.setLineDash([]);

      // Lane label
      if (!compact) {
        ctx.fillStyle = lane.enabled ? lane.color : 'rgba(255,255,255,0.25)';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(lane.targetLabel, 6, yTop + 14);
      }

      if (!lane.enabled) {
        // Draw disabled indicator
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('OFF', width - 36, yTop + 14);
        return;
      }

      if (lane.points.length === 0) return;

      // Draw automation curve
      const valueToY = (value: number): number => {
        // value is 0-1, map to lane height
        return yBot - value * laneHeight;
      };

      ctx.strokeStyle = lane.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Draw from visible start to visible end
      const visStart = scrollOffset;
      const visEnd = scrollOffset + visibleBeats;

      // Start from the interpolated value at the visible start
      const startVal = engine.getValueAtBeat(lane.id, visStart);
      ctx.moveTo(beatToX(visStart), valueToY(startVal));

      // Sample curve at regular intervals for smooth rendering
      const step = visibleBeats / width; // one sample per pixel
      for (let beat = visStart; beat <= visEnd; beat += step) {
        const val = engine.getValueAtBeat(lane.id, beat);
        ctx.lineTo(beatToX(beat), valueToY(val));
      }
      ctx.stroke();

      // Draw points
      lane.points.forEach((pt, ptIndex) => {
        const x = beatToX(pt.time);
        const y = valueToY(pt.value);
        if (x < -pointRadius || x > width + pointRadius) return;

        // Connection line to next point
        if (ptIndex < lane.points.length - 1) {
          const nextPt = lane.points[ptIndex + 1];
          const nx = beatToX(nextPt.time);
          const ny = valueToY(nextPt.value);

          ctx.strokeStyle = lane.color + '60';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        }

        // Point dot
        const isDragging =
          dragState?.laneId === lane.id && dragState?.pointIndex === ptIndex;
        ctx.beginPath();
        ctx.arc(x, y, isDragging ? pointRadius + 2 : pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDragging ? '#ffffff' : lane.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });

    // Playhead
    const playheadX = beatToX(currentBeat);
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = isRecording ? '#ff4444' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvasHeight);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = isRecording ? '#ff4444' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [
    lanes,
    scrollOffset,
    visibleBeats,
    currentBeat,
    isRecording,
    selectedLane,
    dragState,
    compact,
    laneHeight,
    canvasHeight,
    pointRadius,
    beatToX,
    engine,
  ]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw on resize
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // --- Mouse interaction ---

  const getCanvasMousePos = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  const findNearestPoint = useCallback(
    (x: number, y: number): { laneId: string; pointIndex: number } | null => {
      let best: { laneId: string; pointIndex: number; dist: number } | null = null;
      const threshold = pointRadius * 3;

      lanes.forEach((lane, laneIndex) => {
        if (!lane.enabled) return;
        const yBot = (laneIndex + 1) * laneHeight;
        lane.points.forEach((pt, ptIndex) => {
          const px = beatToX(pt.time);
          const py = yBot - pt.value * laneHeight;
          const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
          if (dist < threshold && (!best || dist < best.dist)) {
            best = { laneId: lane.id, pointIndex: ptIndex, dist };
          }
        });
      });

      return best ? { laneId: best.laneId, pointIndex: best.pointIndex } : null;
    },
    [lanes, laneHeight, beatToX, pointRadius]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasMousePos(e);
      const hit = findNearestPoint(pos.x, pos.y);

      if (hit) {
        setSelectedLane(hit.laneId);
        setDragState({
          laneId: hit.laneId,
          pointIndex: hit.pointIndex,
          offsetX: 0,
          offsetY: 0,
        });
      } else {
        // Click on empty area: find which lane and add a point
        const laneIndex = Math.floor(pos.y / laneHeight);
        if (laneIndex >= 0 && laneIndex < lanes.length) {
          const lane = lanes[laneIndex];
          if (lane.enabled) {
            const beat = xToBeat(pos.x);
            const value = clampValue(1 - (pos.y - laneIndex * laneHeight) / laneHeight);
            engine.addPoint(lane.id, beat, value);
            setSelectedLane(lane.id);
            refreshLanes();
          }
        }
      }
    },
    [getCanvasMousePos, findNearestPoint, lanes, laneHeight, xToBeat, engine, refreshLanes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) return;
      const pos = getCanvasMousePos(e);
      const beat = xToBeat(pos.x);
      const laneIndex = lanes.findIndex((l) => l.id === dragState.laneId);
      if (laneIndex < 0) return;
      const value = clampValue(1 - (pos.y - laneIndex * laneHeight) / laneHeight);
      engine.movePoint(dragState.laneId, dragState.pointIndex, Math.max(0, beat), value);
      refreshLanes();
    },
    [dragState, getCanvasMousePos, xToBeat, lanes, laneHeight, engine, refreshLanes]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasMousePos(e);
      const hit = findNearestPoint(pos.x, pos.y);
      if (hit) {
        engine.removePoint(hit.laneId, hit.pointIndex);
        refreshLanes();
      }
    },
    [getCanvasMousePos, findNearestPoint, engine, refreshLanes]
  );

  // Scroll handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        setZoom((prev) => {
          const delta = e.deltaY > 0 ? 1 : -1;
          return Math.max(4, Math.min(32, prev + delta));
        });
      } else {
        // Scroll
        setScrollOffset((prev) => Math.max(0, prev + e.deltaX * 0.05 + e.deltaY * 0.1));
      }
    },
    []
  );

  // --- Actions ---

  const handleAddLane = useCallback(
    (targetId: string) => {
      const target = PARAMETER_TARGETS.find((t) => t.id === targetId);
      if (!target) return;
      engine.createLane(target.id, target.label, target.color);
      setShowLaneSelector(false);
      refreshLanes();
    },
    [engine, refreshLanes]
  );

  const handleToggleLane = useCallback(
    (laneId: string) => {
      const lane = engine.getLane(laneId);
      if (lane) {
        engine.enableLane(laneId, !lane.enabled);
        refreshLanes();
      }
    },
    [engine, refreshLanes]
  );

  const handleDeleteLane = useCallback(
    (laneId: string) => {
      engine.deleteLane(laneId);
      if (selectedLane === laneId) setSelectedLane(null);
      refreshLanes();
    },
    [engine, selectedLane, refreshLanes]
  );

  const handleToggleRecord = useCallback(() => {
    if (engine.isRecording()) {
      engine.stopRecording();
    } else {
      engine.startRecording(bpm, currentBeat);
    }
    refreshLanes();
  }, [engine, bpm, currentBeat, refreshLanes]);

  const handleTogglePlayback = useCallback(() => {
    const state = engine.getPlaybackState();
    if (state.isPlaying) {
      engine.stopPlayback();
    } else {
      engine.startPlayback(bpm);
    }
  }, [engine, bpm]);

  const handleZoomChange = useCallback((beats: number) => {
    setZoom(beats / 4);
  }, []);

  const handleQuantize = useCallback(
    (subdivision: number) => {
      if (selectedLane) {
        engine.quantizePoints(selectedLane, subdivision);
        refreshLanes();
      }
    },
    [engine, selectedLane, refreshLanes]
  );

  const handleClearLane = useCallback(
    (laneId: string) => {
      engine.clearLane(laneId);
      refreshLanes();
    },
    [engine, refreshLanes]
  );

  return (
    <div className="automation-lane-view" style={containerStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Playback controls */}
          <button
            onClick={handleTogglePlayback}
            style={{
              ...btnStyle,
              backgroundColor: isPlaying ? '#ff9800' : '#333',
              color: isPlaying ? '#000' : '#fff',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={handleToggleRecord}
            style={{
              ...btnStyle,
              backgroundColor: isRecording ? '#f44336' : '#333',
              color: isRecording ? '#fff' : '#fff',
              animation: isRecording ? 'pulse 0.5s infinite' : 'none',
            }}
          >
            ● REC
          </button>

          <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
            Beat: {currentBeat.toFixed(2)}
          </span>

          <span style={{ color: '#888', fontSize: 12 }}>{bpm} BPM</span>
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Zoom controls */}
          {BEAT_GRID_SUBDIVISIONS.map((sub) => (
            <button
              key={sub.label}
              onClick={() => handleZoomChange(sub.beats)}
              style={{
                ...btnStyle,
                backgroundColor: zoom === sub.beats / 4 ? '#555' : '#333',
                fontSize: 11,
              }}
            >
              {sub.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Add lane */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowLaneSelector(!showLaneSelector)}
              style={{ ...btnStyle, backgroundColor: '#4caf50', color: '#fff' }}
            >
              + Lane
            </button>
            {showLaneSelector && (
              <div style={dropdownStyle}>
                {PARAMETER_TARGETS.map((target) => (
                  <div
                    key={target.id}
                    onClick={() => handleAddLane(target.id)}
                    style={{
                      ...dropdownItemStyle,
                      borderLeft: `3px solid ${target.color}`,
                    }}
                  >
                    {target.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lane list (side panel) */}
      {lanes.length > 0 && !compact && (
        <div style={laneListStyle}>
          {lanes.map((lane) => (
            <div
              key={lane.id}
              style={{
                ...laneListItemStyle,
                height: laneHeight,
                borderLeft: `3px solid ${lane.color}`,
                backgroundColor:
                  selectedLane === lane.id ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
              onClick={() => setSelectedLane(lane.id)}
            >
              <span
                style={{
                  color: lane.enabled ? lane.color : '#555',
                  fontSize: 11,
                  fontWeight: 'bold',
                }}
              >
                {lane.targetLabel}
              </span>
              <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLane(lane.id);
                  }}
                  style={{
                    ...miniBtnStyle,
                    backgroundColor: lane.enabled ? '#4caf50' : '#555',
                  }}
                  title={lane.enabled ? 'Disable' : 'Enable'}
                >
                  {lane.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearLane(lane.id);
                  }}
                  style={{ ...miniBtnStyle, backgroundColor: '#555' }}
                  title="Clear points"
                >
                  CLR
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLane(lane.id);
                  }}
                  style={{ ...miniBtnStyle, backgroundColor: '#d32f2f' }}
                  title="Delete lane"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'crosshair' }}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{ display: 'block' }}
        />
      </div>

      {/* Selected lane editing tools */}
      {selectedLane && !compact && (
        <div style={editToolbarStyle}>
          <span style={{ color: '#888', fontSize: 11, marginRight: 8 }}>Quantize:</span>
          {[0.25, 0.125, 0.0625].map((sub) => (
            <button
              key={sub}
              onClick={() => handleQuantize(sub)}
              style={{ ...miniBtnStyle, backgroundColor: '#444' }}
            >
              {sub === 0.25 ? '1/4' : sub === 0.125 ? '1/8' : '1/16'}
            </button>
          ))}
          <button
            onClick={() => {
              engine.smoothLane(selectedLane, 0.5);
              refreshLanes();
            }}
            style={{ ...miniBtnStyle, backgroundColor: '#444', marginLeft: 8 }}
          >
            Smooth
          </button>
          <button
            onClick={() => {
              engine.duplicateLane(selectedLane);
              refreshLanes();
            }}
            style={{ ...miniBtnStyle, backgroundColor: '#444', marginLeft: 4 }}
          >
            Duplicate
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// --- Styles ---

function clampValue(v: number): number {
  return Math.max(0, Math.min(1, v));
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#1a1a2e',
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid #333',
  minHeight: 160,
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 12px',
  backgroundColor: '#16162a',
  borderBottom: '1px solid #333',
  flexWrap: 'wrap',
  gap: 4,
};

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 4,
  border: '1px solid #555',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'monospace',
};

const miniBtnStyle: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: 3,
  border: '1px solid #555',
  color: '#ccc',
  cursor: 'pointer',
  fontSize: 10,
  fontFamily: 'monospace',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  backgroundColor: '#222',
  border: '1px solid #444',
  borderRadius: 6,
  zIndex: 100,
  minWidth: 180,
  maxHeight: 300,
  overflowY: 'auto',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};

const dropdownItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  color: '#ddd',
  fontSize: 12,
  transition: 'background-color 0.15s',
};

const laneListStyle: React.CSSProperties = {
  backgroundColor: '#141428',
  borderBottom: '1px solid #333',
};

const laneListItemStyle: React.CSSProperties = {
  padding: '4px 10px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const editToolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 12px',
  backgroundColor: '#16162a',
  borderTop: '1px solid #333',
  gap: 2,
};
