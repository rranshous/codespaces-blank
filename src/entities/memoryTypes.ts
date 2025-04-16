import { Position } from "./sparklingTypes";
import { TerrainType } from "@core/terrain";

/**
 * Types of events that can be remembered
 */
export enum MemoryEventType {
  RESOURCE_FOUND = 'resource_found',
  RESOURCE_DEPLETED = 'resource_depleted',
  ENERGY_FOUND = 'energy_found',
  ENERGY_DEPLETED = 'energy_depleted',
  TERRAIN_DISCOVERED = 'terrain_discovered',
  SPARKLING_ENCOUNTER = 'sparkling_encounter'
}

/**
 * Base interface for all memory entries
 */
export interface MemoryEntry {
  type: MemoryEventType;
  position: Position;
  timestamp: number;
  importance: number;  // 0-1 value, higher = more important/memorable
}

/**
 * Memory of finding a resource
 */
export interface ResourceMemoryEntry extends MemoryEntry {
  type: MemoryEventType.RESOURCE_FOUND | MemoryEventType.RESOURCE_DEPLETED;
  amount: number;
}

/**
 * Memory of finding neural energy
 */
export interface EnergyMemoryEntry extends MemoryEntry {
  type: MemoryEventType.ENERGY_FOUND | MemoryEventType.ENERGY_DEPLETED;
  amount: number;
}

/**
 * Memory of discovering a terrain type
 */
export interface TerrainMemoryEntry extends MemoryEntry {
  type: MemoryEventType.TERRAIN_DISCOVERED;
  terrainType: TerrainType;
  size: number;  // Rough estimate of the size of this terrain area
}

/**
 * Memory of encountering another Sparkling
 */
export interface SparklingEncounterMemoryEntry extends MemoryEntry {
  type: MemoryEventType.SPARKLING_ENCOUNTER;
  sparklingId: number;
  outcome: 'neutral' | 'positive' | 'negative';  // How the encounter went
}