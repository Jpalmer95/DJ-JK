import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-dark-gradient bg-grid-pattern">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto neon-glow-magenta">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold neon-text-magenta">404</h1>
        <p className="text-white/40 text-sm">Page not found</p>
        <Link href="/">
          <Button className="bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/30">
            Back to Studio
          </Button>
        </Link>
      </div>
    </div>
  );
}
