import { useState, type MutableRefObject } from 'react';
import html2canvas from 'html2canvas';
import {
  exportAsPNG,
  exportSavedPaletteAsJSON,
  exportAsASE,
  exportAsCSS,
  exportAsAdobe,
  exportAsProcreate,
  exportMultiplePalettesAsASE,
  exportMultiplePalettesAsCSS,
  exportMultiplePalettesAsAdobe,
  exportMultiplePalettesAsProcreate,
  downloadFile,
  downloadTextFile,
  type SavedPalette,
} from '@/lib/export-formats';

/**
 * Owns the export-in-progress flag and every saved-palette export path
 * (single-palette PNG/JSON/CSS/ASE/Adobe/Procreate, all-palettes-as-one-PNG,
 * and bulk multi-format export). paletteRefs is the DOM-ref map used for
 * html2canvas PNG capture, keyed by palette id (and `modal-${id}` for the
 * detail-modal capture target) — populated by SavedPalettesPanel's JSX.
 */
export function usePaletteExportActions(
  paletteRefs: MutableRefObject<Record<string, HTMLDivElement | null>>
) {
  const [isExporting, setIsExporting] = useState(false);

  // Export individual palette as PNG
  const exportIndividualPaletteAsPNG = async (palette: SavedPalette) => {
    const paletteElement = paletteRefs.current[palette.id];
    if (!paletteElement) return;

    setIsExporting(true);
    try {
      // Scroll to top to fix text positioning issues
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      // Small delay to ensure scroll is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(paletteElement, {
        backgroundColor: '#ffffff',
        scale: window.devicePixelRatio || 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
      });

      // Restore original scroll position
      window.scrollTo(0, originalScrollY);

      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `${palette.name}-palette-${timestamp}.png`;
          downloadFile(blob, filename);
        }
      }, 'image/png', 0.95);

    } catch (error) {
      console.error('PNG export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export all palettes as single PNG
  const exportAllPalettesAsPNG = async () => {
    const palettesContainer = document.querySelector('[data-palettes-container]') as HTMLElement;
    if (!palettesContainer) return;

    setIsExporting(true);
    try {
      // Scroll to top to fix text positioning issues
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      // Small delay to ensure scroll is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(palettesContainer, {
        backgroundColor: '#ffffff',
        scale: window.devicePixelRatio || 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
      });

      // Restore original scroll position
      window.scrollTo(0, originalScrollY);

      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `all-palettes-${timestamp}.png`;
          downloadFile(blob, filename);
        }
      }, 'image/png', 0.95);

    } catch (error) {
      console.error('PNG export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export single palette
  const handleExportPalette = async (
    format: string,
    palette: SavedPalette,
    onSuccess?: () => void
  ) => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `${palette.name}-${timestamp}`;

      switch (format) {
        case 'png': {
          // Check if called from modal and use modal element
          const modalKey = `modal-${palette.id}`;
          const modalElement = paletteRefs.current[modalKey];

          if (modalElement) {
            // Use html2canvas for modal export
            const canvas = await html2canvas(modalElement, {
              backgroundColor: '#ffffff',
              scale: 2,
              useCORS: true,
              allowTaint: true,
            });

            canvas.toBlob((blob) => {
              if (blob) {
                downloadFile(blob, `${baseFilename}.png`);
              }
            }, 'image/png', 0.95);
          } else {
            // Fallback to original PNG export
            const pngBlob = await exportAsPNG(palette.colors);
            downloadFile(pngBlob, `${baseFilename}.png`);
          }
          break;
        }

        case 'json': {
          const jsonContent = exportSavedPaletteAsJSON(palette);
          downloadTextFile(jsonContent, `${baseFilename}.json`, 'application/json');
          break;
        }

        case 'ase': {
          try {
            const aseBlob = exportAsASE(palette.colors);
            downloadFile(aseBlob, `${baseFilename}.ase`);
          } catch (error) {
            console.error('ASE export failed:', error);
          }
          break;
        }

        case 'css': {
          const cssContent = exportAsCSS(palette.colors);
          downloadTextFile(cssContent, `${baseFilename}.css`, 'text/css');
          break;
        }

        case 'adobe': {
          try {
            const acoBlob = exportAsAdobe(palette.colors);
            downloadFile(acoBlob, `${baseFilename}.aco`);
          } catch (error) {
            console.error('Adobe Color export failed:', error);
          }
          break;
        }

        case 'procreate': {
          try {
            const swatchesBlob = exportAsProcreate(palette.colors);
            downloadFile(swatchesBlob, `${baseFilename}.swatches`);
          } catch (error) {
            console.error('Procreate export failed:', error);
          }
          break;
        }

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      onSuccess?.();

    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export all palettes
  const handleBulkExport = async (
    format: string,
    savedPalettes: SavedPalette[],
    onSuccess?: () => void
  ) => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `all-palettes-${timestamp}`;

      switch (format) {
        case 'json': {
          const bulkData = {
            palettes: savedPalettes.map(palette => ({
              palette: {
                name: palette.name,
                tags: palette.tags || [],
              },
              colors: palette.colors.map((extractedColor, index) => ({
                index: index + 1,
                rgb: {
                  r: extractedColor.color.r,
                  g: extractedColor.color.g,
                  b: extractedColor.color.b,
                },
              }))
            }))
          };
          const jsonContent = JSON.stringify(bulkData, null, 2);
          downloadTextFile(jsonContent, `${baseFilename}.json`, 'application/json');
          break;
        }

        case 'ase': {
          try {
            const aseBlob = exportMultiplePalettesAsASE(savedPalettes);
            downloadFile(aseBlob, `${baseFilename}.ase`);
          } catch (error) {
            console.error('Bulk ASE export failed:', error);
          }
          break;
        }

        case 'css': {
          try {
            const cssContent = exportMultiplePalettesAsCSS(savedPalettes);
            downloadTextFile(cssContent, `${baseFilename}.css`, 'text/css');
          } catch (error) {
            console.error('Bulk CSS export failed:', error);
          }
          break;
        }

        case 'adobe': {
          try {
            const acoBlob = exportMultiplePalettesAsAdobe(savedPalettes);
            downloadFile(acoBlob, `${baseFilename}.aco`);
          } catch (error) {
            console.error('Bulk Adobe Color export failed:', error);
          }
          break;
        }

        case 'procreate': {
          try {
            const swatchesBlob = exportMultiplePalettesAsProcreate(savedPalettes);
            downloadFile(swatchesBlob, `${baseFilename}.swatches`);
          } catch (error) {
            console.error('Bulk Procreate export failed:', error);
          }
          break;
        }

        case 'png': {
          // PNG exports remain separate files due to visual nature
          for (let i = 0; i < savedPalettes.length; i++) {
            const palette = savedPalettes[i]!;
            const filename = `${palette.name}-${timestamp}`;

            try {
              const pngBlob = await exportAsPNG(palette.colors);
              downloadFile(pngBlob, `${filename}.png`);
            } catch (error) {
              console.error('PNG export failed for', palette.name, ':', error);
            }

            // Small delay to prevent browser blocking multiple downloads
            if (i < savedPalettes.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          break;
        }

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      onSuccess?.();

    } catch (error) {
      console.error('Bulk export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportIndividualPaletteAsPNG,
    exportAllPalettesAsPNG,
    handleExportPalette,
    handleBulkExport,
  };
}
