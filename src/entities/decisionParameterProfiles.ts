import { DecisionParameters, BehavioralProfile } from "./decisionParameters";

/**
 * Default balanced parameter set
 */
const DEFAULT_PARAMETERS: DecisionParameters = {
  // Resource management parameters
  hungerThreshold: 0.4,          // Seek food when below 40%
  criticalHungerThreshold: 0.15,  // Critical hunger at 15%
  foodSatiationThreshold: 0.7,   // Satisfied with food at 70%
  energyLowThreshold: 0.35,      // Seek energy when below 35%
  criticalEnergyThreshold: 0.1,  // Critical energy at 10%
  energySatiationThreshold: 0.65, // Satisfied with energy at 65%
  resourcePreference: 0,         // No preference between food and energy
  collectionEfficiency: 1.0,     // Standard collection efficiency
  
  // Movement parameters
  explorationRange: 200,         // Standard exploration range
  explorationDuration: 15,       // Explore for 15 seconds before resting
  restDuration: 5,               // Rest for 5 seconds
  personalSpaceFactor: 25,       // Standard personal space
  
  // Cognitive parameters
  memoryTrustFactor: 0.7,        // Moderate trust in memory
  noveltyPreference: 0.5,        // Balanced preference for novelty
  persistenceFactor: 0.4,        // Moderate persistence
  cooperationTendency: 0.5,      // Neutral cooperation tendency
  
  // Inference parameters
  inferenceThreshold: 70,        // Default neural energy threshold for inference
  inferenceInterval: 15          // Default minimum time between inferences
};

/**
 * Generate parameters for a specific behavioral profile
 */
export function generateParametersForProfile(profile: BehavioralProfile): DecisionParameters {
  // Start with default parameters
  const params: DecisionParameters = { ...DEFAULT_PARAMETERS };
  
  // Modify based on profile
  switch (profile) {
    case BehavioralProfile.EXPLORER:
      // Explorers prioritize discovering new areas
      params.explorationRange = 300;          // Larger exploration range
      params.explorationDuration = 25;        // Longer exploration periods
      params.restDuration = 3;                // Shorter rest periods
      params.noveltyPreference = 0.85;        // Strong preference for novelty
      params.memoryTrustFactor = 0.5;         // Less reliance on memory
      params.persistenceFactor = 0.2;         // Lower persistence (changes direction more)
      break;
      
    case BehavioralProfile.GATHERER:
      // Gatherers prioritize finding and collecting food
      params.hungerThreshold = 0.6;           // Start seeking food earlier
      params.criticalHungerThreshold = 0.25;  // Higher critical threshold
      params.foodSatiationThreshold = 0.9;    // Higher food satisfaction threshold
      params.resourcePreference = -0.7;       // Strong preference for food
      params.collectionEfficiency = 1.3;      // More efficient at collecting
      params.memoryTrustFactor = 0.8;         // Higher memory trust
      params.persistenceFactor = 0.7;         // Higher persistence in tasks
      break;
      
    case BehavioralProfile.ENERGY_SEEKER:
      // Energy seekers prioritize neural energy
      params.energyLowThreshold = 0.5;        // Start seeking energy earlier
      params.criticalEnergyThreshold = 0.2;   // Higher critical threshold
      params.energySatiationThreshold = 0.9;  // Higher energy satisfaction threshold
      params.resourcePreference = 0.7;        // Strong preference for neural energy
      params.collectionEfficiency = 1.3;      // More efficient at collecting
      params.memoryTrustFactor = 0.8;         // Higher memory trust
      params.persistenceFactor = 0.7;         // Higher persistence in tasks
      break;
      
    case BehavioralProfile.SOCIAL:
      // Social sparklings interact more with others
      params.personalSpaceFactor = 15;        // Prefer to be closer to others
      params.cooperationTendency = 0.9;       // High cooperation tendency
      params.explorationRange = 150;          // Smaller exploration range (stay closer to group)
      params.memoryTrustFactor = 0.8;         // Higher memory trust
      params.persistenceFactor = 0.5;         // Moderate persistence
      break;
      
    case BehavioralProfile.CAUTIOUS:
      // Cautious sparklings prioritize safety
      params.hungerThreshold = 0.5;           // Start seeking food earlier
      params.energyLowThreshold = 0.45;       // Start seeking energy earlier
      params.explorationRange = 150;          // Smaller exploration range
      params.explorationDuration = 10;        // Shorter exploration periods
      params.restDuration = 7;                // Longer rest periods
      params.personalSpaceFactor = 40;        // Prefer more personal space
      params.memoryTrustFactor = 0.9;         // High memory trust
      params.persistenceFactor = 0.6;         // Higher persistence (fewer direction changes)
      params.noveltyPreference = 0.2;         // Lower preference for novelty
      break;
      
    case BehavioralProfile.BALANCED:
    default:
      // Balanced is already the default
      break;
  }
  
  return params;
}

/**
 * Create a new parameter set with randomized variations from a base set
 * @param baseParams The base parameter set
 * @param variationFactor How much variation to apply (0-1)
 */
export function createRandomizedParameters(
  baseParams: DecisionParameters, 
  variationFactor: number = 0.2
): DecisionParameters {
  const params = { ...baseParams };
  
  // Helper function to add variation while keeping within range
  const varyParam = (value: number, min: number, max: number): number => {
    const variation = (Math.random() * 2 - 1) * variationFactor;
    return Math.max(min, Math.min(max, value + (value * variation)));
  };
  
  // Apply variation to each parameter
  params.hungerThreshold = varyParam(params.hungerThreshold, 0.1, 0.7);
  params.criticalHungerThreshold = varyParam(params.criticalHungerThreshold, 0.05, 0.3);
  params.foodSatiationThreshold = varyParam(params.foodSatiationThreshold, 0.5, 0.95);
  params.energyLowThreshold = varyParam(params.energyLowThreshold, 0.1, 0.7);
  params.criticalEnergyThreshold = varyParam(params.criticalEnergyThreshold, 0.05, 0.3);
  params.energySatiationThreshold = varyParam(params.energySatiationThreshold, 0.5, 0.95);
  params.resourcePreference = varyParam(params.resourcePreference, -1, 1);
  params.collectionEfficiency = varyParam(params.collectionEfficiency, 0.5, 1.5);
  
  params.explorationRange = varyParam(params.explorationRange, 100, 400);
  params.explorationDuration = varyParam(params.explorationDuration, 5, 30);
  params.restDuration = varyParam(params.restDuration, 2, 10);
  params.personalSpaceFactor = varyParam(params.personalSpaceFactor, 10, 50);
  
  params.memoryTrustFactor = varyParam(params.memoryTrustFactor, 0.1, 1);
  params.noveltyPreference = varyParam(params.noveltyPreference, 0.1, 1);
  params.persistenceFactor = varyParam(params.persistenceFactor, 0.1, 0.9);
  params.cooperationTendency = varyParam(params.cooperationTendency, 0.1, 1);
  
  // Apply variation to inference parameters
  params.inferenceThreshold = varyParam(params.inferenceThreshold, 50, 100);
  params.inferenceInterval = varyParam(params.inferenceInterval, 10, 30);
  
  return params;
}

/**
 * Blend two parameter sets together with the given ratio
 * @param params1 First parameter set
 * @param params2 Second parameter set
 * @param ratio Blend ratio (0 = all params1, 1 = all params2)
 */
export function blendParameters(
  params1: DecisionParameters,
  params2: DecisionParameters,
  ratio: number = 0.5
): DecisionParameters {
  const result: DecisionParameters = { ...params1 };
  
  // Helper function to blend a parameter
  const blend = (a: number, b: number): number => {
    return a * (1 - ratio) + b * ratio;
  };
  
  // Blend all parameters
  for (const key in params1) {
    if (key in params1 && key in params2) {
      (result as any)[key] = blend((params1 as any)[key], (params2 as any)[key]);
    }
  }
  
  return result;
}

/**
 * Evolve parameters based on success or failure in a specific area
 * @param params Current parameters
 * @param area Area of adaptation
 * @param successFactor How successful the current parameters were (-1 to 1)
 */
export function evolveParameters(
  params: DecisionParameters,
  area: 'food' | 'energy' | 'exploration' | 'social' | 'inference',
  successFactor: number
): DecisionParameters {
  const result = { ...params };
  const adjustmentAmount = 0.1 * successFactor;
  
  // Helper function to adjust a parameter value
  const adjust = (value: number, direction: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value + (direction * adjustmentAmount)));
  };
  
  switch (area) {
    case 'food':
      result.hungerThreshold = adjust(result.hungerThreshold, successFactor > 0 ? -1 : 1, 0.1, 0.7);
      result.collectionEfficiency = adjust(result.collectionEfficiency, successFactor, 0.5, 1.5);
      result.resourcePreference = adjust(result.resourcePreference, -successFactor, -1, 1);
      break;
      
    case 'energy':
      result.energyLowThreshold = adjust(result.energyLowThreshold, successFactor > 0 ? -1 : 1, 0.1, 0.7);
      result.collectionEfficiency = adjust(result.collectionEfficiency, successFactor, 0.5, 1.5);
      result.resourcePreference = adjust(result.resourcePreference, successFactor, -1, 1);
      break;
      
    case 'exploration':
      result.explorationRange = adjust(result.explorationRange, successFactor, 100, 400);
      result.noveltyPreference = adjust(result.noveltyPreference, successFactor, 0.1, 1);
      result.memoryTrustFactor = adjust(result.memoryTrustFactor, successFactor > 0 ? -1 : 1, 0.1, 1);
      break;
      
    case 'social':
      result.cooperationTendency = adjust(result.cooperationTendency, successFactor, 0.1, 1);
      result.personalSpaceFactor = adjust(result.personalSpaceFactor, -successFactor, 10, 50);
      break;
      
    case 'inference':
      // Adjust inference parameters based on success
      result.inferenceThreshold = adjust(result.inferenceThreshold, successFactor > 0 ? -1 : 1, 50, 100);
      result.inferenceInterval = adjust(result.inferenceInterval, successFactor > 0 ? -1 : 1, 10, 30);
      break;
  }
  
  return result;
}