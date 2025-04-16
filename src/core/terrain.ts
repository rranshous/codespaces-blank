/**
 * Enum representing different terrain types in the world
 */
export enum TerrainType {
  PLAIN = 'plain',
  WATER = 'water',
  MOUNTAIN = 'mountain',
  FOREST = 'forest',
  DESERT = 'desert'
}

/**
 * Represents a cell in the world grid
 */
export interface GridCell {
  x: number;
  y: number;
  terrain: TerrainType;
  resources: number; // Amount of resources in this cell
  neuralEnergy: number; // Amount of neural energy in this cell
}

/**
 * Properties for terrain types
 */
export interface TerrainProperties {
  movementCost: number; // How difficult it is to move through this terrain (1.0 = normal)
  resourceMultiplier: number; // How abundant resources are in this terrain
  neuralEnergyMultiplier: number; // How abundant neural energy is in this terrain
  color: string; // Color used for rendering this terrain
}

/**
 * Terrain type properties lookup
 */
export const TERRAIN_PROPERTIES: Record<TerrainType, TerrainProperties> = {
  [TerrainType.PLAIN]: {
    movementCost: 1.0,
    resourceMultiplier: 1.0,
    neuralEnergyMultiplier: 1.0,
    color: '#8BC34A' // Light green
  },
  [TerrainType.WATER]: {
    movementCost: 2.5,
    resourceMultiplier: 0.2,
    neuralEnergyMultiplier: 1.5,
    color: '#2196F3' // Blue
  },
  [TerrainType.MOUNTAIN]: {
    movementCost: 3.0,
    resourceMultiplier: 0.4,
    neuralEnergyMultiplier: 3.0,
    color: '#757575' // Gray
  },
  [TerrainType.FOREST]: {
    movementCost: 1.5,
    resourceMultiplier: 2.0,
    neuralEnergyMultiplier: 1.2,
    color: '#33691E' // Dark green
  },
  [TerrainType.DESERT]: {
    movementCost: 1.8,
    resourceMultiplier: 0.3,
    neuralEnergyMultiplier: 0.5,
    color: '#FFC107' // Yellow
  }
};