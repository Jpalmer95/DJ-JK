import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { MOOD_DATABASE, getMoodColor } from '@/lib/moodMapping';
import { 
  TrendingUp, 
  Calendar, 
  Brain, 
  Heart, 
  Activity,
  Target,
  Award,
  Zap,
  Sun,
  Moon
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns';

interface MoodJourneyTrackerProps {
  userId: number;
}

interface MoodTransitionRecord {
  id: string;
  userId: number;
  currentMood: string;
  desiredMood: string;
  transitionType: string;
  generatedTrackId?: string;
  createdAt: string;
}

interface MoodInsight {
  type: 'pattern' | 'improvement' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface MoodStats {
  totalTransitions: number;
  mostCommonFromMood: string;
  mostCommonToMood: string;
  preferredTransitionStyle: string;
  weeklyProgress: number;
  currentStreak: number;
}

// Therapeutic insights generator
class TherapeuticInsightsEngine {
  static generateInsights(transitions: MoodTransitionRecord[]): MoodInsight[] {
    const insights: MoodInsight[] = [];
    
    if (transitions.length === 0) {
      return [{
        type: 'recommendation',
        title: 'Start Your Emotional Journey',
        description: 'Try your first mood transition to begin understanding your emotional patterns.',
        icon: <Sun className="w-5 h-5" />,
        color: '#F5A623'
      }];
    }

    // Pattern analysis
    const moodCounts = this.analyzeMoodPatterns(transitions);
    const recentTransitions = transitions.filter(t => 
      isThisWeek(parseISO(t.createdAt))
    );

    // Achievement insights
    if (transitions.length >= 10) {
      insights.push({
        type: 'achievement',
        title: 'Emotional Explorer',
        description: `You've completed ${transitions.length} mood transitions! Your dedication to emotional wellness is inspiring.`,
        icon: <Award className="w-5 h-5" />,
        color: '#7ED321'
      });
    }

    // Progress insights
    if (recentTransitions.length > 0) {
      const negativeToPositive = recentTransitions.filter(t => 
        this.getMoodValence(t.currentMood) < 50 && 
        this.getMoodValence(t.desiredMood) > 50
      ).length;
      
      if (negativeToPositive > 0) {
        insights.push({
          type: 'improvement',
          title: 'Positive Progress',
          description: `This week you've successfully transitioned from challenging emotions ${negativeToPositive} times. Great work on emotional self-care!`,
          icon: <TrendingUp className="w-5 h-5" />,
          color: '#50E3C2'
        });
      }
    }

    // Pattern insights
    if (moodCounts.mostCommon.from) {
      const fromMood = moodCounts.mostCommon.from;
      const recommendation = this.getMoodRecommendation(fromMood);
      
      insights.push({
        type: 'pattern',
        title: 'Mood Pattern Detected',
        description: `You often start from ${fromMood}. ${recommendation}`,
        icon: <Brain className="w-5 h-5" />,
        color: '#BD10E0'
      });
    }

    // Wellness recommendations
    insights.push(...this.generateWellnessRecommendations(transitions));

    return insights;
  }

  private static analyzeMoodPatterns(transitions: MoodTransitionRecord[]) {
    const fromMoods: Record<string, number> = {};
    const toMoods: Record<string, number> = {};
    const transitionTypes: Record<string, number> = {};

    transitions.forEach(t => {
      fromMoods[t.currentMood] = (fromMoods[t.currentMood] || 0) + 1;
      toMoods[t.desiredMood] = (toMoods[t.desiredMood] || 0) + 1;
      transitionTypes[t.transitionType] = (transitionTypes[t.transitionType] || 0) + 1;
    });

    return {
      mostCommon: {
        from: Object.entries(fromMoods).sort(([,a], [,b]) => b - a)[0]?.[0],
        to: Object.entries(toMoods).sort(([,a], [,b]) => b - a)[0]?.[0],
        type: Object.entries(transitionTypes).sort(([,a], [,b]) => b - a)[0]?.[0]
      },
      counts: { fromMoods, toMoods, transitionTypes }
    };
  }

  private static getMoodValence(mood: string): number {
    return MOOD_DATABASE[mood]?.valence || 50;
  }

  private static getMoodRecommendation(mood: string): string {
    const recommendations: Record<string, string> = {
      'stressed': 'Consider regular relaxation techniques like deep breathing or meditation.',
      'anxious': 'Grounding exercises and mindfulness practices might be helpful.',
      'sad': 'Remember that sadness is natural - gentle activities like nature walks can help.',
      'angry': 'Physical activities or creative expression can be healthy outlets.',
      'neutral': 'This is a great starting point for exploring different emotional states.',
    };
    
    return recommendations[mood] || 'Every emotional state has value in your journey.';
  }

  private static generateWellnessRecommendations(transitions: MoodTransitionRecord[]): MoodInsight[] {
    const recent = transitions.slice(-5);
    const recommendations: MoodInsight[] = [];

    // Check for stress patterns
    const stressfulTransitions = recent.filter(t => 
      ['stressed', 'anxious', 'angry'].includes(t.currentMood)
    );

    if (stressfulTransitions.length >= 3) {
      recommendations.push({
        type: 'recommendation',
        title: 'Self-Care Reminder',
        description: 'You\'ve been managing some challenging emotions. Consider adding regular relaxation time to your routine.',
        icon: <Heart className="w-5 h-5" />,
        color: '#FF6B6B'
      });
    }

    // Positive reinforcement
    const positiveTransitions = recent.filter(t => 
      ['happy', 'energetic', 'calm', 'focused'].includes(t.desiredMood)
    );

    if (positiveTransitions.length >= 2) {
      recommendations.push({
        type: 'recommendation',
        title: 'Positive Momentum',
        description: 'You\'re building healthy emotional habits! Keep exploring positive mood states.',
        icon: <Zap className="w-5 h-5" />,
        color: '#4ECDC4'
      });
    }

    return recommendations;
  }
}

function MoodTimeline({ transitions }: { transitions: MoodTransitionRecord[] }) {
  const recentTransitions = transitions.slice(-10).reverse();
  
  if (recentTransitions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Your mood journey will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recentTransitions.map((transition, index) => {
        const date = parseISO(transition.createdAt);
        const timeLabel = isToday(date) ? 'Today' : 
                         isYesterday(date) ? 'Yesterday' : 
                         format(date, 'MMM d');
        
        return (
          <div key={transition.id} className="flex items-center space-x-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div 
                className="w-3 h-3 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: getMoodColor(transition.currentMood) }}
              />
              {index < recentTransitions.length - 1 && (
                <div className="w-0.5 h-8 bg-gradient-to-b from-gray-300 to-transparent mt-1" />
              )}
            </div>
            
            {/* Transition info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium capitalize">{transition.currentMood}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-sm font-medium capitalize">{transition.desiredMood}</span>
                </div>
                <span className="text-xs text-gray-500">{timeLabel}</span>
              </div>
              
              <Badge variant="outline" className="text-xs">
                {transition.transitionType}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WellnessInsights({ insights }: { insights: MoodInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => (
        <Card 
          key={index} 
          className={`border-l-4 ${
            insight.type === 'achievement' ? 'border-l-green-400 bg-green-50' :
            insight.type === 'improvement' ? 'border-l-blue-400 bg-blue-50' :
            insight.type === 'pattern' ? 'border-l-purple-400 bg-purple-50' :
            'border-l-orange-400 bg-orange-50'
          }`}
        >
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <div 
                className="p-2 rounded-full"
                style={{ backgroundColor: `${insight.color}20`, color: insight.color }}
              >
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-800">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MoodStats({ stats }: { stats: MoodStats }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
        <div className="text-2xl font-bold text-blue-700">{stats.totalTransitions}</div>
        <div className="text-xs text-blue-600 font-medium">Total Transitions</div>
      </div>
      
      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
        <div className="text-2xl font-bold text-green-700">{stats.currentStreak}</div>
        <div className="text-xs text-green-600 font-medium">Day Streak</div>
      </div>
      
      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg col-span-2">
        <div className="text-sm font-medium text-purple-700 capitalize">
          {stats.mostCommonFromMood || 'No data'} → {stats.mostCommonToMood || 'No data'}
        </div>
        <div className="text-xs text-purple-600 font-medium">Most Common Journey</div>
      </div>
    </div>
  );
}

export default function MoodJourneyTracker({ userId }: MoodJourneyTrackerProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  // Fetch mood transitions
  const { data: transitions = [], isLoading, error } = useQuery({
    queryKey: ['/api/mood-transitions', userId],
    queryFn: () => apiRequest(`/api/mood-transitions?userId=${userId}`),
    enabled: !!userId,
  });

  // Calculate insights and stats
  const insights = TherapeuticInsightsEngine.generateInsights(transitions);
  
  const stats: MoodStats = {
    totalTransitions: transitions.length,
    mostCommonFromMood: transitions.reduce((acc, t) => {
      acc[t.currentMood] = (acc[t.currentMood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    mostCommonToMood: transitions.reduce((acc, t) => {
      acc[t.desiredMood] = (acc[t.desiredMood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    preferredTransitionStyle: transitions.reduce((acc, t) => {
      acc[t.transitionType] = (acc[t.transitionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    weeklyProgress: Math.min(100, (transitions.filter(t => isThisWeek(parseISO(t.createdAt))).length / 7) * 100),
    currentStreak: calculateCurrentStreak(transitions)
  };

  // Transform stats for display
  const displayStats = {
    ...stats,
    mostCommonFromMood: Object.entries(stats.mostCommonFromMood).sort(([,a], [,b]) => b - a)[0]?.[0] || '',
    mostCommonToMood: Object.entries(stats.mostCommonToMood).sort(([,a], [,b]) => b - a)[0]?.[0] || '',
    preferredTransitionStyle: Object.entries(stats.preferredTransitionStyle).sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <Brain className="w-8 h-8 mx-auto mb-2" />
            <p>Unable to load mood journey data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 border-0">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Brain className="w-6 h-6 mr-3 text-purple-600" />
            Mood Journey Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MoodStats stats={displayStats} />
        </CardContent>
      </Card>

      {/* Wellness Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Heart className="w-5 h-5 mr-2 text-pink-600" />
            Wellness Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WellnessInsights insights={insights} />
        </CardContent>
      </Card>

      {/* Recent Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Activity className="w-5 h-5 mr-2 text-blue-600" />
            Recent Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MoodTimeline transitions={transitions} />
        </CardContent>
      </Card>

      {/* Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Target className="w-5 h-5 mr-2 text-green-600" />
            This Week's Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Emotional Self-Care Sessions</span>
              <span>{transitions.filter(t => isThisWeek(parseISO(t.createdAt))).length}/7</span>
            </div>
            <Progress value={displayStats.weeklyProgress} className="h-2" />
            <p className="text-xs text-gray-600">
              {displayStats.weeklyProgress >= 100 ? 
                'Excellent! You\'re staying consistent with your emotional wellness.' :
                displayStats.weeklyProgress >= 50 ?
                'Great progress! Keep up the emotional self-care routine.' :
                'Every step counts in your emotional wellness journey.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to calculate streak
function calculateCurrentStreak(transitions: MoodTransitionRecord[]): number {
  if (transitions.length === 0) return 0;
  
  const sortedTransitions = transitions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  for (const transition of sortedTransitions) {
    const transitionDate = new Date(transition.createdAt);
    transitionDate.setHours(0, 0, 0, 0);
    
    const diffInDays = Math.floor((currentDate.getTime() - transitionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays <= streak + 1) {
      if (diffInDays === streak) {
        streak++;
      }
    } else {
      break;
    }
  }
  
  return streak;
}