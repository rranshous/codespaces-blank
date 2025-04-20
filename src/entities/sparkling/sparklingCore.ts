// filepath: /workspaces/codespaces-blank/src/entities/sparkling/sparklingCore.ts
import { SimulationConfig } from "@config/config";
import { Position, SparklingState, SparklingStats, Velocity, InferenceStatus } from "../sparklingTypes";
import { Memory } from "../memory";
import { DecisionParameters, BehavioralProfile } from "../decisionParameters";
import { createRandomizedParameters, generateParametersForProfile } from "../decisionParameterProfiles";

/**
 * Core functionality for the Sparkling entity
 */
export class SparklingCore {
  // Core attributes
  protected id: number;
  protected position: Position;
  protected velocity: Velocity;
  protected state: SparklingState;
  protected food: number;
  protected neuralEnergy: number;
  protected stats: SparklingStats;
  protected color: string;
  protected targetPosition: Position | null = null;
  
  // Memory system
  protected memory: Memory;
  protected totalTime: number = 0;
  
  // Decision parameters
  protected parameters: DecisionParameters;
  protected profile: BehavioralProfile;
  
  // Movement and behavior
  protected stateTimer: number = 0;
  protected idleTime: number = 0;
  protected lastResourceCheck: number = 0;
  protected lastTerrainCheck: number = 0;
  protected homePosition: Position | null = null;
  
  // Neural energy & inference
  protected inferenceStatus: InferenceStatus = InferenceStatus.IDLE;
  protected lastInferenceTime: number = 0;
  protected inferenceEnergyCost: number = 30; // Base cost of inference
  protected inferenceTimer: number = 0; // Timer for inference animation
  protected lastInferenceReasoning: string = '';
  
  // Competition & territory
  protected competitionPenalty: number = 0; // Penalty to collection efficiency from competition
  protected competitionTimer: number = 0; // Time remaining for the competition penalty
  protected territoryCenter: Position | null = null; // Center of the Sparkling's territory
  protected territoryRadius: number = 0; // Radius of the Sparkling's territory
  
  // Fadeout properties
  protected fadeoutProgress: number = 0;       // Progress from 0 to 1
  protected fadeoutDuration: number = 5.0;     // How long the fadeout takes in seconds
  protected isFadingOut: boolean = false;      // Whether this sparkling is currently fading out
  protected isReadyToRemove: boolean = false;  // Whether this sparkling can be removed from simulation
  
  /**
   * Create a new SparklingCore
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
      foodConsumptionRate: 0.5, // Reduced from 1.0 to 0.5 unit per second
      neuralEnergyConsumptionRate: 1, // Units per second
      collectionRate: 10 // Units per second
    };
    
    // Set behavioral profile and initialize decision parameters
    this.profile = profile;
    this.parameters = createRandomizedParameters(
      generateParametersForProfile(profile),
      0.2 // 20% variation to create individuality
    );
    
    // Initialize memory system with importance parameters from the Sparkling's decision parameters
    this.memory = new Memory(
      config,
      this.parameters.foodMemoryImportance,
      this.parameters.energyMemoryImportance
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
   * Calculate the distance to a point
   */
  protected distanceToPoint(point: Position): number {
    const dx = this.position.x - point.x;
    const dy = this.position.y - point.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Check if a point is within this Sparkling's territory
   */
  public isPointInTerritory(point: Position): boolean {
    if (!this.territoryCenter) return false;
    
    const dx = point.x - this.territoryCenter.x;
    const dy = point.y - this.territoryCenter.y;
    const distanceSquared = dx * dx + dy * dy;
    
    return distanceSquared < this.territoryRadius * this.territoryRadius;
  }
  
  /**
   * Get the territory center and radius
   */
  public getTerritory(): { center: Position | null, radius: number } {
    return {
      center: this.territoryCenter ? { ...this.territoryCenter } : null,
      radius: this.territoryRadius
    };
  }
  
  // Getters and setters for core properties
  
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
    
    // Update memory importance parameters when decision parameters change
    if (parameters.foodMemoryImportance !== undefined || parameters.energyMemoryImportance !== undefined) {
      this.memory.updateMemoryImportance(
        this.parameters.foodMemoryImportance,
        this.parameters.energyMemoryImportance
      );
    }
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
   * Get the maximum food capacity
   */
  public getMaxFood(): number {
    return this.stats.maxFood;
  }
  
  /**
   * Get the current food consumption rate
   */
  public getFoodConsumptionRate(): number {
    // Base food consumption rate with adjustments based on state
    let rate = this.stats.foodConsumptionRate;
    
    // Extra consumption during movement
    if (this.state !== SparklingState.IDLE && this.state !== SparklingState.RESTING) {
      rate += 0.1; // Movement cost
    }
    
    return rate;
  }
  
  /**
   * Check if the Sparkling is currently collecting food specifically
   * (as opposed to neural energy)
   */
  public isCollectingFood(): boolean {
    if (this.state !== SparklingState.COLLECTING) {
      return false;
    }
    
    // Determine if we're prioritizing food collection based on resource preference
    // and current needs
    const foodRatio = this.food / this.stats.maxFood;
    const energyRatio = this.neuralEnergy / this.stats.maxNeuralEnergy;
    
    // If we need food more urgently than energy, we're probably collecting food
    if (foodRatio < this.parameters.hungerThreshold && 
        (energyRatio > this.parameters.energyLowThreshold || 
         foodRatio < energyRatio)) {
      return true;
    }
    
    // Check resource preference to determine what we're likely collecting
    return this.parameters.resourcePreference <= 0; // Preference for food
  }
  
  /**
   * Check if the Sparkling is ready to be removed from the simulation
   */
  public shouldBeRemoved(): boolean {
    return this.isReadyToRemove;
  }
  
  /**
   * Get the fadeout progress (0-1)
   */
  public getFadeoutProgress(): number {
    return this.fadeoutProgress;
  }
  
  /**
   * Check if the Sparkling is currently fading out
   */
  public isFading(): boolean {
    return this.isFadingOut;
  }
}