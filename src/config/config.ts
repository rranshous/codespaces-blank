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
  initialSparklingCount: 12,  // Increased from 5 to 12
  minSparklingCount: 5,       // Minimum allowed population
  maxSparklingCount: 30,      // Maximum allowed population
  populationBalanceRange: 2,  // Allow variation of ±2 from target population
  autoPopulationControl: true, // Enable automatic population control
  populationGrowthRate: 0.2,   // Can grow by up to 20% at once
  populationDeclineRate: 0.1,  // Can decline by up to 10% at once
  sparklingSize: 10,
  sparklingSpeed: 2,
  sparklingMaxFood: 100,
  sparklingMaxNeuralEnergy: 100,
  
  // Resource parameters
  resourceSpawnRate: 0.0003,  // Base resource spawn rate
  resourceSpawnRatePerSparkling: -0.00001, // Decrease in spawn rate per Sparkling (creates limiting factor)
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