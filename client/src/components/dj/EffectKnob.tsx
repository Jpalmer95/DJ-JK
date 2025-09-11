import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EffectKnobProps {
  // Value properties
  value: number;
  min: number;
  max: number;
  defaultValue?: number;
  step?: number;
  
  // Display properties
  label: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'white';
  
  // Behavior properties
  onChange?: (value: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
  disabled?: boolean;
  
  // Visual properties
  showValue?: boolean;
  precision?: number;
  rotation?: number; // Start rotation angle in degrees
  sweepAngle?: number; // Total sweep angle in degrees
  
  // Test ID for automation
  'data-testid'?: string;
}

export default function EffectKnob({
  value,
  min,
  max,
  defaultValue = min,
  step = (max - min) / 100,
  label,
  unit = '',
  size = 'md',
  color = 'blue',
  onChange,
  onStart,
  onEnd,
  disabled = false,
  showValue = true,
  precision = 1,
  rotation = -135, // Start at -135 degrees (7 o'clock position)
  sweepAngle = 270, // 270 degrees total sweep
  'data-testid': testId
}: EffectKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, value: 0 });
  const knobRef = useRef<HTMLDivElement>(null);
  
  // Calculate current rotation angle based on value
  const valueRange = max - min;
  const normalizedValue = (value - min) / valueRange;
  const currentAngle = rotation + (normalizedValue * sweepAngle);
  
  // Size configurations
  const sizeConfig = {
    sm: {
      knob: 'w-12 h-12',
      inner: 'w-8 h-8',
      dot: 'w-1 h-1',
      text: 'text-xs',
      spacing: 'space-y-1'
    },
    md: {
      knob: 'w-16 h-16',
      inner: 'w-12 h-12',
      dot: 'w-1.5 h-1.5',
      text: 'text-sm',
      spacing: 'space-y-2'
    },
    lg: {
      knob: 'w-20 h-20',
      inner: 'w-16 h-16',
      dot: 'w-2 h-2',
      text: 'text-base',
      spacing: 'space-y-3'
    }
  };
  
  // Color configurations
  const colorConfig = {
    blue: {
      ring: 'ring-blue-500',
      dot: 'bg-blue-400',
      glow: 'shadow-blue-500/50',
      activeGlow: 'shadow-blue-500/75'
    },
    green: {
      ring: 'ring-green-500',
      dot: 'bg-green-400',
      glow: 'shadow-green-500/50',
      activeGlow: 'shadow-green-500/75'
    },
    red: {
      ring: 'ring-red-500',
      dot: 'bg-red-400',
      glow: 'shadow-red-500/50',
      activeGlow: 'shadow-red-500/75'
    },
    orange: {
      ring: 'ring-orange-500',
      dot: 'bg-orange-400',
      glow: 'shadow-orange-500/50',
      activeGlow: 'shadow-orange-500/75'
    },
    purple: {
      ring: 'ring-purple-500',
      dot: 'bg-purple-400',
      glow: 'shadow-purple-500/50',
      activeGlow: 'shadow-purple-500/75'
    },
    white: {
      ring: 'ring-gray-300',
      dot: 'bg-gray-200',
      glow: 'shadow-gray-300/50',
      activeGlow: 'shadow-gray-300/75'
    }
  };
  
  const config = sizeConfig[size];
  const colors = colorConfig[color];
  
  // Format value for display
  const formatValue = (val: number): string => {
    const formatted = Number(val.toFixed(precision));
    return `${formatted}${unit}`;
  };
  
  // Calculate value from mouse position
  const calculateValueFromPosition = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate angle from center
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    // Normalize angle to 0-360 range
    angle = (angle + 360) % 360;
    
    // Convert to our rotation system (starting from rotation position)
    const startAngle = (rotation + 360) % 360;
    let relativeAngle = angle - startAngle;
    
    // Handle wrapping
    if (relativeAngle < 0) {
      relativeAngle += 360;
    }
    if (relativeAngle > 180 && sweepAngle < 360) {
      relativeAngle = relativeAngle - 360;
    }
    
    // Clamp to sweep range
    relativeAngle = Math.max(0, Math.min(sweepAngle, relativeAngle));
    
    // Convert to value
    const normalizedAngle = relativeAngle / sweepAngle;
    const newValue = min + (normalizedAngle * valueRange);
    
    // Apply step quantization
    const steppedValue = Math.round(newValue / step) * step;
    return Math.max(min, Math.min(max, steppedValue));
  }, [min, max, step, rotation, sweepAngle, valueRange]);
  
  // Mouse/touch handlers
  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (disabled) return;
    
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY, value });
    onStart?.();
  }, [disabled, value, onStart]);
  
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !knobRef.current || disabled) return;
    
    const rect = knobRef.current.getBoundingClientRect();
    const newValue = calculateValueFromPosition(clientX, clientY, rect);
    
    if (newValue !== value) {
      onChange?.(newValue);
    }
  }, [isDragging, disabled, value, onChange, calculateValueFromPosition]);
  
  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setDragStart({ x: 0, y: 0, value: 0 });
    onEnd?.();
  }, [isDragging, onEnd]);
  
  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);
  
  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);
  
  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    handleEnd();
  }, [handleEnd]);
  
  // Keyboard handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    let newValue = value;
    const bigStep = step * 10;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        newValue = Math.min(max, value + (e.shiftKey ? bigStep : step));
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        newValue = Math.max(min, value - (e.shiftKey ? bigStep : step));
        break;
      case 'Home':
        newValue = min;
        break;
      case 'End':
        newValue = max;
        break;
      case 'Space':
        newValue = defaultValue;
        break;
      default:
        return;
    }
    
    e.preventDefault();
    onChange?.(newValue);
  };
  
  // Global mouse/touch event handlers
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);
  
  // Double-click to reset to default
  const handleDoubleClick = () => {
    if (!disabled) {
      onChange?.(defaultValue);
    }
  };
  
  return (
    <div className={cn('flex flex-col items-center', config.spacing)} data-testid={testId}>
      {/* Label */}
      <div className={cn('text-gray-300 font-medium text-center leading-tight', config.text)}>
        {label}
      </div>
      
      {/* Knob Container */}
      <div className="relative">
        {/* Knob Base */}
        <div
          ref={knobRef}
          className={cn(
            'relative rounded-full cursor-pointer select-none transition-all duration-75',
            'bg-gradient-to-b from-gray-700 to-gray-900',
            'border-2 border-gray-600',
            config.knob,
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500',
            isDragging ? cn('ring-2', colors.ring, 'shadow-lg', colors.activeGlow) : colors.glow
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatValue(value)}
        >
          {/* Inner Ring */}
          <div
            className={cn(
              'absolute inset-2 rounded-full',
              'bg-gradient-to-b from-gray-800 to-gray-700',
              'border border-gray-500',
              config.inner
            )}
          >
            {/* Position Indicator Dot */}
            <div
              className={cn(
                'absolute rounded-full transition-all duration-75',
                config.dot,
                colors.dot,
                isDragging ? 'shadow-lg' : 'shadow-md'
              )}
              style={{
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotate(${currentAngle}deg) translateY(-${size === 'sm' ? '14px' : size === 'md' ? '18px' : '24px'})`,
                transformOrigin: 'center center'
              }}
            />
          </div>
          
          {/* Value Arc (optional visual enhancement) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="50%"
              cy="50%"
              r={size === 'sm' ? '20' : size === 'md' ? '28' : '36'}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(normalizedValue * sweepAngle * Math.PI) / 180 * (size === 'sm' ? 20 : size === 'md' ? 28 : 36)} ${2 * Math.PI * (size === 'sm' ? 20 : size === 'md' ? 28 : 36)}`}
              className={cn('transition-all duration-150', colors.dot.replace('bg-', 'text-'))}
              style={{
                strokeDashoffset: -(rotation * Math.PI / 180) * (size === 'sm' ? 20 : size === 'md' ? 28 : 36)
              }}
            />
          </svg>
        </div>
        
        {/* Range Markers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Min marker */}
          <div
            className="absolute w-0.5 h-2 bg-gray-500"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(-${size === 'sm' ? '26px' : size === 'md' ? '34px' : '42px'})`,
              transformOrigin: 'center center'
            }}
          />
          {/* Max marker */}
          <div
            className="absolute w-0.5 h-2 bg-gray-500"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${rotation + sweepAngle}deg) translateY(-${size === 'sm' ? '26px' : size === 'md' ? '34px' : '42px'})`,
              transformOrigin: 'center center'
            }}
          />
        </div>
      </div>
      
      {/* Value Display */}
      {showValue && (
        <div className={cn(
          'text-center font-mono font-semibold',
          config.text,
          isDragging ? colors.dot.replace('bg-', 'text-') : 'text-gray-300'
        )}>
          {formatValue(value)}
        </div>
      )}
      
      {/* Status Indicators */}
      <div className="flex items-center space-x-1">
        {/* Active indicator */}
        {value !== defaultValue && (
          <div className={cn('w-1 h-1 rounded-full', colors.dot)} />
        )}
        
        {/* Disabled indicator */}
        {disabled && (
          <div className="w-1 h-1 rounded-full bg-gray-600" />
        )}
      </div>
    </div>
  );
}