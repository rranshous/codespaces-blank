import { SimulationConfig } from '@config/config';
import { World } from '@core/world';
import { GridCell, TERRAIN_PROPERTIES } from '@core/terrain';
import { Sparkling } from '@entities/sparkling';
import { SparklingState, Position } from '@entities/sparklingTypes';

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
    
    // Draw the terrain legend below the map
    this.drawMapLegend(world.getDimensions(), cellSize);
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
   * Draw a legend explaining map elements below the world grid
   */
  private drawMapLegend(dimensions: { width: number, height: number }, cellSize: number): void {
    // Position the legend below the map with some padding
    const legendY = dimensions.height * cellSize + 20;
    const legendWidth = dimensions.width * cellSize;
    const legendHeight = 70; // Total height for the legend area
    
    // Create semi-transparent background for the legend
    this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.context.fillRect(0, legendY - 10, legendWidth, legendHeight);
    
    // Set up text styling
    this.context.font = '14px Arial';
    this.context.textAlign = 'left';
    this.context.textBaseline = 'middle';
    this.context.fillStyle = 'white';
    
    // Draw legend title
    this.context.fillText('Map Legend:', 20, legendY);
    
    // Draw terrain types in the first row
    let xOffset = 20;
    let rowY = legendY + 25;
    
    // Terrain section title
    this.context.fillStyle = 'rgba(200, 200, 200, 0.9)';
    this.context.fillText('Terrain Types:', xOffset, rowY);
    xOffset += 120;
    
    // Draw each terrain type with its color and name
    Object.entries(TERRAIN_PROPERTIES).forEach(([terrainKey, props]) => {
      // Draw terrain color swatch
      this.context.fillStyle = props.color;
      this.context.fillRect(xOffset, rowY - 7, 14, 14);
      
      // Draw terrain name
      this.context.fillStyle = 'white';
      // Capitalize first letter and remove underscore
      const displayName = terrainKey.charAt(0).toUpperCase() + terrainKey.slice(1).toLowerCase();
      this.context.fillText(displayName, xOffset + 20, rowY);
      
      // Move to next position
      xOffset += 100;
    });
    
    // Draw resources and special elements in the second row
    xOffset = 20;
    rowY = legendY + 50;
    
    // Resources section title
    this.context.fillStyle = 'rgba(200, 200, 200, 0.9)';
    this.context.fillText('Resources:', xOffset, rowY);
    xOffset += 120;
    
    // Food resources (gold circles)
    this.context.fillStyle = '#FFD700'; // Gold
    this.context.beginPath();
    this.context.arc(xOffset + 7, rowY, 7, 0, Math.PI * 2);
    this.context.fill();
    
    this.context.fillStyle = 'white';
    this.context.fillText('Food', xOffset + 20, rowY);
    xOffset += 100;
    
    // Neural energy (purple circles)
    this.context.fillStyle = '#9C27B0'; // Purple
    this.context.beginPath();
    this.context.arc(xOffset + 7, rowY, 7, 0, Math.PI * 2);
    this.context.fill();
    
    this.context.fillStyle = 'white';
    this.context.fillText('Neural Energy', xOffset + 20, rowY);
    xOffset += 150;
    
    // Sparklings (if drawn in the simulation)
    this.context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.context.beginPath();
    this.context.arc(xOffset + 7, rowY, 5, 0, Math.PI * 2);
    this.context.fill();
    this.context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.context.lineWidth = 1;
    this.context.beginPath();
    this.context.arc(xOffset + 7, rowY, 8, 0, Math.PI * 2);
    this.context.stroke();
    
    this.context.fillStyle = 'white';
    this.context.fillText('Sparklings', xOffset + 20, rowY);
    
    // Reset styles
    this.context.textAlign = 'left';
    this.context.textBaseline = 'alphabetic';
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
  public drawDebugInfo(fps: number, world?: World, inferenceSystem?: any, speedMultiplier?: number): void {
    this.context.fillStyle = 'white';
    this.context.font = '12px Arial';
    this.context.textAlign = 'right';
    
    // Position the debug info on the right side
    const rightEdge = this.canvas.width - 10;
    
    // Start drawing from top right under the control panel (about 60px from top)
    let y = 80;
    
    this.context.fillText(`FPS: ${Math.round(fps)}`, rightEdge, y);
    y += 20;
    
    // Show simulation speed if provided
    if (speedMultiplier !== undefined) {
      this.context.fillStyle = speedMultiplier > 1 ? 'rgba(255, 152, 0, 0.9)' : 'white';
      this.context.fillText(`Speed: ${speedMultiplier}x`, rightEdge, y);
      y += 20;
      this.context.fillStyle = 'white';
    }
    
    if (world) {
      const dimensions = world.getDimensions();
      this.context.fillText(`World: ${dimensions.width}x${dimensions.height}`, rightEdge, y);
      y += 20;
      
      // Show current time - check if the method exists first
      const simulationTime = world.getCurrentTime ? world.getCurrentTime() : 0;
      const minutes = Math.floor(simulationTime / 60);
      const seconds = Math.floor(simulationTime % 60);
      this.context.fillText(`Simulation time: ${minutes}m ${seconds}s`, rightEdge, y);
      y += 20;
    }
    
    // Add inference system information if available
    if (inferenceSystem) {
      // Add a section header for inference information
      this.context.fillStyle = 'rgba(156, 39, 176, 0.9)'; // Purple for inference section
      this.context.fillText('— Inference System —', rightEdge, y);
      y += 20;
      
      this.context.fillStyle = 'white';
      // Show whether using mock or real inference
      const inferenceMode = inferenceSystem.getUseMockInference() ? 'Mock Inference' : 'API Inference';
      this.context.fillText(`Mode: ${inferenceMode}`, rightEdge, y);
      y += 20;
      
      // Show API configuration info if using real inference
      if (!inferenceSystem.getUseMockInference()) {
        const apiConfig = inferenceSystem.getApiConfig();
        const endpoint = apiConfig.useProxy ? 'Proxy Server' : 'Direct API';
        this.context.fillText(`Endpoint: ${endpoint}`, rightEdge, y);
        y += 20;
        
        const apiValid = inferenceSystem.isApiConfigValid() ? 'Valid' : 'Invalid';
        this.context.fillText(`API Config: ${apiValid}`, rightEdge, y);
        y += 20;
      }
      
      // Display inference metrics with color coding
      const metrics = inferenceSystem.getInferenceQualityMetrics();
      this.context.fillStyle = 'rgba(156, 39, 176, 0.9)';
      this.context.fillText('— Inference Metrics —', rightEdge, y);
      y += 20;
      
      this.context.fillStyle = 'white';
      this.context.fillText(`Total requests: ${metrics.totalInferences}`, rightEdge, y);
      y += 20;
      
      // Color-code successful inferences in green
      this.context.fillStyle = 'rgba(76, 175, 80, 0.9)';
      this.context.fillText(`Successful: ${metrics.successfulInferences}`, rightEdge, y);
      y += 20;
      
      // Color-code failed inferences in red
      this.context.fillStyle = 'rgba(244, 67, 54, 0.9)';
      this.context.fillText(`Failed: ${metrics.failedInferences}`, rightEdge, y);
      y += 20;
      
      // Success rate with appropriate coloring
      const successRate = metrics.totalInferences > 0 
        ? ((metrics.successfulInferences / metrics.totalInferences) * 100).toFixed(1) + '%'
        : 'N/A';
        
      // Choose color based on success rate
      if (metrics.totalInferences > 0) {
        const rate = metrics.successfulInferences / metrics.totalInferences;
        if (rate > 0.8) this.context.fillStyle = 'rgba(76, 175, 80, 0.9)'; // Green for good
        else if (rate > 0.5) this.context.fillStyle = 'rgba(255, 152, 0, 0.9)'; // Orange for medium
        else this.context.fillStyle = 'rgba(244, 67, 54, 0.9)'; // Red for poor
      } else {
        this.context.fillStyle = 'white';
      }
      
      this.context.fillText(`Success rate: ${successRate}`, rightEdge, y);
      y += 20;
      
      // Reset color for response time
      this.context.fillStyle = 'white';
      this.context.fillText(`Avg response time: ${metrics.averageResponseTime.toFixed(1)}ms`, rightEdge, y);
      y += 20;
      
      // Show recent inferences with detailed information
      const recentInferences = inferenceSystem.getRecentInferences ? 
        inferenceSystem.getRecentInferences(5) : [];
      
      if (recentInferences && recentInferences.length > 0) {
        this.context.fillStyle = 'rgba(156, 39, 176, 0.9)';
        this.context.fillText('— Recent Inferences —', rightEdge, y);
        y += 20;
        
        for (const inf of recentInferences) {
          const timestamp = new Date(inf.timestamp).toLocaleTimeString();
          const status = inf.success ? '✓' : '✗';
          
          // Color code based on success/failure
          if (inf.success) {
            this.context.fillStyle = 'rgba(76, 175, 80, 0.9)'; // Green for success
          } else {
            this.context.fillStyle = 'rgba(244, 67, 54, 0.9)'; // Red for failure
          }
          
          this.context.fillText(
            `${status} Sparkling ${inf.sparklingId} (${timestamp})`, 
            rightEdge, 
            y
          );
          y += 15;
          
          // Show a snippet of the reasoning in a smaller font if available
          if (inf.reasoning && inf.reasoning.length > 0) {
            this.context.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.context.font = '10px Arial';
            
            // Truncate reasoning to fit
            const maxLength = 40;
            const shortReason = inf.reasoning.length > maxLength 
              ? inf.reasoning.substring(0, maxLength) + '...' 
              : inf.reasoning;
              
            this.context.fillText(`"${shortReason}"`, rightEdge, y);
            y += 15;
            
            // Reset font size
            this.context.font = '12px Arial';
          }
        }
      }
      
      // Add legend for the home point visualization
      this.context.fillStyle = 'rgba(255, 255, 255, 0.9)';
      y += 10; // Add a bit more space before the next section
      this.context.fillText('— Legend —', rightEdge, y);
      y += 20;
      
      this.context.fillStyle = 'rgba(255, 255, 100, 0.9)';
      this.context.fillText('● "Home" reference points', rightEdge, y);
      y += 20;
      
      this.context.fillStyle = 'rgba(76, 175, 80, 0.7)';
      this.context.fillText('● Memory event markers', rightEdge, y);
      y += 20;
      
      this.context.fillStyle = 'rgba(33, 150, 243, 0.7)';
      this.context.fillText('● Inference locations', rightEdge, y);
      y += 20;
    }
    
    // Reset text alignment for other text
    this.context.textAlign = 'left';
    this.context.fillStyle = 'white';
  }

  /**
   * Draw sparklings and their territories
   * @param sparklings Array of sparklings to draw
   * @param showDetails Whether to show detailed information
   */
  public drawSparklings(sparklings: Sparkling[], showDetails: boolean = false): void {
    const ctx = this.context;
    
    // First, draw territories (so they appear behind sparklings)
    if (showDetails) {
      for (const sparkling of sparklings) {
        const territory = sparkling.getTerritory();
        if (territory.center) {
          // Get sparkling color to match territory color
          const sparklingState = sparkling.getState();
          // Only draw territory for specific states
          if (sparklingState === SparklingState.COLLECTING || 
              sparklingState === SparklingState.COMPETING || 
              sparklingState === SparklingState.RESTING) {
            
            // Extract color components from the sparkling's color
            const color = this.getSparklingColor(sparkling.getId());
            
            // Draw territory as a translucent circle
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(territory.center.x, territory.center.y, territory.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw territory border
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(territory.center.x, territory.center.y, territory.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Reset opacity
            ctx.globalAlpha = 1;
          }
        }
      }
    }
    
    // Draw interaction lines between competing sparklings
    for (let i = 0; i < sparklings.length; i++) {
      const sparklingA = sparklings[i];
      const posA = sparklingA.getPosition();
      const stateA = sparklingA.getState();
      
      for (let j = i + 1; j < sparklings.length; j++) {
        const sparklingB = sparklings[j];
        const posB = sparklingB.getPosition();
        const stateB = sparklingB.getState();
        
        // Calculate distance between sparklings
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);
        
        // Draw line between competing sparklings
        if (distance < 30) {
          let interactionColor = 'rgba(200, 200, 200, 0.3)'; // Neutral interaction
          let lineWidth = 1;
          
          // If both are competing, show competition interaction
          if ((stateA === SparklingState.COMPETING && stateB === SparklingState.COLLECTING) ||
              (stateA === SparklingState.COLLECTING && stateB === SparklingState.COMPETING) ||
              (stateA === SparklingState.COMPETING && stateB === SparklingState.COMPETING)) {
            
            // Competition - red line
            interactionColor = 'rgba(255, 50, 50, 0.6)';
            lineWidth = 2;
            
            // Draw lightning bolt effect
            ctx.strokeStyle = interactionColor;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            
            const midX = (posA.x + posB.x) / 2;
            const midY = (posA.y + posB.y) / 2;
            const offsetX = (posB.y - posA.y) * 0.15;
            const offsetY = (posA.x - posB.x) * 0.15;
            
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(midX + offsetX, midY + offsetY);
            ctx.lineTo(midX - offsetX, midY - offsetY);
            ctx.lineTo(posB.x, posB.y);
            ctx.stroke();
            
            // Draw competition symbol
            ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
            ctx.beginPath();
            ctx.arc(midX, midY, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw crossed swords emoji
            ctx.font = '12px Arial';
            ctx.fillText('⚔️', midX - 6, midY - 6);
          } 
          // If one is in collecting state and the other isn't competing
          else if ((stateA === SparklingState.COLLECTING && stateB !== SparklingState.COMPETING) ||
                  (stateA !== SparklingState.COMPETING && stateB === SparklingState.COLLECTING)) {
            
            // Potential competition - yellow line
            interactionColor = 'rgba(255, 200, 0, 0.4)';
            lineWidth = 1;
            
            ctx.strokeStyle = interactionColor;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posB.x, posB.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          // If both collecting but not competing yet
          else if (stateA === SparklingState.COLLECTING && stateB === SparklingState.COLLECTING) {
            // Tension - orange line
            interactionColor = 'rgba(255, 150, 0, 0.5)';
            lineWidth = 1.5;
            
            ctx.strokeStyle = interactionColor;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posB.x, posB.y);
            ctx.stroke();
            
            // Draw alert symbol
            ctx.fillStyle = 'rgba(255, 150, 0, 0.7)';
            const midX = (posA.x + posB.x) / 2;
            const midY = (posA.y + posB.y) / 2;
            ctx.font = '10px Arial';
            ctx.fillText('⚠️', midX - 5, midY - 5);
          }
          // Basic encounter
          else if (distance < 20) {
            ctx.strokeStyle = interactionColor;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posB.x, posB.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }
    
    // Then draw all sparklings
    for (const sparkling of sparklings) {
      sparkling.render(ctx, showDetails);
    }
  }
  
  /**
   * Get a consistent color for a sparkling based on its ID
   */
  private getSparklingColor(id: number): string {
    // Generate a bright, saturated color based on ID
    const hue = (id * 137) % 360; // Use golden ratio approximation for good distribution
    return `hsl(${hue}, 80%, 60%)`;
  }

  /**
   * Get the rendering context
   */
  public getContext(): CanvasRenderingContext2D {
    return this.context;
  }
}