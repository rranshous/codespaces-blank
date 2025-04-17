import { SimulationConfig } from "@config/config";
import { World } from "@core/world";
import { Position, SparklingState, SparklingStats, Velocity, InferenceStatus } from "./sparklingTypes";
import { Memory } from "./memory";
import { MemoryEventType, InferenceMemoryEntry } from "./memoryTypes";
import { TerrainType } from "@core/terrain";
import { DecisionParameters, BehavioralProfile } from "./decisionParameters";
import { generateParametersForProfile, createRandomizedParameters } from "./decisionParameterProfiles";
import { InferenceSystem, InferenceResult } from "@core/inference";

/**
 * Class representing a Sparkling entity in the simulation
 */
export class Sparkling {
  // Core attributes
  private id: number;
  private position: Position;
  private velocity: Velocity;
  private state: SparklingState;
  private food: number;
  private neuralEnergy: number;
  private stats: SparklingStats;
  private color: string;
  private targetPosition: Position | null = null;
  
  // Memory system
  private memory: Memory;
  private totalTime: number = 0;
  
  // Decision parameters
  private parameters: DecisionParameters;
  private profile: BehavioralProfile;
  
  // Movement and behavior
  private stateTimer: number = 0;
  private idleTime: number = 0;
  private lastResourceCheck: number = 0;
  private lastTerrainCheck: number = 0;
  private homePosition: Position | null = null;
  
  // Neural energy & inference
  private inferenceStatus: InferenceStatus = InferenceStatus.IDLE;
  private lastInferenceTime: number = 0;
  private inferenceEnergyCost: number = 30; // Base cost of inference
  private inferenceThreshold: number = 70; // Default energy threshold for triggering inference
  private inferenceTimer: number = 0; // Timer for inference animation
  private inferenceInterval: number = 15; // Minimum time between inferences (seconds)
  private lastInferenceReasoning: string = '';
  
  /**
   * Create a new Sparkling
   */
  constructor(
    id: number, 
    position: Position, 
    config: SimulationConfig, 
    profile: BehavioralProfile = BehavioralProfile.BALANCED
  ) {
    this.id = id;
    this.position = { ...position };
    this.velocity = { vx: 0, vy: 0 };
    
    // Initialize with exploring state
    this.state = SparklingState.EXPLORING;
    
    // Set up initial resources
    this.food = config.sparklingMaxFood * 0.7; // Start with 70% food
    this.neuralEnergy = config.sparklingMaxNeuralEnergy * 0.3; // Start with 30% neural energy
    
    // Set up stats based on config
    this.stats = {
      maxFood: config.sparklingMaxFood,
      maxNeuralEnergy: config.sparklingMaxNeuralEnergy,
      speed: config.sparklingSpeed,
      sensorRadius: config.gridCellSize * 3, // Can sense 3 cells away
      foodConsumptionRate: 2, // Units per second
      neuralEnergyConsumptionRate: 1, // Units per second
      collectionRate: 10 // Units per second
    };
    
    // Initialize memory system
    this.memory = new Memory(config);
    
    // Set behavioral profile and initialize decision parameters
    this.profile = profile;
    this.parameters = createRandomizedParameters(
      generateParametersForProfile(profile),
      0.2 // 20% variation to create individuality
    );
    
    // Set initial home position to starting point
    this.homePosition = { ...position };
    
    // Assign a random color to this Sparkling
    this.color = this.generateRandomColor();
  }
  
  /**
   * Generate a random color for this Sparkling
   */
  private generateRandomColor(): string {
    // Generate a bright, saturated color
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 80%, 60%)`;
  }
  
  /**
   * Update the Sparkling's state and position
   */
  public update(deltaTime: number, world: World): void {
    // Update total time and memory system's time
    this.totalTime += deltaTime;
    this.memory.updateTime(this.totalTime);
    
    // Update state timer
    this.stateTimer += deltaTime;
    
    // Consume resources over time
    this.consumeResources(deltaTime);
    
    // Check surroundings and update memory
    this.updateMemoryFromSurroundings(world, deltaTime);
    
    // Check if we should trigger inference
    this.updateInferenceStatus(deltaTime);
    
    // Make decisions based on current state and parameters
    this.updateState(world);
    
    // Move based on current state and velocity
    this.move(deltaTime, world);
    
    // Check for and collect resources
    this.collectResources(world);
  }
  
  /**
   * Update the inference status and handle inference triggering
   */
  private async updateInferenceStatus(deltaTime: number): Promise<void> {
    // First, update the inference timer
    if (this.inferenceStatus !== InferenceStatus.IDLE) {
      this.inferenceTimer += deltaTime;
    }
    
    // Handle different inference states
    switch (this.inferenceStatus) {
      case InferenceStatus.IDLE:
        // Check if we have enough neural energy to perform inference
        if (this.neuralEnergy >= this.inferenceThreshold && 
            this.totalTime - this.lastInferenceTime >= this.inferenceInterval) {
          // Begin the inference process
          this.inferenceStatus = InferenceStatus.PREPARING;
          this.inferenceTimer = 0;
        }
        break;
        
      case InferenceStatus.PREPARING:
        // Short preparation phase for visual effects
        if (this.inferenceTimer >= 1.0) {
          this.inferenceStatus = InferenceStatus.THINKING;
          this.inferenceTimer = 0;
          
          // Consume neural energy for inference
          this.neuralEnergy = Math.max(0, this.neuralEnergy - this.inferenceEnergyCost);
          
          // Perform the inference - this actually calls the API if not using mock mode
          this.performInference();
        }
        break;
        
      case InferenceStatus.THINKING:
        // The thinking state is now managed by the async performInference method
        // We'll transition to PROCESSING when the API call completes
        // Only add a timeout fallback in case the API call hangs
        if (this.inferenceTimer >= 15.0) {  // 15 seconds timeout
          console.warn(`Inference for Sparkling ${this.id} timed out after 15 seconds.`);
          this.inferenceStatus = InferenceStatus.PROCESSING;
          this.inferenceTimer = 0;
        }
        break;
        
      case InferenceStatus.PROCESSING:
        // Processing phase - update is completed in performInference()
        if (this.inferenceTimer >= 1.0) {
          this.inferenceStatus = InferenceStatus.IDLE;
          this.inferenceTimer = 0;
          this.lastInferenceTime = this.totalTime;
        }
        break;
    }
  }
  
  /**
   * Perform inference using the InferenceSystem
   */
  private async performInference(): Promise<void> {
    // Get the inference system instance
    const inferenceSystem = InferenceSystem.getInstance();
    
    try {
      // Log the start of inference for debugging
      console.log(`Sparkling ${this.id} starting inference process...`);
      
      // Perform the inference
      const result = await inferenceSystem.performInference(
        this.id,
        this.state,
        { food: this.food, neuralEnergy: this.neuralEnergy },
        { maxFood: this.stats.maxFood, maxNeuralEnergy: this.stats.maxNeuralEnergy },
        this.memory,
        this.parameters
      );
      
      // Process the result if successful
      if (result.success) {
        // Update parameters based on inference result
        this.updateParameters(result.updatedParameters);
        
        // Store reasoning in memory
        this.memory.addInferenceMemory(
          { ...this.position },
          result.reasoning,
          result.parameterChangeSummary,
          result.success
        );
        
        // Store the reasoning for use in rendering
        this.lastInferenceReasoning = result.reasoning;
        
        // Log the inference event for debugging
        console.log(`Sparkling ${this.id} performed inference successfully:`, result.reasoning);
      } else {
        // Log the failure
        console.warn(`Sparkling ${this.id} inference failed:`, result.reasoning);
        this.lastInferenceReasoning = `Inference failed: ${result.reasoning}`;
      }
    } catch (error: unknown) {
      console.error(`Sparkling ${this.id} inference error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.lastInferenceReasoning = `Inference error: ${errorMessage}`;
    } finally {
      // Always transition to PROCESSING state after API call completes (or fails)
      // This ensures we move to the next state regardless of API success/failure
      this.inferenceStatus = InferenceStatus.PROCESSING;
      this.inferenceTimer = 0;
    }
  }
  
  /**
   * Consume food and neural energy over time
   */
  private consumeResources(deltaTime: number): void {
    // Consume food at base rate
    this.food = Math.max(0, this.food - this.stats.foodConsumptionRate * deltaTime);
    
    // Consume neural energy at base rate - faster when actively thinking
    let energyConsumptionRate = this.stats.neuralEnergyConsumptionRate;
    
    // Increased consumption during inference
    if (this.inferenceStatus === InferenceStatus.THINKING) {
      energyConsumptionRate *= 3; // Thinking is energy-intensive
    }
    
    this.neuralEnergy = Math.max(0, this.neuralEnergy - energyConsumptionRate * deltaTime);
    
    // Extra food consumption during movement
    if (this.state !== SparklingState.IDLE && this.state !== SparklingState.RESTING) {
      // Movement costs extra food
      const movementCost = 0.5 * deltaTime;
      this.food = Math.max(0, this.food - movementCost);
    }
    
    // Critical low food causes neural energy loss
    if (this.food < this.stats.maxFood * this.parameters.criticalHungerThreshold) {
      const criticalEnergyLoss = deltaTime * 2; // Lose energy faster when critically hungry
      this.neuralEnergy = Math.max(0, this.neuralEnergy - criticalEnergyLoss);
    }
  }
  
  /**
   * Update memory based on what the Sparkling observes
   */
  private updateMemoryFromSurroundings(world: World, deltaTime: number): void {
    // Adjust check frequencies based on memory trust factor
    const resourceCheckInterval = 1.0 * (1 / this.parameters.memoryTrustFactor);
    const terrainCheckInterval = 3.0 * (1 / this.parameters.memoryTrustFactor);
    
    // Check for resources periodically
    if (this.totalTime - this.lastResourceCheck > resourceCheckInterval) {
      this.lastResourceCheck = this.totalTime;
      this.checkForResourcesAndUpdateMemory(world);
    }
    
    // Check terrain periodically
    if (this.totalTime - this.lastTerrainCheck > terrainCheckInterval) {
      this.lastTerrainCheck = this.totalTime;
      this.checkTerrainAndUpdateMemory(world);
    }
  }
  
  /**
   * Check for resources in the vicinity and update memory
   */
  private checkForResourcesAndUpdateMemory(world: World): void {
    // Adjust sensor radius based on exploration range parameter
    const effectiveSensorRadius = this.stats.sensorRadius * 
                                 (1 + (this.parameters.explorationRange - 200) / 200);
    
    const searchRadiusInCells = Math.floor(effectiveSensorRadius / 20);
    
    // Search the grid cells around the current position
    for (let dy = -searchRadiusInCells; dy <= searchRadiusInCells; dy++) {
      for (let dx = -searchRadiusInCells; dx <= searchRadiusInCells; dx++) {
        const cell = world.getCell(
          this.position.x + dx * 20, 
          this.position.y + dy * 20
        );
        
        if (cell) {
          // Calculate distance to this cell
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Skip if too far away
          if (distance > searchRadiusInCells) continue;
          
          // If we found resources, remember it
          if (cell.resources > 0) {
            this.memory.addResourceMemory(
              MemoryEventType.RESOURCE_FOUND,
              { x: cell.x * 20 + 10, y: cell.y * 20 + 10 },
              cell.resources
            );
          }
          
          // If we found neural energy, remember it
          if (cell.neuralEnergy > 0) {
            this.memory.addEnergyMemory(
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
    const cell = world.getCell(this.position.x, this.position.y);
    if (cell) {
      // Record the terrain type we're currently on
      this.memory.addTerrainMemory(
        { x: cell.x * 20 + 10, y: cell.y * 20 + 10 },
        cell.terrain,
        1 // Size estimate - could be improved with clustering
      );
    }
  }
  
  /**
   * Update the Sparkling's state based on its conditions and parameters
   */
  private updateState(world: World): void {
    // Calculate ratios for decision making
    const foodRatio = this.food / this.stats.maxFood;
    const energyRatio = this.neuralEnergy / this.stats.maxNeuralEnergy;
    
    // Check for state transitions
    switch (this.state) {
      case SparklingState.IDLE:
        // Transition from IDLE after a short time
        if (this.stateTimer > this.idleTime) {
          this.transitionToExploring();
        }
        break;
        
      case SparklingState.EXPLORING:
        // Apply exploration duration from parameters
        const maxExplorationTime = this.parameters.explorationDuration;
        
        // If food is low, prioritize finding food
        if (foodRatio < this.parameters.hungerThreshold) {
          const isCritical = foodRatio < this.parameters.criticalHungerThreshold;
          
          // Only change state if either:
          // 1. The situation is critical, or
          // 2. The persistence factor allows for a state change
          if (isCritical || Math.random() > this.parameters.persistenceFactor) {
            this.state = SparklingState.SEEKING_FOOD;
            this.stateTimer = 0;
            this.targetPosition = this.findResourceFromMemory(MemoryEventType.RESOURCE_FOUND);
          }
        }
        // If neural energy is low, prioritize finding energy
        else if (energyRatio < this.parameters.energyLowThreshold) {
          const isCritical = energyRatio < this.parameters.criticalEnergyThreshold;
          
          // Only change state if either condition is met
          if (isCritical || Math.random() > this.parameters.persistenceFactor) {
            this.state = SparklingState.SEEKING_ENERGY;
            this.stateTimer = 0;
            this.targetPosition = this.findResourceFromMemory(MemoryEventType.ENERGY_FOUND);
          }
        }
        // If we've been exploring for a while, take a rest
        else if (this.stateTimer > maxExplorationTime) {
          this.state = SparklingState.RESTING;
          this.stateTimer = 0;
          this.velocity = { vx: 0, vy: 0 };
          this.idleTime = this.parameters.restDuration * (0.8 + Math.random() * 0.4); // Small variation in rest time
        }
        
        // Occasionally change direction while exploring
        // More likely to change if novelty preference is high
        if (this.stateTimer > 3 && Math.random() < 0.1 * (1 + this.parameters.noveltyPreference)) {
          this.setRandomMovement();
        }
        break;
        
      case SparklingState.SEEKING_FOOD:
        // If food is plentiful again, go back to exploring
        if (foodRatio > this.parameters.foodSatiationThreshold) {
          this.state = SparklingState.EXPLORING;
          this.stateTimer = 0;
          this.targetPosition = null;
          this.setRandomMovement();
        }
        // Look for food in vicinity or use memory
        else {
          // If we don't have a target or reached our target, find a new one
          if (!this.targetPosition || 
              (this.targetPosition && this.isAtPosition(this.targetPosition))) {
            
            // First try to find a target from memory
            this.targetPosition = this.findResourceFromMemory(MemoryEventType.RESOURCE_FOUND);
            
            // If we don't have a remembered target, look for visible resources
            if (!this.targetPosition) {
              this.lookForResources(world, true);
            }
          }
        }
        break;
        
      case SparklingState.SEEKING_ENERGY:
        // If neural energy is plentiful again, go back to exploring
        if (energyRatio > this.parameters.energySatiationThreshold) {
          this.state = SparklingState.EXPLORING;
          this.stateTimer = 0;
          this.targetPosition = null;
          this.setRandomMovement();
        }
        // Look for neural energy in vicinity or use memory
        else {
          // If we don't have a target or reached our target, find a new one
          if (!this.targetPosition || 
              (this.targetPosition && this.isAtPosition(this.targetPosition))) {
            
            // First try to find a target from memory
            this.targetPosition = this.findResourceFromMemory(MemoryEventType.ENERGY_FOUND);
            
            // If we don't have a remembered target, look for visible resources
            if (!this.targetPosition) {
              this.lookForResources(world, false);
            }
          }
        }
        break;
        
      case SparklingState.COLLECTING:
        // After a short time collecting, go back to previous state
        if (this.stateTimer > 1.5) {
          // If we still need food or energy, continue seeking
          if (foodRatio < this.parameters.hungerThreshold) {
            this.state = SparklingState.SEEKING_FOOD;
          } else if (energyRatio < this.parameters.energyLowThreshold) {
            this.state = SparklingState.SEEKING_ENERGY;
          } else {
            this.state = SparklingState.EXPLORING;
            this.setRandomMovement();
          }
          this.stateTimer = 0;
        }
        break;
        
      case SparklingState.RESTING:
        // After resting, go back to exploring
        if (this.stateTimer > this.idleTime) {
          this.transitionToExploring();
        }
        break;
    }
  }
  
  /**
   * Find a target position from memory
   */
  private findResourceFromMemory(type: MemoryEventType): Position | null {
    // The memory trust factor influences how much we rely on memory vs. current perceptions
    if (Math.random() > this.parameters.memoryTrustFactor) {
      return null; // Sometimes ignore memory based on trust factor
    }
    
    // Find the nearest memory of this type
    const nearestMemory = this.memory.findNearestMemory(this.position, type);
    
    if (nearestMemory) {
      return { ...nearestMemory.position };
    }
    
    // If we have no helpful memories or decide not to use them,
    // consider returning to "home" position if we're low on resources
    if ((type === MemoryEventType.RESOURCE_FOUND && this.food < this.stats.maxFood * 0.3) ||
        (type === MemoryEventType.ENERGY_FOUND && this.neuralEnergy < this.stats.maxNeuralEnergy * 0.3)) {
      if (this.homePosition && Math.random() < this.parameters.memoryTrustFactor * 0.5) {
        return { ...this.homePosition };
      }
    }
    
    return null;
  }
  
  /**
   * Check if the Sparkling is at a specific position
   */
  private isAtPosition(position: Position): boolean {
    const dx = this.position.x - position.x;
    const dy = this.position.y - position.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared < 25; // Distance of 5 units
  }
  
  /**
   * Move the Sparkling based on its current state and velocity
   */
  private move(deltaTime: number, world: World): void {
    if (this.state === SparklingState.IDLE || this.state === SparklingState.RESTING || this.state === SparklingState.COLLECTING) {
      // Don't move in these states
      return;
    }
    
    // If we have a target position, move towards it
    if (this.targetPosition) {
      const dx = this.targetPosition.x - this.position.x;
      const dy = this.targetPosition.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If we're close enough to the target, we've reached it
      if (distance < 5) {
        this.targetPosition = null;
        
        // If we were seeking, start collecting
        if (this.state === SparklingState.SEEKING_FOOD || this.state === SparklingState.SEEKING_ENERGY) {
          this.state = SparklingState.COLLECTING;
          this.stateTimer = 0;
          this.velocity = { vx: 0, vy: 0 };
          return;
        }
      } else {
        // Move toward target
        // Adjust the speed based on state - more urgent states move faster
        let speedModifier = 1.0;
        
        if (this.state === SparklingState.SEEKING_FOOD && this.food < this.stats.maxFood * this.parameters.criticalHungerThreshold) {
          speedModifier = 1.3; // Move faster when critically hungry
        } else if (this.state === SparklingState.SEEKING_ENERGY && this.neuralEnergy < this.stats.maxNeuralEnergy * this.parameters.criticalEnergyThreshold) {
          speedModifier = 1.3; // Move faster when critically low on energy
        }
        
        this.velocity = {
          vx: (dx / distance) * this.stats.speed * speedModifier,
          vy: (dy / distance) * this.stats.speed * speedModifier
        };
      }
    }
    
    // Calculate movement considering terrain
    const terrainProps = world.getTerrainPropertiesAt(this.position.x, this.position.y);
    const movementFactor = terrainProps ? 1 / terrainProps.movementCost : 1;
    
    // Apply velocity to position
    this.position.x += this.velocity.vx * deltaTime * this.stats.speed * movementFactor;
    this.position.y += this.velocity.vy * deltaTime * this.stats.speed * movementFactor;
    
    // Keep within world bounds
    this.position.x = Math.max(0, Math.min(world.getDimensions().width * 20 - 1, this.position.x));
    this.position.y = Math.max(0, Math.min(world.getDimensions().height * 20 - 1, this.position.y));
  }
  
  /**
   * Scan for resources in the vicinity and set a target if found
   */
  private lookForResources(world: World, lookingForFood: boolean): void {
    // Get the current grid cell
    const currentCell = world.getCell(this.position.x, this.position.y);
    if (!currentCell) return;
    
    // Search radius adjusted by parameter
    const effectiveSensorRadius = this.stats.sensorRadius * 
                                 (1 + (this.parameters.explorationRange - 200) / 200);
    
    // Search radius in grid coordinates
    const searchRadiusInCells = Math.floor(effectiveSensorRadius / 20);
    let bestCell = null;
    let bestValue = 0;
    
    // Adjust resource preference based on parameter
    // resourcePreference ranges from -1 (food) to 1 (energy)
    let foodPreference = 1.0;
    let energyPreference = 1.0;
    
    if (this.parameters.resourcePreference < 0) {
      // Prefer food over energy
      energyPreference = 1.0 + this.parameters.resourcePreference;
    } else if (this.parameters.resourcePreference > 0) {
      // Prefer energy over food
      foodPreference = 1.0 - this.parameters.resourcePreference;
    }
    
    // Search the grid cells around the current position
    for (let dy = -searchRadiusInCells; dy <= searchRadiusInCells; dy++) {
      for (let dx = -searchRadiusInCells; dx <= searchRadiusInCells; dx++) {
        const cell = world.getCell(
          this.position.x + dx * 20, 
          this.position.y + dy * 20
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
      this.targetPosition = {
        x: bestCell.x * 20 + 10, // Center of the cell
        y: bestCell.y * 20 + 10
      };
    } else if (!this.targetPosition) {
      // If we didn't find anything and have no target, continue exploring
      this.setRandomMovement();
    }
  }
  
  /**
   * Collect resources from the current position
   */
  private collectResources(world: World): void {
    if (this.state !== SparklingState.COLLECTING) return;
    
    // Adjust collection amounts based on collection efficiency parameter
    const foodToCollect = this.stats.collectionRate * this.stateTimer * this.parameters.collectionEfficiency;
    const energyToCollect = this.stats.collectionRate * 0.5 * this.stateTimer * this.parameters.collectionEfficiency;
    
    // Determine what to collect based on resource preference
    let prioritizeFood = true;
    if (this.parameters.resourcePreference > 0) {
      // Prioritize energy based on preference strength
      prioritizeFood = Math.random() > this.parameters.resourcePreference;
    }
    
    // Try to collect resources based on priority
    if (prioritizeFood) {
      // First try to collect food if we need it
      if (this.food < this.stats.maxFood) {
        const collected = this.collectFood(world, foodToCollect);
        
        // If we collected nothing but need energy too, try collecting energy
        if (collected === 0 && this.neuralEnergy < this.stats.maxNeuralEnergy) {
          this.collectEnergy(world, energyToCollect);
        }
      } else {
        // If we don't need food, try energy
        this.collectEnergy(world, energyToCollect);
      }
    } else {
      // First try to collect energy if we need it
      if (this.neuralEnergy < this.stats.maxNeuralEnergy) {
        const collected = this.collectEnergy(world, energyToCollect);
        
        // If we collected nothing but need food too, try collecting food
        if (collected === 0 && this.food < this.stats.maxFood) {
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
    const collected = world.collectResources(
      this.position.x, 
      this.position.y, 
      amount
    );
    
    // If we collected something, remember it
    if (collected > 0) {
      this.food = Math.min(this.stats.maxFood, this.food + collected);
      
      // Add to memory
      this.memory.addResourceMemory(
        MemoryEventType.RESOURCE_FOUND,
        { ...this.position },
        collected
      );
    } else if (amount > 0) {
      // If we tried to collect but there was nothing, remember it's depleted
      this.memory.addResourceMemory(
        MemoryEventType.RESOURCE_DEPLETED,
        { ...this.position },
        0
      );
    }
    
    return collected;
  }
  
  /**
   * Try to collect neural energy from the current position
   */
  private collectEnergy(world: World, amount: number): number {
    const collected = world.collectNeuralEnergy(
      this.position.x, 
      this.position.y, 
      amount
    );
    
    // If we collected something, remember it
    if (collected > 0) {
      this.neuralEnergy = Math.min(this.stats.maxNeuralEnergy, this.neuralEnergy + collected);
      
      // Add to memory
      this.memory.addEnergyMemory(
        MemoryEventType.ENERGY_FOUND,
        { ...this.position },
        collected
      );
    } else if (amount > 0) {
      // If we tried to collect but there was nothing, remember it's depleted
      this.memory.addEnergyMemory(
        MemoryEventType.ENERGY_DEPLETED,
        { ...this.position },
        0
      );
    }
    
    return collected;
  }
  
  /**
   * Set a random movement direction
   */
  private setRandomMovement(): void {
    // Influence by novelty preference
    // High novelty: more random directions
    // Low novelty: tend to continue in the current direction
    
    let angle: number;
    
    if (Math.random() < this.parameters.noveltyPreference) {
      // Completely random direction
      angle = Math.random() * Math.PI * 2;
    } else {
      // Similar to current direction with some variation
      const currentAngle = this.velocity.vx === 0 && this.velocity.vy === 0 
        ? Math.random() * Math.PI * 2  // If not moving, pick random
        : Math.atan2(this.velocity.vy, this.velocity.vx);
        
      // Add some variation to the current angle
      angle = currentAngle + (Math.random() * 0.5 - 0.25) * Math.PI;
    }
    
    this.velocity = {
      vx: Math.cos(angle) * this.stats.speed,
      vy: Math.sin(angle) * this.stats.speed
    };
  }
  
  /**
   * Transition to the exploring state with a random direction
   */
  private transitionToExploring(): void {
    this.state = SparklingState.EXPLORING;
    this.stateTimer = 0;
    this.setRandomMovement();
  }
  
  /**
   * Record an encounter with another Sparkling
   */
  public recordEncounter(otherSparkling: Sparkling, outcome: 'neutral' | 'positive' | 'negative'): void {
    // The likelihood of recording an encounter depends on the cooperation tendency
    // Cooperative Sparklings are more likely to remember encounters
    const recordChance = 0.5 + this.parameters.cooperationTendency * 0.5;
    
    if (Math.random() < recordChance) {
      this.memory.addEncounterMemory(
        { ...this.position },
        otherSparkling.getId(),
        outcome
      );
    }
    
    // If we're too close to another Sparkling and we prefer more personal space,
    // move away slightly based on our personal space preference
    const dx = this.position.x - otherSparkling.getPosition().x;
    const dy = this.position.y - otherSparkling.getPosition().y;
    const distanceSquared = dx * dx + dy * dy;
    
    if (distanceSquared < this.parameters.personalSpaceFactor * this.parameters.personalSpaceFactor) {
      // Move away slightly
      const distance = Math.sqrt(distanceSquared);
      if (distance > 0) {
        this.velocity = {
          vx: (dx / distance) * this.stats.speed * 0.5,
          vy: (dy / distance) * this.stats.speed * 0.5
        };
      }
    }
  }
  
  /**
   * Render the Sparkling on the canvas
   */
  public render(context: CanvasRenderingContext2D, debug: boolean = false): void {
    // Calculate the body size based on food level
    const bodySize = 10 + (this.food / this.stats.maxFood) * 5;
    
    // Draw the main body
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.position.x, this.position.y, bodySize, 0, Math.PI * 2);
    context.fill();
    
    // Draw a glow effect for neural energy level
    const energyRatio = this.neuralEnergy / this.stats.maxNeuralEnergy;
    if (energyRatio > 0) {
      // Calculate the size of the energy glow
      const glowSize = bodySize + 5 * energyRatio;
      
      // Use more intense glow during inference
      let glowOpacity = 0.3 * energyRatio;
      let glowColor = `rgba(150, 50, 200, ${glowOpacity})`;
      
      // Modify the glow based on inference status
      if (this.inferenceStatus !== InferenceStatus.IDLE) {
        // Pulsing effect during inference
        const pulseRate = this.inferenceStatus === InferenceStatus.THINKING ? 4 : 2;
        const pulseIntensity = 0.5 + 0.5 * Math.sin(this.totalTime * pulseRate);
        
        glowOpacity = 0.4 * energyRatio * pulseIntensity;
        glowColor = `rgba(180, 70, 220, ${glowOpacity})`;
      }
      
      context.fillStyle = glowColor;
      context.beginPath();
      context.arc(this.position.x, this.position.y, glowSize, 0, Math.PI * 2);
      context.fill();
      
      // Draw secondary outer glow for high neural energy
      if (energyRatio > 0.7 || this.inferenceStatus !== InferenceStatus.IDLE) {
        const outerGlowSize = glowSize + 4;
        const outerOpacity = this.inferenceStatus !== InferenceStatus.IDLE ? 
                            0.2 * (0.7 + 0.3 * Math.sin(this.totalTime * 5)) :
                            0.1 * energyRatio;
        
        context.fillStyle = `rgba(160, 60, 220, ${outerOpacity})`;
        context.beginPath();
        context.arc(this.position.x, this.position.y, outerGlowSize, 0, Math.PI * 2);
        context.fill();
      }
      
      // NEW: Draw "ready for inference" indicator when close to threshold
      // This shows entities that will soon be able to trigger inference
      if (energyRatio >= 0.6 && energyRatio < this.inferenceThreshold / this.stats.maxNeuralEnergy && 
          this.inferenceStatus === InferenceStatus.IDLE && 
          this.totalTime - this.lastInferenceTime >= this.inferenceInterval) {
        // Draw a dotted circle to indicate approaching inference threshold
        const readyGlowSize = glowSize + 6;
        context.strokeStyle = `rgba(180, 100, 240, ${0.3 + 0.2 * Math.sin(this.totalTime * 3)})`;
        context.setLineDash([3, 3]);
        context.beginPath();
        context.arc(this.position.x, this.position.y, readyGlowSize, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
        
        // Show percentage to threshold
        if (debug) {
          const percentToThreshold = (this.neuralEnergy / this.inferenceThreshold * 100).toFixed(0);
          context.fillStyle = 'rgba(180, 100, 240, 0.9)';
          context.font = '8px Arial';
          context.textAlign = 'center';
          context.fillText(
            `${percentToThreshold}%`,
            this.position.x,
            this.position.y - bodySize - 20
          );
        }
      }
      
      // Draw neural energy level indicator
      if (debug) {
        // Draw neural energy level bar
        const barWidth = 24;
        const barHeight = 3;
        const barX = this.position.x - barWidth / 2;
        const barY = this.position.y - bodySize - 15;
        
        // Background
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(barX, barY, barWidth, barHeight);
        
        // Energy level
        const energyColor = energyRatio >= this.inferenceThreshold / this.stats.maxNeuralEnergy ? 
                            'rgba(180, 100, 240, 0.8)' :  // At or above threshold
                            energyRatio >= 0.6 ? 
                            'rgba(150, 70, 220, 0.8)' :   // Approaching threshold
                            `rgba(150, 50, 200, 0.8)`;    // Normal level
        
        context.fillStyle = energyColor;
        context.fillRect(barX, barY, barWidth * energyRatio, barHeight);
        
        // Inference threshold marker
        const thresholdX = barX + (this.inferenceThreshold / this.stats.maxNeuralEnergy) * barWidth;
        context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        context.beginPath();
        context.moveTo(thresholdX, barY - 1);
        context.lineTo(thresholdX, barY + barHeight + 1);
        context.stroke();
        
        // Show energy level as percentage when close to threshold or during inference
        if ((energyRatio >= 0.6 || this.inferenceStatus !== InferenceStatus.IDLE) && 
            !(energyRatio >= this.inferenceThreshold / this.stats.maxNeuralEnergy && this.inferenceStatus === InferenceStatus.IDLE)) {
          context.fillStyle = 'rgba(255, 255, 255, 0.9)';
          context.font = '7px Arial';
          context.textAlign = 'center';
          context.fillText(
            `${(energyRatio * 100).toFixed(0)}%`,
            barX + barWidth / 2,
            barY - 2
          );
        }
      }
    }
    
    // Draw inference status indicator if actively inferring
    if (this.inferenceStatus !== InferenceStatus.IDLE) {
      // Draw thinking animation
      const statusText = this.getInferenceStatusText();
      const dotsCount = Math.floor((this.inferenceTimer * 2) % 4);
      const dots = '.'.repeat(dotsCount);
      
      context.fillStyle = 'rgba(255, 255, 255, 0.9)';
      context.font = '8px Arial';
      context.textAlign = 'center';
      context.fillText(
        `${statusText}${dots}`, 
        this.position.x, 
        this.position.y - bodySize - 10
      );
      
      // Draw last inference reasoning if available and in debug mode
      if (debug && this.lastInferenceReasoning && this.inferenceStatus === InferenceStatus.PROCESSING) {
        const maxReasoningLength = 60;
        const shortenedReasoning = this.lastInferenceReasoning.length > maxReasoningLength 
          ? this.lastInferenceReasoning.substring(0, maxReasoningLength) + '...'
          : this.lastInferenceReasoning;
        
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = '7px Arial';
        const lines = this.wrapText(shortenedReasoning, 120);
        lines.forEach((line, index) => {
          context.fillText(
            line,
            this.position.x,
            this.position.y + bodySize + 15 + (index * 8)
          );
        });
      }
    } else {
      // Draw "Inference Ready" text when at or above threshold
      if (energyRatio >= this.inferenceThreshold / this.stats.maxNeuralEnergy && 
          this.totalTime - this.lastInferenceTime >= this.inferenceInterval) {
        context.fillStyle = 'rgba(180, 100, 240, 0.9)';
        context.font = '8px Arial';
        context.textAlign = 'center';
        context.fillText(
          'inference ready', 
          this.position.x, 
          this.position.y - bodySize - 10
        );
      } else {
        // Draw regular state label when not inferring
        context.fillStyle = 'white';
        context.font = '8px Arial';
        context.textAlign = 'center';
        context.fillText(
          this.getStateLabel(), 
          this.position.x, 
          this.position.y - bodySize - 10
        );
      }
    }
    
    // Draw home point marker
    if (this.homePosition) {
      context.strokeStyle = `rgba(${parseInt(this.color.substr(1, 2), 16)}, ${parseInt(this.color.substr(3, 2), 16)}, ${parseInt(this.color.substr(5, 2), 16)}, 0.3)`;
      context.setLineDash([2, 2]);
      context.beginPath();
      context.moveTo(this.position.x, this.position.y);
      context.lineTo(this.homePosition.x, this.homePosition.y);
      context.stroke();
      context.setLineDash([]);
      
      // Draw a little house/home symbol
      context.fillStyle = this.color;
      context.beginPath();
      context.arc(this.homePosition.x, this.homePosition.y, 3, 0, Math.PI * 2);
      context.fill();
    }
    
    // If in debug mode, draw additional information
    if (debug) {
      this.renderParameterIndicators(context);
      this.renderMemory(context);
    }
  }
  
  /**
   * Get text description for the current inference status
   */
  private getInferenceStatusText(): string {
    switch (this.inferenceStatus) {
      case InferenceStatus.PREPARING: return "preparing";
      case InferenceStatus.THINKING: return "thinking";
      case InferenceStatus.PROCESSING: return "processing";
      default: return "";
    }
  }
  
  /**
   * Wrap text to multiple lines for rendering
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      // Simple width estimate
      const testWidth = testLine.length * 4; // Approximate width per character
      
      if (testWidth > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.slice(0, 3); // Limit to 3 lines
  }
  
  /**
   * Render visual indicators for key parameters
   */
  private renderParameterIndicators(context: CanvasRenderingContext2D): void {
    const x = this.position.x;
    const y = this.position.y + 20;
    const spacing = 5;
    const width = 30;
    const height = 3;
    
    // Helper for drawing parameter bars
    const drawBar = (yOffset: number, value: number, color: string) => {
      context.fillStyle = 'rgba(0, 0, 0, 0.5)';
      context.fillRect(x - width/2, y + yOffset, width, height);
      
      context.fillStyle = color;
      context.fillRect(x - width/2, y + yOffset, width * Math.max(0, Math.min(1, value)), height);
    };
    
    // Draw key parameter indicators
    drawBar(0, this.parameters.resourcePreference * 0.5 + 0.5, 'rgba(156, 39, 176, 0.7)'); // Energy vs food preference
    drawBar(spacing, this.parameters.cooperationTendency * 0.5 + 0.5, 'rgba(76, 175, 80, 0.7)'); // Cooperation tendency
    drawBar(spacing * 2, this.parameters.noveltyPreference, 'rgba(33, 150, 243, 0.7)'); // Novelty preference
    drawBar(spacing * 3, this.parameters.memoryTrustFactor, 'rgba(255, 152, 0, 0.7)'); // Memory trust
  }
  
  /**
   * Render the Sparkling's memory
   */
  private renderMemory(context: CanvasRenderingContext2D): void {
    const memories = this.memory.getAllMemories();
    
    // Draw a line to connect recent memories
    if (memories.length > 0) {
      context.strokeStyle = `rgba(${parseInt(this.color.substr(1, 2), 16)}, ${parseInt(this.color.substr(3, 2), 16)}, ${parseInt(this.color.substr(5, 2), 16)}, 0.3)`;
      context.beginPath();
      
      // Start from the Sparkling's current position
      context.moveTo(this.position.x, this.position.y);
      
      // Connect to each memory point
      const recentMemories = this.memory.getRecentMemories(30); // Last 30 seconds
      for (const memory of recentMemories) {
        context.lineTo(memory.position.x, memory.position.y);
      }
      
      context.stroke();
    }
    
    // Draw symbols for each type of memory
    for (const memory of memories) {
      let symbol = '';
      let color = 'white';
      
      switch (memory.type) {
        case MemoryEventType.RESOURCE_FOUND:
          symbol = '🍎';
          color = 'rgba(255, 215, 0, 0.7)';
          break;
        case MemoryEventType.RESOURCE_DEPLETED:
          symbol = '✘';
          color = 'rgba(255, 150, 0, 0.4)';
          break;
        case MemoryEventType.ENERGY_FOUND:
          symbol = '⚡';
          color = 'rgba(156, 39, 176, 0.7)';
          break;
        case MemoryEventType.ENERGY_DEPLETED:
          symbol = '✘';
          color = 'rgba(156, 39, 176, 0.4)';
          break;
        case MemoryEventType.TERRAIN_DISCOVERED:
          symbol = '⬢';
          color = 'rgba(76, 175, 80, 0.5)';
          break;
        case MemoryEventType.SPARKLING_ENCOUNTER:
          symbol = '👁️';
          color = 'rgba(233, 30, 99, 0.7)';
          break;
        case MemoryEventType.INFERENCE_PERFORMED:
          symbol = '🧠';
          color = 'rgba(33, 150, 243, 0.7)';
          break;
      }
      
      // Draw small dot for the memory
      context.fillStyle = color;
      context.beginPath();
      context.arc(memory.position.x, memory.position.y, 2, 0, Math.PI * 2);
      context.fill();
      
      // Draw symbol or emoji for the memory type
      if (symbol) {
        context.font = '8px Arial';
        context.fillText(symbol, memory.position.x, memory.position.y - 5);
      }
      
      // For inference memories, draw a special indicator
      if (memory.type === MemoryEventType.INFERENCE_PERFORMED) {
        const inferenceMemory = memory as InferenceMemoryEntry;
        
        // Draw a larger glow for inference locations
        const glowSize = inferenceMemory.success ? 8 : 5;
        context.fillStyle = `rgba(33, 150, 243, ${inferenceMemory.success ? 0.3 : 0.15})`;
        context.beginPath();
        context.arc(memory.position.x, memory.position.y, glowSize, 0, Math.PI * 2);
        context.fill();
        
        // Draw a small label for successful inferences
        if (inferenceMemory.success) {
          context.fillStyle = 'rgba(255, 255, 255, 0.7)';
          context.font = '6px Arial';
          context.fillText('inference', memory.position.x, memory.position.y + 8);
        }
      }
    }
  }
  
  /**
   * Get a label for the current state
   */
  private getStateLabel(): string {
    switch (this.state) {
      case SparklingState.IDLE: return "idle";
      case SparklingState.EXPLORING: return "exploring";
      case SparklingState.SEEKING_FOOD: return "hungry";
      case SparklingState.SEEKING_ENERGY: return "low energy";
      case SparklingState.COLLECTING: return "collecting";
      case SparklingState.RESTING: return "resting";
      default: return "";
    }
  }
  
  /**
   * Get the current position
   */
  public getPosition(): Position {
    return { ...this.position };
  }
  
  /**
   * Get the current state
   */
  public getState(): SparklingState {
    return this.state;
  }
  
  /**
   * Get the current resource levels
   */
  public getResourceLevels(): { food: number, neuralEnergy: number } {
    return {
      food: this.food,
      neuralEnergy: this.neuralEnergy
    };
  }
  
  /**
   * Get the sparkling ID
   */
  public getId(): number {
    return this.id;
  }
  
  /**
   * Get the memory system
   */
  public getMemory(): Memory {
    return this.memory;
  }
  
  /**
   * Get behavioral profile
   */
  public getProfile(): BehavioralProfile {
    return this.profile;
  }
  
  /**
   * Get decision parameters
   */
  public getParameters(): DecisionParameters {
    return { ...this.parameters };
  }
  
  /**
   * Update decision parameters
   */
  public updateParameters(parameters: Partial<DecisionParameters>): void {
    this.parameters = { ...this.parameters, ...parameters };
  }
  
  /**
   * Get the inference status
   */
  public getInferenceStatus(): string {
    return this.inferenceStatus;
  }
  
  /**
   * Get the maximum neural energy capacity
   */
  public getMaxNeuralEnergy(): number {
    return this.stats.maxNeuralEnergy;
  }
  
  /**
   * Get information about the last inference
   */
  public getLastInferenceInfo(): { timestamp: number; success: boolean; reasoning: string } {
    // Get the most recent inference memory
    const inferenceMemories = this.memory.getMemoriesByType(MemoryEventType.INFERENCE_PERFORMED) as InferenceMemoryEntry[];
    
    // Sort by recency (most recent first)
    const sortedMemories = [...inferenceMemories].sort((a, b) => b.timestamp - a.timestamp);
    
    if (sortedMemories.length > 0) {
      const lastInference = sortedMemories[0];
      return {
        timestamp: lastInference.timestamp,
        success: lastInference.success,
        reasoning: lastInference.reasoning
      };
    }
    
    // Return default values if no inference has been performed
    return {
      timestamp: 0,
      success: false,
      reasoning: ''
    };
  }
}