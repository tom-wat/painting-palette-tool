import React from 'react';
import { Card, CardContent } from '../ui';
import { cn } from '@/lib/cn';
import { PaletteAnalysis, BrightnessCategory } from '@/lib/brightness-analysis';

interface BrightnessAnalysisProps {
  analysis: PaletteAnalysis | null;
  className?: string;
}

export default function BrightnessAnalysis({
  analysis,
  className = '',
}: BrightnessAnalysisProps) {
  if (!analysis || analysis.colors.length === 0) {
    return null;
  }

  const { distribution, statistics, harmony } = analysis;

  const getCategoryLabel = (category: BrightnessCategory): string => {
    switch (category) {
      case 'very-dark': return 'Very Dark';
      case 'dark': return 'Dark';
      case 'medium-dark': return 'Medium Dark';
      case 'medium': return 'Medium';
      case 'medium-light': return 'Medium Light';
      case 'light': return 'Light';
      case 'very-light': return 'Very Light';
      default: return 'Unknown';
    }
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <Card className={className}>
      <CardContent>
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Brightness Analysis</h3>
          
          {/* Color Categories */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Color Categories</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {analysis.colors.map((color, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 p-2 bg-muted rounded-md text-sm"
                >
                  <div
                    className="w-4 h-4 rounded border border-input"
                    style={{
                      backgroundColor: `rgb(${color.color.r}, ${color.color.g}, ${color.color.b})`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {getCategoryLabel(color.category)}
                    </div>
                    <div className="text-muted-foreground">
                      {Math.round(color.brightness * 100)}%
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {color.wcagLevel}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Brightness Distribution</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {formatPercentage(distribution.dark)}
                </div>
                <div className="text-sm text-muted-foreground">Dark</div>
                <div className="text-xs text-muted-foreground">(0-20%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {formatPercentage(distribution.medium)}
                </div>
                <div className="text-sm text-muted-foreground">Medium</div>
                <div className="text-xs text-muted-foreground">(20-70%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {formatPercentage(distribution.light)}
                </div>
                <div className="text-sm text-muted-foreground">Light</div>
                <div className="text-xs text-muted-foreground">(70-100%)</div>
              </div>
            </div>
            
            {/* Histogram */}
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">Brightness Histogram</div>
              <div className="flex items-end space-x-1 h-20">
                {distribution.histogram.map((value, index) => (
                  <div
                    key={index}
                    // Tokens rather than hexes — the bars have to invert with
                    // the theme like the rest of the panel.
                    className={cn(
                      'flex-1 rounded-t',
                      value > 0.1 ? 'bg-foreground' : 'bg-border'
                    )}
                    style={{ height: `${Math.max(value * 100, 2)}%` }}
                    title={`${Math.round(index * 10)}-${Math.round((index + 1) * 10)}%: ${formatPercentage(value)}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Mean</div>
                <div className="font-semibold">{Math.round(statistics.mean * 100)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Median</div>
                <div className="font-semibold">{Math.round(statistics.median * 100)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Std Dev</div>
                <div className="font-semibold">{Math.round(statistics.standardDeviation * 100)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Range</div>
                <div className="font-semibold">{Math.round(statistics.range * 100)}%</div>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="text-sm">
                <span className="text-muted-foreground">Dominant Tone: </span>
                <span className="font-semibold capitalize">{statistics.dominantTone}</span>
              </div>
            </div>
          </div>

          {/* Harmony Analysis */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Color Harmony</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Harmony Score</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${harmony.harmonyScore * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold">{Math.round(harmony.harmonyScore * 100)}%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className={`p-2 rounded ${harmony.isMonochromatic ? 'bg-foreground text-primary-foreground' : 'bg-muted'}`}>
                  Monochromatic
                </div>
                <div className={`p-2 rounded ${harmony.isComplementary ? 'bg-foreground text-primary-foreground' : 'bg-muted'}`}>
                  Complementary
                </div>
                <div className={`p-2 rounded ${harmony.isAnalogous ? 'bg-foreground text-primary-foreground' : 'bg-muted'}`}>
                  Analogous
                </div>
              </div>
              
              <div className="text-sm pt-2">
                <span className="text-muted-foreground">Contrast Ratio: </span>
                <span className="font-semibold">{harmony.contrastRatio.toFixed(1)}:1</span>
                {harmony.contrastRatio >= 7 && (
                  <span className="ml-2 text-xs bg-muted text-foreground px-2 py-1 rounded">
                    AAA
                  </span>
                )}
                {harmony.contrastRatio >= 4.5 && harmony.contrastRatio < 7 && (
                  <span className="ml-2 text-xs bg-muted text-foreground px-2 py-1 rounded">
                    AA
                  </span>
                )}
                {harmony.contrastRatio < 4.5 && (
                  <span className="ml-2 text-xs bg-muted text-foreground px-2 py-1 rounded">
                    Poor
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}