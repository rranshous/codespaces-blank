// filepath: /workspaces/codespaces-blank/src/entities/sparkling/sparklingMovement.ts
import { SparklingCore } from "./sparklingCore";
import { Position, SparklingState } from "../sparklingTypes";
import { World } from "@core/world";

/**
 * Handles movement and navigation for Sparkling entities
 */
export class SparklingMovement {
  private sparklingCore: SparklingCore;
  
  constructor(sparklingCore: SparklingCore) {
    this.sparklingCore = sparklingCore;
  }
  
  /**
   * Check if the Sparkling is at a specific position
   */
  public isAtPosition(position: Position): boolean {
    const currentPosition = this.sparklingCore.getPosition();
    const dx = currentPosition.x - position.x;
    const dy = currentPosition.y - position.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared < 25; // Distance of 5 units
  }
  
  /**
   * Move the Sparkling based on its current state and velocity
   */
  public move(deltaTime: number, world: World): void {
    // Get necessary properties from the core
    const core = this.sparklingCore as any; // Use any type for accessing protected properties
    const state = this.sparklingCore.getState();
    const position = core.position;
    const velocity = core.velocity;
    const targetPosition = core.targetPosition;
    const stats = core.stats;
    const parameters = this.sparklingCore.getParameters();
    
    if (state === SparklingState.IDLE || state === SparklingState.RESTING || state === SparklingState.COLLECTING) {
      // Don't move in these states
      return;
    }
    
    // If we have a target position, move towards it
    if (targetPosition) {
      const dx = targetPosition.x - position.x;
      const dy = targetPosition.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If we're close enough to the target, we've reached it
      if (distance < 5) {
        core.targetPosition = null;
        
        // If we were seeking, start collecting
        if (state === SparklingState.SEEKING_FOOD || state === SparklingState.SEEKING_ENERGY) {
          core.state = SparklingState.COLLECTING;
          core.stateTimer = 0;
          core.velocity = { vx: 0, vy: 0 };
          return;
        }
      } else {
        // Move toward target
        // Adjust the speed based on state - more urgent states move faster
        let speedModifier = 2.5; // Significantly increased base speed modifier from 1.5 to 2.5
        
        // Access resources to calculate ratios
        const resources = this.sparklingCore.getResourceLevels();
        const foodRatio = resources.food / this.sparklingCore.getMaxFood();
        const energyRatio = resources.neuralEnergy / this.sparklingCore.getMaxNeuralEnergy();
        
        if (state === SparklingState.SEEKING_FOOD && foodRatio < parameters.criticalHungerThreshold) {
          speedModifier = 3.0; // Increased from 2.0 to 3.0 for critically hungry
        } else if (state === SparklingState.SEEKING_ENERGY && energyRatio < parameters.criticalEnergyThreshold) {
          speedModifier = 3.0; // Increased from 2.0 to 3.0 for critically low energy
        }
        
        core.velocity = {
          vx: (dx / distance) * stats.speed * speedModifier,
          vy: (dy / distance) * stats.speed * speedModifier
        };
      }
    }
    
    // Calculate movement considering terrain
    const terrainProps = world.getTerrainPropertiesAt(position.x, position.y);
    const movementFactor = terrainProps ? 1 / terrainProps.movementCost : 1;
    
    // Apply velocity to position - significantly increased movement speed by 2.5x
    position.x += velocity.vx * deltaTime * stats.speed * movementFactor * 2.5;
    position.y += velocity.vy * deltaTime * stats.speed * movementFactor * 2.5;
    
    // Keep within world bounds
    position.x = Math.max(0, Math.min(world.getDimensions().width * 20 - 1, position.x));
    position.y = Math.max(0, Math.min(world.getDimensions().height * 20 - 1, position.y));
  }
  
  /**
   * Set a random movement direction
   */
  public setRandomMovement(): void {
    const core = this.sparklingCore as any;
    const velocity = core.velocity;
    const stats = core.stats;
    const parameters = this.sparklingCore.getParameters();
    
    // Influence by novelty preference
    // High novelty: more random directions
    // Low novelty: tend to continue in the current direction
    let angle: number;
    
    if (Math.random() < parameters.noveltyPreference) {
      // Completely random direction
      angle = Math.random() * Math.PI * 2;
    } else {
      // Similar to current direction with some variation
      const currentAngle = velocity.vx === 0 && velocity.vy === 0 
        ? Math.random() * Math.PI * 2  // If not moving, pick random
        : Math.atan2(velocity.vy, velocity.vx);
        
      // Add some variation to the current angle
      angle = currentAngle + (Math.random() * 0.5 - 0.25) * Math.PI;
    }
    
    core.velocity = {
      vx: Math.cos(angle) * stats.speed,
      vy: Math.sin(angle) * stats.speed
    };
  }
  
  /**
   * Transition to the exploring state with a random direction
   */
  public transitionToExploring(): void {
    const core = this.sparklingCore as any;
    core.state = SparklingState.EXPLORING;
    core.stateTimer = 0;
    this.setRandomMovement();
  }
  
  /**
   * Record an encounter with another Sparkling and adjust movement if needed
   */
  public recordEncounter(otherSparkling: any, outcome: 'neutral' | 'positive' | 'negative'): void {
    const core = this.sparklingCore as any;
    const position = core.position;
    const parameters = this.sparklingCore.getParameters();
    const memory = core.memory;
    const stats = core.stats;
    
    // The likelihood of recording an encounter depends on the cooperation tendency
    // Cooperative Sparklings are more likely to remember encounters
    const recordChance = 0.5 + parameters.cooperationTendency * 0.5;
    
    if (Math.random() < recordChance) {
      memory.addEncounterMemory(
        { ...position },
        otherSparkling.getId(),
        outcome
      );
    }
    
    // If we're too close to another Sparkling and we prefer more personal space,
    // move away slightly based on our personal space preference
    const otherPosition = otherSparkling.getPosition();
    const dx = position.x - otherPosition.x;
    const dy = position.y - otherPosition.y;
    const distanceSquared = dx * dx + dy * dy;
    
    if (distanceSquared < parameters.personalSpaceFactor * parameters.personalSpaceFactor) {
      // Move away slightly
      const distance = Math.sqrt(distanceSquared);
      if (distance > 0) {
        core.velocity = {
          vx: (dx / distance) * stats.speed * 0.5,
          vy: (dy / distance) * stats.speed * 0.5
        };
      }
    }
  }
  
  /**
   * Scan for resources in the vicinity and set a target if found
   */
  public lookForResources(world: World, lookingForFood: boolean): void {
    const core = this.sparklingCore as any;
    const position = core.position;
    const parameters = this.sparklingCore.getParameters();
    const stats = core.stats;
    
    // Get the current grid cell
    const currentCell = world.getCell(position.x, position.y);
    if (!currentCell) return;
    
    // Search radius adjusted by parameter
    const effectiveSensorRadius = stats.sensorRadius * 
                               (1 + (parameters.explorationRange - 200) / 200);
    
    // Search radius in grid coordinates
    const searchRadiusInCells = Math.floor(effectiveSensorRadius / 20);
    let bestCell = null;
    let bestValue = 0;
    
    // Adjust resource preference based on parameter
    // resourcePreference ranges from -1 (food) to 1 (energy)
    let foodPreference = 1.0;
    let energyPreference = 1.0;
    
    if (parameters.resourcePreference < 0) {
      // Prefer food over energy
      energyPreference = 1.0 + parameters.resourcePreference;
    } else if (parameters.resourcePreference > 0) {
      // Prefer energy over food
      foodPreference = 1.0 - parameters.resourcePreference;
    }
    
    // Search the grid cells around the current position
    for (let dy = -searchRadiusInCells; dy <= searchRadiusInCells; dy++) {
      for (let dx = -searchRadiusInCells; dx <= searchRadiusInCells; dx++) {
        const cell = world.getCell(
          position.x + dx * 20, 
          position.y + dy * 20
        );
        
        if (cell) {
          // Calculate distance to this cell
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Skip if too far away
          if (distance > searchRadiusInCells) continue;
          
          let cellValue = 0;
          
          if (lookingForFood && cell.resources > 0) {
            cellValue = (cell.resources * foodPreference) / (distance + 0.1);
          } else if (!lookingForFood && cell.neuralEnergy > 0) {
            cellValue = (cell.neuralEnergy * energyPreference) / (distance + 0.1);
          }
          
          // If this cell has a better value, remember it
          if (cellValue > bestValue) {
            bestValue = cellValue;
            bestCell = cell;
          }
        }
      }
    }
    
    // If we found a good cell, set it as the target
    if (bestCell && bestValue > 0) {
      core.targetPosition = {
        x: bestCell.x * 20 + 10, // Center of the cell
        y: bestCell.y * 20 + 10
      };
    } else if (!core.targetPosition) {
      // If we didn't find anything and have no target, continue exploring
      this.setRandomMovement();
    }
  }
}