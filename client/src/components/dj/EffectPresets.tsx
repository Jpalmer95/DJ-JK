import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DJDeck } from '@/lib/djAudio';
import { EffectPreset } from '@/lib/audioEffects';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Save, 
  FolderOpen, 
  Star, 
  StarOff, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Play, 
  Search,
  Filter,
  RefreshCw,
  Settings,
  BookOpen,
  Zap
} from 'lucide-react';

interface EffectPresetsProps {
  deck: DJDeck;
  deckLabel: string;
  className?: string;
  'data-testid'?: string;
}

interface PresetWithMetadata extends EffectPreset {
  category: string;
  description?: string;
  author?: string;
  isFavorite: boolean;
  lastUsed?: Date;
  useCount: number;
  tags: string[];
}

interface PresetCategory {
  id: string;
  name: string;
  color: string;
  description: string;
}

export default function EffectPresets({
  deck,
  deckLabel,
  className,
  'data-testid': testId
}: EffectPresetsProps) {
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetWithMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'lastUsed' | 'useCount'>('name');
  
  // Save dialog state
  const [saveForm, setSaveForm] = useState({
    name: '',
    category: '',
    description: '',
    tags: ''
  });
  
  const { toast } = useToast();
  
  // For demo purposes, using userId 1 - in real app this would come from auth context
  const userId = 1;
  
  // Fetch effect presets from API
  const { data: presets = [], isLoading: presetsLoading, error: presetsError } = useQuery({
    queryKey: ['/api/effect-presets', userId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/effect-presets?userId=${userId}`);
        if (!res.ok) {
          console.warn('Effect presets API not available, using empty array');
          return [];
        }
        return res.json();
      } catch (error) {
        console.warn('Effect presets API error, using empty array:', error);
        return [];
      }
    },
  });
  
  // Fetch effect categories from API
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/effect-categories'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/effect-categories');
        if (!res.ok) {
          console.warn('Effect categories API not available, using empty array');
          return [];
        }
        return res.json();
      } catch (error) {
        console.warn('Effect categories API error, using empty array:', error);
        return [];
      }
    },
  });
  
  // Mutation to save new preset
  const savePresetMutation = useMutation({
    mutationFn: (newPreset: any) => apiRequest('/api/effect-presets', {
      method: 'POST',
      body: JSON.stringify(newPreset),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/effect-presets', userId] });
      setIsSaveDialogOpen(false);
      setSaveForm({ name: '', category: '', description: '', tags: '' });
      toast({
        title: "Preset Saved",
        description: "Your effect preset has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Failed to save preset:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save the preset. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update preset usage
  const updatePresetUsageMutation = useMutation({
    mutationFn: (presetId: string) => apiRequest(`/api/effect-presets/${presetId}/use`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/effect-presets', userId] });
    },
  });
  
  // Mutation to update preset
  const updatePresetMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => apiRequest(`/api/effect-presets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/effect-presets', userId] });
      setIsEditDialogOpen(false);
      toast({
        title: "Preset Updated",
        description: "Your effect preset has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Failed to update preset:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update the preset. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete preset
  const deletePresetMutation = useMutation({
    mutationFn: (presetId: string) => apiRequest(`/api/effect-presets/${presetId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/effect-presets', userId] });
      toast({
        title: "Preset Deleted",
        description: "The preset has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error('Failed to delete preset:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the preset. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Filter and sort presets
  const filteredPresets = (Array.isArray(presets) ? presets : [])
    .filter((preset: PresetWithMetadata) => {
      const matchesSearch = preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           preset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           preset.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || preset.category === selectedCategory;
      const matchesFavorites = !showFavoritesOnly || preset.isFavorite;
      
      return matchesSearch && matchesCategory && matchesFavorites;
    })
    .sort((a: PresetWithMetadata, b: PresetWithMetadata) => {
      switch (sortBy) {
        case 'lastUsed':
          return (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0);
        case 'useCount':
          return b.useCount - a.useCount;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  
  // Save current deck effects as preset
  const saveCurrentAsPreset = () => {
    if (!saveForm.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the preset.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Get current effects chain state from deck
      const effectsChain = deck.effectsChain.getEffectsConfig();
      
      const newPreset = {
        userId,
        categoryId: saveForm.category || 'custom',
        name: saveForm.name,
        description: saveForm.description,
        effectsChain: effectsChain, // JSON array of effect configurations
        tags: saveForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        isPublic: false,
        isFavorite: false,
      };
      
      savePresetMutation.mutate(newPreset);
      
    } catch (error) {
      console.error('Error preparing preset data:', error);
      toast({
        title: "Save Failed",
        description: "Failed to prepare preset data. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Load preset
  const loadPreset = (preset: any) => {
    try {
      // Load the effects chain configuration to the deck
      if (preset.effectsChain && Array.isArray(preset.effectsChain)) {
        deck.effectsChain.loadEffectsConfig(preset.effectsChain);
      }
      
      // Update usage statistics on server
      updatePresetUsageMutation.mutate(preset.id);
      
      toast({
        title: "Preset Loaded",
        description: `"${preset.name}" has been loaded to ${deckLabel}.`,
      });
      
      setIsPresetsOpen(false);
      
    } catch (error) {
      console.error('Error loading preset:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load preset. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Toggle favorite
  const toggleFavorite = (presetId: string) => {
    const preset = presets.find((p: PresetWithMetadata) => p.id === presetId);
    if (!preset) return;
    
    updatePresetMutation.mutate({
      id: presetId,
      updates: { isFavorite: !preset.isFavorite }
    });
  };
  
  // Delete preset
  const deletePreset = (presetId: string) => {
    deletePresetMutation.mutate(presetId);
  };
  
  // Export preset
  const exportPreset = (preset: PresetWithMetadata) => {
    const dataStr = JSON.stringify(preset, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${preset.name.replace(/\s+/g, '_')}.djpreset`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    toast({
      title: "Preset Exported",
      description: `"${preset.name}" has been exported successfully.`,
    });
  };
  
  // Import preset
  const importPreset = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const preset = JSON.parse(e.target?.result as string) as PresetWithMetadata;
        preset.id = `imported_${Date.now()}`;
        preset.author = `${preset.author} (Imported)`;
        
        queryClient.invalidateQueries({ queryKey: ['/api/effect-presets', userId] });
        
        toast({
          title: "Preset Imported",
          description: `"${preset.name}" has been imported successfully.`,
        });
        
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid preset file format.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };
  
  // Get category info
  const getCategoryInfo = (categoryId: string) => {
    return categories.find((cat: PresetCategory) => cat.id === categoryId) || categories[0];
  };
  
  // Render preset card
  const renderPresetCard = (preset: PresetWithMetadata) => {
    const categoryInfo = getCategoryInfo(preset.category);
    
    return (
      <Card 
        key={preset.id}
        className="cursor-pointer hover:bg-black/30 transition-colors group"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Badge className={cn('text-xs', categoryInfo.color)}>
                {categoryInfo.name}
              </Badge>
              {preset.isFavorite && (
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
              )}
            </div>
            
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(preset.id);
                }}
                data-testid={`button-favorite-${preset.id}`}
              >
                {preset.isFavorite ? (
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                ) : (
                  <StarOff className="w-3 h-3 text-white/40" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  exportPreset(preset);
                }}
                data-testid={`button-export-${preset.id}`}
              >
                <Download className="w-3 h-3 text-white/40" />
              </Button>
              
              {preset.author === 'User' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePreset(preset.id);
                  }}
                  data-testid={`button-delete-${preset.id}`}
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              )}
            </div>
          </div>
          
          <h3 className="font-semibold text-white/70 mb-1">{preset.name}</h3>
          
          {preset.description && (
            <p className="text-sm text-white/40 mb-2">{preset.description}</p>
          )}
          
          {preset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {preset.tags.map(tag => (
                <span 
                  key={tag}
                  className="text-xs bg-white/10 text-white/60 px-1 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-white/30">
            <span>by {preset.author}</span>
            <div className="flex items-center space-x-2">
              {preset.useCount > 0 && (
                <span>Used {preset.useCount}x</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-blue-400 hover:text-blue-300"
                onClick={() => loadPreset(preset)}
                data-testid={`button-load-${preset.id}`}
              >
                <Play className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className={cn('flex items-center space-x-2', className)} data-testid={testId}>
      {/* Quick Load Button */}
      <Sheet open={isPresetsOpen} onOpenChange={setIsPresetsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-white/60 hover:border-blue-500 hover:text-blue-400"
            data-testid={`button-presets-${deckLabel.toLowerCase()}`}
          >
            <BookOpen className="w-4 h-4 mr-1" />
            Presets
          </Button>
        </SheetTrigger>
        
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-blue-400" />
              <span>Effect Presets - {deckLabel}</span>
            </SheetTitle>
            <SheetDescription>
              Load saved effect configurations or create new presets from your current settings.
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                  <Input
                    placeholder="Search presets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-preset-search"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    showFavoritesOnly ? 'bg-yellow-600 border-yellow-500' : 'border-white/10'
                  )}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  data-testid="button-favorites-filter"
                >
                  <Star className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category: PresetCategory) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger data-testid="select-sort">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="lastUsed">Last Used</SelectItem>
                    <SelectItem value="useCount">Most Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-600 text-green-400 hover:bg-green-900"
                      data-testid="button-save-preset"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save Current
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Effect Preset</DialogTitle>
                      <DialogDescription>
                        Save your current effect configuration as a preset for later use.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="preset-name">Preset Name *</Label>
                        <Input
                          id="preset-name"
                          value={saveForm.name}
                          onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter preset name..."
                          data-testid="input-preset-name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="preset-category">Category</Label>
                        <Select value={saveForm.category} onValueChange={(value) => setSaveForm(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category: PresetCategory) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="preset-description">Description</Label>
                        <Input
                          id="preset-description"
                          value={saveForm.description}
                          onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Optional description..."
                          data-testid="input-preset-description"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="preset-tags">Tags</Label>
                        <Input
                          id="preset-tags"
                          value={saveForm.tags}
                          onChange={(e) => setSaveForm(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="comma, separated, tags"
                          data-testid="input-preset-tags"
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsSaveDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveCurrentAsPreset}
                        data-testid="button-save-confirm"
                      >
                        Save Preset
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <label>
                  <input
                    type="file"
                    accept=".djpreset,.json"
                    onChange={importPreset}
                    className="hidden"
                    data-testid="input-import-preset"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-600 text-blue-400 hover:bg-blue-900"
                    asChild
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Import
                  </Button>
                </label>
              </div>
              
              <span className="text-sm text-white/40">
                {filteredPresets.length} presets
              </span>
            </div>
            
            {/* Presets Grid */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredPresets.length > 0 ? (
                  filteredPresets.map(renderPresetCard)
                ) : (
                  <div className="text-center py-8 text-white/30">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No presets found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Quick Save Button */}
      <Button
        variant="outline"
        size="sm"
        className="border-green-600 text-green-400 hover:bg-green-900"
        onClick={() => setIsSaveDialogOpen(true)}
        data-testid={`button-quick-save-${deckLabel.toLowerCase()}`}
      >
        <Save className="w-4 h-4" />
      </Button>
    </div>
  );
}