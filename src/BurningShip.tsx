import React, { useRef, useCallback, useEffect } from 'react';

interface BurningShipProps {
  canvasWidth?: number;
  canvasHeight?: number;
}

function BurningShip({ canvasWidth = 800, canvasHeight = 600 }: BurningShipProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewState, setViewState] = React.useState({
    zoom: 30,
    cx: -0.5,
    cy: 0
  });
  
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const drawBurningShip = useCallback(() => {
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
        // Map pixel to complex plane (c values)
        const zx0 = (x - width / 2) / zoom + cx;
        const zy0 = (y - height / 2) / zoom + cy;

        let zx = 0;
        let zy = 0;
        let iter = 0;

        // Pre-compute c values (zx0, zy0 are the c values for this pixel)
        const ca = zx0;
        const cb = zy0;

        // Burning Ship iteration: z = (|z| + c)^2 (complex squaring with abs)
        // This creates the distinctive "burning ship" fractal shape
        while (iter < maxIter) {
          // Take absolute value of current z
          const ax = Math.abs(zx);
          const ay = Math.abs(zy);

          // Compute (|z| + c) first
          const ax_plus_a = ax + ca;
          const ay_plus_b = ay + cb;

          // Apply Burning Ship formula:
          // z_new.x = (|z.x| + c.x)^2 - (|z.y| + c.y)^2
          // z_new.y = 2 * (|z.x| + c.x) * (|z.y| + c.y)
          zx = ax_plus_a * ax_plus_a - ay_plus_b * ay_plus_b;
          zy = 2 * ax_plus_a * ay_plus_b;

          // Check escape condition (L2 norm, threshold 4)
          if (zx * zx + zy * zy > 16) {
            break;
          }
          iter++;
        }

        // Color based on iteration count
        const idx = (y * width + x) * 4;
        if (iter >= maxIter - 1) {
          // Inside the set - black (converged)
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          // Outside - warm fire colors (gradient)
          // Smooth color using log of iteration count
          const t = Math.log(iter + 1) / Math.log(maxIter + 1);
          
          // Fire gradient: dark → red → orange → yellow → white
          data[idx] = Math.min(255, 255 * t * 1.5);           // Red
          data[idx + 1] = Math.min(255, 255 * t * t * 1.2);    // Green  
          data[idx + 2] = Math.min(255, 255 * t * t * t);      // Blue
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [viewState]);

  useEffect(() => {
    drawBurningShip();
  }, [drawBurningShip]);

  const zoomAtPoint = useCallback((factor: number, pointX?: number, pointY?: number) => {
    setViewState(prev => {
      const canvas = canvasRef.current;
      if (!canvas) return prev;

      const zoomFactor = Math.pow(1.2, factor);
      let newZoom = prev.zoom * zoomFactor;

      if (pointX !== undefined && pointY !== undefined) {
        const rect = canvas.getBoundingClientRect();
        const clickCx = (pointX - rect.left - rect.width / 2) / prev.zoom + prev.cx;
        const clickCy = (pointY - rect.top - rect.height / 2) / prev.zoom + prev.cy;
        
        const newCx = prev.cx + (clickCx - prev.cx) * (1 - 1/zoomFactor);
        const newCy = prev.cy + (clickCy - prev.cy) * (1 - 1/zoomFactor);
        
        return { ...prev, zoom: newZoom, cx: newCx, cy: newCy };
      }
      
      return { ...prev, zoom: newZoom };
    });
  }, []);

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
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1 : -1;
    zoomAtPoint(factor, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }, [zoomAtPoint]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cx: viewState.cx,
      cy: viewState.cy
    };
  }, [viewState.cx, viewState.cy]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    panTo(dx, dy);
  }, [isDragging, panTo]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragStartRef.current) {
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - dragStartRef.current.x, 2) +
        Math.pow(e.clientY - dragStartRef.current.y, 2)
      );
      
      if (moveDistance < 5) {
        zoomAtPoint(1, e.clientX, e.clientY);
      }
    }
    setIsDragging(false);
    dragStartRef.current = null;
  }, [isDragging, zoomAtPoint]);

  const handleZoomIn = () => zoomAtPoint(1);
  const handleZoomOut = () => zoomAtPoint(-1);
  const handleReset = () => setViewState({ zoom: 30, cx: -0.5, cy: 0 });

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
        Burning Ship Set
        <div className="hint">
          Scroll to zoom • Click to zoom in • Drag to pan
        </div>
      </div>
    </div>
  );
}

export default BurningShip;
