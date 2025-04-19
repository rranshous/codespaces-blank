/**
 * Enum representing different behavioral profiles for Sparklings
 */
export enum BehavioralProfile {
  BALANCED = "balanced",
  EXPLORER = "explorer",
  GATHERER = "gatherer",
  ENERGY_SEEKER = "energy_seeker",
  SOCIAL = "social",
  CAUTIOUS = "cautious"
}

/**
 * Interface defining parameters that influence Sparkling decision making
 */
export interface DecisionParameters {
  // Resource management parameters
  hungerThreshold: number;         // Food level below which a Sparkling starts seeking food
  criticalHungerThreshold: number; // Food level at which hunger becomes critical
  foodSatiationThreshold: number;  // Food level at which a Sparkling feels satisfied
  energyLowThreshold: number;      // Energy level below which a Sparkling starts seeking energy
  criticalEnergyThreshold: number; // Energy level at which energy needs become critical
  energySatiationThreshold: number;// Energy level at which a Sparkling feels satisfied
  resourcePreference: number;      // -1 to 1, preference for food vs energy (-1 = prefer food, 0 = neutral, 1 = prefer energy)
  collectionEfficiency: number;    // Multiplier for resource collection speed
  
  // Movement parameters
  explorationRange: number;        // Base maximum distance a Sparkling will explore from its resting point
  explorationDuration: number;     // Typical duration of exploration in seconds
  restDuration: number;            // Typical duration of rest in seconds
  personalSpaceFactor: number;     // Preference for maintaining distance from other Sparklings
  
  // Cognitive parameters
  memoryTrustFactor: number;       // 0-1, how much the Sparkling trusts its memories
  noveltyPreference: number;       // 0-1, preference for exploring new areas vs familiar areas
  persistenceFactor: number;       // 0-1, how persistent the Sparkling is in following a goal
  cooperationTendency: number;     // 0-1, tendency to cooperate with other Sparklings
  
  // Memory importance parameters
  foodMemoryImportance: number;    // 0-1, how important food memories are to this Sparkling 
  energyMemoryImportance: number;  // 0-1, how important energy memories are to this Sparkling
  
  // Inference parameters
  inferenceThreshold: number;      // Neural energy level required to trigger inference
  inferenceInterval: number;       // Minimum time in seconds between inference operations
}