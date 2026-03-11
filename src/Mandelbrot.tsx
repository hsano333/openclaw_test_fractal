import React, { useRef, useCallback, useEffect } from 'react';

interface MandelbrotProps {
  canvasWidth?: number;
  canvasHeight?: number;
}

function Mandelbrot({ canvasWidth = 800, canvasHeight = 600 }: MandelbrotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewState, setViewState] = React.useState({
    zoom: 150,
    cx: -0.7,
    cy: 0.27
  });
  
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const drawMandelbrot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { zoom, cx, cy } = viewState;
    const maxIter = 100;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // Map pixel to complex plane
        const complexX = (x - width / 2) / zoom + cx;
        const complexY = (y - height / 2) / zoom + cy;

        let zx = 0;
        let zy = 0;
        let iter = 0;

        while (zx * zx + zy * zy <= 4 && iter < maxIter) {
          const zx2 = zx * zx;
          const zy2 = zy * zy;
          zy = 2 * zx * zy + complexY;
          zx = zx2 - zy2 + complexX;
          iter++;
        }

        // Color based on iteration count
        const idx = (y * width + x) * 4;
        if (iter === maxIter) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          const t = iter / maxIter;
          data[idx] = Math.sin(t * Math.PI * 2) * 127 + 128;
          data[idx + 1] = Math.sin(t * Math.PI * 2 + 2) * 127 + 128;
          data[idx + 2] = Math.sin(t * Math.PI * 2 + 4) * 127 + 128;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [viewState]);

  useEffect(() => {
    drawMandelbrot();
  }, [drawMandelbrot]);

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
  }, []);

  // Pan to a specific point
  const panTo = useCallback((dx: number, dy: number) => {
    setViewState(prev => {
      const canvas = canvasRef.current;
      if (!canvas) return prev;
      
      const pixelScale = 1 / prev.zoom;
      return {
        ...prev,
        cx: prev.cx + dx * pixelScale * 0.5,  // 50% drag speed
        cy: prev.cy + dy * pixelScale * 0.5    // 50% drag speed
      };
    });
  }, []);

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

  // Button handlers
  const handleZoomIn = () => zoomAtPoint(1);
  const handleZoomOut = () => zoomAtPoint(-1);
  const handleReset = () => setViewState({ zoom: 150, cx: -0.7, cy: 0.27 });

  // Format zoom display
  const formatZoom = (zoom: number) => {
    if (zoom >= 1000) return `x${(zoom / 1000).toFixed(2)}k`;
    if (zoom >= 100) return `x${zoom.toFixed(1)}`;
    return `x${zoom.toFixed(2)}`;
  };

  return (
    <div className="container">
      <canvas
        ref={canvasRef}
        className="canvas"
        width={canvasWidth}
        height={canvasHeight}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          dragStartRef.current = null;
        }}
      />
      
      <div className="controls">
        <button onClick={handleZoomOut}>− Zoom Out</button>
        <button onClick={handleReset}>Reset</button>
        <button onClick={handleZoomIn}>+ Zoom In</button>
      </div>
      
      <div className="status">
        <span>Zoom: {formatZoom(viewState.zoom)}</span>
        <span>CX: {viewState.cx.toFixed(6)}</span>
        <span>CY: {viewState.cy.toFixed(6)}</span>
      </div>
      
      <div className="label">
        Mandelbrot Set
        <div className="hint">
          Scroll to zoom • Click to zoom in • Drag to pan
        </div>
      </div>
    </div>
  );
}

export default Mandelbrot;