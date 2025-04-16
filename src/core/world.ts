import { SimulationConfig } from "@config/config";
import { GridCell, TerrainType, TERRAIN_PROPERTIES, TerrainProperties } from "./terrain";

/**
 * Options for generating the world
 */
export interface WorldGenerationOptions {
  seed?: number;
  waterPercentage?: number;
  mountainPercentage?: number;
  forestPercentage?: number;
  desertPercentage?: number;
  noiseFactor?: number;
}

/**
 * Default generation options
 */
const DEFAULT_GENERATION_OPTIONS: WorldGenerationOptions = {
  seed: Date.now(),
  waterPercentage: 0.15,
  mountainPercentage: 0.1,
  forestPercentage: 0.2,
  desertPercentage: 0.1,
  noiseFactor: 0.2
};

/**
 * Class representing the simulation world and its grid
 */
export class World {
  private grid: GridCell[][] = [];
  private config: SimulationConfig;
  private gridWidth: number;
  private gridHeight: number;
  private random: () => number;
  private simulationTime: number = 0;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.gridWidth = Math.ceil(this.config.worldWidth / this.config.gridCellSize);
    this.gridHeight = Math.ceil(this.config.worldHeight / this.config.gridCellSize);
    this.random = Math.random;
  }

  /**
   * Initialize the world grid with generated terrain
   */
  public initialize(options: WorldGenerationOptions = {}): void {
    const finalOptions = { ...DEFAULT_GENERATION_OPTIONS, ...options };
    
    // Seed the random number generator if provided
    if (finalOptions.seed) {
      this.setRandomSeed(finalOptions.seed);
    }

    this.generateTerrain(finalOptions);
    this.initializeResources();
    this.simulationTime = 0;
  }
  
  /**
   * Update the simulation time
   * @param deltaTime Time elapsed since last update in seconds
   */
  public updateTime(deltaTime: number): void {
    this.simulationTime += deltaTime;
  }
  
  /**
   * Get the current simulation time in seconds
   * @returns Current simulation time in seconds
   */
  public getCurrentTime(): number {
    return this.simulationTime;
  }

  /**
   * Create a simple deterministic random number generator based on a seed
   */
  private setRandomSeed(seed: number): void {
    this.random = () => {
      // Simple LCG random number generator
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Generate terrain for the world
   */
  private generateTerrain(options: WorldGenerationOptions): void {
    // Initialize grid with plains
    this.grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = {
          x,
          y,
          terrain: TerrainType.PLAIN,
          resources: 0,
          neuralEnergy: 0
        };
      }
    }

    // Generate noise-based terrain
    this.generateNoiseTerrain(options);
  }

  /**
   * Generate terrain using a simple noise-based algorithm
   */
  private generateNoiseTerrain(options: WorldGenerationOptions): void {
    // Water generation (tends to cluster)
    this.generateClusteredTerrain(TerrainType.WATER, options.waterPercentage || 0.15, 0.6);
    
    // Mountain generation (tends to form ranges)
    this.generateClusteredTerrain(TerrainType.MOUNTAIN, options.mountainPercentage || 0.1, 0.7);
    
    // Forest generation (tends to cluster differently than water)
    this.generateClusteredTerrain(TerrainType.FOREST, options.forestPercentage || 0.2, 0.5);
    
    // Desert generation
    this.generateClusteredTerrain(TerrainType.DESERT, options.desertPercentage || 0.1, 0.4);
  }

  /**
   * Generate clusters of a specific terrain type
   */
  private generateClusteredTerrain(terrainType: TerrainType, percentage: number, clusterFactor: number): void {
    const targetCellCount = Math.floor(this.gridWidth * this.gridHeight * percentage);
    let placedCells = 0;
    
    // Place initial seed points
    const seedCount = Math.max(1, Math.floor(targetCellCount * 0.1));
    const seeds: {x: number, y: number}[] = [];
    
    for (let i = 0; i < seedCount; i++) {
      const x = Math.floor(this.random() * this.gridWidth);
      const y = Math.floor(this.random() * this.gridHeight);
      
      if (this.grid[y][x].terrain === TerrainType.PLAIN) {
        this.grid[y][x].terrain = terrainType;
        seeds.push({x, y});
        placedCells++;
      }
    }
    
    // Grow clusters from seed points
    while (placedCells < targetCellCount && seeds.length > 0) {
      // Pick a random seed
      const seedIndex = Math.floor(this.random() * seeds.length);
      const seed = seeds[seedIndex];
      
      // Try to expand in a random direction
      const directions = [
        {dx: -1, dy: 0}, {dx: 1, dy: 0}, 
        {dx: 0, dy: -1}, {dx: 0, dy: 1}
      ];
      
      const shuffledDirs = [...directions].sort(() => this.random() - 0.5);
      
      let expanded = false;
      for (const dir of shuffledDirs) {
        const nx = seed.x + dir.dx;
        const ny = seed.y + dir.dy;
        
        if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
          if (this.grid[ny][nx].terrain === TerrainType.PLAIN && this.random() < clusterFactor) {
            this.grid[ny][nx].terrain = terrainType;
            seeds.push({x: nx, y: ny});
            placedCells++;
            expanded = true;
            break;
          }
        }
      }
      
      // If this seed couldn't expand, remove it
      if (!expanded) {
        seeds.splice(seedIndex, 1);
      }
      
      // Break if we've reached the target
      if (placedCells >= targetCellCount) {
        break;
      }
    }
  }

  /**
   * Initialize resources across the world
   */
  private initializeResources(): void {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.grid[y][x];
        
        // Add some initial resources based on terrain type
        const terrainProps = TERRAIN_PROPERTIES[cell.terrain];
        
        // Base resource amount is influenced by terrain type and some randomness
        if (this.random() < 0.15 * terrainProps.resourceMultiplier) {  // Reduced from 0.3 to 0.15
          cell.resources = Math.ceil(this.random() * 10 * terrainProps.resourceMultiplier);
        }
        
        // Base neural energy amount is influenced by terrain type and some randomness
        if (this.random() < 0.1 * terrainProps.neuralEnergyMultiplier) {  // Reduced from 0.2 to 0.1
          cell.neuralEnergy = Math.ceil(this.random() * 5 * terrainProps.neuralEnergyMultiplier);
        }
      }
    }
  }

  /**
   * Spawn resources in the world based on current state and configuration
   * @param deltaTime Time elapsed since last update in seconds
   */
  public spawnResources(deltaTime: number): void {
    const spawnChance = this.config.resourceSpawnRate * deltaTime;
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        // Only add resources with a certain probability
        if (this.random() < spawnChance) {
          const cell = this.grid[y][x];
          const terrainProps = TERRAIN_PROPERTIES[cell.terrain];
          
          // Resource amount is influenced by terrain type
          if (this.random() < terrainProps.resourceMultiplier) {
            cell.resources += Math.ceil(this.random() * 5 * terrainProps.resourceMultiplier);
          }
          
          // Neural energy spawning 
          if (this.random() < terrainProps.neuralEnergyMultiplier) {
            cell.neuralEnergy += Math.ceil(this.random() * 2 * terrainProps.neuralEnergyMultiplier);
          }
        }
      }
    }
  }

  /**
   * Get a grid cell at specific coordinates
   */
  public getCell(x: number, y: number): GridCell | null {
    // Convert world coordinates to grid coordinates
    const gridX = Math.floor(x / this.config.gridCellSize);
    const gridY = Math.floor(y / this.config.gridCellSize);
    
    if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight) {
      return this.grid[gridY][gridX];
    }
    
    return null;
  }

  /**
   * Get the terrain properties at specific coordinates
   */
  public getTerrainPropertiesAt(x: number, y: number): TerrainProperties | null {
    const cell = this.getCell(x, y);
    if (cell) {
      return TERRAIN_PROPERTIES[cell.terrain];
    }
    return null;
  }

  /**
   * Collect resources from a specific cell
   * @returns The amount of resources collected
   */
  public collectResources(x: number, y: number, amount: number): number {
    const cell = this.getCell(x, y);
    if (!cell || cell.resources <= 0) return 0;
    
    const collected = Math.min(cell.resources, amount);
    cell.resources -= collected;
    return collected;
  }

  /**
   * Collect neural energy from a specific cell
   * @returns The amount of neural energy collected
   */
  public collectNeuralEnergy(x: number, y: number, amount: number): number {
    const cell = this.getCell(x, y);
    if (!cell || cell.neuralEnergy <= 0) return 0;
    
    const collected = Math.min(cell.neuralEnergy, amount);
    cell.neuralEnergy -= collected;
    return collected;
  }

  /**
   * Get the entire grid
   */
  public getGrid(): GridCell[][] {
    return this.grid;
  }

  /**
   * Get grid dimensions
   */
  public getDimensions(): { width: number, height: number } {
    return {
      width: this.gridWidth,
      height: this.gridHeight
    };
  }
}