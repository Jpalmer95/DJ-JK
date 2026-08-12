/**
 * Professional Visual Effects Engine
 * Provides high-performance rendering capabilities for DJ visualizations
 */

import { BeatInfo, SpectralFeatures, TransientInfo } from './beatDetection';

// Visual effect types
export type EffectType = 
  | 'particles' 
  | 'waveform' 
  | 'spectrum' 
  | 'circle' 
  | 'tunnel' 
  | 'plasma' 
  | 'kaleidoscope'
  | 'ripple'
  | 'lightning'
  | 'fire';

export interface VisualTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  gradientColors: string[];
  particleColor: string;
  waveformColor: string;
  spectrumColors: string[];
  glowIntensity: number;
  saturation: number;
  brightness: number;
  contrast: number;
}

export interface ParticleConfig {
  count: number;
  size: number;
  speed: number;
  life: number;
  gravity: number;
  friction: number;
  elasticity: number;
  trailLength: number;
  blendMode: GlobalCompositeOperation;
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'diamond';
}

export interface EffectConfig {
  type: EffectType;
  enabled: boolean;
  intensity: number;
  speed: number;
  scale: number;
  opacity: number;
  beatReactive: boolean;
  frequencyReactive: boolean;
  colorCycling: boolean;
  particleConfig?: ParticleConfig;
  customParams?: Record<string, number>;
}

export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  enableWebGL: boolean;
  enablePostProcessing: boolean;
  enableBloom: boolean;
  enableMotionBlur: boolean;
  antiAliasing: boolean;
}

export class Particle {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public size: number = 1;
  public life: number = 1;
  public maxLife: number = 1;
  public color: string = '#ffffff';
  public opacity: number = 1;
  public rotation: number = 0;
  public rotationSpeed: number = 0;
  public trail: { x: number; y: number; opacity: number }[] = [];

  constructor(
    x: number, 
    y: number, 
    vx: number = 0, 
    vy: number = 0, 
    size: number = 1, 
    life: number = 1,
    color: string = '#ffffff'
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.color = color;
  }

  update(config: ParticleConfig): void {
    // Apply physics
    this.vy += config.gravity;
    this.vx *= config.friction;
    this.vy *= config.friction;
    
    this.x += this.vx * config.speed;
    this.y += this.vy * config.speed;
    
    this.rotation += this.rotationSpeed;
    
    // Update life
    this.life -= 1 / (config.life * 60); // Assuming 60 FPS
    this.opacity = this.life / this.maxLife;
    
    // Update trail
    if (config.trailLength > 0) {
      this.trail.push({ x: this.x, y: this.y, opacity: this.opacity });
      if (this.trail.length > config.trailLength) {
        this.trail.shift();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, config: ParticleConfig): void {
    if (this.life <= 0 || this.opacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.globalCompositeOperation = config.blendMode;
    
    // Render trail
    if (this.trail.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      for (let i = 0; i < this.trail.length; i++) {
        const point = this.trail[i];
        ctx.globalAlpha = point.opacity * 0.5;
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    }
    
    // Render particle
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    
    this.renderShape(ctx, config.shape, this.size);
    
    ctx.restore();
  }

  private renderShape(ctx: CanvasRenderingContext2D, shape: ParticleConfig['shape'], size: number): void {
    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'square':
        ctx.fillRect(-size/2, -size/2, size, size);
        break;
        
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(-size, size);
        ctx.lineTo(size, size);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'star':
        this.drawStar(ctx, 0, 0, 5, size, size/2);
        ctx.fill();
        break;
        
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  isDead(): boolean {
    return this.life <= 0;
  }
}

export class VisualEffectsEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private webglCtx: WebGLRenderingContext | null = null;
  private renderConfig: RenderConfig;
  private effects: EffectConfig[] = [];
  private theme: VisualTheme;
  private particles: Particle[] = [];
  
  // Animation state
  private animationId: number | null = null;
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private deltaTime: number = 0;
  
  // Audio data
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;
  private beatInfo: BeatInfo | null = null;
  private spectralFeatures: SpectralFeatures | null = null;
  private transientInfo: TransientInfo | null = null;
  
  // Performance monitoring
  private performanceStats = {
    averageFPS: 60,
    frameTime: 16.67,
    particleCount: 0,
    effectCount: 0
  };
  
  // Post-processing buffers
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  constructor(canvas: HTMLCanvasElement, renderConfig: RenderConfig) {
    this.canvas = canvas;
    this.renderConfig = renderConfig;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D rendering context');
    }
    this.ctx = ctx;
    
    // Try to initialize WebGL if enabled
    if (renderConfig.enableWebGL) {
      this.webglCtx = (canvas.getContext('webgl') as WebGLRenderingContext | null) || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
      if (this.webglCtx) {
        console.log('WebGL enabled for enhanced visual effects');
      }
    }
    
    // Set default theme
    this.theme = this.getDefaultTheme();
    
    // Initialize post-processing
    if (renderConfig.enablePostProcessing) {
      this.initializePostProcessing();
    }
    
    this.setupCanvas();
  }

  private setupCanvas(): void {
    this.canvas.width = this.renderConfig.width;
    this.canvas.height = this.renderConfig.height;
    
    // Set canvas quality based on config
    const scale = this.getQualityScale();
    this.ctx.scale(scale, scale);
    
    // Enable smoothing if anti-aliasing is enabled
    this.ctx.imageSmoothingEnabled = this.renderConfig.antiAliasing;
  }

  private getQualityScale(): number {
    switch (this.renderConfig.quality) {
      case 'low': return 0.5;
      case 'medium': return 0.75;
      case 'high': return 1.0;
      case 'ultra': return 1.25;
      default: return 1.0;
    }
  }

  private initializePostProcessing(): void {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.renderConfig.width;
    this.offscreenCanvas.height = this.renderConfig.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  }

  // Theme management
  setTheme(theme: VisualTheme): void {
    this.theme = theme;
    console.log(`Visual theme set to: ${theme.name}`);
  }

  getTheme(): VisualTheme {
    return this.theme;
  }

  private getDefaultTheme(): VisualTheme {
    return {
      id: 'dark-club',
      name: 'Dark Club',
      primaryColor: '#00d4ff',
      secondaryColor: '#ff0080',
      accentColor: '#ffff00',
      backgroundColor: '#000000',
      gradientColors: ['#000428', '#004e92', '#00d4ff'],
      particleColor: '#00d4ff',
      waveformColor: '#00ff88',
      spectrumColors: ['#ff0080', '#ff4000', '#ffff00', '#00ff88', '#00d4ff'],
      glowIntensity: 0.8,
      saturation: 1.0,
      brightness: 1.0,
      contrast: 1.2
    };
  }

  // Effect management
  addEffect(effectConfig: EffectConfig): void {
    this.effects.push(effectConfig);
    this.performanceStats.effectCount = this.effects.length;
    console.log(`Added ${effectConfig.type} effect (total: ${this.effects.length})`);
  }

  removeEffect(type: EffectType): void {
    this.effects = this.effects.filter(effect => effect.type !== type);
    this.performanceStats.effectCount = this.effects.length;
    console.log(`Removed ${type} effect (remaining: ${this.effects.length})`);
  }

  updateEffect(type: EffectType, updates: Partial<EffectConfig>): void {
    const effect = this.effects.find(e => e.type === type);
    if (effect) {
      Object.assign(effect, updates);
    }
  }

  getEffect(type: EffectType): EffectConfig | undefined {
    return this.effects.find(e => e.type === type);
  }

  clearEffects(): void {
    this.effects = [];
    this.particles = [];
    this.performanceStats.effectCount = 0;
    this.performanceStats.particleCount = 0;
  }

  // Audio data input
  updateAudioData(
    frequencyData: Uint8Array,
    timeDomainData: Uint8Array,
    beatInfo?: BeatInfo,
    spectralFeatures?: SpectralFeatures,
    transientInfo?: TransientInfo
  ): void {
    this.frequencyData = frequencyData;
    this.timeDomainData = timeDomainData;
    this.beatInfo = beatInfo || null;
    this.spectralFeatures = spectralFeatures || null;
    this.transientInfo = transientInfo || null;
  }

  // Main rendering loop
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    
    console.log('Visual effects engine started');
    this.render();
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    console.log('Visual effects engine stopped');
  }

  private render(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    this.deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Calculate FPS
    this.fps = 1000 / this.deltaTime;
    this.performanceStats.averageFPS = (this.performanceStats.averageFPS * 0.9) + (this.fps * 0.1);
    this.performanceStats.frameTime = this.deltaTime;
    
    // Clear canvas
    this.clearCanvas();
    
    // Update and render effects
    this.updateEffects();
    this.renderEffects();
    
    // Update particles
    this.updateParticles();
    this.renderParticles();
    
    // Post-processing
    if (this.renderConfig.enablePostProcessing) {
      this.applyPostProcessing();
    }
    
    this.frameCount++;
    
    // Continue rendering
    this.animationId = requestAnimationFrame(() => this.render());
  }

  private clearCanvas(): void {
    // Apply background based on theme
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
    );
    
    gradient.addColorStop(0, this.theme.backgroundColor);
    gradient.addColorStop(1, this.theme.gradientColors[0] || this.theme.backgroundColor);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private updateEffects(): void {
    this.effects.forEach(effect => {
      if (!effect.enabled) return;
      
      // Beat-reactive effects
      if (effect.beatReactive && this.beatInfo?.isBeat) {
        this.triggerBeatEffect(effect);
      }
      
      // Frequency-reactive effects
      if (effect.frequencyReactive && this.spectralFeatures) {
        this.updateFrequencyReactiveEffect(effect);
      }
      
      // Create particles based on effect
      if (effect.type === 'particles' && effect.particleConfig) {
        this.spawnParticles(effect);
      }
    });
  }

  private triggerBeatEffect(effect: EffectConfig): void {
    const beatStrength = this.beatInfo?.beatStrength || 1.0;
    
    switch (effect.type) {
      case 'particles':
        if (effect.particleConfig) {
          this.spawnBeatParticles(effect.particleConfig, beatStrength);
        }
        break;
        
      case 'circle':
        this.triggerCircleEffect(beatStrength);
        break;
        
      case 'ripple':
        this.triggerRippleEffect(beatStrength);
        break;
    }
  }

  private updateFrequencyReactiveEffect(effect: EffectConfig): void {
    if (!this.spectralFeatures) return;
    
    const { bassEnergy, midEnergy, highEnergy } = this.spectralFeatures;
    
    // Update effect parameters based on frequency content
    switch (effect.type) {
      case 'spectrum':
        // Spectrum analyzer is frequency-reactive by nature
        break;
        
      case 'plasma':
        // Adjust plasma parameters based on frequency content
        if (effect.customParams) {
          effect.customParams.speed = effect.speed * (1 + bassEnergy);
          effect.customParams.intensity = effect.intensity * (1 + midEnergy);
        }
        break;
        
      case 'tunnel':
        // Tunnel rotation speed based on high frequencies
        if (effect.customParams) {
          effect.customParams.rotationSpeed = highEnergy * 2;
        }
        break;
    }
  }

  private spawnParticles(effect: EffectConfig): void {
    if (!effect.particleConfig) return;
    
    const config = effect.particleConfig;
    const spawnRate = Math.max(1, config.count / 60); // Particles per frame
    
    for (let i = 0; i < spawnRate; i++) {
      if (this.particles.length >= 5000) break; // Limit total particles
      
      const particle = new Particle(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        Math.random() * config.size + 1,
        config.life,
        this.getRandomThemeColor()
      );
      
      this.particles.push(particle);
    }
  }

  private spawnBeatParticles(config: ParticleConfig, beatStrength: number): void {
    const particleCount = Math.floor(config.count * beatStrength);
    
    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= 5000) break;
      
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = config.speed * beatStrength * (Math.random() + 0.5);
      
      const particle = new Particle(
        this.canvas.width / 2,
        this.canvas.height / 2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        config.size * (beatStrength + 0.5),
        config.life,
        this.theme.particleColor
      );
      
      particle.rotationSpeed = (Math.random() - 0.5) * 0.2;
      this.particles.push(particle);
    }
  }

  private triggerCircleEffect(beatStrength: number): void {
    // Draw expanding circle on beat
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const maxRadius = Math.min(this.canvas.width, this.canvas.height) / 4;
    
    this.ctx.save();
    this.ctx.globalAlpha = beatStrength * 0.5;
    this.ctx.strokeStyle = this.theme.accentColor;
    this.ctx.lineWidth = 3;
    
    // Draw multiple expanding circles
    for (let i = 0; i < 3; i++) {
      const radius = maxRadius * beatStrength * (0.3 + i * 0.3);
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  private triggerRippleEffect(beatStrength: number): void {
    // Create ripple effect from center
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const maxRadius = Math.max(this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    this.ctx.globalAlpha = beatStrength * 0.3;
    
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxRadius * beatStrength
    );
    
    gradient.addColorStop(0, this.theme.primaryColor);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  private renderEffects(): void {
    this.effects.forEach(effect => {
      if (!effect.enabled) return;
      
      switch (effect.type) {
        case 'waveform':
          this.renderWaveform(effect);
          break;
          
        case 'spectrum':
          this.renderSpectrum(effect);
          break;
          
        case 'plasma':
          this.renderPlasma(effect);
          break;
          
        case 'tunnel':
          this.renderTunnel(effect);
          break;
          
        case 'kaleidoscope':
          this.renderKaleidoscope(effect);
          break;
          
        case 'lightning':
          this.renderLightning(effect);
          break;
          
        case 'fire':
          this.renderFire(effect);
          break;
      }
    });
  }

  private renderWaveform(effect: EffectConfig): void {
    if (!this.timeDomainData) return;
    
    const centerY = this.canvas.height / 2;
    const amplitude = (this.canvas.height / 4) * effect.scale;
    
    this.ctx.save();
    this.ctx.globalAlpha = effect.opacity;
    this.ctx.strokeStyle = this.theme.waveformColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const x = (i / this.timeDomainData.length) * this.canvas.width;
      const y = centerY + ((this.timeDomainData[i] - 128) / 128) * amplitude;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderSpectrum(effect: EffectConfig): void {
    if (!this.frequencyData) return;
    
    const barWidth = this.canvas.width / this.frequencyData.length;
    const maxHeight = this.canvas.height * effect.scale;
    
    this.ctx.save();
    this.ctx.globalAlpha = effect.opacity;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      const barHeight = (this.frequencyData[i] / 255) * maxHeight;
      const x = i * barWidth;
      const y = this.canvas.height - barHeight;
      
      // Color based on frequency
      const colorIndex = Math.floor((i / this.frequencyData.length) * this.theme.spectrumColors.length);
      this.ctx.fillStyle = this.theme.spectrumColors[colorIndex] || this.theme.primaryColor;
      
      this.ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
    
    this.ctx.restore();
  }

  private renderPlasma(effect: EffectConfig): void {
    const time = this.frameCount * 0.02 * effect.speed;
    const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    
    for (let x = 0; x < this.canvas.width; x++) {
      for (let y = 0; y < this.canvas.height; y++) {
        const index = (y * this.canvas.width + x) * 4;
        
        // Plasma calculation
        const value = Math.sin(x * 0.01 + time) +
                     Math.sin(y * 0.01 + time) +
                     Math.sin((x + y) * 0.01 + time) +
                     Math.sin(Math.sqrt(x * x + y * y) * 0.01 + time);
        
        const normalized = (value + 4) / 8; // Normalize to 0-1
        
        // Convert to RGB using theme colors
        const r = Math.floor(Math.sin(normalized * Math.PI) * 127 + 128);
        const g = Math.floor(Math.sin(normalized * Math.PI + 2) * 127 + 128);
        const b = Math.floor(Math.sin(normalized * Math.PI + 4) * 127 + 128);
        
        imageData.data[index] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = Math.floor(effect.opacity * 255);
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  private renderTunnel(effect: EffectConfig): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const time = this.frameCount * 0.02 * effect.speed;
    
    this.ctx.save();
    this.ctx.globalAlpha = effect.opacity;
    this.ctx.translate(centerX, centerY);
    
    const rotationSpeed = effect.customParams?.rotationSpeed || 0.01;
    this.ctx.rotate(time * rotationSpeed);
    
    // Draw concentric circles with varying opacity
    for (let i = 1; i < 20; i++) {
      const radius = i * 20 * effect.scale;
      const alpha = 1 - (i / 20);
      
      this.ctx.globalAlpha = effect.opacity * alpha;
      this.ctx.strokeStyle = this.theme.primaryColor;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  private renderKaleidoscope(effect: EffectConfig): void {
    // Complex kaleidoscope pattern - simplified implementation
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const time = this.frameCount * 0.01 * effect.speed;
    const segments = 8;
    
    this.ctx.save();
    this.ctx.globalAlpha = effect.opacity;
    this.ctx.translate(centerX, centerY);
    
    for (let i = 0; i < segments; i++) {
      this.ctx.save();
      this.ctx.rotate((Math.PI * 2 * i) / segments);
      
      // Draw mirrored pattern
      const gradient = this.ctx.createLinearGradient(-100, -100, 100, 100);
      gradient.addColorStop(0, this.theme.primaryColor);
      gradient.addColorStop(0.5, this.theme.secondaryColor);
      gradient.addColorStop(1, this.theme.accentColor);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(-5, 0, 10, 100 * effect.scale);
      
      this.ctx.restore();
    }
    
    this.ctx.restore();
  }

  private renderLightning(effect: EffectConfig): void {
    if (!this.transientInfo?.isTransient) return;
    
    const segments = 20;
    const intensity = this.transientInfo.strength;
    
    this.ctx.save();
    this.ctx.globalAlpha = effect.opacity * intensity;
    this.ctx.strokeStyle = this.theme.accentColor;
    this.ctx.lineWidth = 3;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this.theme.accentColor;
    
    // Generate lightning path
    let x = Math.random() * this.canvas.width;
    let y = 0;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    
    for (let i = 0; i < segments; i++) {
      x += (Math.random() - 0.5) * 100;
      y += this.canvas.height / segments;
      this.ctx.lineTo(x, y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderFire(effect: EffectConfig): void {
    // Simplified fire effect using particles
    const baseY = this.canvas.height - 50;
    const fireWidth = this.canvas.width;
    
    this.ctx.save();
    this.ctx.globalAlpha = effect.opacity;
    
    // Create fire gradient
    const gradient = this.ctx.createLinearGradient(0, baseY, 0, baseY - 200 * effect.scale);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.5, '#ff6600');
    gradient.addColorStop(0.8, '#ffff00');
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    
    // Draw fire shape with noise
    this.ctx.beginPath();
    this.ctx.moveTo(0, baseY);
    
    for (let x = 0; x < fireWidth; x += 10) {
      const flameHeight = Math.random() * 200 * effect.scale * effect.intensity;
      this.ctx.lineTo(x, baseY - flameHeight);
    }
    
    this.ctx.lineTo(fireWidth, baseY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  private updateParticles(): void {
    // Update existing particles
    this.particles = this.particles.filter(particle => {
      // Find particle config (default if not found)
      const defaultConfig: ParticleConfig = {
        count: 100,
        size: 2,
        speed: 1,
        life: 120,
        gravity: 0.01,
        friction: 0.99,
        elasticity: 0.8,
        trailLength: 10,
        blendMode: 'source-over',
        shape: 'circle'
      };
      
      particle.update(defaultConfig);
      return !particle.isDead();
    });
    
    this.performanceStats.particleCount = this.particles.length;
  }

  private renderParticles(): void {
    const defaultConfig: ParticleConfig = {
      count: 100,
      size: 2,
      speed: 1,
      life: 120,
      gravity: 0.01,
      friction: 0.99,
      elasticity: 0.8,
      trailLength: 10,
      blendMode: 'source-over',
      shape: 'circle'
    };
    
    this.particles.forEach(particle => {
      particle.render(this.ctx, defaultConfig);
    });
  }

  private applyPostProcessing(): void {
    if (!this.offscreenCtx || !this.offscreenCanvas) return;
    
    // Copy current canvas to offscreen canvas
    this.offscreenCtx.drawImage(this.canvas, 0, 0);
    
    // Apply bloom effect
    if (this.renderConfig.enableBloom) {
      this.applyBloom();
    }
    
    // Apply motion blur
    if (this.renderConfig.enableMotionBlur) {
      this.applyMotionBlur();
    }
  }

  private applyBloom(): void {
    // Simplified bloom effect
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.filter = 'blur(5px)';
    this.ctx.globalAlpha = 0.5;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.restore();
  }

  private applyMotionBlur(): void {
    // Simple motion blur effect
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.globalAlpha = 0.95;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.restore();
  }

  private getRandomThemeColor(): string {
    const colors = [
      this.theme.primaryColor,
      this.theme.secondaryColor,
      this.theme.accentColor,
      ...this.theme.gradientColors
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Public API methods
  getPerformanceStats() {
    return { ...this.performanceStats };
  }

  setRenderConfig(config: Partial<RenderConfig>): void {
    Object.assign(this.renderConfig, config);
    this.setupCanvas();
  }

  resize(width: number, height: number): void {
    this.renderConfig.width = width;
    this.renderConfig.height = height;
    this.setupCanvas();
    
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }
  }

  // Preset configurations
  static getDefaultEffects(): EffectConfig[] {
    return [
      {
        type: 'spectrum',
        enabled: true,
        intensity: 1.0,
        speed: 1.0,
        scale: 0.8,
        opacity: 0.9,
        beatReactive: true,
        frequencyReactive: true,
        colorCycling: false
      },
      {
        type: 'particles',
        enabled: true,
        intensity: 0.7,
        speed: 1.0,
        scale: 1.0,
        opacity: 0.8,
        beatReactive: true,
        frequencyReactive: false,
        colorCycling: true,
        particleConfig: {
          count: 50,
          size: 3,
          speed: 2,
          life: 180,
          gravity: 0.02,
          friction: 0.98,
          elasticity: 0.7,
          trailLength: 15,
          blendMode: 'screen',
          shape: 'circle'
        }
      },
      {
        type: 'waveform',
        enabled: true,
        intensity: 1.0,
        speed: 1.0,
        scale: 1.0,
        opacity: 0.6,
        beatReactive: false,
        frequencyReactive: false,
        colorCycling: false
      }
    ];
  }

  static getThemes(): VisualTheme[] {
    return [
      {
        id: 'dark-club',
        name: 'Dark Club',
        primaryColor: '#00d4ff',
        secondaryColor: '#ff0080',
        accentColor: '#ffff00',
        backgroundColor: '#000000',
        gradientColors: ['#000428', '#004e92'],
        particleColor: '#00d4ff',
        waveformColor: '#00ff88',
        spectrumColors: ['#ff0080', '#ff4000', '#ffff00', '#00ff88', '#00d4ff'],
        glowIntensity: 0.8,
        saturation: 1.0,
        brightness: 1.0,
        contrast: 1.2
      },
      {
        id: 'neon-cyber',
        name: 'Neon Cyber',
        primaryColor: '#ff00ff',
        secondaryColor: '#00ffff',
        accentColor: '#ffff00',
        backgroundColor: '#0a0a0a',
        gradientColors: ['#1a0033', '#330066'],
        particleColor: '#ff00ff',
        waveformColor: '#00ffff',
        spectrumColors: ['#ff00ff', '#ff0080', '#ff4000', '#ffff00', '#00ffff'],
        glowIntensity: 1.0,
        saturation: 1.2,
        brightness: 1.1,
        contrast: 1.3
      },
      {
        id: 'retro-synthwave',
        name: 'Retro Synthwave',
        primaryColor: '#ff6ec7',
        secondaryColor: '#7928ca',
        accentColor: '#ffd700',
        backgroundColor: '#0f0f23',
        gradientColors: ['#2d1b69', '#11072c'],
        particleColor: '#ff6ec7',
        waveformColor: '#7928ca',
        spectrumColors: ['#7928ca', '#9333ea', '#c084fc', '#e879f9', '#ff6ec7'],
        glowIntensity: 0.9,
        saturation: 0.9,
        brightness: 0.95,
        contrast: 1.1
      }
    ];
  }
}

// Utility functions for visual effects
export const VisualUtils = {
  // Color manipulation
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  rgbToHex: (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },

  interpolateColor: (color1: string, color2: string, factor: number): string => {
    const c1 = VisualUtils.hexToRgb(color1);
    const c2 = VisualUtils.hexToRgb(color2);
    
    if (!c1 || !c2) return color1;
    
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    
    return VisualUtils.rgbToHex(r, g, b);
  },

  // Easing functions
  easeInOut: (t: number): number => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  },

  easeIn: (t: number): number => {
    return t * t;
  },

  easeOut: (t: number): number => {
    return 1 - (1 - t) * (1 - t);
  },

  // Noise functions
  randomNoise: (x: number, y: number): number => {
    return Math.random();
  },

  // Performance optimization
  throttle: <T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: NodeJS.Timeout | null = null;
    return ((...args: any[]) => {
      if (!timeout) {
        timeout = setTimeout(() => {
          func(...args);
          timeout = null;
        }, wait);
      }
    }) as T;
  }
};