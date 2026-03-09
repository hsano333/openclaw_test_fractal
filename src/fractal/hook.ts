import React, { useEffect, useRef, useState, useCallback } from 'react';

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
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

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

  // Pan to a specific point
  const panTo = useCallback((dx: number, dy: number) => {
    setViewState(prev => {
      const canvas = canvasRef.current;
      if (!canvas) return prev;
      
      const pixelScale = 1 / prev.zoom;
      return {
        ...prev,
        cx: prev.cx + dx * pixelScale,
        cy: prev.cy + dy * pixelScale
      };
    });
  }, [setViewState]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    // Scroll up = zoom in, scroll down = zoom out
    const factor = e.deltaY < 0 ? 1 : -1;
    zoomAtPoint(factor, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }, [zoomAtPoint]);

  // Mouse down - start drag or click-zoom
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cx: viewState.cx,
      cy: viewState.cy
    };
  }, [viewState.cx, viewState.cy]);

  // Mouse move - pan if dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    panTo(dx, dy);
  }, [isDragging, panTo]);

  // Mouse up - if no movement, treat as click-zoom
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragStartRef.current) {
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - dragStartRef.current.x, 2) +
        Math.pow(e.clientY - dragStartRef.current.y, 2)
      );
      
      // If moved less than 5 pixels, treat as click (zoom in at that point)
      if (moveDistance < 5) {
        zoomAtPoint(1, e.clientX, e.clientY);
      }
    }
    setIsDragging(false);
    dragStartRef.current = null;
  }, [isDragging, zoomAtPoint]);

  return {
    isDragging,
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
