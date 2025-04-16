import { SimulationConfig, getConfig } from '@config/config';
import { Renderer } from '@rendering/renderer';
import { TimeManager } from '@utils/time';
import { World, WorldGenerationOptions } from '@core/world';
import { Sparkling } from '@entities/sparkling';
import { Position } from '@entities/sparklingTypes';

/**
 * Main simulation class that manages the entire simulation
 */
export class Simulation {
  private config: SimulationConfig;
  private renderer: Renderer;
  private timeManager: TimeManager;
  private world: World;
  private sparklings: Sparkling[] = [];
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private showDebug: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<SimulationConfig> = {}) {
    this.config = getConfig(config);
    this.renderer = new Renderer(canvas, this.config);
    this.timeManager = new TimeManager();
    this.world = new World(this.config);
  }

  /**
   * Initialize the simulation
   */
  public initialize(worldOptions: WorldGenerationOptions = {}): void {
    this.setupEventListeners();
    this.world.initialize(worldOptions);
    this.createSparklings();
    
    // Perform an initial render
    this.render();
  }

  /**
   * Create initial sparklings
   */
  private createSparklings(): void {
    // Clear existing sparklings
    this.sparklings = [];
    
    // Create the initial sparklings
    for (let i = 0; i < this.config.initialSparklingCount; i++) {
      // Generate a random position within the world
      const position: Position = {
        x: Math.random() * this.config.worldWidth,
        y: Math.random() * this.config.worldHeight
      };
      
      // Create a new sparkling
      const sparkling = new Sparkling(i, position, this.config);
      this.sparklings.push(sparkling);
    }
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
  public reset(worldOptions: WorldGenerationOptions = {}): void {
    this.stop();
    this.timeManager.reset();
    this.world.initialize(worldOptions);
    this.createSparklings();
    this.render(); // Render the new world state
  }

  /**
   * Toggle debug visualization
   */
  public toggleDebug(): void {
    this.showDebug = !this.showDebug;
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
    // Spawn new resources in the world
    this.world.spawnResources(deltaTime);
    
    // Update all sparklings
    for (const sparkling of this.sparklings) {
      sparkling.update(deltaTime, this.world);
    }
    
    // Check for sparkling encounters
    this.checkSparklingEncounters();
  }

  /**
   * Check for encounters between sparklings
   */
  private checkSparklingEncounters(): void {
    const encounterRadius = 30; // Distance at which sparklings notice each other
    
    for (let i = 0; i < this.sparklings.length; i++) {
      const sparklingA = this.sparklings[i];
      const posA = sparklingA.getPosition();
      
      for (let j = i + 1; j < this.sparklings.length; j++) {
        const sparklingB = this.sparklings[j];
        const posB = sparklingB.getPosition();
        
        // Calculate distance between sparklings
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distanceSquared = dx * dx + dy * dy;
        
        // If they're close enough, record the encounter
        if (distanceSquared < encounterRadius * encounterRadius) {
          // For now, encounters are always neutral
          // In future implementations, this could depend on competition or cooperation
          sparklingA.recordEncounter(sparklingB, 'neutral');
          sparklingB.recordEncounter(sparklingA, 'neutral');
        }
      }
    }
  }

  /**
   * Render the current simulation state
   */
  private render(): void {
    this.renderer.clear();
    
    // Draw the world (terrain and resources)
    this.renderer.drawWorld(this.world);
    
    // Draw all sparklings
    for (const sparkling of this.sparklings) {
      sparkling.render(this.renderer.getContext(), this.showDebug);
    }
    
    this.renderer.drawDebugInfo(this.timeManager.getFPS(), this.world);
    
    // Draw additional debug information if enabled
    if (this.showDebug) {
      this.drawMemoryStats();
    }
  }
  
  /**
   * Draw memory statistics for debugging
   */
  private drawMemoryStats(): void {
    const context = this.renderer.getContext();
    context.fillStyle = 'white';
    context.font = '12px Arial';
    context.textAlign = 'right';
    
    // Position on right side
    const rightEdge = this.renderer.getContext().canvas.width - 10;
    
    // Start below the world dimensions info
    let y = 120;
    
    context.fillText('Memory Stats:', rightEdge, y);
    y += 20;
    
    for (const sparkling of this.sparklings) {
      const memory = sparkling.getMemory();
      context.fillText(
        `Sparkling ${sparkling.getId()}: ${memory.getCount()}/${memory.getCapacity()} memories`,
        rightEdge, 
        y
      );
      y += 20;
    }
    
    // Reset text alignment for other rendering
    context.textAlign = 'left';
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
    
    // Add debug toggle button
    const debugButton = document.createElement('button');
    debugButton.id = 'toggle-debug';
    debugButton.textContent = 'Toggle Memory View';
    debugButton.addEventListener('click', () => this.toggleDebug());
    
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv) {
      controlsDiv.appendChild(debugButton);
    }
  }

  /**
   * Get the current configuration
   */
  public getConfig(): SimulationConfig {
    return this.config;
  }
  
  /**
   * Get the world
   */
  public getWorld(): World {
    return this.world;
  }
  
  /**
   * Get all sparklings
   */
  public getSparklings(): Sparkling[] {
    return [...this.sparklings];
  }
}