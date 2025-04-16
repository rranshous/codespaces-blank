import { SimulationConfig } from "@config/config";
import { World } from "@core/world";
import { Position, SparklingState, SparklingStats, Velocity } from "./sparklingTypes";
import { Memory } from "./memory";
import { MemoryEventType } from "./memoryTypes";
import { TerrainType } from "@core/terrain";

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
  
  // Movement and behavior
  private stateTimer: number = 0;
  private idleTime: number = 0;
  private lastResourceCheck: number = 0;
  private lastTerrainCheck: number = 0;
  
  /**
   * Create a new Sparkling
   */
  constructor(id: number, position: Position, config: SimulationConfig) {
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
    
    // Make decisions based on current state
    this.updateState(world);
    
    // Move based on current state and velocity
    this.move(deltaTime, world);
    
    // Check for and collect resources
    this.collectResources(world);
  }
  
  /**
   * Consume food and neural energy over time
   */
  private consumeResources(deltaTime: number): void {
    // Consume food at base rate
    this.food = Math.max(0, this.food - this.stats.foodConsumptionRate * deltaTime);
    
    // Consume neural energy at base rate
    this.neuralEnergy = Math.max(0, this.neuralEnergy - this.stats.neuralEnergyConsumptionRate * deltaTime);
    
    // Extra food consumption during movement
    if (this.state !== SparklingState.IDLE && this.state !== SparklingState.RESTING) {
      // Movement costs extra food
      const movementCost = 0.5 * deltaTime;
      this.food = Math.max(0, this.food - movementCost);
    }
  }
  
  /**
   * Update memory based on what the Sparkling observes
   */
  private updateMemoryFromSurroundings(world: World, deltaTime: number): void {
    // Check for resources periodically
    if (this.totalTime - this.lastResourceCheck > 1.0) { // Check every second
      this.lastResourceCheck = this.totalTime;
      this.checkForResourcesAndUpdateMemory(world);
    }
    
    // Check terrain periodically
    if (this.totalTime - this.lastTerrainCheck > 3.0) { // Check every 3 seconds
      this.lastTerrainCheck = this.totalTime;
      this.checkTerrainAndUpdateMemory(world);
    }
  }
  
  /**
   * Check for resources in the vicinity and update memory
   */
  private checkForResourcesAndUpdateMemory(world: World): void {
    const searchRadiusInCells = Math.floor(this.stats.sensorRadius / 20);
    
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
   * Update the Sparkling's state based on its conditions
   */
  private updateState(world: World): void {
    // Check for state transitions
    switch (this.state) {
      case SparklingState.IDLE:
        // Transition from IDLE after a short time
        if (this.stateTimer > this.idleTime) {
          this.transitionToExploring();
        }
        break;
        
      case SparklingState.EXPLORING:
        // If food is low, prioritize finding food
        if (this.food < this.stats.maxFood * 0.3) {
          this.state = SparklingState.SEEKING_FOOD;
          this.stateTimer = 0;
          this.targetPosition = this.findTargetFromMemory(MemoryEventType.RESOURCE_FOUND);
        }
        // If neural energy is low, prioritize finding energy
        else if (this.neuralEnergy < this.stats.maxNeuralEnergy * 0.3) {
          this.state = SparklingState.SEEKING_ENERGY;
          this.stateTimer = 0;
          this.targetPosition = this.findTargetFromMemory(MemoryEventType.ENERGY_FOUND);
        }
        // If we've been exploring for a while, take a rest
        else if (this.stateTimer > 10) {
          this.state = SparklingState.RESTING;
          this.stateTimer = 0;
          this.velocity = { vx: 0, vy: 0 };
          this.idleTime = 2 + Math.random() * 2; // Rest for 2-4 seconds
        }
        
        // Occasionally change direction while exploring
        if (this.stateTimer > 3 && Math.random() < 0.1) {
          this.setRandomMovement();
        }
        break;
        
      case SparklingState.SEEKING_FOOD:
        // If food is plentiful again, go back to exploring
        if (this.food > this.stats.maxFood * 0.7) {
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
            this.targetPosition = this.findTargetFromMemory(MemoryEventType.RESOURCE_FOUND);
            
            // If we don't have a remembered target, look for visible resources
            if (!this.targetPosition) {
              this.lookForResources(world, true);
            }
          }
        }
        break;
        
      case SparklingState.SEEKING_ENERGY:
        // If neural energy is plentiful again, go back to exploring
        if (this.neuralEnergy > this.stats.maxNeuralEnergy * 0.7) {
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
            this.targetPosition = this.findTargetFromMemory(MemoryEventType.ENERGY_FOUND);
            
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
          if (this.food < this.stats.maxFood * 0.3) {
            this.state = SparklingState.SEEKING_FOOD;
          } else if (this.neuralEnergy < this.stats.maxNeuralEnergy * 0.3) {
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
  private findTargetFromMemory(type: MemoryEventType): Position | null {
    // Find the nearest memory of this type
    const nearestMemory = this.memory.findNearestMemory(this.position, type);
    
    if (nearestMemory) {
      return { ...nearestMemory.position };
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
        this.velocity = {
          vx: (dx / distance) * this.stats.speed,
          vy: (dy / distance) * this.stats.speed
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
    
    // Search radius in grid coordinates
    const searchRadiusInCells = Math.floor(this.stats.sensorRadius / 20);
    let bestCell = null;
    let bestValue = 0;
    
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
            cellValue = cell.resources / (distance + 0.1);
          } else if (!lookingForFood && cell.neuralEnergy > 0) {
            cellValue = cell.neuralEnergy / (distance + 0.1);
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
    
    // Calculate collection amounts based on time spent collecting
    const foodToCollect = this.stats.collectionRate * this.stateTimer;
    const energyToCollect = this.stats.collectionRate * 0.5 * this.stateTimer;
    
    // Try to collect food if we need it
    if (this.food < this.stats.maxFood) {
      const collected = world.collectResources(
        this.position.x, 
        this.position.y, 
        foodToCollect
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
      } else if (foodToCollect > 0) {
        // If we tried to collect but there was nothing, remember it's depleted
        this.memory.addResourceMemory(
          MemoryEventType.RESOURCE_DEPLETED,
          { ...this.position },
          0
        );
      }
    }
    
    // Try to collect neural energy if we need it
    if (this.neuralEnergy < this.stats.maxNeuralEnergy) {
      const collected = world.collectNeuralEnergy(
        this.position.x, 
        this.position.y, 
        energyToCollect
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
      } else if (energyToCollect > 0) {
        // If we tried to collect but there was nothing, remember it's depleted
        this.memory.addEnergyMemory(
          MemoryEventType.ENERGY_DEPLETED,
          { ...this.position },
          0
        );
      }
    }
  }
  
  /**
   * Set a random movement direction
   */
  private setRandomMovement(): void {
    const angle = Math.random() * Math.PI * 2;
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
    this.memory.addEncounterMemory(
      { ...this.position },
      otherSparkling.getId(),
      outcome
    );
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
      const glowSize = bodySize + 5 * energyRatio;
      context.fillStyle = `rgba(150, 50, 200, ${0.3 * energyRatio})`;
      context.beginPath();
      context.arc(this.position.x, this.position.y, glowSize, 0, Math.PI * 2);
      context.fill();
    }
    
    // Draw indicator of current state
    context.fillStyle = 'white';
    context.font = '8px Arial';
    context.textAlign = 'center';
    context.fillText(
      this.getStateLabel(), 
      this.position.x, 
      this.position.y - bodySize - 5
    );
    
    // Draw the target position if we have one and debug is enabled
    if (debug && this.targetPosition) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      context.beginPath();
      context.moveTo(this.position.x, this.position.y);
      context.lineTo(this.targetPosition.x, this.targetPosition.y);
      context.stroke();
      
      context.fillStyle = 'rgba(255, 255, 255, 0.7)';
      context.beginPath();
      context.arc(this.targetPosition.x, this.targetPosition.y, 3, 0, Math.PI * 2);
      context.fill();
    }
    
    // Draw memory visualization if debug is enabled
    if (debug) {
      this.renderMemory(context);
    }
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
}