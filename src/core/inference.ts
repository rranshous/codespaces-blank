import { SparklingState } from '@entities/sparklingTypes';
import { DecisionParameters } from '@entities/decisionParameters';
import { Memory } from '@entities/memory';
import { MemoryEventType, InferenceMemoryEntry } from '@entities/memoryTypes';
import { getAnthropicConfig, isApiConfigValid, AnthropicConfig, getActiveEndpoint } from '@config/apiConfig';

/**
 * Interface to define the result of an inference
 */
export interface InferenceResult {
  updatedParameters: Partial<DecisionParameters>;
  reasoning: string;
  parameterChangeSummary: string;
  success: boolean;
}

/**
 * Interface for Anthropic API Response
 */
interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text?: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Class that handles neural energy inference
 */
export class InferenceSystem {
  private static instance: InferenceSystem;
  private apiConfig: AnthropicConfig;
  private useMockInference: boolean = true;
  private recentInferences: Array<{
    sparklingId: number;
    timestamp: number;
    success: boolean;
  }> = [];
  private inferenceQualityMetrics: {
    totalInferences: number;
    successfulInferences: number;
    failedInferences: number;
    averageResponseTime: number;
  } = {
    totalInferences: 0,
    successfulInferences: 0,
    failedInferences: 0,
    averageResponseTime: 0
  };
  
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
  private constructor() {
    this.apiConfig = getAnthropicConfig();
    
    // If we don't have a valid API key, always use mock inference
    if (!isApiConfigValid(this.apiConfig)) {
      console.warn("Anthropic API configuration is invalid. Using mock inference instead.");
      this.useMockInference = true;
    }
  }
  
  /**
   * Set whether to use mock inference instead of the actual API
   */
  public setUseMockInference(useMock: boolean): void {
    this.useMockInference = useMock;
  }
  
  /**
   * Get whether mock inference is being used
   */
  public getUseMockInference(): boolean {
    return this.useMockInference;
  }
  
  /**
   * Get the current API configuration
   */
  public getApiConfig(): AnthropicConfig {
    return { ...this.apiConfig };
  }
  
  /**
   * Check if the API configuration is valid
   */
  public isApiConfigValid(): boolean {
    return isApiConfigValid(this.apiConfig);
  }
  
  /**
   * Get a list of recent inferences
   */
  public getRecentInferences(count: number = 10): Array<{sparklingId: number, timestamp: number, success: boolean}> {
    return this.recentInferences.slice(-count).reverse();
  }
  
  /**
   * Update API configuration
   */
  public updateApiConfig(config: Partial<AnthropicConfig>): void {
    this.apiConfig = { ...this.apiConfig, ...config };
  }
  
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
    const resourceDepletedMemories = memory.getMemoriesByType(MemoryEventType.RESOURCE_DEPLETED);
    const energyMemories = memory.getMemoriesByType(MemoryEventType.ENERGY_FOUND);
    const energyDepletedMemories = memory.getMemoriesByType(MemoryEventType.ENERGY_DEPLETED);
    const encounterMemories = memory.getMemoriesByType(MemoryEventType.SPARKLING_ENCOUNTER);
    const terrainMemories = memory.getMemoriesByType(MemoryEventType.TERRAIN_DISCOVERED);
    const inferenceMemories = memory.getMemoriesByType(MemoryEventType.INFERENCE_PERFORMED) as InferenceMemoryEntry[];
    
    // Format memory information
    const formatMemories = (memories: any[], type: string): string => {
      if (memories.length === 0) return `No ${type} memories.`;
      
      // Sort memories by recency (most recent first)
      const sortedMemories = [...memories].sort((a, b) => b.timestamp - a.timestamp);
      // Take only the 3 most recent memories to avoid overwhelming the model
      const recentMemories = sortedMemories.slice(0, 3);
      
      return recentMemories.map(m => {
        // Just use the timestamp directly, without trying to calculate a relative time
        return `- ${type} at position (${m.position.x.toFixed(0)}, ${m.position.y.toFixed(0)}), timestamp: ${m.timestamp.toFixed(1)}, value: ${m.amount || 'N/A'}`;
      }).join('\n');
    };
    
    // Format inference memories specifically
    const formatInferenceMemories = (memories: InferenceMemoryEntry[]): string => {
      if (memories.length === 0) return "No previous inferences.";
      
      // Sort by recency and take only the most recent one
      const sortedMemories = [...memories].sort((a, b) => b.timestamp - a.timestamp);
      const recentMemory = sortedMemories[0];
      
      return `Last inference at timestamp ${recentMemory.timestamp.toFixed(1)}:
- Reasoning: ${recentMemory.reasoning.substring(0, 150)}${recentMemory.reasoning.length > 150 ? '...' : ''}
- Changes: ${recentMemory.parameterChanges}
- Success: ${recentMemory.success ? 'Yes' : 'No'}`;
    };
    
    // Create the prompt
    const prompt = `
# Your Current Status:
- State: ${state}
- Food: ${resourceLevels.food.toFixed(1)}/${maxLevels.maxFood} (${((resourceLevels.food / maxLevels.maxFood) * 100).toFixed(1)}%)
- Neural Energy: ${resourceLevels.neuralEnergy.toFixed(1)}/${maxLevels.maxNeuralEnergy} (${((resourceLevels.neuralEnergy / maxLevels.maxNeuralEnergy) * 100).toFixed(1)}%)

# Your Memories
## Food Found
${formatMemories(resourceMemories, 'food')}

## Food Depleted:
${formatMemories(resourceDepletedMemories, 'depleted food')}

## Neural Energy Found:
${formatMemories(energyMemories, 'energy')}

## Neural Energy Depleted:
${formatMemories(energyDepletedMemories, 'depleted energy')}

## Encounters with other entities:
${formatMemories(encounterMemories, 'encounter')}

## Terrain:
${formatMemories(terrainMemories, 'terrain')}

## Previous Thoughts:
${formatInferenceMemories(inferenceMemories)}

## Current Instincts
- Resource Preference: ${currentParameters.resourcePreference.toFixed(2)} (-1 = prefer food, 0 = neutral, 1 = prefer energy)
- Hunger Threshold: ${currentParameters.hungerThreshold.toFixed(2)} (food level below which to seek food)
- Critical Hunger Threshold: ${currentParameters.criticalHungerThreshold.toFixed(2)} (critical food level)
- Food Satiation Threshold: ${currentParameters.foodSatiationThreshold.toFixed(2)} (food level at which to stop seeking)
- Energy Low Threshold: ${currentParameters.energyLowThreshold.toFixed(2)} (energy level below which to seek energy)
- Critical Energy Threshold: ${currentParameters.criticalEnergyThreshold.toFixed(2)} (critical energy level)
- Energy Satiation Threshold: ${currentParameters.energySatiationThreshold.toFixed(2)} (energy level at which to stop seeking)
- Collection Efficiency: ${currentParameters.collectionEfficiency.toFixed(2)} (multiplier for resource collection speed)
- Exploration Range: ${currentParameters.explorationRange.toFixed(0)} (how far to explore)
- Exploration Duration: ${currentParameters.explorationDuration.toFixed(0)} (seconds before resting)
- Rest Duration: ${currentParameters.restDuration.toFixed(0)} (seconds of rest)
- Memory Trust Factor: ${currentParameters.memoryTrustFactor.toFixed(2)} (how much to trust memories)
- Novelty Preference: ${currentParameters.noveltyPreference.toFixed(2)} (preference for new areas)
- Persistence Factor: ${currentParameters.persistenceFactor.toFixed(2)} (tendency to stick with current goal)
- Cooperation Tendency: ${currentParameters.cooperationTendency.toFixed(2)} (willingness to cooperate)
- Personal Space Factor: ${currentParameters.personalSpaceFactor.toFixed(0)} (preferred distance from others)
- Inference Threshold: ${currentParameters.inferenceThreshold.toFixed(0)} (neural energy threshold to trigger inference)
- Inference Interval: ${currentParameters.inferenceInterval.toFixed(0)} (seconds between inference attempts)
- Food Memory Importance: ${currentParameters.foodMemoryImportance.toFixed(2)} (importance of food memories for retention)
- Energy Memory Importance: ${currentParameters.energyMemoryImportance.toFixed(2)} (importance of energy memories for retention)

# Consider
What instincts should you follow to optimize your survival?

# Response Format
Return your response in this JSON format with camelCase parameter names:
{
  "reasoning": "Detailed explanation of your reasoning...",
  "parameters": {
    "resourcePreference": number,  // Must use camelCase for parameter names
    "hungerThreshold": number,
    "criticalHungerThreshold": number,
    "foodSatiationThreshold": number,
    "energyLowThreshold": number,
    "criticalEnergyThreshold": number,
    "energySatiationThreshold": number,
    "collectionEfficiency": number,
    "explorationRange": number,
    "explorationDuration": number,
    "restDuration": number,
    "memoryTrustFactor": number,
    "noveltyPreference": number,
    "persistenceFactor": number,
    "cooperationTendency": number,
    "personalSpaceFactor": number,
    "inferenceThreshold": number,
    "inferenceInterval": number,
    "foodMemoryImportance": number,
    "energyMemoryImportance": number
  }
}

IMPORTANT: All parameter names must use camelCase (e.g., "resourcePreference", not "Resource Preference").
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
    let parameterChangeSummary = [];
    
    // Adjust food vs energy preference based on current levels
    if (foodRatio < 0.3 && energyRatio > 0.5) {
      // Low food, sufficient energy - prioritize food
      updatedParameters.resourcePreference = Math.max(-1, currentParameters.resourcePreference - 0.2);
      reasoning += "- Decreased resource preference to prioritize food as food levels are low.\n";
      parameterChangeSummary.push("Resource preference: prioritize food");
    } else if (foodRatio > 0.7 && energyRatio < 0.3) {
      // Sufficient food, low energy - prioritize energy
      updatedParameters.resourcePreference = Math.min(1, currentParameters.resourcePreference + 0.2);
      reasoning += "- Increased resource preference to prioritize neural energy as energy levels are low.\n";
      parameterChangeSummary.push("Resource preference: prioritize energy");
    }
    
    // Adjust thresholds based on abundance or scarcity
    if (prompt.includes("depleted food") && foodRatio < 0.5) {
      // Food appears scarce, increase hunger threshold to seek food earlier
      updatedParameters.hungerThreshold = Math.min(0.7, currentParameters.hungerThreshold + 0.1);
      reasoning += "- Increased hunger threshold to seek food earlier as food appears scarce.\n";
      parameterChangeSummary.push("Increased hunger threshold");
    }
    
    if (prompt.includes("depleted energy") && energyRatio < 0.5) {
      // Energy appears scarce, increase energy threshold to seek energy earlier
      updatedParameters.energyLowThreshold = Math.min(0.7, currentParameters.energyLowThreshold + 0.1);
      reasoning += "- Increased energy threshold to seek neural energy earlier as energy appears scarce.\n";
      parameterChangeSummary.push("Increased energy low threshold");
    }
    
    // Adjust exploration range based on memory distribution
    if (prompt.includes("No food memories") || prompt.includes("No energy memories")) {
      // If missing memories of resources, explore more
      updatedParameters.explorationRange = Math.min(300, currentParameters.explorationRange + 20);
      updatedParameters.noveltyPreference = Math.min(1, currentParameters.noveltyPreference + 0.1);
      reasoning += "- Increased exploration range and novelty preference to discover more resources.\n";
      parameterChangeSummary.push("Increased exploration range and novelty");
    }
    
    // Adjust memory trust factor based on successful finds
    if ((prompt.includes("food") && prompt.includes("Found")) && 
        !prompt.includes("No food memories")) {
      // Resources seem reliable, trust memory more
      updatedParameters.memoryTrustFactor = Math.min(1, currentParameters.memoryTrustFactor + 0.1);
      reasoning += "- Increased memory trust as remembered food locations seem reliable.\n";
      parameterChangeSummary.push("Increased memory trust");
    } else if (prompt.includes("depleted") && !prompt.includes("Found")) {
      // Resources seem unreliable, trust memory less
      updatedParameters.memoryTrustFactor = Math.max(0.1, currentParameters.memoryTrustFactor - 0.1);
      reasoning += "- Decreased memory trust as remembered locations seem depleted.\n";
      parameterChangeSummary.push("Decreased memory trust");
    }
    
    // Adjust cooperation tendency based on encounters
    if (prompt.includes("encounter") && prompt.includes("positive")) {
      updatedParameters.cooperationTendency = Math.min(1, currentParameters.cooperationTendency + 0.1);
      reasoning += "- Increased cooperation tendency due to positive encounters.\n";
      parameterChangeSummary.push("Increased cooperation tendency");
    } else if (prompt.includes("encounter") && prompt.includes("negative")) {
      updatedParameters.cooperationTendency = Math.max(0, currentParameters.cooperationTendency - 0.1);
      reasoning += "- Decreased cooperation tendency due to negative encounters.\n";
      parameterChangeSummary.push("Decreased cooperation tendency");
    }
    
    // Adjust inference parameters based on energy levels
    if (energyRatio > 0.8) {
      // High energy, lower the inference threshold to use it more often
      updatedParameters.inferenceThreshold = Math.max(50, currentParameters.inferenceThreshold - 5);
      reasoning += "- Decreased inference threshold to use neural inference more often when energy is abundant.\n";
      parameterChangeSummary.push("Decreased inference threshold");
    } else if (energyRatio < 0.3) {
      // Low energy, raise the threshold to be more conservative
      updatedParameters.inferenceThreshold = Math.min(100, currentParameters.inferenceThreshold + 5);
      reasoning += "- Increased inference threshold to be more conservative with neural energy.\n";
      parameterChangeSummary.push("Increased inference threshold");
    }
    
    // Adjust inference interval based on overall situation
    if (foodRatio < 0.3 || energyRatio < 0.3) {
      // In challenging situations, increase inference interval to save energy
      updatedParameters.inferenceInterval = Math.min(30, currentParameters.inferenceInterval + 3);
      reasoning += "- Increased inference interval to conserve energy during resource scarcity.\n";
      parameterChangeSummary.push("Increased inference interval");
    } else if (foodRatio > 0.7 && energyRatio > 0.7) {
      // When resources are abundant, decrease interval to use inference more often
      updatedParameters.inferenceInterval = Math.max(10, currentParameters.inferenceInterval - 2);
      reasoning += "- Decreased inference interval to think more frequently during resource abundance.\n";
      parameterChangeSummary.push("Decreased inference interval");
    }
    
    // If no significant changes were made, make a minor adjustment to exploration
    if (Object.keys(updatedParameters).length === 0) {
      // Make a small random adjustment to exploration duration
      const adjustmentDirection = Math.random() > 0.5 ? 1 : -1;
      updatedParameters.explorationDuration = Math.max(
        5, 
        Math.min(
          30, 
          currentParameters.explorationDuration + (adjustmentDirection * 2)
        )
      );
      reasoning += "- Made a small adjustment to exploration duration to optimize resource gathering efficiency.\n";
      parameterChangeSummary.push(`${adjustmentDirection > 0 ? 'Increased' : 'Decreased'} exploration duration`);
    }
    
    return {
      updatedParameters,
      reasoning,
      parameterChangeSummary: parameterChangeSummary.join(", "),
      success: true
    };
  }
  
  /**
   * Call the Anthropic API to perform an inference
   */
  private async callAnthropicApi(prompt: string): Promise<InferenceResult> {
    try {
      // Record the start time for response time measurement
      const startTime = performance.now();
      
      // Determine which endpoint to use (proxy or direct)
      const endpoint = getActiveEndpoint(this.apiConfig);
      
      // Prepare headers based on whether we're using the proxy or direct API
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // When making direct API calls, include the API key
      // When using proxy, the key is stored server-side
      if (!this.apiConfig.useProxy) {
        headers['x-api-key'] = this.apiConfig.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      }
      
      // Make the API request
      const systemPrompt = `
        You are the higher reasoning sub agent for a simple creature trying to survive. You have the opportunity to fine tune your base instincts. Only return JSON.
      `;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.apiConfig.model,
          max_tokens: this.apiConfig.maxTokens,
          temperature: this.apiConfig.temperature,
          system: systemPrompt, 
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      // Calculate response time
      const responseTime = performance.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);
      
      // Process the response
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${this.apiConfig.useProxy ? 'proxy' : 'direct'}):`, errorText);
        this.inferenceQualityMetrics.failedInferences++;
        return {
          updatedParameters: {},
          reasoning: `Failed to perform inference due to an API error. Using ${this.apiConfig.useProxy ? 'proxy endpoint' : 'direct API calls'}.`,
          parameterChangeSummary: "API error",
          success: false
        };
      }
      
      const data = await response.json() as AnthropicResponse;
      
      try {
        // Extract the text content from the response
        // Find the text content in the content array
        const textContent = data.content.find(item => item.type === 'text' && item.text);
        
        if (!textContent || !textContent.text) {
          throw new Error("No text content found in the response");
        }
        
        const content = textContent.text;
        
        // Enhanced JSON extraction and parsing with robust error handling
        try {
          // Try using a regex to extract the JSON more precisely
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error("No valid JSON found in the response");
          }
          
          // Clean the extracted JSON string to handle control characters
          const cleanedJson = this.sanitizeJsonString(jsonMatch[0]);
          const jsonResponse = JSON.parse(cleanedJson);
          
          if (typeof jsonResponse.reasoning !== 'string' || typeof jsonResponse.parameters !== 'object') {
            throw new Error("Response JSON missing required fields");
          }
          
          // Convert parameter names from title case to camelCase
          const convertedParameters: Partial<DecisionParameters> = {};
          if (jsonResponse.parameters) {
            Object.entries(jsonResponse.parameters).forEach(([key, value]) => {
              // Convert "Resource Preference" to "resourcePreference", etc.
              const camelCaseKey = this.convertToCamelCase(key);
              
              // Direct assignment if it's a known parameter
              if (typeof value === 'number' && this.isValidParameterName(camelCaseKey)) {
                convertedParameters[camelCaseKey as keyof DecisionParameters] = value;
              }
            });
          }
          
          // Create a summary of parameter changes
          const parameterChangeSummary = Object.entries(convertedParameters)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
          
          this.inferenceQualityMetrics.successfulInferences++;
          
          return {
            updatedParameters: convertedParameters,
            reasoning: jsonResponse.reasoning,
            parameterChangeSummary,
            success: true
          };
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
          
          // Fallback approach - try to manually extract reasoning and parameters
          // This is a last resort for malformed but recoverable JSON
          try {
            console.log("Attempting fallback JSON parsing");
            
            // Extract reasoning
            const reasoningMatch = content.match(/"reasoning"\s*:\s*"([^"]*)"/);
            const reasoning = reasoningMatch ? reasoningMatch[1] : "Unknown reasoning";
            
            // Extract parameters section
            const paramsMatch = content.match(/"parameters"\s*:\s*\{([^}]*)\}/);
            if (!paramsMatch) throw new Error("Could not extract parameters section");
            
            const parameterEntries = paramsMatch[1].split(',')
              .map(entry => {
                const [key, value] = entry.split(':').map(part => part.trim());
                // Remove quotes if present
                const cleanKey = key.replace(/^"(.*)"$/, '$1').trim();
                const camelKey = this.convertToCamelCase(cleanKey);
                const numValue = parseFloat(value);
                return [camelKey, numValue];
              })
              .filter(([key, value]) => !isNaN(value as number) && this.isValidParameterName(key as string));
              
            const convertedParameters: Partial<DecisionParameters> = {};
            parameterEntries.forEach(([key, value]) => {
              if (this.isValidParameterName(key as string)) {
                convertedParameters[key as keyof DecisionParameters] = value as number;
              }
            });
            
            const parameterChangeSummary = Object.entries(convertedParameters)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");
            
            this.inferenceQualityMetrics.successfulInferences++;
            
            return {
              updatedParameters: convertedParameters,
              reasoning: reasoning,
              parameterChangeSummary,
              success: true
            };
          } catch (fallbackError) {
            // If even the fallback fails, re-throw the original error
            throw jsonError;
          }
        }
      } catch (error) {
        console.error("Error parsing API response:", error);
        console.error("Raw response content:", data.content);
        this.inferenceQualityMetrics.failedInferences++;
        return {
          updatedParameters: {},
          reasoning: "Failed to parse inference response. The AI did not return valid JSON.",
          parameterChangeSummary: "Parsing error",
          success: false
        };
      }
    } catch (error) {
      console.error(`Error calling ${this.apiConfig.useProxy ? 'proxy' : 'Anthropic API'}:`, error);
      this.inferenceQualityMetrics.failedInferences++;
      return {
        updatedParameters: {},
        reasoning: `Failed to perform inference due to a network or server error. Using ${this.apiConfig.useProxy ? 'proxy endpoint' : 'direct API calls'}.`,
        parameterChangeSummary: "Network error",
        success: false
      };
    }
  }
  
  /**
   * Sanitize a JSON string by removing or escaping invalid control characters
   */
  private sanitizeJsonString(jsonString: string): string {
    // Remove or replace control characters that would break JSON.parse
    return jsonString
      // Replace control characters with spaces
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, ' ')
      // Fix newlines (sometimes they're not properly escaped)
      .replace(/\n/g, '\\n')
      // Fix carriage returns
      .replace(/\r/g, '\\r')
      // Fix tabs
      .replace(/\t/g, '\\t')
      // Fix backspace
      .replace(/\b/g, '\\b')
      // Fix form feed
      .replace(/\f/g, '\\f')
      // Double backslashes (sometimes these cause issues)
      .replace(/\\\\/g, '\\\\');
  }

  /**
   * Convert a string from title case or other formats to camelCase
   */
  private convertToCamelCase(input: string): string {
    // Convert "Resource Preference" to "resourcePreference"
    return input
      .replace(/\s(.)/g, match => match.trim().toUpperCase()) // Convert "X Y" to "XY"
      .replace(/^(.)/, match => match.toLowerCase()); // Convert first char to lowercase
  }

  /**
   * Check if a parameter name is valid
   */
  private isValidParameterName(name: string): boolean {
    const validParameterNames = [
      'resourcePreference',
      'hungerThreshold',
      'criticalHungerThreshold',
      'foodSatiationThreshold',
      'energyLowThreshold',
      'criticalEnergyThreshold',
      'energySatiationThreshold',
      'collectionEfficiency',
      'explorationRange',
      'explorationDuration',
      'restDuration',
      'personalSpaceFactor',
      'memoryTrustFactor',
      'noveltyPreference',
      'persistenceFactor',
      'cooperationTendency',
      'inferenceThreshold',
      'inferenceInterval',
      'foodMemoryImportance',
      'energyMemoryImportance'
    ];
    
    return validParameterNames.includes(name);
  }
  
  /**
   * Update the response time metrics
   */
  private updateResponseTimeMetrics(responseTime: number): void {
    const previousTotal = this.inferenceQualityMetrics.averageResponseTime * 
                         this.inferenceQualityMetrics.totalInferences;
    
    this.inferenceQualityMetrics.totalInferences++;
    this.inferenceQualityMetrics.averageResponseTime = 
      (previousTotal + responseTime) / this.inferenceQualityMetrics.totalInferences;
  }
  
  /**
   * Get inference quality metrics
   */
  public getInferenceQualityMetrics(): typeof this.inferenceQualityMetrics {
    return { ...this.inferenceQualityMetrics };
  }
  
  /**
   * Track the inference in the recent inferences list
   */
  private trackInference(sparklingId: number, success: boolean): void {
    // Add the inference to the recent inferences list
    this.recentInferences.push({
      sparklingId,
      timestamp: Date.now(),
      success
    });
    
    // Keep only the last 100 inferences
    if (this.recentInferences.length > 100) {
      this.recentInferences.shift();
    }
    
    // Update metrics
    this.inferenceQualityMetrics.totalInferences++;
    if (success) {
      this.inferenceQualityMetrics.successfulInferences++;
    } else {
      this.inferenceQualityMetrics.failedInferences++;
    }
  }
  
  /**
   * Check if a Sparkling has made an inference recently
   */
  public hasRecentInference(sparklingId: number, timeWindowMs: number = 10000): boolean {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.recentInferences.some(
      inf => inf.sparklingId === sparklingId && inf.timestamp >= cutoffTime
    );
  }
  
  /**
   * Validate parameter updates to ensure they're within valid ranges
   */
  private validateParameterUpdates(
    parameters: Partial<DecisionParameters>
  ): Partial<DecisionParameters> {
    const validatedParams: Partial<DecisionParameters> = {};
    
    // Define valid ranges for each parameter
    const validRanges: Record<keyof DecisionParameters, [number, number]> = {
      hungerThreshold: [0.2, 0.8],
      criticalHungerThreshold: [0.1, 0.3],
      foodSatiationThreshold: [0.7, 0.95],
      energyLowThreshold: [0.2, 0.8],
      criticalEnergyThreshold: [0.1, 0.3],
      energySatiationThreshold: [0.7, 0.95],
      resourcePreference: [-1, 1],
      collectionEfficiency: [0.5, 2],
      explorationRange: [50, 500],
      explorationDuration: [5, 30],
      restDuration: [2, 15],
      personalSpaceFactor: [10, 100],
      memoryTrustFactor: [0.1, 1],
      noveltyPreference: [0, 1],
      persistenceFactor: [0, 1],
      cooperationTendency: [0, 1],
      inferenceThreshold: [50, 100],
      inferenceInterval: [10, 30],
      foodMemoryImportance: [0, 1],
      energyMemoryImportance: [0, 1]
    };
    
    // Validate each parameter
    for (const [key, value] of Object.entries(parameters)) {
      const paramKey = key as keyof DecisionParameters;
      
      // Skip if undefined or not a valid parameter
      if (value === undefined || !(paramKey in validRanges)) {
        continue;
      }
      
      const [min, max] = validRanges[paramKey];
      // Clamp the value to the valid range
      validatedParams[paramKey] = Math.max(min, Math.min(max, value as number));
    }
    
    return validatedParams;
  }
  
  /**
   * Perform inference based on the Sparkling's state
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
    
    let result: InferenceResult;
    
    if (this.useMockInference) {
      // Use mock inference
      result = this.mockInference(prompt, currentParameters);
    } else {
      // Use real API
      result = await this.callAnthropicApi(prompt);
    }
    
    // Track this inference
    this.trackInference(sparklingId, result.success);
    
    // Validate the parameter updates
    if (result.success && Object.keys(result.updatedParameters).length > 0) {
      result.updatedParameters = this.validateParameterUpdates(result.updatedParameters);
    }
    
    return result;
  }
}