import { SimulationConfig } from "@config/config";
import { MemoryEntry, MemoryEventType, ResourceMemoryEntry, EnergyMemoryEntry, TerrainMemoryEntry, SparklingEncounterMemoryEntry, InferenceMemoryEntry } from "./memoryTypes";
import { Position } from "./sparklingTypes";
import { TerrainType } from "@core/terrain";

/**
 * Class that manages a Sparkling's memory
 */
export class Memory {
  private entries: MemoryEntry[] = [];
  private capacity: number;
  private currentTime: number = 0;
  
  constructor(config: SimulationConfig) {
    this.capacity = config.memorySize;
  }
  
  /**
   * Add a new memory entry
   * @returns true if the memory was added, false if it was discarded
   */
  public addEntry(entry: MemoryEntry): boolean {
    // Update the timestamp if not provided
    if (!entry.timestamp) {
      entry.timestamp = this.currentTime;
    }
    
    // Check if this is a duplicate or very similar to recent memories
    if (this.isDuplicate(entry)) {
      return false;
    }
    
    // Add the new entry
    this.entries.push(entry);
    
    // If we're over capacity, remove the least important entries
    this.pruneMemory();
    
    return true;
  }
  
  /**
   * Create and add a resource memory
   */
  public addResourceMemory(type: MemoryEventType.RESOURCE_FOUND | MemoryEventType.RESOURCE_DEPLETED, position: Position, amount: number): boolean {
    const entry: ResourceMemoryEntry = {
      type,
      position: { ...position },
      timestamp: this.currentTime,
      importance: this.calculateResourceImportance(amount),
      amount
    };
    
    return this.addEntry(entry);
  }
  
  /**
   * Create and add an energy memory
   */
  public addEnergyMemory(type: MemoryEventType.ENERGY_FOUND | MemoryEventType.ENERGY_DEPLETED, position: Position, amount: number): boolean {
    const entry: EnergyMemoryEntry = {
      type,
      position: { ...position },
      timestamp: this.currentTime,
      importance: this.calculateEnergyImportance(amount),
      amount
    };
    
    return this.addEntry(entry);
  }
  
  /**
   * Create and add a terrain memory
   */
  public addTerrainMemory(position: Position, terrainType: TerrainType, size: number): boolean {
    const entry: TerrainMemoryEntry = {
      type: MemoryEventType.TERRAIN_DISCOVERED,
      position: { ...position },
      timestamp: this.currentTime,
      importance: 0.5, // Medium importance for terrain
      terrainType,
      size
    };
    
    return this.addEntry(entry);
  }
  
  /**
   * Create and add a Sparkling encounter memory
   */
  public addEncounterMemory(position: Position, sparklingId: number, outcome: 'neutral' | 'positive' | 'negative'): boolean {
    const importanceMap = {
      'neutral': 0.5,
      'positive': 0.7,
      'negative': 0.9
    };
    
    const entry: SparklingEncounterMemoryEntry = {
      type: MemoryEventType.SPARKLING_ENCOUNTER,
      position: { ...position },
      timestamp: this.currentTime,
      importance: importanceMap[outcome],
      sparklingId,
      outcome
    };
    
    return this.addEntry(entry);
  }
  
  /**
   * Create and add an inference memory
   */
  public addInferenceMemory(position: Position, reasoning: string, parameterChanges: string, success: boolean): boolean {
    const entry: InferenceMemoryEntry = {
      type: MemoryEventType.INFERENCE_PERFORMED,
      position: { ...position },
      timestamp: this.currentTime,
      importance: success ? 0.9 : 0.6, // Successful inferences are more important to remember
      reasoning,
      parameterChanges,
      success
    };
    
    return this.addEntry(entry);
  }
  
  /**
   * Get all inference memories
   */
  public getInferenceMemories(): InferenceMemoryEntry[] {
    return this.getMemoriesByType(MemoryEventType.INFERENCE_PERFORMED) as InferenceMemoryEntry[];
  }
  
  /**
   * Get the most recent inference memory
   */
  public getLatestInferenceMemory(): InferenceMemoryEntry | null {
    const memories = this.getInferenceMemories();
    if (memories.length === 0) return null;
    
    // Sort by timestamp (descending)
    memories.sort((a, b) => b.timestamp - a.timestamp);
    return memories[0];
  }
  
  /**
   * Update the current time
   */
  public updateTime(time: number): void {
    this.currentTime = time;
  }
  
  /**
   * Get all memory entries
   */
  public getAllMemories(): MemoryEntry[] {
    return [...this.entries];
  }
  
  /**
   * Get memory entries of a specific type
   */
  public getMemoriesByType(type: MemoryEventType): MemoryEntry[] {
    return this.entries.filter(entry => entry.type === type);
  }
  
  /**
   * Get memory entries within a certain time range
   */
  public getRecentMemories(timeWindow: number): MemoryEntry[] {
    const cutoffTime = this.currentTime - timeWindow;
    return this.entries.filter(entry => entry.timestamp >= cutoffTime);
  }
  
  /**
   * Find memories near a position
   */
  public getMemoriesNearPosition(position: Position, radius: number): MemoryEntry[] {
    return this.entries.filter(entry => {
      const dx = entry.position.x - position.x;
      const dy = entry.position.y - position.y;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared <= radius * radius;
    });
  }
  
  /**
   * Find the nearest memory of a specific type
   */
  public findNearestMemory(position: Position, type: MemoryEventType): MemoryEntry | null {
    const memoriesOfType = this.getMemoriesByType(type);
    if (memoriesOfType.length === 0) return null;
    
    let nearestEntry = memoriesOfType[0];
    let nearestDistanceSquared = this.calculateDistanceSquared(position, nearestEntry.position);
    
    for (let i = 1; i < memoriesOfType.length; i++) {
      const entry = memoriesOfType[i];
      const distanceSquared = this.calculateDistanceSquared(position, entry.position);
      
      if (distanceSquared < nearestDistanceSquared) {
        nearestEntry = entry;
        nearestDistanceSquared = distanceSquared;
      }
    }
    
    return nearestEntry;
  }
  
  /**
   * Calculate squared distance between two positions
   */
  private calculateDistanceSquared(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return dx * dx + dy * dy;
  }
  
  /**
   * Check if a memory entry is a duplicate or very similar to recent memories
   */
  private isDuplicate(entry: MemoryEntry): boolean {
    // Only check recent memories (last 25% of capacity)
    const recentCount = Math.ceil(this.capacity * 0.25);
    const recentEntries = this.entries.slice(-recentCount);
    
    for (const existingEntry of recentEntries) {
      // If the same type and very close position
      if (existingEntry.type === entry.type) {
        const distance = this.calculateDistanceSquared(existingEntry.position, entry.position);
        // If positions are very close
        if (distance < 400) { // 20 units squared
          // For resource/energy memories, also check if they're the same state (found/depleted)
          if ((entry.type === MemoryEventType.RESOURCE_FOUND || 
               entry.type === MemoryEventType.RESOURCE_DEPLETED) &&
              existingEntry.type === entry.type) {
            return true;
          }
          
          // For terrain, also check if it's the same terrain type
          if (entry.type === MemoryEventType.TERRAIN_DISCOVERED &&
              existingEntry.type === MemoryEventType.TERRAIN_DISCOVERED) {
            const terrainEntry = entry as TerrainMemoryEntry;
            const existingTerrainEntry = existingEntry as TerrainMemoryEntry;
            if (terrainEntry.terrainType === existingTerrainEntry.terrainType) {
              return true;
            }
          }
          
          // For encounter memories, check if it's the same Sparkling
          if (entry.type === MemoryEventType.SPARKLING_ENCOUNTER &&
              existingEntry.type === MemoryEventType.SPARKLING_ENCOUNTER) {
            const encounterEntry = entry as SparklingEncounterMemoryEntry;
            const existingEncounterEntry = existingEntry as SparklingEncounterMemoryEntry;
            if (encounterEntry.sparklingId === existingEncounterEntry.sparklingId) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Prune memory to keep it within capacity
   */
  private pruneMemory(): void {
    if (this.entries.length <= this.capacity) {
      return;
    }
    
    // Sort by importance (ascending)
    this.entries.sort((a, b) => a.importance - b.importance);
    
    // Remove the least important entries
    const excessCount = this.entries.length - this.capacity;
    this.entries.splice(0, excessCount);
    
    // Resort by timestamp (oldest first) for FIFO behavior when importance is equal
    this.entries.sort((a, b) => {
      // If importance is significantly different, prioritize importance
      if (Math.abs(a.importance - b.importance) > 0.2) {
        return b.importance - a.importance;
      }
      // Otherwise sort by time (recent memories have priority)
      return b.timestamp - a.timestamp;
    });
  }
  
  /**
   * Calculate importance for resource memories
   */
  private calculateResourceImportance(amount: number): number {
    // More resources = more important
    return Math.min(0.3 + (amount / 50) * 0.6, 0.9);
  }
  
  /**
   * Calculate importance for energy memories
   */
  private calculateEnergyImportance(amount: number): number {
    // Energy is generally more valuable than food
    return Math.min(0.5 + (amount / 20) * 0.4, 0.95);
  }
  
  /**
   * Clear all memories
   */
  public clear(): void {
    this.entries = [];
  }
  
  /**
   * Get the current memory capacity
   */
  public getCapacity(): number {
    return this.capacity;
  }
  
  /**
   * Get the current number of memories
   */
  public getCount(): number {
    return this.entries.length;
  }
}