import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, X, Share2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { encodeRecording } from "@/lib/audio";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  recording: {
    notes: { noteIndex: number; time: number }[];
    soundMode: string;
    beatPattern: string;
  } | null;
}

const ShareModal = ({ isOpen, onClose, recording }: ShareModalProps) => {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Generate a shareable link
  const handleGenerateLink = async () => {
    if (!recording || recording.notes.length === 0) {
      toast({
        title: "No recording to share",
        description: "Please create a recording first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Encode the recording
      const encodedRecording = encodeRecording({
        notes: recording.notes,
        soundMode: recording.soundMode as any,
        beatPattern: recording.beatPattern as any
      });
      
      // Save to server to get a link
      const response = await apiRequest<{ id: string; shareUrl: string }>('/api/share', {
        method: 'POST',
        body: JSON.stringify({ recording: encodedRecording }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response && response.shareUrl) {
        setShareUrl(response.shareUrl);
      }
      toast({
        title: "Link generated!",
        description: "Your recording is ready to share.",
      });
    } catch (error) {
      console.error('Error sharing recording:', error);
      toast({
        title: "Could not generate link",
        description: "There was an error creating your share link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Copy link to clipboard
  const handleCopyLink = () => {
    if (!shareUrl) return;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Copied!",
        description: "Link copied to clipboard.",
      });
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader className="flex justify-between items-center flex-row">
          <DialogTitle className="text-xl font-bold font-poppins text-gray-800">Share Your Music</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <DialogDescription className="text-center text-gray-600 text-sm">
          {recording?.notes.length ? 
            `Share your ${recording.notes.length} note creation with friends!` : 
            "Create a recording first to share it with others."
          }
        </DialogDescription>
        
        <div className="space-y-4 my-4">
          {shareUrl ? (
            <div className="flex items-center space-x-2">
              <Input 
                value={shareUrl} 
                readOnly 
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button 
              className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center"
              onClick={handleGenerateLink}
              disabled={isLoading || !recording?.notes.length}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Generate Share Link
            </Button>
          )}
        </div>
        
        {shareUrl && (
          <div className="text-xs text-gray-500 text-center">
            Anyone with this link can play your creation!
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;