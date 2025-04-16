import { SimulationConfig } from '@config/config';

/**
 * Responsible for rendering the simulation to a canvas
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private config: SimulationConfig;

  constructor(canvas: HTMLCanvasElement, config: SimulationConfig) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.config = config;
    this.resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /**
   * Resize the canvas to fill the container
   */
  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
    }
  }

  /**
   * Clear the canvas
   */
  public clear(): void {
    this.context.fillStyle = '#111';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw a grid on the canvas
   */
  public drawGrid(): void {
    const { gridCellSize } = this.config;
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.context.strokeStyle = 'rgba(50, 50, 50, 0.5)';
    this.context.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridCellSize) {
      this.context.beginPath();
      this.context.moveTo(x, 0);
      this.context.lineTo(x, height);
      this.context.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridCellSize) {
      this.context.beginPath();
      this.context.moveTo(0, y);
      this.context.lineTo(width, y);
      this.context.stroke();
    }
  }

  /**
   * Draw debug information on the canvas
   */
  public drawDebugInfo(fps: number): void {
    this.context.fillStyle = 'white';
    this.context.font = '12px Arial';
    this.context.fillText(`FPS: ${Math.round(fps)}`, 10, 20);
  }

  /**
   * Get the rendering context
   */
  public getContext(): CanvasRenderingContext2D {
    return this.context;
  }
}