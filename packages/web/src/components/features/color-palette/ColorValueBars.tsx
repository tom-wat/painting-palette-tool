import { type RGBColor, type ExtractedColor, calculateHScL, rgbToHsl } from '@palette-tool/color-engine';

// Helper function to get bar color based on color space and type
function getBarColor(
  colorSpace: 'hsl' | 'hscl',
  type: 'H' | 'S' | 'L' | 'Sc',
  value: number,
  color: RGBColor
) {
  const hsl = rgbToHsl(color);
  const hscl = calculateHScL(color);

  switch (colorSpace) {
    case 'hsl':
      switch (type) {
        case 'H':
          return `hsl(${value}, 50%, 50%)`;
        case 'S':
          return `hsl(${hsl.h}, ${value}%, 60%)`;
        case 'L':
          return `hsl(${hsl.h}, 50%, 60%)`;
        default:
          return '#9ca3af'; // gray-400
      }

    case 'hscl':
      switch (type) {
        case 'H':
          return `hsl(${value}, 50%, 50%)`;
        case 'Sc':
          return `hsl(${hscl.h}, ${value}%, 60%)`;
        case 'L':
          return `hsl(${hscl.h}, 50%, 60%)`;
        default:
          return '#9ca3af'; // gray-400
      }

    default:
      return '#9ca3af'; // gray-400
  }
}

/**
 * Horizontal HSL/HScL value bar graphs shown under a color swatch.
 */
export function ColorValueBars({
  color,
  showLabels = false,
}: {
  color: ExtractedColor;
  showLabels?: boolean;
}) {
  const hsl = rgbToHsl(color.color);
  const hscl = calculateHScL(color.color);

  const BarGraph = ({
    label,
    value,
    max,
    suffix = '',
    colorSpace,
    type,
  }: {
    label: string;
    value: number;
    max: number;
    suffix?: string;
    colorSpace: 'hsl' | 'hscl';
    type: 'H' | 'S' | 'L' | 'Sc';
  }) => (
    <div className={`text-[12px] ${showLabels ? 'space-y-0.5' : 'mb-1'}`}>
      {showLabels && (
        <div className="flex justify-between">
          <span className="text-gray-500 tracking-wide">{label}</span>
          <span className="text-gray-700 font-mono">
            {value}
            {suffix}
          </span>
        </div>
      )}
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${Math.min((value / max) * 100, 100)}%`,
            backgroundColor: getBarColor(colorSpace, type, value, color.color),
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="p-1">
      {/* HSL Values */}
      {showLabels && (
        <div className="text-[12px] text-gray-500 font-medium mb-1">HSL</div>
      )}
      <div className="space-y-1">
        <BarGraph
          label="H"
          value={hsl.h}
          max={360}
          suffix="°"
          colorSpace="hsl"
          type="H"
        />
        <BarGraph
          label="S"
          value={hsl.s}
          max={100}
          suffix="%"
          colorSpace="hsl"
          type="S"
        />
        <BarGraph
          label="L"
          value={hsl.l}
          max={100}
          suffix="%"
          colorSpace="hsl"
          type="L"
        />
      </div>

      {/* HScL Values */}
      {showLabels && (
        <div className="text-[12px] text-gray-500 font-medium mb-1 mt-3">
          HScL
        </div>
      )}
      <div className={`space-y-1 ${!showLabels ? 'mt-3' : ''}`}>
        <BarGraph
          label="H"
          value={hscl.h}
          max={360}
          suffix="°"
          colorSpace="hscl"
          type="H"
        />
        <BarGraph
          label="Sc"
          value={hscl.sc}
          max={100}
          suffix="%"
          colorSpace="hscl"
          type="Sc"
        />
        <BarGraph
          label="L"
          value={hscl.l}
          max={100}
          suffix="%"
          colorSpace="hscl"
          type="L"
        />
      </div>
    </div>
  );
}
