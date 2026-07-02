'use client';

import ColorPalette from '@/components/features/ColorPalette';
import ImageCanvas from '@/components/features/ImageCanvas';
import ImageUpload from '@/components/features/ImageUpload';
import AnnotationControls from '@/components/features/AnnotationControls';
import { useCallback, useRef, useState } from 'react';
import AdvancedSelectionTools, {
  type AdvancedSelectionConfig,
  type SelectionMode,
  type AnnotationMode,
} from '@/components/features/AdvancedSelectionTools';
import SavedPalettesPanel from '@/components/features/SavedPalettesPanel';
import MobileTabBar, { type MobileTab } from '@/components/features/MobileTabBar';
import { Card, CardContent, Select, Slider, Toggle, useToast } from '@/components/ui';
import {
  exportImageWithAnnotations,
  exportAnnotationsOnly,
  downloadFile,
} from '@/lib/export-formats';
import { useUISettings } from '@/hooks/useUISettings';
import { useAnnotationHistory } from '@/hooks/useAnnotationHistory';
import { usePaletteExtraction } from '@/hooks/usePaletteExtraction';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isGreyscale, setIsGreyscale] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'palette'>('image');

  const {
    annotations,
    canUndo: canUndoAnnotations,
    canRedo: canRedoAnnotations,
    handleAnnotationsChange,
    handleAnnotationUndo,
    handleAnnotationRedo,
    handleClearAnnotations,
    resetAnnotations,
  } = useAnnotationHistory();

  // Advanced selection tools state (selectionConfig.mode is persisted by useUISettings below)
  const [selectionConfig, setSelectionConfig] =
    useState<AdvancedSelectionConfig>({
      mode: 'point' as SelectionMode,
    });
  const clearSelectionFnRef = useRef<(() => void) | null>(null);
  const setSelectionMode = useCallback(
    (mode: SelectionMode) => setSelectionConfig((prev) => ({ ...prev, mode })),
    []
  );

  const {
    annotationLineOpacity,
    setAnnotationLineOpacity,
    annotationFontSize,
    setAnnotationFontSize,
    annotationMode,
    setAnnotationMode,
    annotationTheme,
    setAnnotationTheme,
    annotationLineColor,
    setAnnotationLineColor,
    annotationColorSpace,
    setAnnotationColorSpace,
  } = useUISettings(selectionConfig.mode, setSelectionMode);

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');
  const [paletteBadge, setPaletteBadge] = useState(false);

  const handleMobileTabChange = (tab: MobileTab) => {
    setMobileTab(tab);
    // Palette tab always shows ColorPalette → clear badge on tap
    if (tab === 'palette') setPaletteBadge(false);
  };

  const handleAnnotationModeChange = (mode: AnnotationMode) => {
    setAnnotationMode(mode);
    // Auto-switch mobile tab when annotation mode changes
    if (mode === 'annotate') {
      setMobileTab((prev) => (prev === 'palette' ? 'annotate' : prev));
    } else {
      setMobileTab((prev) => (prev === 'annotate' ? 'palette' : prev));
    }
  };

  // Toast notification hook
  const { showToast, ToastContainer } = useToast();

  // Use useCallback to prevent re-rendering issues
  const handleClearSelectionCallback = useCallback((clearFn: () => void) => {
    clearSelectionFnRef.current = clearFn;
  }, []);

  const {
    extractedColors,
    settings,
    updateSettings,
    isExtracting,
    processingProgress,
    canCancel,
    lastAddedColorIds,
    algorithmOptions,
    sortOptions,
    handleCancelProcessing,
    handleSelectionChange,
    handlePointColorAdd,
    handleAddColorFromSaved,
    handleDeleteColor,
    handleResetPalette,
    resetForNewImage,
    resetForClearedImage,
  } = usePaletteExtraction(imageData, isGreyscale, mobileTab, setPaletteBadge, showToast);

  const handleImageUpload = async (file: File, imgData: ImageData) => {
    setUploadedImage(file);
    setImageData(imgData);
    resetForNewImage();
    setMobileTab('canvas');

    // Don't auto-extract colors on upload - let user choose when to extract
  };

  // Clear image and return to initial state
  const handleClearImage = () => {
    setUploadedImage(null);
    setImageData(null);
    resetForClearedImage();
    resetAnnotations();
    setActiveTab('image');
  };

  // Export PNG = image + annotations at original resolution
  const handleExportImage = async () => {
    if (!uploadedImage || annotations.length === 0) return;
    try {
      const blob = await exportImageWithAnnotations(uploadedImage, annotations, {
        lineOpacity: annotationLineOpacity,
        fontSize: annotationFontSize,
        theme: annotationTheme,
        lineColor: annotationLineColor,
        colorSpace: annotationColorSpace,
      });
      const date = new Date().toISOString().split('T')[0];
      downloadFile(blob, `image-annotated-${date}.png`);
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Export failed', 'error');
    }
  };

  // Export PNG (overlay) = annotations only on transparent background at original resolution
  const handleExportOverlay = async () => {
    if (!uploadedImage || annotations.length === 0) return;
    try {
      const blob = await exportAnnotationsOnly(uploadedImage, annotations, {
        lineOpacity: annotationLineOpacity,
        fontSize: annotationFontSize,
        theme: annotationTheme,
        lineColor: annotationLineColor,
        colorSpace: annotationColorSpace,
      });
      const date = new Date().toISOString().split('T')[0];
      downloadFile(blob, `overlay-${date}.png`);
    } catch (error) {
      console.error('Overlay export failed:', error);
      showToast('Export failed', 'error');
    }
  };


  // Shared sub-components referenced in both layouts
  const imageCanvasEl = uploadedImage ? (
    <ImageCanvas
      imageFile={uploadedImage}
      onSelectionChange={handleSelectionChange}
      onPointColorAdd={handlePointColorAdd}
      selectionMode={selectionConfig.mode}
      onClearSelection={handleClearSelectionCallback}
      isGreyscale={isGreyscale}
      className="flex-1 flex flex-col"
      annotations={annotations}
      onAnnotationsChange={handleAnnotationsChange}
      onUndo={handleAnnotationUndo}
      onRedo={handleAnnotationRedo}
      canUndo={canUndoAnnotations}
      canRedo={canRedoAnnotations}
      annotationMode={annotationMode}
      annotationLineOpacity={annotationLineOpacity}
      annotationFontSize={annotationFontSize}
      annotationTheme={annotationTheme}
      annotationLineColor={annotationLineColor}
      annotationColorSpace={annotationColorSpace}
    />
  ) : null;

  const rightPanelEl = selectionConfig.mode === 'point' && annotationMode === 'annotate' ? (
    <AnnotationControls
      lineOpacity={annotationLineOpacity}
      onLineOpacityChange={setAnnotationLineOpacity}
      fontSize={annotationFontSize}
      onFontSizeChange={setAnnotationFontSize}
      onClearAnnotations={handleClearAnnotations}
      onExportImage={handleExportImage}
      onExportOverlay={handleExportOverlay}
      hasAnnotations={annotations.length > 0}
      annotationTheme={annotationTheme}
      onAnnotationThemeChange={setAnnotationTheme}
      lineColor={annotationLineColor}
      onLineColorChange={setAnnotationLineColor}
      colorSpace={annotationColorSpace}
      onColorSpaceChange={setAnnotationColorSpace}
    />
  ) : (
    <ColorPalette
      colors={extractedColors}
      imageFilename={uploadedImage?.name}
      lastAddedColorIds={lastAddedColorIds}
      onDeleteColor={handleDeleteColor}
      onResetPalette={handleResetPalette}
    />
  );

  const mobilePaletteEl = (
    <ColorPalette
      colors={extractedColors}
      imageFilename={uploadedImage?.name}
      lastAddedColorIds={lastAddedColorIds}
      onDeleteColor={handleDeleteColor}
      onResetPalette={handleResetPalette}
    />
  );

  const mobileAnnotateEl = (
    <AnnotationControls
      lineOpacity={annotationLineOpacity}
      onLineOpacityChange={setAnnotationLineOpacity}
      fontSize={annotationFontSize}
      onFontSizeChange={setAnnotationFontSize}
      onClearAnnotations={handleClearAnnotations}
      onExportImage={handleExportImage}
      onExportOverlay={handleExportOverlay}
      hasAnnotations={annotations.length > 0}
      annotationTheme={annotationTheme}
      onAnnotationThemeChange={setAnnotationTheme}
      lineColor={annotationLineColor}
      onLineColorChange={setAnnotationLineColor}
      colorSpace={annotationColorSpace}
      onColorSpaceChange={setAnnotationColorSpace}
    />
  );

  const leftPanelEl = (
    <div className="p-4 space-y-4">
      {uploadedImage ? (
        <AdvancedSelectionTools
          config={selectionConfig}
          onConfigChange={setSelectionConfig}
          onModeChange={(mode) =>
            setSelectionConfig((prev) => ({ ...prev, mode }))
          }
          onClearSelection={() => clearSelectionFnRef.current?.()}
          annotationMode={annotationMode}
          onAnnotationModeChange={handleAnnotationModeChange}
        />
      ) : (
        <Card>
          <CardContent>
            <div className="text-center py-6 text-gray-500">
              <div className="mb-2">Selection Tools</div>
              <div className="text-sm">
                Upload an image to access selection tools
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {imageData ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Extraction Settings</h3>
              <div className="grid grid-cols-1 gap-4">
                <Slider
                  label="Number of Colors"
                  value={settings.colorCount}
                  onChange={(value) => updateSettings({ colorCount: value })}
                  min={3}
                  max={16}
                  step={1}
                />
                <Select
                  label="Algorithm"
                  value={settings.algorithm}
                  onChange={(value) => updateSettings({ algorithm: value })}
                  options={algorithmOptions}
                />
                <Select
                  label="Sort By"
                  value={settings.sortBy}
                  onChange={(value) => updateSettings({ sortBy: value })}
                  options={sortOptions}
                />
                <Slider
                  label="Quality"
                  value={settings.quality}
                  onChange={(value) => updateSettings({ quality: value })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
              <Toggle
                label="Include Transparent Colors"
                checked={settings.includeTransparent}
                onChange={(checked) =>
                  updateSettings({ includeTransparent: checked })
                }
              />
              {isExtracting && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span>Extracting colors...</span>
                    </div>
                    {canCancel && (
                      <button
                        onClick={handleCancelProcessing}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {processingProgress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-800 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Extraction Settings</h3>
              <div className="text-center py-6 text-gray-500">
                <div className="mb-2">Configure extraction parameters</div>
                <div className="text-sm">
                  Upload an image to access settings
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      {/* ── Desktop layout (≥1024px) ── */}
      <main className="hidden lg:flex h-screen flex-col bg-gray-50 text-gray-800">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <h1
              className={`text-lg font-bold transition-colors select-none ${uploadedImage ? 'cursor-pointer hover:text-gray-500' : ''}`}
              onClick={uploadedImage ? handleClearImage : undefined}
              title={uploadedImage ? 'Click to clear image and return to top' : undefined}
            >
              Painting Palette
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setActiveTab(activeTab === 'image' ? 'palette' : 'image')
                }
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {activeTab === 'image' ? 'Palette' : 'Image'}
              </button>
              <button
                onClick={() => setIsGreyscale(!isGreyscale)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isGreyscale ? 'Color' : 'Greyscale'}
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-80 bg-white border-r border-gray-100 overflow-y-auto">
            {leftPanelEl}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'image' ? (
              <>
                {uploadedImage ? (
                  <div className="flex-1 p-4 flex flex-col overflow-hidden">
                    {imageCanvasEl}
                    <ImageUpload
                      onImageUpload={handleImageUpload}
                      hasUploadedImage={!!uploadedImage}
                      showToast={showToast}
                    />
                  </div>
                ) : (
                  <div className="flex-1 p-4">
                    <ImageUpload
                      onImageUpload={handleImageUpload}
                      hasUploadedImage={!!uploadedImage}
                      showToast={showToast}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 space-y-6 overflow-auto">
                <SavedPalettesPanel onAddColorToExtracted={handleAddColorFromSaved} />
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-80 bg-white border-l border-gray-100">
            <div className="p-4 h-full">{rightPanelEl}</div>
          </div>
        </div>
      </main>

      {/* ── Mobile layout (<1024px) ── */}
      <main className="lg:hidden flex flex-col bg-gray-50 text-gray-800" style={{ height: '100dvh' }}>
        {/* Compact Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
          <h1
            className={`text-base font-bold transition-colors select-none ${uploadedImage ? 'cursor-pointer hover:text-gray-500' : ''}`}
            onClick={uploadedImage ? handleClearImage : undefined}
          >
            Painting Palette
          </h1>
          <button
            onClick={() => setIsGreyscale(!isGreyscale)}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {isGreyscale ? 'Color' : 'Greyscale'}
          </button>
        </header>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

          {/* Canvas Tab */}
          {mobileTab === 'canvas' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Quick mode selector (only when image loaded) */}
              {uploadedImage && (
                <div className="bg-white border-b border-gray-100 px-3 py-2 flex items-center gap-2">
                  {([
                    { mode: 'point', label: 'Point' },
                    { mode: 'rectangle', label: 'Rect' },
                    { mode: 'polygon', label: 'Poly' },
                  ] as const).map(({ mode, label }) => (
                    <button
                      key={mode}
                      onClick={() => setSelectionConfig((prev) => ({ ...prev, mode }))}
                      className={`px-3 py-1 text-xs rounded-md border transition-colors flex-shrink-0 ${
                        selectionConfig.mode === mode
                          ? 'bg-gray-800 text-white border-gray-800'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  {selectionConfig.mode === 'point' && (
                    <div className="ml-auto flex-shrink-0 flex rounded-md border border-gray-200 overflow-hidden">
                      {(['pick', 'annotate'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleAnnotationModeChange(mode)}
                          className={`px-3 py-1 text-xs font-medium transition-colors capitalize ${
                            annotationMode === mode
                              ? 'bg-gray-800 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {uploadedImage ? (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  {imageCanvasEl}
                  <ImageUpload
                    onImageUpload={handleImageUpload}
                    hasUploadedImage={!!uploadedImage}
                    showToast={showToast}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-0 p-4 overflow-hidden">
                  <ImageUpload
                    onImageUpload={handleImageUpload}
                    hasUploadedImage={!!uploadedImage}
                    showToast={showToast}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tools Tab */}
          {mobileTab === 'tools' && (
            <div className="flex-1 overflow-y-auto">
              {leftPanelEl}
            </div>
          )}

          {/* Palette Tab — always ColorPalette */}
          {mobileTab === 'palette' && (
            <div className="flex-1 overflow-hidden">
              <div className="p-4 h-full">{mobilePaletteEl}</div>
            </div>
          )}

          {/* Annotate Tab — always AnnotationControls */}
          {mobileTab === 'annotate' && (
            <div className="flex-1 overflow-hidden">
              <div className="p-4 h-full">{mobileAnnotateEl}</div>
            </div>
          )}

          {/* Saved Tab */}
          {mobileTab === 'saved' && (
            <div className="flex-1 overflow-y-auto p-4">
              <SavedPalettesPanel onAddColorToExtracted={handleAddColorFromSaved} />
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <MobileTabBar
          activeTab={mobileTab}
          onTabChange={handleMobileTabChange}
          isAnnotateMode={selectionConfig.mode === 'point' && annotationMode === 'annotate'}
          showPaletteBadge={paletteBadge}
        />
      </main>

      {/* Toast Container */}
      {ToastContainer}
    </>
  );
}
