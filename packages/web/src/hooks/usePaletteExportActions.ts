import { useState } from 'react';
import {
  exportAsPNG,
  exportPalettesAsPNG,
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
 * and bulk multi-format export).
 *
 * PNGs are drawn onto a canvas by `lib/export-formats`, not screenshotted from
 * the DOM: the previous html2canvas capture threw on the theme's oklch()
 * colours and left the download silently doing nothing.
 *
 * `onError` is how a failure reaches the user — every path reports through it
 * rather than only logging.
 */
export function usePaletteExportActions(onError?: (_message: string) => void) {
  const [isExporting, setIsExporting] = useState(false);

  const report = (context: string, error: unknown) => {
    console.error(`${context}:`, error);
    onError?.(`${context} failed`);
  };

  // Export individual palette as PNG
  const exportIndividualPaletteAsPNG = async (palette: SavedPalette) => {
    setIsExporting(true);
    try {
      const blob = await exportAsPNG(palette.colors, { title: palette.name });
      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(blob, `${palette.name}-palette-${timestamp}.png`);
    } catch (error) {
      report('PNG export', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export all palettes as single PNG
  const exportAllPalettesAsPNG = async (savedPalettes: SavedPalette[]) => {
    if (savedPalettes.length === 0) return;

    setIsExporting(true);
    try {
      const blob = await exportPalettesAsPNG(savedPalettes);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(blob, `all-palettes-${timestamp}.png`);
    } catch (error) {
      report('PNG export', error);
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
          const pngBlob = await exportAsPNG(palette.colors, { title: palette.name });
          downloadFile(pngBlob, `${baseFilename}.png`);
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
            report('ASE export', error);
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
            report('Adobe Color export', error);
          }
          break;
        }

        case 'procreate': {
          try {
            const swatchesBlob = exportAsProcreate(palette.colors);
            downloadFile(swatchesBlob, `${baseFilename}.swatches`);
          } catch (error) {
            report('Procreate export', error);
          }
          break;
        }

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      onSuccess?.();

    } catch (error) {
      report('Export', error);
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
            report('Bulk ASE export', error);
          }
          break;
        }

        case 'css': {
          try {
            const cssContent = exportMultiplePalettesAsCSS(savedPalettes);
            downloadTextFile(cssContent, `${baseFilename}.css`, 'text/css');
          } catch (error) {
            report('Bulk CSS export', error);
          }
          break;
        }

        case 'adobe': {
          try {
            const acoBlob = exportMultiplePalettesAsAdobe(savedPalettes);
            downloadFile(acoBlob, `${baseFilename}.aco`);
          } catch (error) {
            report('Bulk Adobe Color export', error);
          }
          break;
        }

        case 'procreate': {
          try {
            const swatchesBlob = exportMultiplePalettesAsProcreate(savedPalettes);
            downloadFile(swatchesBlob, `${baseFilename}.swatches`);
          } catch (error) {
            report('Bulk Procreate export', error);
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
              report(`PNG export for ${palette.name}`, error);
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
      report('Bulk export', error);
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
