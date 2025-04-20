// filepath: /workspaces/codespaces-blank/src/entities/sparkling/sparklingDecisions.ts
import { SparklingCore } from "./sparklingCore";
import { SparklingState } from "../sparklingTypes";
import { World } from "@core/world";
import { MemoryEventType } from "../memoryTypes";
import { Position } from "../sparklingTypes";

/**
 * Handles decision making for Sparkling entities
 */
export class SparklingDecisions {
  private sparklingCore: SparklingCore;
  
  constructor(sparklingCore: SparklingCore) {
    this.sparklingCore = sparklingCore;
  }
  
  /**
   * Update the Sparkling's state based on its conditions and parameters
   */
  public updateState(world: World): void {
    const core = this.sparklingCore as any;
    const state = this.sparklingCore.getState();
    const resources = this.sparklingCore.getResourceLevels();
    const parameters = this.sparklingCore.getParameters();
    
    // Calculate ratios for decision making
    const foodRatio = resources.food / this.sparklingCore.getMaxFood();
    const energyRatio = resources.neuralEnergy / this.sparklingCore.getMaxNeuralEnergy();
    
    // Check for state transitions
    switch (state) {
      case SparklingState.IDLE:
        // Transition from IDLE after a short time
        if (core.stateTimer > core.idleTime) {
          this.transitionToExploring();
        }
        break;
        
      case SparklingState.EXPLORING:
        // Apply exploration duration from parameters
        const maxExplorationTime = parameters.explorationDuration;
        
        // If food is low, prioritize finding food
        if (foodRatio < parameters.hungerThreshold) {
          const isCritical = foodRatio < parameters.criticalHungerThreshold;
          
          // Only change state if either:
          // 1. The situation is critical, or
          // 2. The persistence factor allows for a state change
          if (isCritical || Math.random() > parameters.persistenceFactor) {
            core.state = SparklingState.SEEKING_FOOD;
            core.stateTimer = 0;
            core.targetPosition = this.findResourceFromMemory(MemoryEventType.RESOURCE_FOUND);
          }
        }
        // If neural energy is low, prioritize finding energy
        else if (energyRatio < parameters.energyLowThreshold) {
          const isCritical = energyRatio < parameters.criticalEnergyThreshold;
          
          // Only change state if either condition is met
          if (isCritical || Math.random() > parameters.persistenceFactor) {
            core.state = SparklingState.SEEKING_ENERGY;
            core.stateTimer = 0;
            core.targetPosition = this.findResourceFromMemory(MemoryEventType.ENERGY_FOUND);
          }
        }
        // If we've been exploring for a while, take a rest
        else if (core.stateTimer > maxExplorationTime) {
          core.state = SparklingState.RESTING;
          core.stateTimer = 0;
          core.velocity = { vx: 0, vy: 0 };
          core.idleTime = parameters.restDuration * (0.8 + Math.random() * 0.4); // Small variation in rest time
        }
        
        // Occasionally change direction while exploring
        // More likely to change if novelty preference is high
        if (core.stateTimer > 3 && Math.random() < 0.1 * (1 + parameters.noveltyPreference)) {
          this.setRandomMovement();
        }
        break;
        
      case SparklingState.SEEKING_FOOD:
        // If food is plentiful again, go back to exploring
        if (foodRatio > parameters.foodSatiationThreshold) {
          core.state = SparklingState.EXPLORING;
          core.stateTimer = 0;
          core.targetPosition = null;
          this.setRandomMovement();
        }
        // Look for food in vicinity or use memory
        else {
          // If we don't have a target or reached our target, find a new one
          if (!core.targetPosition || 
              (core.targetPosition && this.isAtPosition(core.targetPosition))) {
            
            // First try to find a target from memory
            core.targetPosition = this.findResourceFromMemory(MemoryEventType.RESOURCE_FOUND);
            
            // If we don't have a remembered target, look for visible resources
            if (!core.targetPosition) {
              this.lookForResources(world, true);
            }
          }
        }
        break;
        
      case SparklingState.SEEKING_ENERGY:
        // If neural energy is plentiful again, go back to exploring
        if (energyRatio > parameters.energySatiationThreshold) {
          core.state = SparklingState.EXPLORING;
          core.stateTimer = 0;
          core.targetPosition = null;
          this.setRandomMovement();
        }
        // Look for neural energy in vicinity or use memory
        else {
          // If we don't have a target or reached our target, find a new one
          if (!core.targetPosition || 
              (core.targetPosition && this.isAtPosition(core.targetPosition))) {
            
            // First try to find a target from memory
            core.targetPosition = this.findResourceFromMemory(MemoryEventType.ENERGY_FOUND);
            
            // If we don't have a remembered target, look for visible resources
            if (!core.targetPosition) {
              this.lookForResources(world, false);
            }
          }
        }
        break;
        
      case SparklingState.COLLECTING:
        // After a short time collecting, go back to previous state
        if (core.stateTimer > 1.5) {
          // If we still need food or energy, continue seeking
          if (foodRatio < parameters.hungerThreshold) {
            core.state = SparklingState.SEEKING_FOOD;
          } else if (energyRatio < parameters.energyLowThreshold) {
            core.state = SparklingState.SEEKING_ENERGY;
          } else {
            core.state = SparklingState.EXPLORING;
            this.setRandomMovement();
          }
          core.stateTimer = 0;
        }
        break;
        
      case SparklingState.RESTING:
        // After resting, go back to exploring
        if (core.stateTimer > core.idleTime) {
          this.transitionToExploring();
        }
        break;
        
      case SparklingState.COMPETING:
        // Competing state is managed by competition penalties
        break;
    }
  }
  
  /**
   * Find a target position from memory
   */
  private findResourceFromMemory(type: MemoryEventType): Position | null {
    const core = this.sparklingCore as any;
    const parameters = this.sparklingCore.getParameters();
    const memory = core.memory;
    const resourceLevels = this.sparklingCore.getResourceLevels();
    
    // The memory trust factor influences how much we rely on memory vs. current perceptions
    if (Math.random() > parameters.memoryTrustFactor) {
      return null; // Sometimes ignore memory based on trust factor
    }
    
    // Find the nearest memory of this type
    const nearestMemory = memory.findNearestMemory(core.position, type);
    
    if (nearestMemory) {
      return { ...nearestMemory.position };
    }
    
    // If we have no helpful memories or decide not to use them,
    // consider returning to "home" position if we're low on resources
    if ((type === MemoryEventType.RESOURCE_FOUND && resourceLevels.food < this.sparklingCore.getMaxFood() * 0.3) ||
        (type === MemoryEventType.ENERGY_FOUND && resourceLevels.neuralEnergy < this.sparklingCore.getMaxNeuralEnergy() * 0.3)) {
      if (core.homePosition && Math.random() < parameters.memoryTrustFactor * 0.5) {
        return { ...core.homePosition };
      }
    }
    
    return null;
  }
  
  /**
   * Check if the Sparkling is at a specific position
   */
  private isAtPosition(position: Position): boolean {
    const currentPosition = this.sparklingCore.getPosition();
    const dx = currentPosition.x - position.x;
    const dy = currentPosition.y - position.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared < 25; // Distance of 5 units
  }
  
  /**
   * Set a random movement direction
   */
  private setRandomMovement(): void {
    // Call a helper that's expected to be available in another component
    const movementHelper = this.sparklingCore as any;
    if (typeof movementHelper.setRandomMovement === 'function') {
      movementHelper.setRandomMovement();
    }
  }
  
  /**
   * Look for resources in the vicinity
   */
  private lookForResources(world: World, lookingForFood: boolean): void {
    // Call a helper that's expected to be available in another component
    const movementHelper = this.sparklingCore as any;
    if (typeof movementHelper.lookForResources === 'function') {
      movementHelper.lookForResources(world, lookingForFood);
    }
  }
  
  /**
   * Transition to the exploring state with a random direction
   */
  private transitionToExploring(): void {
    // Call a helper that's expected to be available in another component
    const movementHelper = this.sparklingCore as any;
    if (typeof movementHelper.transitionToExploring === 'function') {
      movementHelper.transitionToExploring();
    } else {
      // Fallback implementation if method not available
      const core = this.sparklingCore as any;
      core.state = SparklingState.EXPLORING;
      core.stateTimer = 0;
      this.setRandomMovement();
    }
  }
  
  /**
   * Update memory based on what the Sparkling observes
   */
  public updateMemoryFromSurroundings(world: World, deltaTime: number): void {
    const core = this.sparklingCore as any;
    const parameters = this.sparklingCore.getParameters();
    
    // Adjust check frequencies based on memory trust factor
    const resourceCheckInterval = 1.0 * (1 / parameters.memoryTrustFactor);
    const terrainCheckInterval = 3.0 * (1 / parameters.memoryTrustFactor);
    
    // Check for resources periodically
    if (core.totalTime - core.lastResourceCheck > resourceCheckInterval) {
      core.lastResourceCheck = core.totalTime;
      this.checkForResourcesAndUpdateMemory(world);
    }
    
    // Check terrain periodically
    if (core.totalTime - core.lastTerrainCheck > terrainCheckInterval) {
      core.lastTerrainCheck = core.totalTime;
      this.checkTerrainAndUpdateMemory(world);
    }
  }
  
  /**
   * Check for resources in the vicinity and update memory
   */
  private checkForResourcesAndUpdateMemory(world: World): void {
    const core = this.sparklingCore as any;
    const parameters = this.sparklingCore.getParameters();
    const stats = core.stats;
    const position = core.position;
    const memory = core.memory;
    
    // Adjust sensor radius based on exploration range parameter
    const effectiveSensorRadius = stats.sensorRadius * 
                               (1 + (parameters.explorationRange - 200) / 200);
    
    const searchRadiusInCells = Math.floor(effectiveSensorRadius / 20);
    
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
          
          // If we found resources, remember it
          if (cell.resources > 0) {
            memory.addResourceMemory(
              MemoryEventType.RESOURCE_FOUND,
              { x: cell.x * 20 + 10, y: cell.y * 20 + 10 },
              cell.resources
            );
          }
          
          // If we found neural energy, remember it
          if (cell.neuralEnergy > 0) {
            memory.addEnergyMemory(
              MemoryEventType.ENERGY_FOUND,
              { x: cell.x * 20 + 10, y: cell.y * 20 + 10 },
              cell.neuralEnergy
            );
          }
        }
      }
    }
  }
  
  /**
   * Check terrain type at current position and update memory
   */
  private checkTerrainAndUpdateMemory(world: World): void {
    const core = this.sparklingCore as any;
    const position = core.position;
    const memory = core.memory;
    
    const cell = world.getCell(position.x, position.y);
    if (cell) {
      // Record the terrain type we're currently on
      memory.addTerrainMemory(
        { x: cell.x * 20 + 10, y: cell.y * 20 + 10 },
        cell.terrain,
        1 // Size estimate - could be improved with clustering
      );
    }
  }
}