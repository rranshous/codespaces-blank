// filepath: /workspaces/codespaces-blank/src/entities/sparkling/sparklingMemory.ts
import { SparklingCore } from "./sparklingCore";
import { MemoryEventType } from "../memoryTypes";
import { Position } from "../sparklingTypes";

/**
 * Handles memory integration for Sparkling entities
 */
export class SparklingMemory {
  private sparklingCore: SparklingCore;
  
  constructor(sparklingCore: SparklingCore) {
    this.sparklingCore = sparklingCore;
  }
  
  /**
   * Update the memory system's time reference
   */
  public updateTime(deltaTime: number): void {
    const core = this.sparklingCore as any;
    
    // Update total time
    core.totalTime += deltaTime;
    
    // Update memory system's time
    core.memory.updateTime(core.totalTime);
  }
  
  /**
   * Get information about the last inference
   */
  public getLastInferenceInfo(): { timestamp: number; success: boolean; reasoning: string } {
    const core = this.sparklingCore as any;
    const memory = core.memory;
    
    // Get the most recent inference memory
    const inferenceMemories = memory.getMemoriesByType(MemoryEventType.INFERENCE_PERFORMED);
    
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