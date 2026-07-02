import { useCallback, useState } from 'react';
import type { ColorAnnotation } from '@/lib/export-formats';

/**
 * Undo/redo history for the annotation list. Each mutating call snapshots
 * the current annotations onto the appropriate stack before applying the
 * change, matching a standard linear undo/redo (branching future is
 * discarded on new edits).
 */
export function useAnnotationHistory() {
  const [annotations, setAnnotations] = useState<ColorAnnotation[]>([]);
  const [annotationHistory, setAnnotationHistory] = useState<ColorAnnotation[][]>([]);
  const [annotationFuture, setAnnotationFuture] = useState<ColorAnnotation[][]>([]);

  const handleAnnotationsChange = useCallback((newAnnotations: ColorAnnotation[]) => {
    setAnnotationHistory(prev => [...prev, annotations]);
    setAnnotationFuture([]);
    setAnnotations(newAnnotations);
  }, [annotations]);

  const handleAnnotationUndo = useCallback(() => {
    if (annotationHistory.length === 0) return;
    const prev = annotationHistory[annotationHistory.length - 1];
    setAnnotationFuture(f => [annotations, ...f]);
    setAnnotations(prev);
    setAnnotationHistory(h => h.slice(0, -1));
  }, [annotationHistory, annotations]);

  const handleAnnotationRedo = useCallback(() => {
    if (annotationFuture.length === 0) return;
    const next = annotationFuture[0];
    setAnnotationHistory(h => [...h, annotations]);
    setAnnotations(next);
    setAnnotationFuture(f => f.slice(1));
  }, [annotationFuture, annotations]);

  const handleClearAnnotations = useCallback(() => {
    setAnnotationHistory(prev => [...prev, annotations]);
    setAnnotationFuture([]);
    setAnnotations([]);
  }, [annotations]);

  // Reset without recording history — used when switching images entirely.
  const resetAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  return {
    annotations,
    canUndo: annotationHistory.length > 0,
    canRedo: annotationFuture.length > 0,
    handleAnnotationsChange,
    handleAnnotationUndo,
    handleAnnotationRedo,
    handleClearAnnotations,
    resetAnnotations,
  };
}
