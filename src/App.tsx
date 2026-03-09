import React, { useRef, useState } from 'react';
import Mandelbrot from './Mandelbrot';
import Julia from './Julia';
import './App.css';

function App() {
  const [showMandelbrot, setShowMandelbrot] = useState(true);

  return (
    <div className="container">
      <div className="tab-controls">
        <button 
          className={`tab-btn ${!showMandelbrot ? 'active' : ''}`}
          onClick={() => setShowMandelbrot(false)}
        >
          Mandelbrot Set
        </button>
        <button 
          className={`tab-btn ${showMandelbrot ? 'active' : ''}`}
          onClick={() => setShowMandelbrot(true)}
        >
          Julia Set
        </button>
      </div>
      
      {showMandelbrot ? <Mandelbrot /> : <Julia />}
    </div>
  );
}

export default App;
