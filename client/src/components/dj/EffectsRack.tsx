import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import EffectKnob from './EffectKnob';
import { DJDeck } from '@/lib/djAudio';
import { BaseEffect, EffectFactory } from '@/lib/audioEffects';
import { 
  Plus, 
  X, 
  Power, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  GripVertical, 
  Zap,
  Volume2,
  VolumeX
} from 'lucide-react';

interface EffectsRackProps {
  deck: DJDeck;
  deckLabel: string;
  className?: string;
  maxEffects?: number;
  showEQ?: boolean;
  'data-testid'?: string;
}

interface EffectSlotState {
  effect: BaseEffect | null;
  expanded: boolean;
  bypassed: boolean;
}

export default function EffectsRack({
  deck,
  deckLabel,
  className,
  maxEffects = 6,
  showEQ = true,
  'data-testid': testId
}: EffectsRackProps) {
  const [effectSlots, setEffectSlots] = useState<EffectSlotState[]>(
    Array(maxEffects).fill(null).map(() => ({
      effect: null,
      expanded: false,
      bypassed: false
    }))
  );
  
  const [isAddingEffect, setIsAddingEffect] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [masterBypass, setMasterBypass] = useState(false);
  
  // Available effect types
  const availableEffects = EffectFactory.getAvailableEffects().filter(type => 
    !showEQ || type !== 'ThreeBandEQ' // Exclude EQ if it's shown separately
  );
  
  // Get current effects from deck
  const getCurrentEffects = useCallback(() => {
    return deck.getEffects();
  }, [deck]);
  
  // Add effect to slot
  const addEffectToSlot = (slotIndex: number, effectType: string) => {
    try {
      const effect = deck.addEffect(effectType, `${effectType}_${Date.now()}`);
      
      setEffectSlots(prev => {
        const newSlots = [...prev];
        if (newSlots[slotIndex].effect) {
          // Remove existing effect if slot is occupied
          deck.removeEffect(newSlots[slotIndex].effect!.id);
        }
        newSlots[slotIndex] = {
          effect,
          expanded: true,
          bypassed: false
        };
        return newSlots;
      });
      
      setIsAddingEffect(false);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Failed to add effect:', error);
    }
  };
  
  // Remove effect from slot
  const removeEffectFromSlot = (slotIndex: number) => {
    const slot = effectSlots[slotIndex];
    if (slot.effect) {
      deck.removeEffect(slot.effect.id);
      
      setEffectSlots(prev => {
        const newSlots = [...prev];
        newSlots[slotIndex] = {
          effect: null,
          expanded: false,
          bypassed: false
        };
        return newSlots;
      });
    }
  };
  
  // Toggle effect bypass
  const toggleEffectBypass = (slotIndex: number) => {
    const slot = effectSlots[slotIndex];
    if (slot.effect) {
      const newBypass = !slot.bypassed;
      deck.setEffectBypass(slot.effect.id, newBypass);
      
      setEffectSlots(prev => {
        const newSlots = [...prev];
        newSlots[slotIndex].bypassed = newBypass;
        return newSlots;
      });
    }
  };
  
  // Toggle effect panel expansion
  const toggleEffectExpansion = (slotIndex: number) => {
    setEffectSlots(prev => {
      const newSlots = [...prev];
      newSlots[slotIndex].expanded = !newSlots[slotIndex].expanded;
      return newSlots;
    });
  };
  
  // Update effect parameter
  const updateEffectParameter = (slotIndex: number, parameterName: string, value: number) => {
    const slot = effectSlots[slotIndex];
    if (slot.effect) {
      deck.setEffectParameter(slot.effect.id, parameterName, value);
    }
  };
  
  // Master bypass toggle
  const toggleMasterBypass = () => {
    const newBypass = !masterBypass;
    deck.setEffectsEnabled(!newBypass);
    setMasterBypass(newBypass);
  };
  
  // Clear all effects
  const clearAllEffects = () => {
    deck.clearAllEffects();
    setEffectSlots(prev => 
      prev.map(() => ({
        effect: null,
        expanded: false,
        bypassed: false
      }))
    );
  };
  
  // Get effect type display name
  const getEffectDisplayName = (effectType: string): string => {
    const nameMap: Record<string, string> = {
      'ThreeBandEQ': '3-Band EQ',
      'Filter': 'Filter',
      'Reverb': 'Reverb',
      'Delay': 'Delay',
      'Distortion': 'Distortion',
      'Phaser': 'Phaser',
      'Flanger': 'Flanger',
      'Bitcrusher': 'Bitcrusher'
    };
    return nameMap[effectType] || effectType;
  };
  
  // Get effect type color
  const getEffectColor = (effectType: string): string => {
    const colorMap: Record<string, string> = {
      'ThreeBandEQ': 'bg-blue-600',
      'Filter': 'bg-purple-600',
      'Reverb': 'bg-green-600',
      'Delay': 'bg-orange-600',
      'Distortion': 'bg-red-600',
      'Phaser': 'bg-yellow-600',
      'Flanger': 'bg-pink-600',
      'Bitcrusher': 'bg-indigo-600'
    };
    return colorMap[effectType] || 'bg-gray-600';
  };
  
  // Render effect parameters
  const renderEffectParameters = (effect: BaseEffect, slotIndex: number) => {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg">
        {Object.entries(effect.parameters).map(([paramName, param]) => (
          <div key={paramName} className="flex flex-col items-center">
            <EffectKnob
              value={param.value}
              min={param.min}
              max={param.max}
              defaultValue={param.default}
              label={param.name}
              unit={param.unit}
              size="sm"
              color="blue"
              onChange={(value) => updateEffectParameter(slotIndex, paramName, value)}
              data-testid={`knob-${effect.id}-${paramName}`}
            />
          </div>
        ))}
      </div>
    );
  };
  
  // Render effect slot
  const renderEffectSlot = (slot: EffectSlotState, slotIndex: number) => {
    const isEmpty = !slot.effect;
    
    return (
      <Card 
        key={slotIndex}
        className={cn(
          'transition-all duration-200',
          isEmpty 
            ? 'bg-gray-800 border-gray-700 border-dashed' 
            : 'bg-gray-900 border-gray-600',
          slot.bypassed && 'opacity-50'
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            {isEmpty ? (
              <div className="flex items-center space-x-2">
                <GripVertical className="w-4 h-4 text-gray-600" />
                <span className="text-gray-500 text-sm">Empty Slot {slotIndex + 1}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                <Badge className={cn('text-xs', getEffectColor(slot.effect!.effectType))}>
                  {getEffectDisplayName(slot.effect!.effectType)}
                </Badge>
                <span className="text-gray-300 text-sm font-medium">
                  Slot {slotIndex + 1}
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              {!isEmpty && (
                <>
                  {/* Bypass Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'p-1 h-auto',
                      slot.bypassed 
                        ? 'text-red-400 hover:text-red-300' 
                        : 'text-green-400 hover:text-green-300'
                    )}
                    onClick={() => toggleEffectBypass(slotIndex)}
                    data-testid={`button-bypass-slot-${slotIndex}`}
                  >
                    {slot.bypassed ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  
                  {/* Expand/Collapse Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto text-gray-400 hover:text-gray-300"
                    onClick={() => toggleEffectExpansion(slotIndex)}
                    data-testid={`button-expand-slot-${slotIndex}`}
                  >
                    {slot.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  
                  {/* Remove Effect */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto text-gray-400 hover:text-red-400"
                    onClick={() => removeEffectFromSlot(slotIndex)}
                    data-testid={`button-remove-slot-${slotIndex}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              {/* Add Effect */}
              {isEmpty && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-gray-400 hover:text-blue-400"
                  onClick={() => {
                    setSelectedSlot(slotIndex);
                    setIsAddingEffect(true);
                  }}
                  data-testid={`button-add-slot-${slotIndex}`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {!isEmpty && slot.expanded && (
          <CardContent className="pt-0">
            {renderEffectParameters(slot.effect!, slotIndex)}
          </CardContent>
        )}
        
        {isEmpty && (
          <CardContent className="pt-0">
            <div className="text-center text-gray-500 text-sm py-4">
              Click + to add an effect
            </div>
          </CardContent>
        )}
      </Card>
    );
  };
  
  return (
    <div className={cn('space-y-4', className)} data-testid={testId}>
      {/* Effects Rack Header */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-blue-400" />
              <span className="text-white">{deckLabel} Effects Rack</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Master Bypass */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'border-2 font-bold transition-all',
                  masterBypass
                    ? 'bg-red-600 border-red-500 text-white shadow-red-500/50 shadow-md'
                    : 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                )}
                onClick={toggleMasterBypass}
                data-testid={`button-master-bypass-${deckLabel.toLowerCase()}`}
              >
                <Power className="w-4 h-4 mr-1" />
                {masterBypass ? 'BYPASSED' : 'ACTIVE'}
              </Button>
              
              {/* Clear All */}
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-400"
                onClick={clearAllEffects}
                data-testid={`button-clear-all-${deckLabel.toLowerCase()}`}
              >
                Clear All
              </Button>
              
              {/* Settings */}
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-300"
                data-testid={`button-settings-${deckLabel.toLowerCase()}`}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>
      
      {/* Effect Slots */}
      <div className="space-y-3">
        {effectSlots.map((slot, index) => renderEffectSlot(slot, index))}
      </div>
      
      {/* Add Effect Modal */}
      <Sheet open={isAddingEffect} onOpenChange={setIsAddingEffect}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Effect to Slot {(selectedSlot || 0) + 1}</SheetTitle>
            <SheetDescription>
              Choose an effect to add to your effects chain.
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {availableEffects.map(effectType => (
              <Card 
                key={effectType}
                className="cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => selectedSlot !== null && addEffectToSlot(selectedSlot, effectType)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={cn('text-xs', getEffectColor(effectType))}>
                        {getEffectDisplayName(effectType)}
                      </Badge>
                      <span className="font-medium text-gray-200">
                        {getEffectDisplayName(effectType)}
                      </span>
                    </div>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    {/* Add effect descriptions */}
                    {effectType === 'Filter' && 'High/Low pass filter with resonance control'}
                    {effectType === 'Reverb' && 'Room, hall, and plate reverb effects'}
                    {effectType === 'Delay' && 'Echo effect with feedback and sync options'}
                    {effectType === 'Distortion' && 'Overdrive and saturation effects'}
                    {effectType === 'Phaser' && 'Classic phaser effect with LFO modulation'}
                    {effectType === 'Flanger' && 'Jet-like whoosh effect with feedback'}
                    {effectType === 'Bitcrusher' && 'Digital distortion and sample rate reduction'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Rack Status */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-400">
                Effects: {effectSlots.filter(slot => slot.effect).length}/{maxEffects}
              </span>
              <span className="text-gray-400">
                Active: {effectSlots.filter(slot => slot.effect && !slot.bypassed).length}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* CPU indicator placeholder */}
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400">CPU OK</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}