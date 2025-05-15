import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Music, Share2, Play } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader className="flex justify-between items-center flex-row">
          <DialogTitle className="text-xl font-bold font-poppins text-gray-800">Welcome to Music Studio!</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-5 text-gray-600">
          <DialogDescription asChild>
            <div className="space-y-5">
              <div className="flex items-start">
                <Music className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-blue-600" />
                <div>
                  <h3 className="font-medium text-gray-800 mb-1">Create Music</h3>
                  <p className="text-sm">Tap on any tile to play notes. Choose from different instrument sounds: Piano, Synth, Chiptune, and Funk!</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Play className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-green-600" />
                <div>
                  <h3 className="font-medium text-gray-800 mb-1">Record & Playback</h3>
                  <p className="text-sm">Record your creations and play them back. Enable background beats for extra rhythm.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Share2 className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-purple-600" />
                <div>
                  <h3 className="font-medium text-gray-800 mb-1">Share Your Music</h3>
                  <p className="text-sm">Share your musical creations with friends via a unique link. They can listen to your composition exactly as you created it!</p>
                </div>
              </div>
            </div>
          </DialogDescription>
        </div>
        
        <Button 
          className="w-full mt-4 bg-blue-600 text-white hover:bg-blue-700"
          onClick={onClose}
        >
          Let's Make Music!
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;
