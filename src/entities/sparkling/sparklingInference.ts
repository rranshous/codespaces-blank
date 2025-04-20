// filepath: /workspaces/codespaces-blank/src/entities/sparkling/sparklingInference.ts
import { SparklingCore } from "./sparklingCore";
import { InferenceSystem, InferenceResult } from "@core/inference";
import { InferenceStatus } from "../sparklingTypes";

/**
 * Handles inference processing for Sparkling entities
 */
export class SparklingInference {
  private sparklingCore: SparklingCore;
  
  constructor(sparklingCore: SparklingCore) {
    this.sparklingCore = sparklingCore;
  }
  
  /**
   * Update the inference status and handle inference triggering
   */
  public async updateInferenceStatus(deltaTime: number): Promise<void> {
    const core = this.sparklingCore as any;
    
    // First, update the inference timer
    if (core.inferenceStatus !== InferenceStatus.IDLE) {
      core.inferenceTimer += deltaTime;
    }
    
    // Handle different inference states
    switch (core.inferenceStatus) {
      case InferenceStatus.IDLE:
        // Check if we have enough neural energy to perform inference
        if (core.neuralEnergy >= core.parameters.inferenceThreshold && 
            core.totalTime - core.lastInferenceTime >= core.parameters.inferenceInterval) {
          // Begin the inference process
          core.inferenceStatus = InferenceStatus.PREPARING;
          core.inferenceTimer = 0;
        }
        break;
        
      case InferenceStatus.PREPARING:
        // Short preparation phase for visual effects
        if (core.inferenceTimer >= 1.0) {
          core.inferenceStatus = InferenceStatus.THINKING;
          core.inferenceTimer = 0;
          
          // Consume neural energy for inference
          core.neuralEnergy = Math.max(0, core.neuralEnergy - core.inferenceEnergyCost);
          
          // Perform the inference - this actually calls the API if not using mock mode
          this.performInference();
        }
        break;
        
      case InferenceStatus.THINKING:
        // The thinking state is now managed by the async performInference method
        // We'll transition to PROCESSING when the API call completes
        // Only add a timeout fallback in case the API call hangs
        if (core.inferenceTimer >= 15.0) {  // 15 seconds timeout
          console.warn(`Inference for Sparkling ${core.id} timed out after 15 seconds.`);
          core.inferenceStatus = InferenceStatus.PROCESSING;
          core.inferenceTimer = 0;
        }
        break;
        
      case InferenceStatus.PROCESSING:
        // Processing phase - update is completed in performInference()
        if (core.inferenceTimer >= 1.0) {
          core.inferenceStatus = InferenceStatus.IDLE;
          core.inferenceTimer = 0;
          core.lastInferenceTime = core.totalTime;
        }
        break;
    }
  }
  
  /**
   * Perform inference using the InferenceSystem
   */
  private async performInference(): Promise<void> {
    const core = this.sparklingCore as any;
    
    // Get the inference system instance
    const inferenceSystem = InferenceSystem.getInstance();
    
    try {
      // Log the start of inference for debugging
      console.log(`Sparkling ${core.id} starting inference process...`);
      
      // Perform the inference
      const result = await inferenceSystem.performInference(
        core.id,
        core.state,
        { food: core.food, neuralEnergy: core.neuralEnergy },
        { maxFood: core.stats.maxFood, maxNeuralEnergy: core.stats.maxNeuralEnergy },
        core.memory,
        core.parameters
      );
      
      // Process the result if successful
      if (result.success) {
        // Update parameters based on inference result
        this.sparklingCore.updateParameters(result.updatedParameters);
        
        // Store reasoning in memory
        core.memory.addInferenceMemory(
          { ...core.position },
          result.reasoning,
          result.parameterChangeSummary,
          result.success
        );
        
        // Store the reasoning for use in rendering
        core.lastInferenceReasoning = result.reasoning;
        
        // Log the inference event for debugging
        console.log(`Sparkling ${core.id} performed inference successfully:`, result.reasoning);
      } else {
        // Log the failure
        console.warn(`Sparkling ${core.id} inference failed:`, result.reasoning);
        core.lastInferenceReasoning = `Inference failed: ${result.reasoning}`;
      }
    } catch (error: unknown) {
      console.error(`Sparkling ${core.id} inference error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      core.lastInferenceReasoning = `Inference error: ${errorMessage}`;
    } finally {
      // Always transition to PROCESSING state after API call completes (or fails)
      // This ensures we move to the next state regardless of API success/failure
      core.inferenceStatus = InferenceStatus.PROCESSING;
      core.inferenceTimer = 0;
    }
  }
}