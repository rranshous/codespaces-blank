import { SimulationConfig, getConfig } from '@config/config';
import { Renderer } from '@rendering/renderer';
import { TimeManager } from '@utils/time';

/**
 * Main simulation class that manages the entire simulation
 */
export class Simulation {
  private config: SimulationConfig;
  private renderer: Renderer;
  private timeManager: TimeManager;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, config: Partial<SimulationConfig> = {}) {
    this.config = getConfig(config);
    this.renderer = new Renderer(canvas, this.config);
    this.timeManager = new TimeManager();
  }

  /**
   * Initialize the simulation
   */
  public initialize(): void {
    this.setupEventListeners();
    this.reset();
  }

  /**
   * Start the simulation loop
   */
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.animationLoop(performance.now());
  }

  /**
   * Stop the simulation loop
   */
  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Toggle between running and stopped states
   */
  public toggleRunning(): void {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Reset the simulation to its initial state
   */
  public reset(): void {
    this.stop();
    this.timeManager.reset();
    // Will add more reset logic as we implement more systems
  }

  /**
   * Main animation loop
   */
  private animationLoop(timestamp: number): void {
    this.timeManager.update(timestamp);
    
    this.update(this.timeManager.getDeltaTime());
    this.render();
    
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
    }
  }

  /**
   * Update the simulation state
   */
  private update(deltaTime: number): void {
    // Will add update logic for entities as we implement them
  }

  /**
   * Render the current simulation state
   */
  private render(): void {
    this.renderer.clear();
    this.renderer.drawGrid();
    
    // Will add more rendering as we implement entities
    
    this.renderer.drawDebugInfo(this.timeManager.getFPS());
  }

  /**
   * Set up event listeners for user input
   */
  private setupEventListeners(): void {
    const startPauseButton = document.getElementById('start-pause');
    if (startPauseButton) {
      startPauseButton.addEventListener('click', () => this.toggleRunning());
    }

    const resetButton = document.getElementById('reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.reset());
    }
  }

  /**
   * Get the current configuration
   */
  public getConfig(): SimulationConfig {
    return this.config;
  }
}