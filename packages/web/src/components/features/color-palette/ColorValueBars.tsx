import { type ExtractedColor } from '@palette-tool/color-engine';
import {
  barRatio,
  colorBarGroups,
  formatBarValue,
  type ColorBar,
} from '@/lib/palette-card-model';

/**
 * Horizontal HSL/HScL value bar graphs shown under a color swatch.
 *
 * The values and bar colors come from `lib/palette-card-model`, which the PNG
 * export draws from as well — that is what keeps an exported image looking like
 * the panel it came from.
 */
export function ColorValueBars({
  color,
  showLabels = false,
}: {
  color: ExtractedColor;
  showLabels?: boolean;
}) {
  const BarGraph = ({ bar }: { bar: ColorBar }) => (
    <div className={`text-[12px] ${showLabels ? 'space-y-0.5' : 'mb-1'}`}>
      {showLabels && (
        <div className="flex justify-between">
          <span className="text-muted-foreground tracking-wide">{bar.label}</span>
          <span className="text-foreground font-mono">{formatBarValue(bar)}</span>
        </div>
      )}
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${barRatio(bar) * 100}%`,
            backgroundColor: bar.fill,
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="p-1">
      {colorBarGroups(color).map((group, groupIndex) => (
        <div key={group.name}>
          {showLabels && (
            <div
              className={`text-[12px] text-muted-foreground font-medium mb-1 ${groupIndex > 0 ? 'mt-3' : ''}`}
            >
              {group.name}
            </div>
          )}
          <div className={`space-y-1 ${!showLabels && groupIndex > 0 ? 'mt-3' : ''}`}>
            {group.bars.map((bar) => (
              <BarGraph key={`${group.name}-${bar.label}`} bar={bar} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
