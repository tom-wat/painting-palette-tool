'use client';

import ColorPalette from '@/components/features/ColorPalette';
import ImageCanvas from '@/components/features/ImageCanvas';
import ImageUpload from '@/components/features/ImageUpload';
import AnnotationControls from '@/components/features/AnnotationControls';
import { ArrowUUpLeft, ArrowUUpRight } from '@phosphor-icons/react';
import { useCallback, useRef, useState } from 'react';
import AdvancedSelectionTools, {
  type AdvancedSelectionConfig,
  type SelectionMode,
  type AnnotationMode,
} from '@/components/features/AdvancedSelectionTools';
import SavedPalettesPanel from '@/components/features/SavedPalettesPanel';
import { AppShell, CollapsibleSection } from '@/components/layout';
import { LabeledSlider, SegmentedControl, ToggleChip } from '@/components/controls';
import { Button, Select, Toggle, useToast } from '@/components/ui';
import {
  exportImageWithAnnotations,
  exportAnnotationsOnly,
  downloadFile,
} from '@/lib/export-formats';
import { useUISettings } from '@/hooks/useUISettings';
import { useAnnotationHistory } from '@/hooks/useAnnotationHistory';
import { usePaletteExtraction } from '@/hooks/usePaletteExtraction';

/** What the centre column shows. */
type MainView = 'canvas' | 'saved';

const mainViewOptions = [
  { value: 'canvas' as MainView, label: 'Canvas' },
  { value: 'saved' as MainView, label: 'Palette' },
];

const selectionModeOptions = [
  { value: 'point' as SelectionMode, label: 'Point' },
  { value: 'rectangle' as SelectionMode, label: 'Rect' },
  { value: 'polygon' as SelectionMode, label: 'Poly' },
];

const annotationModeOptions = [
  { value: 'pick' as AnnotationMode, label: 'Pick' },
  { value: 'annotate' as AnnotationMode, label: 'Annotate' },
];

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isGreyscale, setIsGreyscale] = useState(false);
  const [mainView, setMainView] = useState<MainView>('canvas');

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
  const [hasSelection, setHasSelection] = useState(false);
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

  /** New colors landed while the palette panel was closed (mobile only). */
  const [paletteBadge, setPaletteBadge] = useState(false);

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
  } = usePaletteExtraction(imageData, isGreyscale, setPaletteBadge, showToast);

  const handleImageUpload = async (file: File, imgData: ImageData) => {
    setUploadedImage(file);
    setImageData(imgData);
    resetForNewImage();
    setMainView('canvas');

    // Don't auto-extract colors on upload - let user choose when to extract
  };

  // Clear image and return to initial state
  const handleClearImage = () => {
    setUploadedImage(null);
    setImageData(null);
    resetForClearedImage();
    resetAnnotations();
    setMainView('canvas');
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

  const isAnnotating =
    selectionConfig.mode === 'point' && annotationMode === 'annotate';

  const isAreaSelection =
    selectionConfig.mode === 'rectangle' || selectionConfig.mode === 'polygon';

  const headerActions = (
    <>
      {isAnnotating && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Undo"
            disabled={!canUndoAnnotations}
            onClick={handleAnnotationUndo}
          >
            <ArrowUUpLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Redo"
            disabled={!canRedoAnnotations}
            onClick={handleAnnotationRedo}
          >
            <ArrowUUpRight />
          </Button>
        </>
      )}
      {uploadedImage && isAreaSelection && (
        <Button
          variant="outline"
          size="sm"
          disabled={!hasSelection}
          onClick={() => clearSelectionFnRef.current?.()}
        >
          Clear
        </Button>
      )}
      <SegmentedControl
        ariaLabel="Main view"
        value={mainView}
        onChange={setMainView}
        options={mainViewOptions}
        size="sm"
      />
      <ToggleChip
        label="Greyscale"
        pressed={isGreyscale}
        onPressedChange={setIsGreyscale}
      />
    </>
  );

  const leftPanel = (
    <div>
      <CollapsibleSection title="Selection Tools">
        {uploadedImage ? (
          <AdvancedSelectionTools
            config={selectionConfig}
            onConfigChange={setSelectionConfig}
            onModeChange={setSelectionMode}
            onClearSelection={() => clearSelectionFnRef.current?.()}
            annotationMode={annotationMode}
            onAnnotationModeChange={setAnnotationMode}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Upload an image to access selection tools.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Extraction Settings" defaultOpen={false}>
        {imageData ? (
          <>
            <LabeledSlider
              label="Number of Colors"
              value={settings.colorCount}
              onChange={(value) => updateSettings({ colorCount: value })}
              min={3}
              max={16}
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
            <LabeledSlider
              label="Quality"
              value={settings.quality}
              onChange={(value) => updateSettings({ quality: value })}
              min={1}
              max={10}
            />
            <Toggle
              label="Include Transparent Colors"
              checked={settings.includeTransparent}
              onChange={(checked) =>
                updateSettings({ includeTransparent: checked })
              }
            />
            {isExtracting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-muted-foreground" />
                    <span>Extracting colors...</span>
                  </div>
                  {canCancel && (
                    <Button variant="outline" size="sm" onClick={handleCancelProcessing}>
                      Cancel
                    </Button>
                  )}
                </div>
                {processingProgress > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-border">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Upload an image to configure extraction parameters.
          </p>
        )}
      </CollapsibleSection>
    </div>
  );

  const annotationControlsEl = (
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

  const rightPanel = (
    <div className="h-full">
      {isAnnotating ? (
        annotationControlsEl
      ) : (
        <ColorPalette
          colors={extractedColors}
          imageFilename={uploadedImage?.name}
          lastAddedColorIds={lastAddedColorIds}
          onDeleteColor={handleDeleteColor}
          onResetPalette={handleResetPalette}
        />
      )}
    </div>
  );

  return (
    <>
      <AppShell
        title="Painting Palette"
        onTitleClick={uploadedImage ? handleClearImage : undefined}
        headerActions={headerActions}
        leftPanel={leftPanel}
        leftPanelLabel="Controls"
        rightPanel={rightPanel}
        rightPanelLabel={isAnnotating ? 'Annotate' : 'Colors'}
        rightPanelBadge={paletteBadge}
        onRightPanelOpen={() => setPaletteBadge(false)}
      >
        {mainView === 'canvas' ? (
          uploadedImage ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Mode switch stays reachable on mobile, where the left panel is a sheet. */}
              <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 lg:hidden">
                <SegmentedControl
                  ariaLabel="Selection mode"
                  value={selectionConfig.mode}
                  onChange={setSelectionMode}
                  options={selectionModeOptions}
                  size="sm"
                  className="flex-1"
                />
                {selectionConfig.mode === 'point' && (
                  <SegmentedControl
                    ariaLabel="Point action"
                    value={annotationMode}
                    onChange={setAnnotationMode}
                    options={annotationModeOptions}
                    size="sm"
                    className="flex-1"
                  />
                )}
              </div>

              <ImageCanvas
                imageFile={uploadedImage}
                onSelectionChange={handleSelectionChange}
                onPointColorAdd={handlePointColorAdd}
                selectionMode={selectionConfig.mode}
                onClearSelection={handleClearSelectionCallback}
                onSelectionStateChange={setHasSelection}
                isGreyscale={isGreyscale}
                className="min-h-0 flex-1"
                annotations={annotations}
                onAnnotationsChange={handleAnnotationsChange}
                annotationMode={annotationMode}
                annotationLineOpacity={annotationLineOpacity}
                annotationFontSize={annotationFontSize}
                annotationTheme={annotationTheme}
                annotationLineColor={annotationLineColor}
                annotationColorSpace={annotationColorSpace}
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-hidden p-4">
              <ImageUpload
                onImageUpload={handleImageUpload}
                hasUploadedImage={!!uploadedImage}
                showToast={showToast}
              />
            </div>
          )
        ) : (
          <SavedPalettesPanel
            className="min-h-0 flex-1"
            onAddColorToExtracted={handleAddColorFromSaved}
            onError={(message) => showToast(message, 'error')}
          />
        )}
      </AppShell>

      {/* Toast Container */}
      {ToastContainer}
    </>
  );
}
