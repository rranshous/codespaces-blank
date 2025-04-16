/**
 * Enum representing different states a Sparkling can be in
 */
export enum SparklingState {
  IDLE = 'idle',
  EXPLORING = 'exploring',
  SEEKING_FOOD = 'seeking_food',
  SEEKING_ENERGY = 'seeking_energy',
  COLLECTING = 'collecting',
  RESTING = 'resting'
}

/**
 * Interface for position in 2D space
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Interface for velocity in 2D space
 */
export interface Velocity {
  vx: number;
  vy: number;
}

/**
 * Sparkling base stats interface
 */
export interface SparklingStats {
  maxFood: number;
  maxNeuralEnergy: number;
  speed: number;
  sensorRadius: number;
  foodConsumptionRate: number;
  neuralEnergyConsumptionRate: number;
  collectionRate: number;
}