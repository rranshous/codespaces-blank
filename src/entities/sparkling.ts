import { SimulationConfig } from "@config/config";
import { World } from "@core/world";
import { Position, SparklingState, SparklingStats, Velocity } from "./sparklingTypes";

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
  
  // Movement and behavior
  private stateTimer: number = 0;
  private idleTime: number = 0;
  
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
    // Update state timer
    this.stateTimer += deltaTime;
    
    // Consume resources over time
    this.consumeResources(deltaTime);
    
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
          this.targetPosition = null;
        }
        // If neural energy is low, prioritize finding energy
        else if (this.neuralEnergy < this.stats.maxNeuralEnergy * 0.3) {
          this.state = SparklingState.SEEKING_ENERGY;
          this.stateTimer = 0;
          this.targetPosition = null;
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
        // Look for food in vicinity
        else {
          this.lookForResources(world, true);
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
        // Look for neural energy in vicinity
        else {
          this.lookForResources(world, false);
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
      this.food = Math.min(this.stats.maxFood, this.food + collected);
    }
    
    // Try to collect neural energy if we need it
    if (this.neuralEnergy < this.stats.maxNeuralEnergy) {
      const collected = world.collectNeuralEnergy(
        this.position.x, 
        this.position.y, 
        energyToCollect
      );
      this.neuralEnergy = Math.min(this.stats.maxNeuralEnergy, this.neuralEnergy + collected);
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
   * Render the Sparkling on the canvas
   */
  public render(context: CanvasRenderingContext2D): void {
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
}