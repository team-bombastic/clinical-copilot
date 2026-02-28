'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import styles from './pdf-preview.module.css';

interface PdfPreviewProps {
  pdfBase64: string;
}

const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_DEFAULT = 1.0;
const RENDER_SCALE = 2; // render at 2x for crisp display

export default function PdfPreview({ pdfBase64 }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [pageCount, setPageCount] = useState(0);
  const [isRendering, setIsRendering] = useState(true);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);

  // Render PDF to canvas
  useEffect(() => {
    if (!pdfBase64 || !canvasRef.current) return;

    let cancelled = false;

    const renderPdf = async () => {
      setIsRendering(true);

      try {
        const pdfjsLib = await import('pdfjs-dist');

        // Set up the worker
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.mjs',
            import.meta.url
          ).toString();
        }

        // Decode base64 to bytes
        const byteChars = atob(pdfBase64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument({ data: byteArray }).promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);

        // Render first page
        const page = await pdf.getPage(1);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setNaturalWidth(viewport.width / RENDER_SCALE);
        setNaturalHeight(viewport.height / RENDER_SCALE);

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('PDF render failed:', err);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    renderPdf();
    return () => {
      cancelled = true;
    };
  }, [pdfBase64]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(+(z + ZOOM_STEP).toFixed(2), ZOOM_MAX));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(+(z - ZOOM_STEP).toFixed(2), ZOOM_MIN));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(ZOOM_DEFAULT);
  }, []);

  // Fit to width of container
  const handleFitWidth = useCallback(() => {
    if (!viewportRef.current || !naturalWidth) return;
    const containerWidth = viewportRef.current.clientWidth - 48; // minus padding
    const fitScale = containerWidth / naturalWidth;
    setZoom(Math.max(ZOOM_MIN, Math.min(+(fitScale).toFixed(2), ZOOM_MAX)));
  }, [naturalWidth]);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className={styles.viewer}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <svg
            className={styles.toolbarIcon}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className={styles.toolbarLabel}>
            Preview
            {pageCount > 0 && (
              <span className={styles.pageCount}>{pageCount} pg</span>
            )}
          </span>
        </div>

        <div className={styles.toolbarCenter}>
          <button
            onClick={handleZoomOut}
            className={styles.controlBtn}
            disabled={zoom <= ZOOM_MIN}
            title="Zoom out"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            onClick={handleZoomReset}
            className={styles.zoomBadge}
            title="Reset to 100%"
          >
            {zoomPercent}%
          </button>

          <button
            onClick={handleZoomIn}
            className={styles.controlBtn}
            disabled={zoom >= ZOOM_MAX}
            title="Zoom in"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <div className={styles.separator} />

          <button
            onClick={handleFitWidth}
            className={styles.controlBtn}
            title="Fit to width"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>

        </div>
      </div>

      {/* Canvas viewport */}
      <div ref={viewportRef} className={styles.viewport}>
        {isRendering && (
          <div className={styles.loadingOverlay}>
            <span className={styles.loadingSpinner} />
            <span className={styles.loadingText}>Rendering...</span>
          </div>
        )}
        <div className={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={{
              width: naturalWidth ? `${naturalWidth * zoom}px` : undefined,
              height: naturalHeight ? `${naturalHeight * zoom}px` : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
