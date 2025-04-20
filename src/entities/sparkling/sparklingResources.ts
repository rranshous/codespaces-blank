// filepath: /workspaces/codespaces-blank/src/entities/sparkling/sparklingResources.ts
import { SparklingCore } from "./sparklingCore";
import { MemoryEventType } from "../memoryTypes";
import { World } from "@core/world";
import { SparklingState } from "../sparklingTypes";

/**
 * Handles resource management for Sparkling entities
 */
export class SparklingResources {
  private sparklingCore: SparklingCore;
  
  constructor(sparklingCore: SparklingCore) {
    this.sparklingCore = sparklingCore;
  }
  
  /**
   * Consume food and neural energy over time
   */
  public consumeResources(deltaTime: number): void {
    const core = this.sparklingCore as any;
    const parameters = this.sparklingCore.getParameters();
    const stats = core.stats;
    const state = this.sparklingCore.getState();
    
    // Don't consume resources if already fading out
    if (core.isFadingOut) return;
    
    // Consume food at base rate
    core.food = Math.max(0, core.food - stats.foodConsumptionRate * deltaTime);
    
    // Only consume neural energy during inference (thinking)
    if (core.inferenceStatus === "THINKING") {
      // Increased consumption during inference - thinking is energy-intensive
      const energyConsumptionRate = stats.neuralEnergyConsumptionRate * 3;
      core.neuralEnergy = Math.max(0, core.neuralEnergy - energyConsumptionRate * deltaTime);
    }
    
    // Extra food consumption during movement
    if (state !== SparklingState.IDLE && state !== SparklingState.RESTING) {
      // Movement costs extra food - reduced from 0.2 to 0.1
      const movementCost = 0.1 * deltaTime;
      core.food = Math.max(0, core.food - movementCost);
    }
    
    // Critical low food causes neural energy loss
    if (core.food < stats.maxFood * parameters.criticalHungerThreshold) {
      const criticalEnergyLoss = deltaTime * 2; // Lose energy faster when critically hungry
      core.neuralEnergy = Math.max(0, core.neuralEnergy - criticalEnergyLoss);
    }
    
    // Check if both food and neural energy are depleted to initiate fadeout
    this.checkResourceDepletion();
  }
  
  /**
   * Check if the Sparkling's resources are depleted and start fadeout if necessary
   */
  private checkResourceDepletion(): void {
    const core = this.sparklingCore as any;
    
    // If both food and neural energy are completely depleted, start fadeout
    if (core.food <= 0 && core.neuralEnergy <= 0 && !core.isFadingOut) {
      this.startFadeout();
    }
  }
  
  /**
   * Start the fadeout process for this Sparkling
   */
  private startFadeout(): void {
    const core = this.sparklingCore as any;
    
    // Set fadeout flag and update state
    core.isFadingOut = true;
    core.state = SparklingState.FADING;
    core.stateTimer = 0;
    core.fadeoutProgress = 0;
    
    // Stop movement
    core.velocity = { vx: 0, vy: 0 };
    
    console.log(`Sparkling ${core.id} has started fading out due to resource depletion.`);
  }
  
  /**
   * Initiate a controlled fadeout process for population control
   * This is triggered externally by the population control system
   */
  public initiateControlledFadeout(): void {
    const core = this.sparklingCore as any;
    
    // Set fadeout flag and update state
    core.isFadingOut = true;
    core.state = SparklingState.FADING;
    core.stateTimer = 0;
    core.fadeoutProgress = 0;
    
    // Stop movement
    core.velocity = { vx: 0, vy: 0 };
    
    console.log(`Sparkling ${core.id} has started controlled fadeout due to population control.`);
  }
  
  /**
   * Update the fadeout progress
   * @param deltaTime Time elapsed since last update
   */
  public updateFadeout(deltaTime: number): void {
    const core = this.sparklingCore as any;
    
    // Only update if we're fading out
    if (!core.isFadingOut) return;
    
    // Progress the fadeout
    const progressIncrement = deltaTime / core.fadeoutDuration;
    core.fadeoutProgress = Math.min(1.0, core.fadeoutProgress + progressIncrement);
    
    // If fadeout is complete, mark ready for removal
    if (core.fadeoutProgress >= 1.0) {
      core.isReadyToRemove = true;
      console.log(`Sparkling ${core.id} has completed fadeout and is ready to be removed.`);
    }
  }
  
  /**
   * Collect resources from the current position
   */
  public collectResources(world: World): void {
    const core = this.sparklingCore as any;
    const state = this.sparklingCore.getState();
    const parameters = this.sparklingCore.getParameters();
    const stats = core.stats;
    
    if (state !== SparklingState.COLLECTING) return;
    
    // Adjust collection amounts based on collection efficiency parameter and competition penalty
    const foodToCollect = stats.collectionRate * core.stateTimer * parameters.collectionEfficiency * (1 - core.competitionPenalty);
    const energyToCollect = stats.collectionRate * 0.5 * core.stateTimer * parameters.collectionEfficiency * (1 - core.competitionPenalty);
    
    // Determine what to collect based on resource preference
    let prioritizeFood = true;
    if (parameters.resourcePreference > 0) {
      // Prioritize energy based on preference strength
      prioritizeFood = Math.random() > parameters.resourcePreference;
    }
    
    // Try to collect resources based on priority
    if (prioritizeFood) {
      // First try to collect food if we need it
      if (core.food < stats.maxFood) {
        const collected = this.collectFood(world, foodToCollect);
        
        // If we collected nothing but need energy too, try collecting energy
        if (collected === 0 && core.neuralEnergy < stats.maxNeuralEnergy) {
          this.collectEnergy(world, energyToCollect);
        }
      } else {
        // If we don't need food, try energy
        this.collectEnergy(world, energyToCollect);
      }
    } else {
      // First try to collect energy if we need it
      if (core.neuralEnergy < stats.maxNeuralEnergy) {
        const collected = this.collectEnergy(world, energyToCollect);
        
        // If we collected nothing but need food too, try collecting food
        if (collected === 0 && core.food < stats.maxFood) {
          this.collectFood(world, foodToCollect);
        }
      } else {
        // If we don't need energy, try food
        this.collectFood(world, foodToCollect);
      }
    }
  }
  
  /**
   * Try to collect food from the current position
   */
  private collectFood(world: World, amount: number): number {
    const core = this.sparklingCore as any;
    const position = core.position;
    const memory = core.memory;
    const stats = core.stats;
    
    const collected = world.collectResources(
      position.x, 
      position.y, 
      amount
    );
    
    // If we collected something, remember it
    if (collected > 0) {
      core.food = Math.min(stats.maxFood, core.food + collected);
      
      // Add to memory
      memory.addResourceMemory(
        MemoryEventType.RESOURCE_FOUND,
        { ...position },
        collected
      );
    } else if (amount > 0) {
      // If we tried to collect but there was nothing, remember it's depleted
      memory.addResourceMemory(
        MemoryEventType.RESOURCE_DEPLETED,
        { ...position },
        0
      );
    }
    
    return collected;
  }
  
  /**
   * Try to collect neural energy from the current position
   */
  private collectEnergy(world: World, amount: number): number {
    const core = this.sparklingCore as any;
    const position = core.position;
    const memory = core.memory;
    const stats = core.stats;
    
    const collected = world.collectNeuralEnergy(
      position.x, 
      position.y, 
      amount
    );
    
    // If we collected something, remember it
    if (collected > 0) {
      core.neuralEnergy = Math.min(stats.maxNeuralEnergy, core.neuralEnergy + collected);
      
      // Add to memory
      memory.addEnergyMemory(
        MemoryEventType.ENERGY_FOUND,
        { ...position },
        collected
      );
    } else if (amount > 0) {
      // If we tried to collect but there was nothing, remember it's depleted
      memory.addEnergyMemory(
        MemoryEventType.ENERGY_DEPLETED,
        { ...position },
        0
      );
    }
    
    return collected;
  }
  
  /**
   * Set a competition penalty that temporarily reduces collection efficiency
   * @param penalty Penalty factor (0-1 where 1 is a 100% reduction)
   * @param duration Duration of the penalty in seconds
   */
  public setCompetitionPenalty(penalty: number, duration: number): void {
    const core = this.sparklingCore as any;
    
    core.competitionPenalty = Math.min(1, Math.max(0, penalty)); // Clamp between 0-1
    core.competitionTimer = duration;
    
    // If the penalty is significant, transition to competing state
    if (core.competitionPenalty > 0.3 && core.state === SparklingState.COLLECTING) {
      core.state = SparklingState.COMPETING;
      core.stateTimer = 0;
    }
  }
  
  /**
   * Update competition state and penalties
   * @param deltaTime Time elapsed since last update
   */
  public updateCompetition(deltaTime: number): void {
    const core = this.sparklingCore as any;
    
    // Update competition timer
    if (core.competitionTimer > 0) {
      core.competitionTimer -= deltaTime;
      
      // If timer expires, clear the penalty
      if (core.competitionTimer <= 0) {
        core.competitionPenalty = 0;
        core.competitionTimer = 0;
        
        // If we were in competing state, go back to collecting
        if (core.state === SparklingState.COMPETING) {
          core.state = SparklingState.COLLECTING;
          core.stateTimer = 0;
        }
      }
    }
  }
  
  /**
   * Check if the Sparkling has a territory and establish one if appropriate
   * @param world The current world
   */
  public updateTerritory(world: World): void {
    const core = this.sparklingCore as any;
    const parameters = this.sparklingCore.getParameters();
    
    // Only establish a territory when we have enough resources and are collecting
    const foodRatio = core.food / core.stats.maxFood;
    
    // Sparklings establish territories around resource-rich areas they've found
    if (core.state === SparklingState.COLLECTING && foodRatio > parameters.foodSatiationThreshold * 0.8) {
      // If we don't have a territory yet or we're far from our current territory
      if (!core.territoryCenter || 
          this.distanceToPoint(core.territoryCenter) > core.territoryRadius * 1.5) {
        
        // Establish a new territory centered on the current position
        core.territoryCenter = { ...core.position };
        
        // Territory radius is influenced by personal space preference and cooperation tendency
        // Less cooperative Sparklings claim larger territories
        core.territoryRadius = parameters.personalSpaceFactor * 
                             (2.0 - parameters.cooperationTendency) * 5;
        
        // Remember this location as a home position
        core.homePosition = { ...core.position };
      }
    }
  }
  
  /**
   * Calculate the distance to a point
   */
  private distanceToPoint(point: any): number {
    const core = this.sparklingCore as any;
    const dx = core.position.x - point.x;
    const dy = core.position.y - point.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}