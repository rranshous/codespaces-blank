import { SimulationConfig } from '@config/config';
import { World } from '@core/world';
import { GridCell, TERRAIN_PROPERTIES } from '@core/terrain';

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
   * Draw the world grid and terrain
   */
  public drawWorld(world: World): void {
    const grid = world.getGrid();
    const cellSize = this.config.gridCellSize;
    
    // Draw each cell's terrain
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        this.drawTerrainCell(cell, cellSize);
      }
    }
    
    // Draw grid lines
    this.drawGridLines(world.getDimensions(), cellSize);
    
    // Draw resources on top of terrain
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        this.drawResourcesInCell(cell, cellSize);
      }
    }
  }
  
  /**
   * Draw a single terrain cell
   */
  private drawTerrainCell(cell: GridCell, cellSize: number): void {
    const terrainProps = TERRAIN_PROPERTIES[cell.terrain];
    this.context.fillStyle = terrainProps.color;
    this.context.fillRect(
      cell.x * cellSize, 
      cell.y * cellSize, 
      cellSize, 
      cellSize
    );
  }
  
  /**
   * Draw grid lines
   */
  private drawGridLines(dimensions: { width: number, height: number }, cellSize: number): void {
    this.context.strokeStyle = 'rgba(50, 50, 50, 0.5)';
    this.context.lineWidth = 0.5;

    // Draw vertical lines
    for (let x = 0; x <= dimensions.width; x++) {
      this.context.beginPath();
      this.context.moveTo(x * cellSize, 0);
      this.context.lineTo(x * cellSize, dimensions.height * cellSize);
      this.context.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= dimensions.height; y++) {
      this.context.beginPath();
      this.context.moveTo(0, y * cellSize);
      this.context.lineTo(dimensions.width * cellSize, y * cellSize);
      this.context.stroke();
    }
  }
  
  /**
   * Draw resources in a cell
   */
  private drawResourcesInCell(cell: GridCell, cellSize: number): void {
    const centerX = (cell.x * cellSize) + (cellSize / 2);
    const centerY = (cell.y * cellSize) + (cellSize / 2);
    
    // Draw food resources (if any)
    if (cell.resources > 0) {
      const resourceRadius = Math.min(3 + Math.log1p(cell.resources), cellSize / 3);
      this.context.fillStyle = '#FFD700'; // Gold
      this.context.beginPath();
      this.context.arc(
        centerX - cellSize / 4, 
        centerY, 
        resourceRadius, 
        0, 
        Math.PI * 2
      );
      this.context.fill();
    }
    
    // Draw neural energy (if any)
    if (cell.neuralEnergy > 0) {
      const energyRadius = Math.min(2 + Math.log1p(cell.neuralEnergy), cellSize / 4);
      this.context.fillStyle = '#9C27B0'; // Purple
      this.context.beginPath();
      this.context.arc(
        centerX + cellSize / 4, 
        centerY, 
        energyRadius, 
        0, 
        Math.PI * 2
      );
      this.context.fill();
    }
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
  public drawDebugInfo(fps: number, world?: World): void {
    this.context.fillStyle = 'white';
    this.context.font = '12px Arial';
    this.context.textAlign = 'right';
    
    // Position the debug info on the right side
    const rightEdge = this.canvas.width - 10;
    
    // Start drawing from top right under the control panel (about 60px from top)
    let y = 80;
    
    this.context.fillText(`FPS: ${Math.round(fps)}`, rightEdge, y);
    y += 20;
    
    if (world) {
      const dimensions = world.getDimensions();
      this.context.fillText(`World: ${dimensions.width}x${dimensions.height}`, rightEdge, y);
    }
    
    // Reset text alignment for other text
    this.context.textAlign = 'left';
  }

  /**
   * Get the rendering context
   */
  public getContext(): CanvasRenderingContext2D {
    return this.context;
  }
}