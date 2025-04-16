import { SparklingState } from '@entities/sparklingTypes';
import { DecisionParameters } from '@entities/decisionParameters';
import { Memory } from '@entities/memory';
import { MemoryEventType } from '@entities/memoryTypes';

/**
 * Interface to define the result of an inference
 */
export interface InferenceResult {
  updatedParameters: Partial<DecisionParameters>;
  reasoning: string;
  success: boolean;
}

/**
 * Class that handles neural energy inference
 */
export class InferenceSystem {
  private static instance: InferenceSystem;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): InferenceSystem {
    if (!InferenceSystem.instance) {
      InferenceSystem.instance = new InferenceSystem();
    }
    return InferenceSystem.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Generate a prompt for the AI based on the Sparkling's state and memory
   */
  private generatePrompt(
    sparklingId: number,
    state: SparklingState,
    resourceLevels: { food: number, neuralEnergy: number },
    maxLevels: { maxFood: number, maxNeuralEnergy: number },
    memory: Memory,
    currentParameters: DecisionParameters
  ): string {
    // Get memory information by type
    const resourceMemories = memory.getMemoriesByType(MemoryEventType.RESOURCE_FOUND);
    const energyMemories = memory.getMemoriesByType(MemoryEventType.ENERGY_FOUND);
    const encounterMemories = memory.getMemoriesByType(MemoryEventType.SPARKLING_ENCOUNTER);
    const terrainMemories = memory.getMemoriesByType(MemoryEventType.TERRAIN_DISCOVERED);
    
    // Format memory information
    const formatMemories = (memories: any[], type: string): string => {
      if (memories.length === 0) return `No ${type} memories.`;
      
      return memories.map(m => {
        // Just use the timestamp directly, without trying to calculate a relative time
        return `- ${type} at position (${m.position.x.toFixed(0)}, ${m.position.y.toFixed(0)}), timestamp: ${m.timestamp.toFixed(1)}, value: ${m.amount || 'N/A'}`;
      }).join('\n');
    };
    
    // Create the prompt
    const prompt = `
You are a Sparkling (ID: ${sparklingId}) in a simulation. Help improve your decision parameters based on your current situation.

Current State:
- State: ${state}
- Food: ${resourceLevels.food.toFixed(1)}/${maxLevels.maxFood}
- Neural Energy: ${resourceLevels.neuralEnergy.toFixed(1)}/${maxLevels.maxNeuralEnergy}

Memory:
Food Resources:
${formatMemories(resourceMemories, 'food')}

Neural Energy:
${formatMemories(energyMemories, 'energy')}

Encounters:
${formatMemories(encounterMemories, 'encounter')}

Terrain:
${formatMemories(terrainMemories, 'terrain')}

Current Decision Parameters:
- Resource Preference (food vs energy): ${currentParameters.resourcePreference.toFixed(2)} (-1 to 1)
- Hunger Threshold: ${currentParameters.hungerThreshold.toFixed(2)}
- Energy Low Threshold: ${currentParameters.energyLowThreshold.toFixed(2)}
- Collection Efficiency: ${currentParameters.collectionEfficiency.toFixed(2)}
- Exploration Range: ${currentParameters.explorationRange.toFixed(0)}
- Memory Trust: ${currentParameters.memoryTrustFactor.toFixed(2)}
- Novelty Preference: ${currentParameters.noveltyPreference.toFixed(2)}
- Persistence: ${currentParameters.persistenceFactor.toFixed(2)}
- Cooperation: ${currentParameters.cooperationTendency.toFixed(2)}

Based on this information, suggest adjustments to your decision parameters to improve survival and intelligence.
Return only JSON format with "reasoning" explaining your choices and "parameters" with updated values.
`;
    
    return prompt;
  }
  
  /**
   * Mock inference for development purposes
   * In a real implementation, this would call an external AI API
   */
  private mockInference(prompt: string, currentParameters: DecisionParameters): InferenceResult {
    // For now, generate a simple adjustment to parameters based on content of prompt
    const updatedParameters: Partial<DecisionParameters> = {};
    
    // Extract current levels from prompt
    const foodMatch = prompt.match(/Food: (\d+\.?\d*)\/(\d+)/);
    const energyMatch = prompt.match(/Neural Energy: (\d+\.?\d*)\/(\d+)/);
    
    const foodLevel = foodMatch ? parseFloat(foodMatch[1]) : 50;
    const maxFood = foodMatch ? parseFloat(foodMatch[2]) : 100;
    const energyLevel = energyMatch ? parseFloat(energyMatch[1]) : 50;
    const maxEnergy = energyMatch ? parseFloat(energyMatch[2]) : 100;
    
    const foodRatio = foodLevel / maxFood;
    const energyRatio = energyLevel / maxEnergy;
    
    // Generate reasoning
    let reasoning = "Based on my current state and memory, I've made the following adjustments:\n";
    
    // Adjust food vs energy preference based on current levels
    if (foodRatio < 0.3 && energyRatio > 0.5) {
      // Low food, sufficient energy - prioritize food
      updatedParameters.resourcePreference = Math.max(-1, currentParameters.resourcePreference - 0.2);
      reasoning += "- Decreased resource preference to prioritize food as food levels are low.\n";
    } else if (foodRatio > 0.7 && energyRatio < 0.3) {
      // Sufficient food, low energy - prioritize energy
      updatedParameters.resourcePreference = Math.min(1, currentParameters.resourcePreference + 0.2);
      reasoning += "- Increased resource preference to prioritize neural energy as energy levels are low.\n";
    }
    
    // Adjust thresholds based on abundance or scarcity
    if (prompt.includes("food") && prompt.includes("depleted")) {
      // Food appears scarce, increase hunger threshold to seek food earlier
      updatedParameters.hungerThreshold = Math.min(0.7, currentParameters.hungerThreshold + 0.1);
      reasoning += "- Increased hunger threshold to seek food earlier as food appears scarce.\n";
    }
    
    if (prompt.includes("energy") && prompt.includes("depleted")) {
      // Energy appears scarce, increase energy threshold to seek energy earlier
      updatedParameters.energyLowThreshold = Math.min(0.7, currentParameters.energyLowThreshold + 0.1);
      reasoning += "- Increased energy threshold to seek neural energy earlier as energy appears scarce.\n";
    }
    
    // Adjust exploration range based on memory distribution
    if (prompt.includes("No food memories") || prompt.includes("No energy memories")) {
      // If missing memories of resources, explore more
      updatedParameters.explorationRange = Math.min(300, currentParameters.explorationRange + 20);
      updatedParameters.noveltyPreference = Math.min(1, currentParameters.noveltyPreference + 0.1);
      reasoning += "- Increased exploration range and novelty preference to discover more resources.\n";
    }
    
    // Adjust memory trust factor based on successful finds
    if (prompt.includes("found") && !prompt.includes("depleted")) {
      // Resources seem reliable, trust memory more
      updatedParameters.memoryTrustFactor = Math.min(1, currentParameters.memoryTrustFactor + 0.1);
      reasoning += "- Increased memory trust as remembered locations seem reliable.\n";
    } else if (prompt.includes("depleted") && !prompt.includes("found")) {
      // Resources seem unreliable, trust memory less
      updatedParameters.memoryTrustFactor = Math.max(0.1, currentParameters.memoryTrustFactor - 0.1);
      reasoning += "- Decreased memory trust as remembered locations seem depleted.\n";
    }
    
    return {
      updatedParameters,
      reasoning,
      success: true
    };
  }
  
  /**
   * Perform inference based on the Sparkling's state
   * In a real implementation, this would call an external AI API
   */
  public async performInference(
    sparklingId: number,
    state: SparklingState,
    resourceLevels: { food: number, neuralEnergy: number },
    maxLevels: { maxFood: number, maxNeuralEnergy: number },
    memory: Memory,
    currentParameters: DecisionParameters
  ): Promise<InferenceResult> {
    // Generate the prompt
    const prompt = this.generatePrompt(
      sparklingId,
      state,
      resourceLevels,
      maxLevels,
      memory,
      currentParameters
    );
    
    // For development purposes, use a mock inference instead of calling an external API
    return this.mockInference(prompt, currentParameters);
    
    // In a real implementation, the prompt would be sent to an AI API
    // Example (pseudo-code):
    // try {
    //   const response = await fetch('https://api.anthropic.com/v1/messages', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'x-api-key': 'YOUR_API_KEY'
    //     },
    //     body: JSON.stringify({
    //       model: 'claude-3-opus-20240229',
    //       system: "You are a decision system for a simulated entity. Respond only with JSON.",
    //       messages: [{ role: 'user', content: prompt }],
    //       max_tokens: 1000
    //     })
    //   });
    //   const data = await response.json();
    //
    //   // Parse the response and extract the parameters
    //   // This implementation would need to handle parsing the AI response
    //   const result = JSON.parse(data.content);
    //   
    //   return {
    //     updatedParameters: result.parameters,
    //     reasoning: result.reasoning,
    //     success: true
    //   };
    // } catch (error) {
    //   console.error("Error performing inference:", error);
    //   return {
    //     updatedParameters: {},
    //     reasoning: "Failed to perform inference due to an error.",
    //     success: false
    //   };
    // }
  }
}