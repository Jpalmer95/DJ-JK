import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DJDeck, KeyInfo } from '@/lib/djAudio';
import { Music, Lock, Unlock, Zap, Edit2, Check, X } from 'lucide-react';

interface BPMDisplayProps {
  deck: DJDeck;
  otherDeck?: DJDeck;
  className?: string;
}

export default function BPMDisplay({ deck, otherDeck, className = '' }: BPMDisplayProps) {
  const [currentBpm, setCurrentBpm] = useState<number>(120);
  const [detectedBpm, setDetectedBpm] = useState<number>(120);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [otherKeyInfo, setOtherKeyInfo] = useState<KeyInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  useEffect(() => {
    // Set up BPM detection callback
    deck.onBpmDetected((bpm) => {
      setDetectedBpm(bpm);
      setCurrentBpm(bpm);
      setIsAnalyzing(false);
    });
    
    // Set up key detection callback
    deck.onKeyDetected((key) => {
      setKeyInfo(key);
    });
    
    // Set up other deck key tracking
    if (otherDeck) {
      otherDeck.onKeyDetected((key) => {
        setOtherKeyInfo(key);
      });
      
      // Initialize from current state
      const otherAnalysis = otherDeck.getAnalysisState();
      setOtherKeyInfo(otherAnalysis.keyInfo);
    }
    
    // Update current BPM when track loads
    if (deck.trackInfo?.bpm) {
      setCurrentBpm(deck.trackInfo.bpm);
    } else if (deck.detectedBpm) {
      setCurrentBpm(deck.detectedBpm);
      setDetectedBpm(deck.detectedBpm);
    }
    
    // Get current analysis state
    const analysisState = deck.getAnalysisState();
    setIsAnalyzing(analysisState.isAnalyzing);
    setKeyInfo(analysisState.keyInfo);
  }, [deck, deck.trackInfo]);
  
  const handleBpmEdit = () => {
    if (!isEditing) {
      setEditValue(currentBpm.toString());
      setIsEditing(true);
    }
  };
  
  const handleBpmSave = () => {
    const newBpm = parseFloat(editValue);
    if (newBpm >= 60 && newBpm <= 200) {
      deck.setBPM(newBpm);
      setCurrentBpm(newBpm);
    }
    setIsEditing(false);
  };
  
  const handleBpmCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };
  
  const handleSync = () => {
    if (otherDeck && otherDeck.trackInfo) {
      deck.syncTo(otherDeck);
      // Update display to show synced BPM
      const syncedBpm = otherDeck.detectedBpm || otherDeck.bpm;
      setCurrentBpm(syncedBpm);
    }
  };
  
  const handleUnsync = () => {
    deck.unsync();
  };
  
  const calculateBpmDifference = (): number => {
    if (!otherDeck || !otherDeck.trackInfo) return 0;
    const otherBpm = otherDeck.detectedBpm || otherDeck.bpm;
    return ((currentBpm - otherBpm) / otherBpm) * 100;
  };
  
  const getBpmCompatibilityColor = (difference: number): string => {
    const abs = Math.abs(difference);
    if (abs <= 2) return 'text-green-500';
    if (abs <= 5) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getKeyCompatibility = (): { compatible: boolean; reason: string } => {
    if (!keyInfo || !otherKeyInfo) {
      return { compatible: false, reason: 'No key data' };
    }
    
    const thisKey = keyInfo.camelot;
    const otherKey = otherKeyInfo.camelot;
    
    if (!thisKey || !otherKey) {
      return { compatible: false, reason: 'No key data' };
    }
    
    // Parse Camelot notation (e.g., "8A", "12B")
    const parseKey = (key: string) => {
      const match = key.match(/(\d+)([AB])/);
      if (!match) return null;
      return { number: parseInt(match[1]), letter: match[2] };
    };
    
    const thisParsed = parseKey(thisKey);
    const otherParsed = parseKey(otherKey);
    
    if (!thisParsed || !otherParsed) {
      return { compatible: false, reason: 'Invalid key format' };
    }
    
    // Camelot wheel compatibility rules:
    // 1. Same key (perfect match)
    // 2. Adjacent numbers with same letter (e.g., 8A -> 9A)
    // 3. Same number, different letter (relative major/minor)
    // 4. Energy boost: +1 number and switch letter (e.g., 8A -> 9B)
    // 5. Energy drop: -1 number and switch letter (e.g., 9B -> 8A)
    
    const sameKey = thisKey === otherKey;
    const sameNumber = thisParsed.number === otherParsed.number;
    const sameLetter = thisParsed.letter === otherParsed.letter;
    
    // Calculate number distance (handle wrap around at 12/1)
    const numberDiff = Math.abs(thisParsed.number - otherParsed.number);
    const wrappedDiff = Math.min(numberDiff, 12 - numberDiff);
    const adjacentNumbers = wrappedDiff === 1;
    
    let compatible = false;
    let reason = '';
    
    if (sameKey) {
      compatible = true;
      reason = 'Perfect match';
    } else if (sameNumber && !sameLetter) {
      compatible = true;
      reason = 'Relative major/minor';
    } else if (adjacentNumbers && sameLetter) {
      compatible = true;
      reason = 'Adjacent harmony';
    } else if (adjacentNumbers && !sameLetter) {
      // Energy transition
      const isEnergyBoost = (thisParsed.letter === 'A' && otherParsed.letter === 'B' && 
                            ((otherParsed.number === thisParsed.number + 1) || 
                             (thisParsed.number === 12 && otherParsed.number === 1)));
      const isEnergyDrop = (thisParsed.letter === 'B' && otherParsed.letter === 'A' && 
                           ((thisParsed.number === otherParsed.number + 1) || 
                            (otherParsed.number === 12 && thisParsed.number === 1)));
      
      if (isEnergyBoost || isEnergyDrop) {
        compatible = true;
        reason = isEnergyBoost ? 'Energy boost' : 'Energy drop';
      } else {
        compatible = false;
        reason = 'Key clash';
      }
    } else {
      compatible = false;
      reason = 'Key clash';
    }
    
    return { compatible, reason };
  };
  
  const bpmDifference = calculateBpmDifference();
  const keyCompatibility = getKeyCompatibility();
  
  return (
    <Card className={`glass-panel neon-border ${className}`}>
      <CardContent className="p-4 space-y-4">
        {/* BPM Display */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Music className="w-4 h-4 text-cyan-400/60" />
            <span className="text-sm text-cyan-400/60 uppercase tracking-wide">BPM</span>
            {deck.syncState.isSynced && (
              <Zap className="w-4 h-4 text-blue-400" title="Synced" />
            )}
          </div>
          
          {isAnalyzing ? (
            <div className="text-2xl font-mono text-magenta-400 animate-pulse neon-text-magenta">
              ANALYZING...
            </div>
          ) : isEditing ? (
            <div className="flex items-center space-x-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-20 text-center bg-black/30 border-white/10"
                type="number"
                min="60"
                max="200"
                step="0.1"
                data-testid={`input-bpm-${deck.id.toLowerCase().replace(' ', '-')}`}
              />
              <Button
                size="sm"
                onClick={handleBpmSave}
                className="bg-green-600 hover:bg-green-700"
                data-testid={`button-bpm-save-${deck.id.toLowerCase().replace(' ', '-')}`}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBpmCancel}
                className="border-white/10"
                data-testid={`button-bpm-cancel-${deck.id.toLowerCase().replace(' ', '-')}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div 
              className="text-4xl font-mono font-bold neon-text-cyan cursor-pointer hover:text-white transition-colors"
              onClick={handleBpmEdit}
              data-testid={`text-bpm-${deck.id.toLowerCase().replace(' ', '-')}`}
            >
              {currentBpm.toFixed(1)}
            </div>
          )}
          
          {!isEditing && !isAnalyzing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleBpmEdit}
              className="text-xs text-white/40 hover:text-white"
              data-testid={`button-bpm-edit-${deck.id.toLowerCase().replace(' ', '-')}`}
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
        
        {/* Detection Info */}
        {detectedBpm !== currentBpm && (
          <div className="text-center text-xs text-white/40">
            Detected: {detectedBpm.toFixed(1)} BPM
          </div>
        )}
        
        {/* Sync Controls */}
        {otherDeck && otherDeck.trackInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Sync</span>
              {deck.syncState.isSynced ? (
                <Button
                  size="sm"
                  onClick={handleUnsync}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid={`button-unsync-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  <Unlock className="w-3 h-3 mr-1" />
                  Synced
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  className="border-white/10 text-white/60 hover:bg-black/30"
                  data-testid={`button-sync-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  <Lock className="w-3 h-3 mr-1" />
                  Sync
                </Button>
              )}
            </div>
            
            {/* BPM Difference Indicator */}
            <div className="text-center">
              <div className={`text-xs font-mono ${getBpmCompatibilityColor(bpmDifference)}`}>
                {bpmDifference > 0 ? '+' : ''}{bpmDifference.toFixed(1)}%
              </div>
              <div className="text-xs text-white/30">
                vs Other Deck
              </div>
            </div>
          </div>
        )}
        
        {/* Key Information */}
        {keyInfo && (
          <div className="space-y-2">
            <div className="text-center">
              <div className="text-xs text-white/40 mb-1">Key</div>
              <div className="flex items-center justify-center space-x-2">
                <Badge 
                  variant="outline" 
                  className="bg-black/30 border-white/10 text-white"
                  data-testid={`badge-key-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  {keyInfo.detected}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="bg-purple-900 border-purple-600 text-purple-200"
                  data-testid={`badge-camelot-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  {keyInfo.camelot}
                </Badge>
              </div>
            </div>
            
            {/* Harmonic Compatibility */}
            {otherDeck && (
              <div className="text-center">
                <Badge
                  variant={keyCompatibility.compatible ? "default" : "destructive"}
                  className={keyCompatibility.compatible 
                    ? "bg-green-900 border-green-600 text-green-200" 
                    : "bg-red-900 border-red-600 text-red-200"
                  }
                  data-testid={`badge-key-compatibility-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  {keyCompatibility.reason}
                </Badge>
              </div>
            )}
          </div>
        )}
        
        {/* Pitch Rate Display */}
        <div className="text-center">
          <div className="text-xs text-white/40 mb-1">Pitch</div>
          <div className="text-sm font-mono text-white">
            {deck.getPitchPercentage() > 0 ? '+' : ''}{deck.getPitchPercentage().toFixed(1)}%
          </div>
          {deck.keyLock && (
            <div className="text-xs text-blue-400 mt-1">
              <Lock className="w-3 h-3 inline mr-1" />
              Key Lock
            </div>
          )}
        </div>
        
        {/* Beat Position Indicator */}
        <div className="text-center">
          <div className="text-xs text-white/40 mb-1">Beat</div>
          <div className="text-lg font-mono text-green-400" data-testid={`text-beat-${deck.id.toLowerCase().replace(' ', '-')}`}>
            {deck.currentBeat || 1}
          </div>
          <div className="w-full bg-white/10 rounded-full h-1 mt-1">
            <div 
              className="bg-green-400 h-1 rounded-full transition-all duration-75"
              style={{ 
                width: `${((deck.currentBeat % deck.beatsPerBar) / deck.beatsPerBar) * 100}%` 
              }}
            />
          </div>
        </div>
        
        {/* Track End Warning */}
        {deck.isNearTrackEnd() && (
          <div className="text-center">
            <Badge variant="destructive" className="animate-pulse">
              Track Ending!
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}