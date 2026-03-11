import { useState } from 'react';
import Mandelbrot from './Mandelbrot';
import Julia from './Julia';
import BurningShip from './BurningShip';
import './App.css';

type FractalType = 'mandelbrot' | 'julia' | 'burningship';

function App() {
  const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');

  return (
    <div className="container">
      <div className="tab-controls">
        <button 
          className={`tab-btn ${fractalType === 'mandelbrot' ? 'active' : ''}`}
          onClick={() => setFractalType('mandelbrot')}
        >
          Mandelbrot Set
        </button>
        <button 
          className={`tab-btn ${fractalType === 'julia' ? 'active' : ''}`}
          onClick={() => setFractalType('julia')}
        >
          Julia Set
        </button>
        <button 
          className={`tab-btn ${fractalType === 'burningship' ? 'active' : ''}`}
          onClick={() => setFractalType('burningship')}
        >
          Burning Ship Set
        </button>
      </div>
      
      {fractalType === 'mandelbrot' ? <Mandelbrot />
       : fractalType === 'julia' ? <Julia />
       : <BurningShip />}
    </div>
  );
}

export default App;
