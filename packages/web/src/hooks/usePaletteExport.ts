import { useState } from 'react';
import {
  downloadFile,
  downloadTextFile,
  exportAsAdobe,
  exportAsASE,
  exportAsCSS,
  exportAsJSON,
  exportAsPNG,
  exportAsProcreate,
  type ExtractedColor,
} from '@/lib/export-formats';

/**
 * Owns the export-in-progress flag and the current-in-progress-palette
 * export switch (PNG/JSON/CSS/ASE/Adobe/Procreate). Distinct from
 * usePaletteExportActions, which exports already-*saved* palettes and
 * needs DOM refs for html2canvas capture — this one exports the working
 * `colors` array directly via export-formats' pure PNG renderer.
 */
export function usePaletteExport(colors: ExtractedColor[]) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (
    format: string,
    onSuccess?: () => void,
    onError?: () => void
  ) => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `palette-${timestamp}`;

      switch (format) {
        case 'png': {
          const pngBlob = await exportAsPNG(colors);
          downloadFile(pngBlob, `${baseFilename}.png`);
          break;
        }

        case 'json': {
          const jsonContent = exportAsJSON(colors, { includeMetadata: true });
          downloadTextFile(
            jsonContent,
            `${baseFilename}.json`,
            'application/json'
          );
          break;
        }

        case 'ase': {
          const aseBlob = exportAsASE(colors);
          downloadFile(aseBlob, `${baseFilename}.ase`);
          break;
        }

        case 'css': {
          const cssContent = exportAsCSS(colors);
          downloadTextFile(cssContent, `${baseFilename}.css`, 'text/css');
          break;
        }

        case 'adobe': {
          try {
            const acoBlob = exportAsAdobe(colors);
            downloadFile(acoBlob, `${baseFilename}.aco`);
          } catch (error) {
            console.error('Adobe Color export failed:', error);
          }
          break;
        }

        case 'procreate': {
          try {
            const swatchesBlob = exportAsProcreate(colors);
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
      onError?.();
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, handleExport };
}
