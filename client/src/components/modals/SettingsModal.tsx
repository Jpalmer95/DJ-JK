import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  volume: number;
  animationsEnabled: boolean;
  themeColor: string;
  onSave: (volume: number, animationsEnabled: boolean, themeColor: string) => void;
}

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  volume: initialVolume, 
  animationsEnabled: initialAnimationsEnabled,
  themeColor: initialThemeColor,
  onSave 
}: SettingsModalProps) => {
  const [volume, setVolume] = useState(initialVolume);
  const [animationsEnabled, setAnimationsEnabled] = useState(initialAnimationsEnabled);
  const [themeColor, setThemeColor] = useState(initialThemeColor);
  
  const handleSave = () => {
    onSave(volume, animationsEnabled, themeColor);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader className="flex justify-between items-center flex-row">
          <DialogTitle className="text-xl font-bold font-poppins text-gray-800">Settings</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="volume-slider" className="block text-sm font-medium text-gray-700">
              Sound Volume
            </Label>
            <Slider 
              id="volume-slider"
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="block text-sm font-medium text-gray-700">
              Color Theme
            </Label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                className={`w-10 h-10 bg-blue-500 rounded-full ${themeColor === 'blue' ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                onClick={() => setThemeColor('blue')}
                aria-label="Blue theme"
              />
              <button
                type="button"
                className={`w-10 h-10 bg-purple-500 rounded-full ${themeColor === 'purple' ? 'ring-2 ring-offset-2 ring-purple-500' : ''}`}
                onClick={() => setThemeColor('purple')}
                aria-label="Purple theme"
              />
              <button
                type="button"
                className={`w-10 h-10 bg-pink-500 rounded-full ${themeColor === 'pink' ? 'ring-2 ring-offset-2 ring-pink-500' : ''}`}
                onClick={() => setThemeColor('pink')}
                aria-label="Pink theme"
              />
              <button
                type="button"
                className={`w-10 h-10 bg-green-500 rounded-full ${themeColor === 'green' ? 'ring-2 ring-offset-2 ring-green-500' : ''}`}
                onClick={() => setThemeColor('green')}
                aria-label="Green theme"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="animations-toggle"
              checked={animationsEnabled}
              onCheckedChange={setAnimationsEnabled}
            />
            <Label htmlFor="animations-toggle" className="text-gray-700">
              Enable animations
            </Label>
          </div>
        </div>
        
        <Button 
          className="w-full mt-4 bg-blue-600 text-white hover:bg-blue-700"
          onClick={handleSave}
        >
          Save Settings
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
