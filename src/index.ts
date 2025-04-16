import { Simulation } from '@core/simulation';

/**
 * Entry point for the Sparklings Neural Energy Simulation
 */
document.addEventListener('DOMContentLoaded', () => {
  // Get the canvas element
  const canvas = document.getElementById('simulation-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Create and initialize the simulation
  const simulation = new Simulation(canvas);
  simulation.initialize();
  
  // Start the simulation
  simulation.start();
  
  // Make simulation accessible from the console for debugging
  (window as any).simulation = simulation;
  
  console.log('Sparklings Neural Energy Simulation initialized');
});