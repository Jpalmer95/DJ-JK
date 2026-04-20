import { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Play, Pause, Loader2, ExternalLink, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

// TODO: Set your Freesound.org API key here. Get one at https://freesound.org/apiv2/apply/
const FREESOUND_API_KEY = '';

const FREESOUND_API_BASE = 'https://freesound.org/apiv2';

interface FreesoundSound {
  id: number;
  name: string;
  duration: number;
  username: string;
  tags: string[];
  license: string;
  previews: {
    'preview-lq-mp3': string;
    'preview-hq-mp3': string;
    'preview-lq-ogg': string;
    'preview-hq-ogg': string;
  };
}

interface FreesoundSearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FreesoundSound[];
}

interface FreesoundSearchProps {
  onSoundSelect: (audioUrl: string, soundName: string) => void;
  compact?: boolean;
}

type DurationFilter = 'any' | 'short' | 'medium' | 'long' | 'verylong';
type SortOption = 'score' | 'duration' | 'rating' | 'downloads';

const DURATION_OPTIONS: { value: DurationFilter; label: string; query?: string }[] = [
  { value: 'any', label: 'Any duration' },
  { value: 'short', label: '< 1s', query: 'duration:[* TO 1]' },
  { value: 'medium', label: '1-5s', query: 'duration:[1 TO 5]' },
  { value: 'long', label: '5-30s', query: 'duration:[5 TO 30]' },
  { value: 'verylong', label: '> 30s', query: 'duration:[30 TO *]' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'score', label: 'Relevance' },
  { value: 'duration', label: 'Duration' },
  { value: 'rating', label: 'Rating' },
  { value: 'downloads', label: 'Downloads' },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getLicenseShort(license: string): string {
  if (license.includes('CC0')) return 'CC0';
  if (license.includes('CC BY')) {
    if (license.includes('4.0')) return 'CC BY 4.0';
    if (license.includes('3.0')) return 'CC BY 3.0';
    return 'CC BY';
  }
  if (license.includes('Sampling')) return 'Sampling+';
  if (license.includes('public')) return 'Public Domain';
  return license.slice(0, 20);
}

function SoundCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

function SoundCard({
  sound,
  isPlaying,
  isLoading,
  onPlay,
  onStop,
  onSelect,
}: {
  sound: FreesoundSound;
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onStop: () => void;
  onSelect: () => void;
}) {
  const previewUrl = sound.previews['preview-lq-mp3'];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-8 w-8 flex-shrink-0 border-zinc-700',
            isPlaying && 'bg-blue-600/20 border-blue-500 text-blue-400'
          )}
          onClick={isPlaying ? onStop : onPlay}
          disabled={isLoading || !previewUrl}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-200 truncate">{sound.name}</h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            <span>{formatDuration(sound.duration)}</span>
            <span className="text-zinc-700">|</span>
            <span>{sound.username}</span>
            <span className="text-zinc-700">|</span>
            <span
              className="px-1.5 py-0.5 rounded bg-zinc-800"
              title={sound.license}
            >
              {getLicenseShort(sound.license)}
            </span>
          </div>
          {sound.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {sound.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-400"
                >
                  {tag}
                </span>
              ))}
              {sound.tags.length > 5 && (
                <span className="text-[10px] text-zinc-600">
                  +{sound.tags.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        <Button
          size="sm"
          className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={onSelect}
          disabled={!previewUrl}
        >
          <Music className="h-3.5 w-3.5 mr-1" />
          Load
        </Button>
      </div>
    </div>
  );
}

function NoApiKeyMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-zinc-800 p-4 mb-4">
        <Search className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-300 mb-2">
        Freesound API Key Required
      </h3>
      <p className="text-sm text-zinc-500 max-w-sm mb-4">
        To search and import sounds from Freesound.org, you need to set your
        API key.
      </p>
      <div className="bg-zinc-900 rounded-lg p-4 text-left max-w-md w-full border border-zinc-800">
        <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
          <li>
            Apply for an API key at{' '}
            <a
              href="https://freesound.org/apiv2/apply/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              freesound.org/apiv2/apply
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            Open{' '}
            <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
              FreesoundSearch.tsx
            </code>
          </li>
          <li>
            Set the{' '}
            <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
              FREESOUND_API_KEY
            </code>{' '}
            constant
          </li>
        </ol>
      </div>
    </div>
  );
}

export function FreesoundSearch({ onSoundSelect, compact = false }: FreesoundSearchProps) {
  const [query, setQuery] = useState('');
  const [duration, setDuration] = useState<DurationFilter>('any');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [results, setResults] = useState<FreesoundSound[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingSoundId, setPlayingSoundId] = useState<number | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<number | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const searchSounds = useCallback(async () => {
    if (!FREESOUND_API_KEY) return;
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    // Stop any playing preview
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingSoundId(null);
    }

    try {
      const params = new URLSearchParams({
        query: query.trim(),
        token: FREESOUND_API_KEY,
        fields: 'id,name,duration,username,tags,license,previews',
        page_size: compact ? '8' : '15',
        sort: sortBy,
      });

      const durationFilter = DURATION_OPTIONS.find((d) => d.value === duration);
      if (durationFilter?.query) {
        params.set('filter', durationFilter.query);
      }

      const response = await fetch(
        `${FREESOUND_API_BASE}/search/text/?${params.toString()}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your Freesound API key.');
        }
        throw new Error(`Search failed (${response.status})`);
      }

      const data: FreesoundSearchResponse = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, duration, sortBy, compact]);

  const handlePlayPreview = useCallback((sound: FreesoundSound) => {
    const url = sound.previews['preview-lq-mp3'];
    if (!url) return;

    // If already playing this sound, pause it
    if (playingSoundId === sound.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingSoundId(null);
      return;
    }

    // Stop previous audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Create and play new audio
    const audio = new Audio(url);
    audioRef.current = audio;
    setLoadingPreviewId(sound.id);

    audio.addEventListener('canplaythrough', () => {
      setLoadingPreviewId(null);
      audio.play();
      setPlayingSoundId(sound.id);
    });

    audio.addEventListener('ended', () => {
      setPlayingSoundId(null);
    });

    audio.addEventListener('error', () => {
      setLoadingPreviewId(null);
      setPlayingSoundId(null);
    });

    // Start loading
    audio.load();
  }, [playingSoundId]);

  const handleStopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingSoundId(null);
    }
  }, []);

  const handleSelect = useCallback((sound: FreesoundSound) => {
    const previewUrl = sound.previews['preview-lq-mp3'];
    if (previewUrl) {
      // Stop any playing preview
      handleStopPreview();
      onSoundSelect(previewUrl, sound.name);
    }
  }, [onSoundSelect, handleStopPreview]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        searchSounds();
      }
    },
    [searchSounds]
  );

  if (!FREESOUND_API_KEY) {
    return <NoApiKeyMessage />;
  }

  return (
    <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-3')}>
      {/* Search bar and filters */}
      <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-3')}>
        <div className="flex gap-2">
          <Input
            placeholder="Search Freesound.org..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
          />
          <Button
            onClick={searchSounds}
            disabled={isLoading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={duration} onValueChange={(v) => setDuration(v as DurationFilter)}>
            <SelectTrigger className="flex-1 h-8 bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-zinc-300 text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="flex-1 h-8 bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {SORT_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-zinc-300 text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results area */}
      <div className="flex-1 min-h-0">
        {/* Loading skeleton */}
        {isLoading && (
          <div className={cn('flex flex-col gap-2')}>
            {Array.from({ length: compact ? 3 : 5 }).map((_, i) => (
              <SoundCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className={cn('flex flex-col gap-2 overflow-y-auto', compact ? 'max-h-64' : 'max-h-96')}>
            {results.map((sound) => (
              <SoundCard
                key={sound.id}
                sound={sound}
                isPlaying={playingSoundId === sound.id}
                isLoading={loadingPreviewId === sound.id}
                onPlay={() => handlePlayPreview(sound)}
                onStop={handleStopPreview}
                onSelect={() => handleSelect(sound)}
              />
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && hasSearched && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-500">No sounds found</p>
            <p className="text-xs text-zinc-600">Try a different search term or adjust filters</p>
          </div>
        )}

        {/* Initial state */}
        {!hasSearched && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400">
              Search millions of free sounds
            </p>
            <p className="text-xs text-zinc-600">
              from Freesound.org
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
