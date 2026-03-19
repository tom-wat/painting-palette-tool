import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import { Slider } from '../ui';

interface AnnotationControlsProps {
  lineOpacity: number;
  onLineOpacityChange: (_value: number) => void;
  fontSize: number;
  onFontSizeChange: (_size: number) => void;
  onClearAnnotations: () => void;
  onExportImage: () => void;
  onExportOverlay: () => void;
  hasAnnotations: boolean;
  annotationTheme: 'light' | 'dark';
  onAnnotationThemeChange: (_theme: 'light' | 'dark') => void;
  lineColor: string;
  onLineColorChange: (_color: string) => void;
}

export default function AnnotationControls({
  lineOpacity,
  onLineOpacityChange,
  fontSize,
  onFontSizeChange,
  onClearAnnotations,
  onExportImage,
  onExportOverlay,
  hasAnnotations,
  annotationTheme,
  onAnnotationThemeChange,
  lineColor,
  onLineColorChange,
}: AnnotationControlsProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Annotations</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Theme toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Label Theme
            </label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => onAnnotationThemeChange('light')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  annotationTheme === 'light'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => onAnnotationThemeChange('dark')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  annotationTheme === 'dark'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Line Color */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Line Color
            </label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => onLineColorChange('#ffffff')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  lineColor === '#ffffff'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                White
              </button>
              <button
                onClick={() => onLineColorChange('#000000')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  lineColor === '#000000'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Black
              </button>
            </div>
          </div>

          {/* Line Opacity */}
          <Slider
            label="Line Opacity"
            value={Math.round(lineOpacity * 100)}
            onChange={(v) => onLineOpacityChange(v / 100)}
            min={0}
            max={100}
            step={5}
          />

          {/* Font Size */}
          <Slider
            label="Font Size"
            value={fontSize}
            onChange={onFontSizeChange}
            min={12}
            max={36}
            step={1}
          />

          {/* Export */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <button
              onClick={onExportImage}
              disabled={!hasAnnotations}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export PNG
            </button>
            <button
              onClick={onExportOverlay}
              disabled={!hasAnnotations}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export PNG (overlay)
            </button>
          </div>

          {/* Clear */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={onClearAnnotations}
              disabled={!hasAnnotations}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
            >
              Clear All Annotations
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
