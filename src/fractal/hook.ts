import React, { useRef, useState, useCallback } from 'react';

// State for fractal view
interface ViewState {
  zoom: number;
  cx: number;  // center real part
  cy: number;  // center imaginary part
}

interface MandelbrotProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewState: ViewState;
  setViewState: React.Dispatch<React.SetStateAction<ViewState>>;
  onDrawComplete?: () => void;
}

// Custom hook for mouse interactions
function useFractalInteractions(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  viewState: ViewState,
  setViewState: React.Dispatch<React.SetStateAction<ViewState>>
) {
  const [clickStartTime, setClickStartTime] = useState<number | null>(null);
  const clickStartPos = useRef<{ x: number; y: number } | null>(null);

  // Zoom at a specific point
  const zoomAtPoint = useCallback((factor: number, pointX?: number, pointY?: number) => {
    setViewState(prev => {
      const canvas = canvasRef.current;
      if (!canvas) return prev;

      const zoomFactor = Math.pow(1.2, factor); // 1.2x zoom per step
      let newZoom = prev.zoom * zoomFactor;

      if (pointX !== undefined && pointY !== undefined) {
        // Zoom toward the clicked point
        const rect = canvas.getBoundingClientRect();
        const clickCx = (pointX - rect.left - rect.width / 2) / prev.zoom + prev.cx;
        const clickCy = (pointY - rect.top - rect.height / 2) / prev.zoom + prev.cy;
        
        // Adjust center to keep the clicked point in the same screen position
        const newCx = prev.cx + (clickCx - prev.cx) * (1 - 1/zoomFactor);
        const newCy = prev.cy + (clickCy - prev.cy) * (1 - 1/zoomFactor);
        
        return { ...prev, zoom: newZoom, cx: newCx, cy: newCy };
      }
      
      return { ...prev, zoom: newZoom };
    });
  }, [canvasRef, setViewState]);

  // Center view at a specific point (new functionality)
  const centerAtPoint = useCallback((pointX: number, pointY: number) => {
    setViewState(prev => {
      const canvas = canvasRef.current;
      if (!canvas) return prev;
      
      const rect = canvas.getBoundingClientRect();
      
      // Calculate the complex coordinate at the clicked point
      const clickedCx = (pointX - rect.left - rect.width / 2) / prev.zoom + prev.cx;
      const clickedCy = (pointY - rect.top - rect.height / 2) / prev.zoom + prev.cy;
      
      // Set the center to the clicked coordinate
      return { ...prev, cx: clickedCx, cy: clickedCy };
    });
  }, [canvasRef, setViewState]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    // Scroll up = zoom in, scroll down = zoom out
    const factor = e.deltaY < 0 ? 1 : -1;
    zoomAtPoint(factor, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }, [zoomAtPoint]);

  // Mouse down - record click position and time
  // Note: viewState is kept in deps for hook consistency, though not directly used
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setClickStartTime(Date.now());
    clickStartPos.current = {
      x: e.clientX,
      y: e.clientY
    };
  }, [viewState.cx, viewState.cy]);

  // Mouse move - no panning behavior now
  const handleMouseMove = useCallback(() => {
    // Intentionally empty - no dragging/panning
  }, []);

  // Mouse up - center at clicked point
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (clickStartTime !== null && clickStartPos.current) {
      const clickDuration = Date.now() - clickStartTime;
      
      // Only trigger if it was a quick click (less than 250ms)
      if (clickDuration < 250) {
        centerAtPoint(e.clientX, e.clientY);
      }
    }
    setClickStartTime(null);
    clickStartPos.current = null;
  }, [clickStartTime, centerAtPoint]);

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleZoomIn: () => zoomAtPoint(1),
    handleZoomOut: () => zoomAtPoint(-1),
    handleReset: () => setViewState({ zoom: 150, cx: -0.7, cy: 0.27 })
  };
}

export { useFractalInteractions, type ViewState, type MandelbrotProps };
