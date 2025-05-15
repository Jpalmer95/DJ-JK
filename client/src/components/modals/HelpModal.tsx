import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader className="flex justify-between items-center flex-row">
          <DialogTitle className="text-xl font-bold font-poppins text-gray-800">How to Play</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4 text-gray-600">
          <DialogDescription asChild>
            <div className="space-y-4">
              <p>Tap on any tile to play a piano note. Each tile produces a different sound.</p>
              <p>Experiment with different combinations to create your own music!</p>
              <p>The grid is responsive and works on all devices.</p>
            </div>
          </DialogDescription>
        </div>
        
        <Button 
          className="w-full mt-4 bg-blue-600 text-white hover:bg-blue-700"
          onClick={onClose}
        >
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;
