// filepath: /workspaces/codespaces-blank/src/entities/sparkling/index.ts
import { SimulationConfig } from "@config/config";
import { World } from "@core/world";
import { Position, SparklingState, SparklingStats, Velocity, InferenceStatus } from "../sparklingTypes";
import { DecisionParameters, BehavioralProfile } from "../decisionParameters";
import { SparklingCore } from "./sparklingCore";
import { SparklingRenderer } from "./sparklingRenderer";
import { SparklingMovement } from "./sparklingMovement";
import { SparklingResources } from "./sparklingResources";
import { SparklingDecisions } from "./sparklingDecisions";
import { SparklingMemory } from "./sparklingMemory";
import { SparklingInference } from "./sparklingInference";

/**
 * Class representing a Sparkling entity in the simulation
 * This is a composition of specialized components that handle different aspects
 * of the Sparkling's behavior and functionality.
 */
export class Sparkling extends SparklingCore {
  private renderer: SparklingRenderer;
  private movement: SparklingMovement;
  private resources: SparklingResources;
  private decisions: SparklingDecisions;
  private memoryManager: SparklingMemory;
  private inference: SparklingInference;
  
  /**
   * Create a new Sparkling
   */
  constructor(
    id: number, 
    position: Position, 
    config: SimulationConfig, 
    profile: BehavioralProfile = BehavioralProfile.BALANCED
  ) {
    super(id, position, config, profile);
    
    // Initialize all the components
    this.renderer = new SparklingRenderer(this);
    this.movement = new SparklingMovement(this);
    this.resources = new SparklingResources(this);
    this.decisions = new SparklingDecisions(this);
    this.memoryManager = new SparklingMemory(this);
    this.inference = new SparklingInference(this);
  }
  
  /**
   * Update the Sparkling's state and position
   */
  public update(deltaTime: number, world: World): void {
    // Update memory system's time
    this.memoryManager.updateTime(deltaTime);
    
    // Update state timer
    this.stateTimer += deltaTime;
    
    // Consume resources over time
    this.resources.consumeResources(deltaTime);
    
    // Check surroundings and update memory
    this.decisions.updateMemoryFromSurroundings(world, deltaTime);
    
    // Check if we should trigger inference
    this.inference.updateInferenceStatus(deltaTime);
    
    // Update competition penalties and state
    this.resources.updateCompetition(deltaTime);
    
    // Update territory
    this.resources.updateTerritory(world);
    
    // Make decisions based on current state and parameters
    this.decisions.updateState(world);
    
    // Move based on current state and velocity
    this.movement.move(deltaTime, world);
    
    // Check for and collect resources
    this.resources.collectResources(world);
  }
  
  /**
   * Render the Sparkling on the canvas
   */
  public render(context: CanvasRenderingContext2D, debug: boolean = false): void {
    this.renderer.render(context, debug);
  }
  
  /**
   * Set a competition penalty that temporarily reduces collection efficiency
   */
  public setCompetitionPenalty(penalty: number, duration: number): void {
    this.resources.setCompetitionPenalty(penalty, duration);
  }
  
  /**
   * Record an encounter with another Sparkling
   */
  public recordEncounter(otherSparkling: Sparkling, outcome: 'neutral' | 'positive' | 'negative'): void {
    this.movement.recordEncounter(otherSparkling, outcome);
  }
  
  /**
   * Get information about the last inference
   */
  public getLastInferenceInfo(): { timestamp: number; success: boolean; reasoning: string } {
    return this.memoryManager.getLastInferenceInfo();
  }
  
  // Methods from SparklingMovement
  public lookForResources(world: World, lookingForFood: boolean): void {
    this.movement.lookForResources(world, lookingForFood);
  }
  
  public setRandomMovement(): void {
    this.movement.setRandomMovement();
  }
  
  public transitionToExploring(): void {
    this.movement.transitionToExploring();
  }
}