/**
 * Advanced Audio Analysis Module for DJ Application
 * Provides professional-grade BPM, key, energy detection and beat grid generation.
 */

// ============================================================================
// Constants
// ============================================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Krumhansl-Kessler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// Camelot wheel mapping (outer = major, inner = minor)
const CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
const CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];

// Analysis parameters
const DOWNSAMPLE_RATE = 11025;
const LOWPASS_CUTOFF = 150;
const WINDOW_SIZE = 4096;
const HOP_SIZE = 2048;
const BPM_MIN = 60;
const BPM_MAX = 200;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple low-pass filter (single-pole IIR)
 */
function lowPassFilter(data: Float32Array, cutoffHz: number, sampleRate: number): Float32Array {
  const rc = 1.0 / (2.0 * Math.PI * cutoffHz);
  const dt = 1.0 / sampleRate;
  const alpha = dt / (rc + dt);
  const filtered = new Float32Array(data.length);
  filtered[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    filtered[i] = filtered[i - 1] + alpha * (data[i] - filtered[i - 1]);
  }
  return filtered;
}

/**
 * Downsample audio buffer to mono at target sample rate
 */
function downsampleToMono(buffer: AudioBuffer, targetRate: number): Float32Array {
  const sourceRate = buffer.sampleRate;
  const channelData = buffer.numberOfChannels > 1
    ? mixToMono(buffer.getChannelData(0), buffer.getChannelData(1))
    : buffer.getChannelData(0).slice();

  const ratio = sourceRate / targetRate;
  const newLength = Math.floor(channelData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(idx0 + 1, channelData.length - 1);
    const frac = srcIdx - idx0;
    result[i] = channelData[idx0] * (1 - frac) + channelData[idx1] * frac;
  }

  return result;
}

/**
 * Mix two channels to mono
 */
function mixToMono(left: Float32Array, right: Float32Array): Float32Array {
  const result = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) {
    result[i] = (left[i] + right[i]) * 0.5;
  }
  return result;
}

/**
 * Compute autocorrelation of a signal
 */
function autocorrelation(signal: Float32Array): Float32Array {
  const n = signal.length;
  const result = new Float32Array(n);

  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    const limit = n - lag;
    for (let i = 0; i < limit; i++) {
      sum += signal[i] * signal[i + lag];
    }
    result[lag] = sum / limit;
  }

  return result;
}

/**
 * Hann window function
 */
function hannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
}

/**
 * Compute Discrete Fourier Transform (simple DFT for a subset of bins)
 */
function computeDFT(frame: Float32Array, numBins: number): Float32Array[] {
  const magnitudes = new Float32Array(numBins);
  const phases = new Float32Array(numBins);

  for (let k = 0; k < numBins; k++) {
    let realSum = 0;
    let imagSum = 0;
    for (let n = 0; n < frame.length; n++) {
      const angle = (2 * Math.PI * k * n) / frame.length;
      realSum += frame[n] * Math.cos(angle);
      imagSum -= frame[n] * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(realSum * realSum + imagSum * imagSum);
    phases[k] = Math.atan2(imagSum, realSum);
  }

  return [magnitudes, phases];
}

/**
 * Pearson correlation coefficient between two arrays
 */
function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;

  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }

  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  return den === 0 ? 0 : num / den;
}

/**
 * Parabolic interpolation around a peak for sub-sample refinement
 */
function parabolicInterpolation(arr: Float32Array | number[], peakIdx: number): number {
  if (peakIdx <= 0 || peakIdx >= arr.length - 1) return peakIdx;

  const y0 = arr[peakIdx - 1];
  const y1 = arr[peakIdx];
  const y2 = arr[peakIdx + 1];
  const a = (y0 + y2) / 2 - y1;

  if (Math.abs(a) < 1e-10) return peakIdx;

  const delta = (y0 - y2) / (4 * a);
  return peakIdx + delta;
}

// ============================================================================
// BPM Detection
// ============================================================================

/**
 * Detect BPM using autocorrelation of onset detection function.
 * Algorithm:
 * 1. Downsample to mono, reduce to 11025 Hz for speed
 * 2. Apply low-pass filter to isolate kick drum energy (< 150Hz)
 * 3. Compute onset detection function (spectral flux or energy difference)
 * 4. Apply autocorrelation to the onset function
 * 5. Find the peak in the autocorrelation in the range 60-200 BPM
 * 6. Refine using parabolic interpolation around the peak
 * 7. Return the detected BPM (rounded to nearest 0.1)
 */
export async function detectBPM(buffer: AudioBuffer): Promise<number> {
  // 1. Downsample to mono at 11025 Hz
  const downsampled = downsampleToMono(buffer, DOWNSAMPLE_RATE);

  // 2. Low-pass filter to isolate kick energy
  const filtered = lowPassFilter(downsampled, LOWPASS_CUTOFF, DOWNSAMPLE_RATE);

  // 3. Compute onset detection function (energy-based)
  // Use energy in windows and compute positive differences
  const windowLen = Math.floor(DOWNSAMPLE_RATE * 0.02); // 20ms windows
  const hopLen = Math.floor(windowLen / 2);
  const numFrames = Math.floor((filtered.length - windowLen) / hopLen);
  const onsetFunction = new Float32Array(numFrames);

  let prevEnergy = 0;
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopLen;
    let energy = 0;
    for (let j = 0; j < windowLen; j++) {
      const sample = filtered[start + j];
      energy += sample * sample;
    }
    energy = Math.sqrt(energy / windowLen);

    // Onset = positive energy difference
    onsetFunction[i] = Math.max(0, energy - prevEnergy);
    prevEnergy = energy;
  }

  // 4. Apply autocorrelation
  const autocorr = autocorrelation(onsetFunction);

  // 5. Find peak in autocorrelation within BPM range
  // Convert BPM range to lag indices
  const framesPerSecond = DOWNSAMPLE_RATE / hopLen;
  const maxLag = Math.floor(framesPerSecond * 60 / BPM_MIN); // 60 BPM -> longest lag
  const minLag = Math.floor(framesPerSecond * 60 / BPM_MAX); // 200 BPM -> shortest lag

  // Skip the first few lags (they'll have high DC correlation)
  const searchStart = Math.max(minLag, 2);
  const searchEnd = Math.min(maxLag, autocorr.length - 2);

  let peakLag = searchStart;
  let peakValue = -Infinity;

  for (let lag = searchStart; lag < searchEnd; lag++) {
    if (autocorr[lag] > peakValue) {
      peakValue = autocorr[lag];
      peakLag = lag;
    }
  }

  // 6. Refine with parabolic interpolation
  const refinedLag = parabolicInterpolation(autocorr, peakLag);

  // Convert lag to BPM
  const bpm = (framesPerSecond * 60) / refinedLag;

  // 7. Round to nearest 0.1
  return Math.round(bpm * 10) / 10;
}

// ============================================================================
// Key Detection
// ============================================================================

/**
 * Detect musical key using chromagram analysis and Krumhansl-Kessler profiles.
 * Algorithm:
 * 1. Compute Short-Time Fourier Transform (STFT) using overlapping windows
 * 2. Map FFT bins to 12 pitch classes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
 * 3. Accumulate chroma vector over all frames
 * 4. Compare chroma vector against major and minor key templates (Krumhansl-Kessler profiles)
 * 5. Find the key with highest correlation
 * 6. Return key name (e.g., "Am"), Camelot notation, and confidence score (0-1)
 */
export async function detectKey(buffer: AudioBuffer): Promise<{
  key: string;
  camelotKey: string;
  confidence: number;
}> {
  const sampleRate = buffer.sampleRate;

  // Get mono data
  const channelData = buffer.numberOfChannels > 1
    ? mixToMono(buffer.getChannelData(0), buffer.getChannelData(1))
    : buffer.getChannelData(0).slice();

  // Apply Hann window
  const window = hannWindow(WINDOW_SIZE);

  // Accumulate chroma vector (12 pitch classes)
  const chroma = new Float32Array(12);
  const numBins = Math.floor(WINDOW_SIZE / 2) + 1;

  // Number of frames
  const numFrames = Math.floor((channelData.length - WINDOW_SIZE) / HOP_SIZE);

  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * HOP_SIZE;

    // Extract and window the frame
    const frameData = new Float32Array(WINDOW_SIZE);
    for (let i = 0; i < WINDOW_SIZE; i++) {
      frameData[i] = channelData[start + i] * window[i];
    }

    // Compute DFT magnitudes
    const [magnitudes] = computeDFT(frameData, numBins);

    // Map FFT bins to pitch classes
    for (let bin = 1; bin < numBins; bin++) {
      const freq = (bin * sampleRate) / WINDOW_SIZE;

      // Convert frequency to MIDI note number
      if (freq > 0) {
        const midiNote = 69 + 12 * Math.log2(freq / 440.0);
        const pitchClass = ((Math.round(midiNote) % 12) + 12) % 12;
        chroma[pitchClass] += magnitudes[bin];
      }
    }
  }

  // Normalize chroma vector
  let chromaMax = 0;
  for (let i = 0; i < 12; i++) {
    if (chroma[i] > chromaMax) chromaMax = chroma[i];
  }
  if (chromaMax > 0) {
    for (let i = 0; i < 12; i++) {
      chroma[i] /= chromaMax;
    }
  }

  // Convert to regular array for correlation
  const chromaArr = Array.from(chroma);

  // Compare against all 24 key templates (12 major + 12 minor)
  let bestCorrelation = -Infinity;
  let bestKeyIndex = 0;
  let isMinor = false;
  let secondBestCorrelation = -Infinity;

  for (let root = 0; root < 12; root++) {
    // Major key correlation (rotate profile so root aligns)
    const majorTemplate = new Array(12);
    for (let i = 0; i < 12; i++) {
      majorTemplate[i] = MAJOR_PROFILE[(i - root + 12) % 12];
    }
    const majorCorr = pearsonCorrelation(chromaArr, majorTemplate);

    if (majorCorr > bestCorrelation) {
      secondBestCorrelation = bestCorrelation;
      bestCorrelation = majorCorr;
      bestKeyIndex = root;
      isMinor = false;
    } else if (majorCorr > secondBestCorrelation) {
      secondBestCorrelation = majorCorr;
    }

    // Minor key correlation
    const minorTemplate = new Array(12);
    for (let i = 0; i < 12; i++) {
      minorTemplate[i] = MINOR_PROFILE[(i - root + 12) % 12];
    }
    const minorCorr = pearsonCorrelation(chromaArr, minorTemplate);

    if (minorCorr > bestCorrelation) {
      secondBestCorrelation = bestCorrelation;
      bestCorrelation = minorCorr;
      bestKeyIndex = root;
      isMinor = true;
    } else if (minorCorr > secondBestCorrelation) {
      secondBestCorrelation = minorCorr;
    }
  }

  // Build key name
  const noteName = NOTE_NAMES[bestKeyIndex];
  const keyName = isMinor ? `${noteName}m` : noteName;

  // Get Camelot key
  const camelotKey = isMinor
    ? CAMELOT_MINOR[bestKeyIndex]
    : CAMELOT_MAJOR[bestKeyIndex];

  // Confidence: difference between best and second-best, mapped to 0-1
  // Also factor in absolute correlation strength
  const diff = bestCorrelation - secondBestCorrelation;
  const confidence = Math.min(1, Math.max(0, (diff + 1) / 2));

  return {
    key: keyName,
    camelotKey,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ============================================================================
// Energy Detection
// ============================================================================

/**
 * Detect overall track energy on a 0-1 scale.
 * Algorithm:
 * 1. Compute RMS energy across the track
 * 2. Compute dynamic range (peak - average)
 * 3. Compute spectral centroid (brightness)
 * 4. Combine into 0-1 energy rating
 */
export function detectEnergy(buffer: AudioBuffer): number {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.numberOfChannels > 1
    ? mixToMono(buffer.getChannelData(0), buffer.getChannelData(1))
    : buffer.getChannelData(0).slice();

  // 1. Compute RMS energy
  let sumSquares = 0;
  let peakAmplitude = 0;
  let sumAmplitude = 0;

  for (let i = 0; i < channelData.length; i++) {
    const abs = Math.abs(channelData[i]);
    sumSquares += channelData[i] * channelData[i];
    sumAmplitude += abs;
    if (abs > peakAmplitude) peakAmplitude = abs;
  }

  const rms = Math.sqrt(sumSquares / channelData.length);
  const avgAmplitude = sumAmplitude / channelData.length;

  // Normalize RMS to 0-1 (typical music RMS is 0.05-0.3)
  const rmsNormalized = Math.min(1, rms * 3);

  // 2. Dynamic range: ratio of peak to average
  const dynamicRange = peakAmplitude > 0 ? (peakAmplitude - avgAmplitude) / peakAmplitude : 0;

  // 3. Spectral centroid (brightness indicator)
  // Use a sample of frames for efficiency
  const frameSize = WINDOW_SIZE;
  const numFrames = Math.floor(channelData.length / frameSize);
  const sampleFrames = Math.min(numFrames, 100);
  const frameStep = Math.max(1, Math.floor(numFrames / sampleFrames));

  let totalCentroid = 0;
  let framesAnalyzed = 0;

  for (let f = 0; f < numFrames; f += frameStep) {
    const start = f * frameSize;
    if (start + frameSize > channelData.length) break;

    const frameData = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      frameData[i] = channelData[start + i];
    }

    const [magnitudes] = computeDFT(frameData, Math.floor(frameSize / 2) + 1);

    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let bin = 1; bin < magnitudes.length; bin++) {
      const freq = (bin * sampleRate) / frameSize;
      weightedSum += freq * magnitudes[bin];
      magnitudeSum += magnitudes[bin];
    }

    if (magnitudeSum > 0) {
      totalCentroid += weightedSum / magnitudeSum;
      framesAnalyzed++;
    }
  }

  // Normalize centroid (typical range 500-8000 Hz)
  const avgCentroid = framesAnalyzed > 0 ? totalCentroid / framesAnalyzed : 0;
  const centroidNormalized = Math.min(1, Math.max(0, avgCentroid / 6000));

  // 4. Combine into energy rating
  // Weight: 50% RMS, 20% dynamic range, 30% brightness
  const energy = rmsNormalized * 0.5 + dynamicRange * 0.2 + centroidNormalized * 0.3;

  return Math.round(Math.min(1, Math.max(0, energy)) * 100) / 100;
}

// ============================================================================
// Beat Grid Generation
// ============================================================================

/**
 * Generate beat grid positions in seconds.
 * Algorithm:
 * 1. Find the first strong beat using onset detection on the first 2 seconds
 * 2. Generate beat positions at the detected BPM from that starting point
 * 3. Refine beat positions using local energy peaks
 */
export function generateBeatGrid(buffer: AudioBuffer, bpm: number): number[] {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.numberOfChannels > 1
    ? mixToMono(buffer.getChannelData(0), buffer.getChannelData(1))
    : buffer.getChannelData(0).slice();

  const duration = buffer.duration;
  const beatInterval = 60.0 / bpm;

  // 1. Find the first strong beat in the first 2 seconds
  const analyzeWindow = Math.min(2.0, duration * 0.1);
  const analyzeSamples = Math.floor(analyzeWindow * sampleRate);

  // Compute onset function for the analysis window
  const windowLen = Math.floor(sampleRate * 0.01); // 10ms windows
  const hopLen = Math.floor(windowLen / 2);
  const numFrames = Math.floor((analyzeSamples - windowLen) / hopLen);

  const onsetFunction = new Float32Array(numFrames);
  let prevEnergy = 0;

  for (let i = 0; i < numFrames; i++) {
    const start = i * hopLen;
    let energy = 0;
    for (let j = 0; j < windowLen; j++) {
      if (start + j < channelData.length) {
        energy += channelData[start + j] * channelData[start + j];
      }
    }
    energy = Math.sqrt(energy / windowLen);
    onsetFunction[i] = Math.max(0, energy - prevEnergy);
    prevEnergy = energy;
  }

  // Find the first significant onset (first beat)
  const threshold = 0.1;
  let firstBeatSample = 0;
  for (let i = 0; i < onsetFunction.length; i++) {
    if (onsetFunction[i] > threshold) {
      firstBeatSample = i * hopLen;
      break;
    }
  }

  // If no onset found, assume beat starts at 0
  const firstBeatTime = firstBeatSample / sampleRate;

  // 2. Generate beat grid
  const beatGrid: number[] = [];

  // Generate beats forward from first beat
  let beatTime = firstBeatTime;
  while (beatTime < duration) {
    beatGrid.push(beatTime);
    beatTime += beatInterval;
  }

  // Generate beats backward from first beat (if there's room)
  beatTime = firstBeatTime - beatInterval;
  while (beatTime >= 0) {
    beatGrid.unshift(beatTime);
    beatTime -= beatInterval;
  }

  // 3. Refine beat positions using local energy peaks
  const refineWindow = beatInterval * 0.15; // Search within 15% of beat interval

  for (let i = 0; i < beatGrid.length; i++) {
    const centerSample = Math.floor(beatGrid[i] * sampleRate);
    const windowSamples = Math.floor(refineWindow * sampleRate);
    const startSample = Math.max(0, centerSample - windowSamples);
    const endSample = Math.min(channelData.length - 1, centerSample + windowSamples);

    // Find the peak energy in this window
    let maxEnergy = 0;
    let bestSample = centerSample;
    const analysisStep = Math.floor(sampleRate * 0.005); // 5ms steps

    for (let s = startSample; s < endSample; s += analysisStep) {
      let energy = 0;
      const lookAhead = Math.min(analysisStep, endSample - s);
      for (let j = 0; j < lookAhead; j++) {
        energy += channelData[s + j] * channelData[s + j];
      }
      if (energy > maxEnergy) {
        maxEnergy = energy;
        bestSample = s;
      }
    }

    // Update beat position to nearest energy peak
    beatGrid[i] = bestSample / sampleRate;
  }

  // Sort and remove duplicates
  beatGrid.sort((a, b) => a - b);

  return beatGrid;
}

// ============================================================================
// Waveform Generation
// ============================================================================

/**
 * Generate downsampled waveform data for visualization.
 */
function generateWaveformData(buffer: AudioBuffer, numPoints: number = 2000): number[] {
  const channelData = buffer.numberOfChannels > 1
    ? mixToMono(buffer.getChannelData(0), buffer.getChannelData(1))
    : buffer.getChannelData(0).slice();

  const samplesPerPoint = Math.floor(channelData.length / numPoints);
  const waveform: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const start = i * samplesPerPoint;
    const end = Math.min(start + samplesPerPoint, channelData.length);
    let maxVal = 0;

    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > maxVal) maxVal = abs;
    }

    waveform.push(maxVal);
  }

  return waveform;
}

// ============================================================================
// Full Analysis
// ============================================================================

/**
 * Perform complete audio analysis on a track.
 * Runs BPM, key, energy detection, beat grid generation, and waveform extraction.
 */
export async function analyzeTrack(buffer: AudioBuffer): Promise<{
  bpm: number;
  key: string;
  camelotKey: string;
  keyConfidence: number;
  energy: number;
  beatGrid: number[];
  waveformData: number[];
}> {
  // Run analyses
  const [bpm, keyResult] = await Promise.all([
    detectBPM(buffer),
    detectKey(buffer),
  ]);

  // These are synchronous but depend on other results
  const energy = detectEnergy(buffer);
  const beatGrid = generateBeatGrid(buffer, bpm);
  const waveformData = generateWaveformData(buffer);

  return {
    bpm,
    key: keyResult.key,
    camelotKey: keyResult.camelotKey,
    keyConfidence: keyResult.confidence,
    energy,
    beatGrid,
    waveformData,
  };
}
