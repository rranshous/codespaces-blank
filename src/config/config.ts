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
  minSparklingCount: number;    // Minimum number of Sparklings allowed
  maxSparklingCount: number;    // Maximum number of Sparklings allowed
  populationBalanceRange: number; // Acceptable deviation from target population
  autoPopulationControl: boolean; // Whether to automatically control population
  populationGrowthRate: number; // Rate at which population can grow (0-1)
  populationDeclineRate: number; // Rate at which population can decline (0-1)
  sparklingSize: number;
  sparklingSpeed: number;
  sparklingMaxFood: number;
  sparklingMaxNeuralEnergy: number;
  
  // Resource parameters
  resourceSpawnRate: number;
  resourceSpawnRatePerSparkling: number; // Resource spawn rate adjustment per Sparkling
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
  initialSparklingCount: 12,
  minSparklingCount: 5,
  maxSparklingCount: 30,
  populationBalanceRange: 2,
  autoPopulationControl: true,
  populationGrowthRate: 0.2,
  populationDeclineRate: 0.1,
  sparklingSize: 10,
  sparklingSpeed: 3.5,             // Increased from 2 to 3.5 for faster movement
  sparklingMaxFood: 100,
  sparklingMaxNeuralEnergy: 100,
  
  // Resource parameters
  resourceSpawnRate: 0.0003,
  resourceSpawnRatePerSparkling: -0.0000025,  // Reduced sensitivity by 4x (from -0.00001)
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