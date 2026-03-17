import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mic, 
  MicOff, 
  Square, 
  Pause, 
  Play, 
  Settings, 
  Clock, 
  Activity,
  Disc,
  Volume2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { SessionRecordingEngine, RecordingState, LevelMeterData, formatRecordingDuration, getLevelColor, RECORDING_QUALITIES } from '@/lib/sessionRecording';
import { AutomationCaptureEngine } from '@/lib/automationCapture';
import { DJMixer } from '@/lib/djAudio';
import { cn } from '@/lib/utils';

interface SessionRecorderProps {
  mixer: DJMixer;
  onSessionComplete?: (sessionData: any) => void;
  className?: string;
}

interface RecordingConfig {
  title: string;
  description: string;
  tags: string[];
  qualityId: string;
  enableMasterTrack: boolean;
  enableDeckTracks: boolean;
  enableEffectsProcessing: boolean;
  autoGainControl: boolean;
  targetLevel: number;
}

// Level meter component for real-time audio monitoring
interface LevelMeterProps {
  trackId: string;
  trackName: string;
  levelData?: LevelMeterData;
  className?: string;
}

const LevelMeter = ({ trackId, trackName, levelData, className }: LevelMeterProps) => {
  const peakRef = useRef<HTMLDivElement>(null);
  const rmsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!levelData || !peakRef.current || !rmsRef.current) return;
    
    const peakHeight = Math.max(levelData.peak * 100, 2);
    const rmsHeight = Math.max(levelData.rms * 100, 1);
    
    // Update visual meters
    peakRef.current.style.height = `${peakHeight}%`;
    rmsRef.current.style.height = `${rmsHeight}%`;
    
    // Update colors based on level
    const color = getLevelColor(levelData.peakDb);
    peakRef.current.style.backgroundColor = color;
    rmsRef.current.style.backgroundColor = color;
  }, [levelData]);
  
  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      <div className="text-xs font-medium text-center">{trackName}</div>
      
      {/* Visual level meter */}
      <div className="relative w-8 h-32 bg-black/40 rounded border border-white/10">
        {/* Peak meter */}
        <div 
          ref={peakRef}
          className="absolute bottom-0 w-full bg-green-500 rounded transition-all duration-75"
          style={{ height: '2%' }}
        />
        {/* RMS meter */}
        <div 
          ref={rmsRef}
          className="absolute bottom-0 w-3/4 left-1/2 transform -translate-x-1/2 bg-green-400 opacity-75 rounded transition-all duration-150"
          style={{ height: '1%' }}
        />
        
        {/* Scale markers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-full h-px bg-red-500 opacity-50" style={{ top: '2%' }}>
            <span className="absolute right-0 -top-2 text-xs text-red-400">0dB</span>
          </div>
          <div className="absolute w-full h-px bg-yellow-500 opacity-50" style={{ top: '25%' }}>
            <span className="absolute right-0 -top-2 text-xs text-yellow-400">-6</span>
          </div>
          <div className="absolute w-full h-px bg-green-500 opacity-50" style={{ top: '50%' }}>
            <span className="absolute right-0 -top-2 text-xs text-green-400">-12</span>
          </div>
          <div className="absolute w-full h-px bg-white/20 opacity-50" style={{ top: '75%' }}>
            <span className="absolute right-0 -top-2 text-xs text-white/40">-18</span>
          </div>
        </div>
        
        {/* Clipping indicator */}
        {levelData?.isClipping && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
        )}
      </div>
      
      {/* Numeric display */}
      <div className="text-xs text-center space-y-1">
        <div className="text-white">
          {levelData ? `${levelData.peakDb.toFixed(1)}dB` : '--dB'}
        </div>
        <div className="text-white/40">
          {levelData ? `${levelData.rmsDb.toFixed(1)}` : '--'}
        </div>
      </div>
    </div>
  );
};

export const SessionRecorder = ({ mixer, onSessionComplete, className }: SessionRecorderProps) => {
  // Recording engine instances
  const [recordingEngine] = useState(() => new SessionRecordingEngine(mixer));
  const [automationEngine] = useState(() => new AutomationCaptureEngine(mixer));
  
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [levelData, setLevelData] = useState<LevelMeterData[]>([]);
  
  // Configuration state
  const [config, setConfig] = useState<RecordingConfig>({
    title: '',
    description: '',
    tags: [],
    qualityId: 'standard',
    enableMasterTrack: true,
    enableDeckTracks: false,
    enableEffectsProcessing: true,
    autoGainControl: true,
    targetLevel: -12
  });
  
  // UI state
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  
  // Initialize recording engine callbacks
  useEffect(() => {
    recordingEngine.onStateChange(setRecordingState);
    recordingEngine.onLevelUpdate(setLevelData);
    recordingEngine.onRecordingProgress(setRecordingDuration);
    
    recordingEngine.onRecordingComplete((session) => {
      console.log('Recording completed:', session);
      onSessionComplete?.(session);
    });
    
    recordingEngine.onError((error) => {
      console.error('Recording error:', error);
      // TODO: Show error toast
    });
    
    return () => {
      recordingEngine.destroy();
      automationEngine.destroy();
    };
  }, [recordingEngine, automationEngine, onSessionComplete]);
  
  // Update recording engine configuration when config changes
  useEffect(() => {
    const quality = RECORDING_QUALITIES.find(q => q.id === config.qualityId) || RECORDING_QUALITIES[1];
    
    recordingEngine.updateConfig({
      quality,
      enableMasterTrack: config.enableMasterTrack,
      enableDeckTracks: config.enableDeckTracks,
      enableEffectsProcessing: config.enableEffectsProcessing,
      autoGainControl: config.autoGainControl,
      targetLevel: config.targetLevel
    });
  }, [config, recordingEngine]);
  
  // Handle recording controls
  const handleStartRecording = async () => {
    if (recordingState !== 'idle') return;
    
    try {
      // Start automation capture
      automationEngine.startCapture(recordingEngine);
      
      // Start recording
      await recordingEngine.startRecording(config.title || 'DJ Session');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };
  
  const handlePauseRecording = () => {
    if (recordingState === 'recording') {
      recordingEngine.pauseRecording();
    } else if (recordingState === 'paused') {
      recordingEngine.resumeRecording();
    }
  };
  
  const handleStopRecording = async () => {
    if (recordingState === 'recording' || recordingState === 'paused') {
      // Stop automation capture
      const automationEvents = automationEngine.stopCapture();
      
      // Stop recording
      const session = await recordingEngine.stopRecording();
      
      if (session) {
        // Add automation data to session
        const sessionWithAutomation = {
          ...session,
          automationEvents,
          config: config
        };
        
        onSessionComplete?.(sessionWithAutomation);
      }
    }
  };
  
  // Handle tag management
  const handleAddTag = () => {
    if (tagInput.trim() && !config.tags.includes(tagInput.trim())) {
      setConfig(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setConfig(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  // Get recording button props based on state
  const getRecordingButtonProps = () => {
    switch (recordingState) {
      case 'idle':
        return {
          icon: Mic,
          label: 'Start Recording',
          variant: 'default' as const,
          disabled: false,
          onClick: handleStartRecording
        };
      case 'recording':
        return {
          icon: Square,
          label: 'Stop Recording',
          variant: 'destructive' as const,
          disabled: false,
          onClick: handleStopRecording
        };
      case 'paused':
        return {
          icon: Square,
          label: 'Stop Recording',
          variant: 'destructive' as const,
          disabled: false,
          onClick: handleStopRecording
        };
      case 'processing':
        return {
          icon: Activity,
          label: 'Processing...',
          variant: 'secondary' as const,
          disabled: true,
          onClick: () => {}
        };
      default:
        return {
          icon: MicOff,
          label: 'Error',
          variant: 'secondary' as const,
          disabled: true,
          onClick: () => {}
        };
    }
  };
  
  const recordingButtonProps = getRecordingButtonProps();
  const ButtonIcon = recordingButtonProps.icon;
  
  // Get current quality settings
  const currentQuality = RECORDING_QUALITIES.find(q => q.id === config.qualityId) || RECORDING_QUALITIES[1];
  
  return (
    <Card className={cn("w-full", className)} data-testid="session-recorder">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Disc className="w-5 h-5" />
            <span>Session Recorder</span>
            {recordingState === 'recording' && (
              <div className="flex items-center space-x-1 text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-normal">REC</span>
              </div>
            )}
          </CardTitle>
          
          {/* Recording status */}
          <div className="flex items-center space-x-2">
            {recordingState !== 'idle' && (
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4" />
                <span className="font-mono">
                  {formatRecordingDuration(recordingDuration)}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfigExpanded(!isConfigExpanded)}
              data-testid="toggle-recorder-config"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={recordingButtonProps.variant}
            size="lg"
            disabled={recordingButtonProps.disabled}
            onClick={recordingButtonProps.onClick}
            className="min-w-[140px]"
            data-testid="button-record"
          >
            <ButtonIcon className="w-5 h-5 mr-2" />
            {recordingButtonProps.label}
          </Button>
          
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handlePauseRecording}
              data-testid="button-pause"
            >
              {recordingState === 'recording' ? (
                <Pause className="w-5 h-5 mr-2" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {recordingState === 'recording' ? 'Pause' : 'Resume'}
            </Button>
          )}
        </div>
        
        {/* Level Meters */}
        {recordingState !== 'idle' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4" />
              <span className="text-sm font-medium">Recording Levels</span>
            </div>
            
            <div className="flex items-end justify-center space-x-6 p-4 bg-black/50 rounded-lg">
              {config.enableMasterTrack && (
                <LevelMeter
                  trackId="master"
                  trackName="Master"
                  levelData={levelData.find(d => d.trackId === 'master')}
                />
              )}
              {config.enableDeckTracks && (
                <>
                  <LevelMeter
                    trackId="deckA"
                    trackName="Deck A"
                    levelData={levelData.find(d => d.trackId === 'deckA')}
                  />
                  <LevelMeter
                    trackId="deckB"
                    trackName="Deck B"
                    levelData={levelData.find(d => d.trackId === 'deckB')}
                  />
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Configuration Panel */}
        {isConfigExpanded && (
          <div className="space-y-6 p-4 bg-black/40 rounded-lg">
            {/* Session Metadata */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Session Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-title">Session Title</Label>
                  <Input
                    id="session-title"
                    placeholder="Enter session title..."
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-session-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="recording-quality">Recording Quality</Label>
                  <Select
                    value={config.qualityId}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, qualityId: value }))}
                  >
                    <SelectTrigger id="recording-quality" data-testid="select-recording-quality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECORDING_QUALITIES.map(quality => (
                        <SelectItem key={quality.id} value={quality.id}>
                          {quality.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="session-description">Description</Label>
                <Textarea
                  id="session-description"
                  placeholder="Describe your session..."
                  value={config.description}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  data-testid="textarea-session-description"
                />
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="session-tags">Tags</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="session-tags"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    data-testid="input-session-tags"
                  />
                  <Button size="sm" onClick={handleAddTag} data-testid="button-add-tag">
                    Add
                  </Button>
                </div>
                {config.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                        data-testid={`tag-${tag}`}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Recording Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Recording Settings</h3>
              
              {/* Track Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="master-track">Master Track Recording</Label>
                  <Switch
                    id="master-track"
                    checked={config.enableMasterTrack}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableMasterTrack: checked }))}
                    data-testid="switch-master-track"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="deck-tracks">Individual Deck Tracks</Label>
                  <Switch
                    id="deck-tracks"
                    checked={config.enableDeckTracks}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableDeckTracks: checked }))}
                    data-testid="switch-deck-tracks"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="effects-processing">Include Effects Processing</Label>
                  <Switch
                    id="effects-processing"
                    checked={config.enableEffectsProcessing}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableEffectsProcessing: checked }))}
                    data-testid="switch-effects-processing"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-gain">Automatic Gain Control</Label>
                  <Switch
                    id="auto-gain"
                    checked={config.autoGainControl}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoGainControl: checked }))}
                    data-testid="switch-auto-gain"
                  />
                </div>
              </div>
              
              {/* Advanced Settings */}
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="text-sm"
                  data-testid="toggle-advanced-settings"
                >
                  Advanced Settings {showAdvancedSettings ? '▲' : '▼'}
                </Button>
                
                {showAdvancedSettings && (
                  <div className="space-y-3 p-3 bg-black/30 rounded">
                    <div className="space-y-2">
                      <Label htmlFor="target-level">Target Level (dB)</Label>
                      <Select
                        value={config.targetLevel.toString()}
                        onValueChange={(value) => setConfig(prev => ({ ...prev, targetLevel: parseInt(value) }))}
                      >
                        <SelectTrigger id="target-level" data-testid="select-target-level">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-6">-6 dB (Hot)</SelectItem>
                          <SelectItem value="-12">-12 dB (Recommended)</SelectItem>
                          <SelectItem value="-18">-18 dB (Conservative)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Quality Information */}
                    <div className="text-xs text-white/40 space-y-1">
                      <div>Format: {currentQuality.mimeType}</div>
                      <div>Sample Rate: {currentQuality.sampleRate / 1000}kHz</div>
                      <div>Bit Depth: {currentQuality.bitDepth}-bit</div>
                      <div>Channels: {currentQuality.channels === 2 ? 'Stereo' : 'Mono'}</div>
                      {currentQuality.bitrate && (
                        <div>Bitrate: {currentQuality.bitrate / 1000}kbps</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Recording Status */}
        {recordingState !== 'idle' && (
          <div className="flex items-center justify-center space-x-2 text-sm">
            {recordingState === 'recording' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">Recording in progress</span>
              </>
            )}
            {recordingState === 'paused' && (
              <>
                <Pause className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-600 dark:text-yellow-400">Recording paused</span>
              </>
            )}
            {recordingState === 'processing' && (
              <>
                <Activity className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-blue-600 dark:text-blue-400">Processing recording...</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};