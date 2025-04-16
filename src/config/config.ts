/**
 * Simulation configuration parameters
 */
export interface SimulationConfig {
  // World parameters
  worldWidth: number;
  worldHeight: number;
  gridCellSize: number;
  
  // Rendering parameters
  fps: number;
  renderScale: number;
  
  // Sparkling parameters
  initialSparklingCount: number;
  sparklingSize: number;
  sparklingSpeed: number;
  sparklingMaxFood: number;
  sparklingMaxNeuralEnergy: number;
  
  // Resource parameters
  resourceSpawnRate: number;
  resourceValue: number;
  
  // Memory parameters
  memorySize: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SimulationConfig = {
  // World parameters
  worldWidth: 1000,
  worldHeight: 800,
  gridCellSize: 20,
  
  // Rendering parameters
  fps: 60,
  renderScale: 1,
  
  // Sparkling parameters
  initialSparklingCount: 12,  // Increased from 5 to 12
  sparklingSize: 10,
  sparklingSpeed: 2,
  sparklingMaxFood: 100,
  sparklingMaxNeuralEnergy: 100,
  
  // Resource parameters
  resourceSpawnRate: 0.0003,  // Reduced from 0.01 to 0.0003
  resourceValue: 10,
  
  // Memory parameters
  memorySize: 20
};

/**
 * Returns a configuration object, potentially overriding defaults with custom values
 */
export function getConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}