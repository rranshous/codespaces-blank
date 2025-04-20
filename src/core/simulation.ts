import { SimulationConfig, getConfig } from '@config/config';
import { AnthropicConfig, getAnthropicConfig, isApiConfigValid } from '@config/apiConfig';
import { Renderer } from '@rendering/renderer';
import { TimeManager, SimulationSpeed } from '@utils/time';
import { World, WorldGenerationOptions } from '@core/world';
import { Sparkling } from '@entities/sparkling';
import { Position, SparklingState } from '@entities/sparklingTypes';
import { BehavioralProfile } from '@entities/decisionParameters';
import { InferenceSystem } from '@core/inference';
import { InferenceQualityTester } from '@core/inferenceQualityTester';
import { MemoryEventType } from '@entities/memoryTypes';

/**
 * Main simulation class that manages the entire simulation
 */
export class Simulation {
  private config: SimulationConfig;
  private apiConfig: AnthropicConfig;
  private renderer: Renderer;
  private timeManager: TimeManager;
  private world: World;
  private sparklings: Sparkling[] = [];
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private showDebug: boolean = false;
  private inferenceSystem: InferenceSystem;
  private inferenceQualityTester: InferenceQualityTester;
  private useMockInference: boolean = true;
  private populationMetricsDiv: HTMLDivElement | null = null;

  constructor(canvas: HTMLCanvasElement, config: Partial<SimulationConfig> = {}) {
    this.config = getConfig(config);
    this.apiConfig = getAnthropicConfig();
    this.renderer = new Renderer(canvas, this.config);
    this.timeManager = new TimeManager();
    this.world = new World(this.config);
    this.inferenceSystem = InferenceSystem.getInstance();
    this.inferenceQualityTester = new InferenceQualityTester();
    
    // Default to mock inference if no valid API key
    this.useMockInference = !isApiConfigValid(this.apiConfig);
    this.inferenceSystem.setUseMockInference(this.useMockInference);
  }

  /**
   * Initialize the simulation
   */
  public initialize(worldOptions: WorldGenerationOptions = {}): void {
    this.setupEventListeners();
    this.world.initialize(worldOptions);
    this.createSparklings();
    this.setupPopulationControls();
    
    // Perform an initial render
    this.render();
  }

  /**
   * Create initial sparklings
   */
  private createSparklings(): void {
    // Clear existing sparklings
    this.sparklings = [];
    
    // Create the initial sparklings with varied behavioral profiles
    for (let i = 0; i < this.config.initialSparklingCount; i++) {
      // Generate a random position within the world
      const position: Position = {
        x: Math.random() * this.config.worldWidth,
        y: Math.random() * this.config.worldHeight
      };
      
      // Assign different behavioral profiles to create variety
      // This will ensure some Sparklings prioritize energy collection
      let profile: BehavioralProfile;
      
      // Distribute different profiles to create variety
      const profileRoll = Math.random();
      if (profileRoll < 0.3) {
        // 30% Gatherers (food focused)
        profile = BehavioralProfile.GATHERER;
      } else if (profileRoll < 0.5) {
        // 20% Energy Seekers
        profile = BehavioralProfile.ENERGY_SEEKER;
      } else if (profileRoll < 0.7) {
        // 20% Explorers
        profile = BehavioralProfile.EXPLORER;
      } else if (profileRoll < 0.85) {
        // 15% Balanced
        profile = BehavioralProfile.BALANCED;
      } else if (profileRoll < 0.95) {
        // 10% Cautious
        profile = BehavioralProfile.CAUTIOUS;
      } else {
        // 5% Social
        profile = BehavioralProfile.SOCIAL;
      }
      
      // Create a new sparkling with the assigned profile
      const sparkling = new Sparkling(i, position, this.config, profile);
      this.sparklings.push(sparkling);
    }
  }

  /**
   * Start the simulation loop
   */
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.animationLoop(performance.now());
  }

  /**
   * Stop the simulation loop
   */
  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Toggle between running and stopped states
   */
  public toggleRunning(): void {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Reset the simulation to its initial state
   */
  public reset(worldOptions: WorldGenerationOptions = {}): void {
    this.stop();
    this.timeManager.reset();
    this.world.initialize(worldOptions);
    this.createSparklings();
    this.render(); // Render the new world state
  }

  /**
   * Toggle debug visualization
   */
  public toggleDebug(): void {
    this.showDebug = !this.showDebug;
  }

  /**
   * Toggle between mock inference and API inference
   */
  public toggleInferenceMode(): void {
    this.useMockInference = !this.useMockInference;
    this.inferenceSystem.setUseMockInference(this.useMockInference);
    
    // Update button text
    const inferenceToggleButton = document.getElementById('toggle-inference');
    if (inferenceToggleButton) {
      inferenceToggleButton.textContent = this.useMockInference ? 'Using Mock Inference' : 'Using API Inference';
    }
    
    console.log(`Inference mode set to: ${this.useMockInference ? 'Mock' : 'API'}`);
  }
  
  /**
   * Toggle between using the API proxy or direct calls
   */
  public toggleProxyMode(): void {
    const newProxyMode = !this.apiConfig.useProxy;
    this.apiConfig.useProxy = newProxyMode;
    this.inferenceSystem.updateApiConfig(this.apiConfig);
    
    // Update button text
    const proxyToggleButton = document.getElementById('toggle-proxy');
    if (proxyToggleButton) {
      proxyToggleButton.textContent = newProxyMode ? 'Using Proxy Server' : 'Using Direct API Calls';
    }
    
    console.log(`API mode set to: ${newProxyMode ? 'Proxy Server' : 'Direct API Calls'}`);
    
    // Inform the user if proxy mode is enabled but mock inference is also enabled
    if (newProxyMode && this.useMockInference) {
      console.warn("Note: Proxy mode is enabled, but mock inference is also enabled. The proxy will only be used when mock inference is disabled.");
    }
  }
  
  /**
   * Update Anthropic API configuration
   */
  public updateApiConfig(apiConfig: Partial<AnthropicConfig>): void {
    this.apiConfig = { ...this.apiConfig, ...apiConfig };
    this.inferenceSystem.updateApiConfig(this.apiConfig);
    
    // Update inference mode based on API config validity
    const isValid = isApiConfigValid(this.apiConfig);
    if (!isValid && !this.useMockInference) {
      this.useMockInference = true;
      this.inferenceSystem.setUseMockInference(true);
      console.warn("Invalid API configuration. Switched to mock inference.");
      
      // Update button text
      const inferenceToggleButton = document.getElementById('toggle-inference');
      if (inferenceToggleButton) {
        inferenceToggleButton.textContent = 'Using Mock Inference';
      }
    }
  }
  
  /**
   * Run inference quality tests
   */
  public async runInferenceTests(): Promise<void> {
    console.log("Running inference quality tests...");
    
    // Toggle test results visibility if they already exist
    let resultsElement = document.getElementById('inference-test-results');
    if (resultsElement) {
      // Toggle visibility
      if (resultsElement.style.display === 'none') {
        resultsElement.style.display = 'block';
        // Update button text to indicate toggle functionality
        const runTestsButton = document.getElementById('run-inference-tests');
        if (runTestsButton) {
          runTestsButton.textContent = 'Hide Inference Tests';
        }
        // If we're just showing existing results, no need to run tests again
        return;
      } else {
        resultsElement.style.display = 'none';
        // Update button text to indicate toggle functionality
        const runTestsButton = document.getElementById('run-inference-tests');
        if (runTestsButton) {
          runTestsButton.textContent = 'Show Inference Tests';
        }
        return;
      }
    }
    
    // Pause simulation while running tests
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.stop();
    }
    
    // Run the tests using the current inference mode
    console.log(`Running inference tests using ${this.useMockInference ? 'mock' : 'API'} inference mode`);
    await this.inferenceQualityTester.runAllTests();
    
    // Display the results
    const testSummary = this.inferenceQualityTester.getTestSummary();
    console.log(testSummary);
    
    // Create test results element
    resultsElement = document.createElement('div');
    resultsElement.id = 'inference-test-results';
    resultsElement.style.position = 'absolute';
    
    // Position on right side like other debug info
    const canvas = this.renderer.getContext().canvas;
    resultsElement.style.top = '120px';
    resultsElement.style.right = '20px';
    resultsElement.style.width = '400px';
    resultsElement.style.padding = '10px';
    resultsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    resultsElement.style.color = 'white';
    resultsElement.style.fontFamily = 'monospace';
    resultsElement.style.fontSize = '12px';
    resultsElement.style.whiteSpace = 'pre-wrap';
    resultsElement.style.zIndex = '100';
    resultsElement.style.maxHeight = '80vh';
    resultsElement.style.overflowY = 'auto';
    resultsElement.style.textAlign = 'left'; // Ensure text is left-aligned
    document.body.appendChild(resultsElement);
    
    resultsElement.textContent = testSummary;
    
    // Resume simulation if it was running
    if (wasRunning) {
      this.start();
    }
    
    // Update button text to indicate toggle functionality
    const runTestsButton = document.getElementById('run-inference-tests');
    if (runTestsButton) {
      runTestsButton.textContent = 'Hide Inference Tests';
    }
  }

  /**
   * Set the simulation speed
   * @param speed The simulation speed to set
   */
  public setSimulationSpeed(speed: SimulationSpeed): void {
    this.timeManager.setSpeedMultiplier(speed);
    
    // Update the speed buttons to reflect the current selection
    this.updateSpeedButtonStates(speed);
    
    console.log(`Simulation speed set to ${speed}x`);
  }
  
  /**
   * Update the speed button UI to reflect the current selected speed
   */
  private updateSpeedButtonStates(currentSpeed: SimulationSpeed): void {
    const speedButtons = [
      document.getElementById('speed-1x'),
      document.getElementById('speed-2x'),
      document.getElementById('speed-5x'),
      document.getElementById('speed-10x')
    ];
    
    speedButtons.forEach((button, index) => {
      if (!button) return;
      
      // Clear all active classes
      button.classList.remove('active');
      
      // Add active class to currently selected speed
      const buttonSpeed = [
        SimulationSpeed.NORMAL,
        SimulationSpeed.DOUBLE,
        SimulationSpeed.FAST,
        SimulationSpeed.ULTRA
      ][index];
      
      if (buttonSpeed === currentSpeed) {
        button.classList.add('active');
      }
    });
  }

  /**
   * Main animation loop
   */
  private animationLoop(timestamp: number): void {
    this.timeManager.update(timestamp);
    
    // Always update the simulation state
    this.update(this.timeManager.getDeltaTime());
    
    // Only render if we're not skipping frames
    if (!this.timeManager.shouldSkipFrame()) {
      this.render();
    }
    
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
    }
  }

  /**
   * Update the simulation state
   */
  private update(deltaTime: number): void {
    // Update the simulation time
    this.world.updateTime(deltaTime);
    
    // Spawn new resources in the world
    this.world.spawnResources(deltaTime);
    
    // Update all sparklings
    for (const sparkling of this.sparklings) {
      sparkling.update(deltaTime, this.world);
    }
    
    // Check for sparklings that have completed fadeout and need to be removed
    this.removeCompletedFadeouts();
    
    // Check for sparkling encounters
    this.checkSparklingEncounters();
    
    // Update population metrics
    this.updatePopulationMetrics();
  }
  
  /**
   * Remove Sparklings that have completed their fadeout process
   * and manage population balance
   */
  private removeCompletedFadeouts(): void {
    const fadedSparklings = this.sparklings.filter(sparkling => sparkling.shouldBeRemoved());
    
    // If any Sparklings need to be removed, log it and filter them out
    if (fadedSparklings.length > 0) {
      for (const sparkling of fadedSparklings) {
        console.log(`Removing Sparkling #${sparkling.getId()} after fadeout completion.`);
      }
      
      // Remove the faded Sparklings from the array
      this.sparklings = this.sparklings.filter(sparkling => !sparkling.shouldBeRemoved());
      
      // Handle population control
      this.managePopulation(fadedSparklings.length);
    } 
    else {
      // Even if no Sparklings faded out, periodically check population balance
      if (this.timeManager.getCurrentTime() % 5 < 0.016) { // Check roughly every 5 seconds
        this.managePopulation(0);
      }
    }
  }
  
  /**
   * Manage the Sparkling population based on configuration settings
   * @param fadedCount Number of Sparklings that just faded out
   */
  private managePopulation(fadedCount: number): void {
    if (!this.config.autoPopulationControl) {
      // If auto population control is disabled, just replace the faded Sparklings
      if (fadedCount > 0) {
        this.spawnNewSparklings(fadedCount);
      }
      return;
    }
    
    const currentPopulation = this.sparklings.length;
    const targetPopulation = this.config.initialSparklingCount;
    const allowedDeviation = this.config.populationBalanceRange;
    
    // Calculate the ideal number of Sparklings to add or remove based on resource availability
    const resourceBalance = this.calculateResourceBalance();
    const populationAdjustment = this.calculatePopulationAdjustment(resourceBalance, currentPopulation, targetPopulation);
    
    console.log(`Population Manager: Current=${currentPopulation}, Target=${targetPopulation}, Resource Balance=${resourceBalance.toFixed(2)}, Adjustment=${populationAdjustment}`);
    
    // If we need to add Sparklings to the population
    if (populationAdjustment > 0) {
      // Check we don't exceed the maximum population
      const spawnCount = Math.min(populationAdjustment, this.config.maxSparklingCount - currentPopulation);
      if (spawnCount > 0) {
        console.log(`Population Manager: Spawning ${spawnCount} new Sparklings to balance ecosystem.`);
        this.spawnNewSparklings(spawnCount);
      }
    }
    // If we need to reduce the population beyond natural fadeout
    else if (populationAdjustment < 0 && Math.abs(populationAdjustment) > fadedCount) {
      // We've already lost fadedCount Sparklings naturally, so we only need to remove the difference
      const additionalRemovalNeeded = Math.min(
        Math.abs(populationAdjustment) - fadedCount,
        currentPopulation - this.config.minSparklingCount // Don't go below minimum
      );
      
      if (additionalRemovalNeeded > 0) {
        console.log(`Population Manager: Initiating fadeout for ${additionalRemovalNeeded} Sparklings to balance ecosystem.`);
        this.initiateAdditionalFadeouts(additionalRemovalNeeded);
      }
    }
    
    // Adjust the resource spawn rate based on population
    this.adjustResourceSpawnRate();
  }
  
  /**
   * Calculate a resource balance factor between -1 and 1
   * Negative values mean resources are scarce, positive values mean resources are abundant
   */
  private calculateResourceBalance(): number {
    // Get resource metrics from the world
    const resourceCells = this.world.findResourceRichCells(10);
    const worldDimensions = this.world.getDimensions();
    const totalCells = worldDimensions.width * worldDimensions.height;
    
    // Calculate total resources versus population demands
    const totalResourceCells = resourceCells.length;
    const currentPopulation = this.sparklings.length;
    
    // Get average food level across Sparklings as an indicator of health
    const averageFoodLevel = this.sparklings.reduce((sum, sparkling) => {
      return sum + (sparkling.getResourceLevels().food / sparkling.getMaxFood());
    }, 0) / Math.max(1, currentPopulation);
    
    // Calculate resource availability per Sparkling
    const resourcePerSparkling = totalResourceCells / Math.max(1, currentPopulation);
    
    // Calculate a balance factor from -1 (scarce) to 1 (abundant)
    // Blend multiple metrics to get a more balanced view
    const resourceFactor = (resourcePerSparkling - 1) / 4; // Normalize to roughly -1 to 1
    const foodFactor = (averageFoodLevel - 0.5) * 2; // Normalize to roughly -1 to 1
    
    // Weight the factors (food level is more important than raw resource count)
    const balance = resourceFactor * 0.4 + foodFactor * 0.6;
    
    // Clamp to -1 to 1 range
    return Math.max(-1, Math.min(1, balance));
  }
  
  /**
   * Calculate how many Sparklings to add or remove based on resource balance
   * @returns A number (positive for adding, negative for removing)
   */
  private calculatePopulationAdjustment(
    resourceBalance: number, 
    currentPopulation: number, 
    targetPopulation: number
  ): number {
    // Start with the difference between current and target population
    let adjustment = targetPopulation - currentPopulation;
    
    // If we're within the allowed deviation, adjust based on resource balance
    if (Math.abs(adjustment) <= this.config.populationBalanceRange) {
      // If resources are abundant, grow the population
      if (resourceBalance > 0.3) {
        // Calculate growth based on the growth rate and resource abundance
        const growthPotential = Math.ceil(currentPopulation * this.config.populationGrowthRate * resourceBalance);
        adjustment = Math.max(adjustment, growthPotential);
      }
      // If resources are scarce, shrink the population
      else if (resourceBalance < -0.3) {
        // Calculate decline based on the decline rate and resource scarcity
        const declinePotential = Math.floor(currentPopulation * this.config.populationDeclineRate * -resourceBalance);
        adjustment = Math.min(adjustment, -declinePotential);
      }
    }
    
    // Ensure we don't exceed configured limits
    if (currentPopulation + adjustment < this.config.minSparklingCount) {
      adjustment = this.config.minSparklingCount - currentPopulation;
    }
    
    if (currentPopulation + adjustment > this.config.maxSparklingCount) {
      adjustment = this.config.maxSparklingCount - currentPopulation;
    }
    
    return adjustment;
  }
  
  /**
   * Initiate fadeout for additional Sparklings when population needs to be reduced
   */
  private initiateAdditionalFadeouts(count: number): void {
    if (count <= 0) return;
    
    // Select Sparklings to fade out based on predefined criteria
    // (preferring those with lower food/energy, older Sparklings, etc.)
    const candidates = [...this.sparklings]
      .filter(s => !s.isFading()) // Only consider Sparklings not already fading
      .sort((a, b) => {
        // Lower food value means higher priority for fadeout
        const foodA = a.getResourceLevels().food / a.getMaxFood();
        const foodB = b.getResourceLevels().food / b.getMaxFood();
        
        // Lower energy value means higher priority for fadeout
        const energyA = a.getResourceLevels().neuralEnergy / a.getMaxNeuralEnergy();
        const energyB = b.getResourceLevels().neuralEnergy / b.getMaxNeuralEnergy();
        
        // Combined factor (80% food, 20% energy)
        const factorA = foodA * 0.8 + energyA * 0.2;
        const factorB = foodB * 0.8 + energyB * 0.2;
        
        // Sort ascending (lowest resources first)
        return factorA - factorB;
      });
    
    // Initiate fadeout for the selected Sparklings
    const selectedForFadeout = candidates.slice(0, count);
    for (const sparkling of selectedForFadeout) {
      sparkling.initiateControlledFadeout();
      console.log(`Population Control: Initiating controlled fadeout for Sparkling #${sparkling.getId()} (low resources)`);
    }
  }
  
  /**
   * Adjust resource spawn rate based on current population
   */
  private adjustResourceSpawnRate(): void {
    // Get the base resource spawn rate
    const baseSpawnRate = this.config.resourceSpawnRate;
    
    // Adjust based on population size
    const populationFactor = this.sparklings.length * this.config.resourceSpawnRatePerSparkling;
    
    // Calculate new spawn rate with a minimum threshold
    const newSpawnRate = Math.max(baseSpawnRate * 0.5, baseSpawnRate + populationFactor);
    
    // Apply the new spawn rate to the world
    this.world.setResourceSpawnRate(newSpawnRate);
  }

  /**
   * Spawn new Sparklings to replace those that have faded out
   * @param count Number of new Sparklings to spawn
   */
  private spawnNewSparklings(count: number): void {
    // Get the next available ID (max ID + 1)
    const nextId = this.getNextSparklingId();
    
    // Create the new sparklings
    for (let i = 0; i < count; i++) {
      // Generate a position preferably near resources but not too close to existing Sparklings
      const position = this.findGoodSpawningPosition();
      
      // Determine a behavioral profile for the new Sparkling
      const profile = this.determineNewSparklingProfile();
      
      // Create the new Sparkling with a unique ID
      const newSparkling = new Sparkling(nextId + i, position, this.config, profile);
      
      // Add a small "spawn" animation effect
      // This would be implemented in SparklingRenderer
      (newSparkling as any).isNewlySpawned = true;
      
      // Add it to the simulation
      this.sparklings.push(newSparkling);
      
      console.log(`Spawned new Sparkling #${nextId + i} at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) with profile ${profile}`);
    }
  }
  
  /**
   * Find the next available ID for a new Sparkling
   */
  private getNextSparklingId(): number {
    if (this.sparklings.length === 0) {
      return 0;
    }
    
    // Find the maximum ID currently in use
    const maxId = Math.max(...this.sparklings.map(s => s.getId()));
    return maxId + 1;
  }
  
  /**
   * Find a good position to spawn a new Sparkling
   * - Preferably near resources
   * - Not too close to existing Sparklings
   * - Within the world bounds
   */
  private findGoodSpawningPosition(): Position {
    const minDistanceToOtherSparklings = 50; // Minimum distance to other Sparklings
    const maxAttempts = 20; // Maximum number of attempts to find a good position
    
    // Try to find a position near resources first
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Find resource-rich areas to prioritize for spawning
      const resourceCells = this.world.findResourceRichCells(5); // Get top 5 resource cells
      
      if (resourceCells.length > 0) {
        // Pick a random cell from the top resource cells
        const randomIndex = Math.floor(Math.random() * resourceCells.length);
        const cell = resourceCells[randomIndex];
        
        // Add some randomness to the position within the cell
        const position: Position = {
          x: cell.x * 20 + 5 + Math.random() * 10, // Center of cell + random offset
          y: cell.y * 20 + 5 + Math.random() * 10
        };
        
        // Check if this position is far enough from existing Sparklings
        if (this.isPositionFarEnoughFromSparklings(position, minDistanceToOtherSparklings)) {
          return position;
        }
      }
    }
    
    // If we couldn't find a good position near resources, just find any position far from other Sparklings
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const position: Position = {
        x: Math.random() * this.config.worldWidth,
        y: Math.random() * this.config.worldHeight
      };
      
      if (this.isPositionFarEnoughFromSparklings(position, minDistanceToOtherSparklings)) {
        return position;
      }
    }
    
    // If all else fails, return a totally random position
    return {
      x: Math.random() * this.config.worldWidth,
      y: Math.random() * this.config.worldHeight
    };
  }
  
  /**
   * Check if a position is far enough from all existing Sparklings
   */
  private isPositionFarEnoughFromSparklings(position: Position, minDistance: number): boolean {
    for (const sparkling of this.sparklings) {
      const sparklingPos = sparkling.getPosition();
      const dx = position.x - sparklingPos.x;
      const dy = position.y - sparklingPos.y;
      const distanceSquared = dx * dx + dy * dy;
      
      if (distanceSquared < minDistance * minDistance) {
        return false; // Too close to an existing Sparkling
      }
    }
    
    return true; // Far enough from all Sparklings
  }
  
  /**
   * Determine a behavioral profile for a new Sparkling
   * This could later be enhanced to create inheritance from successful Sparklings
   */
  private determineNewSparklingProfile(): BehavioralProfile {
    // For now, distribute profiles with some randomization
    // In the future, this would take into account successful Sparklings
    const profileRoll = Math.random();
    
    if (profileRoll < 0.3) {
      // 30% Gatherers (food focused)
      return BehavioralProfile.GATHERER;
    } else if (profileRoll < 0.5) {
      // 20% Energy Seekers
      return BehavioralProfile.ENERGY_SEEKER;
    } else if (profileRoll < 0.7) {
      // 20% Explorers
      return BehavioralProfile.EXPLORER;
    } else if (profileRoll < 0.85) {
      // 15% Balanced
      return BehavioralProfile.BALANCED;
    } else if (profileRoll < 0.95) {
      // 10% Cautious
      return BehavioralProfile.CAUTIOUS;
    } else {
      // 5% Social
      return BehavioralProfile.SOCIAL;
    }
  }

  /**
   * Check for encounters between sparklings
   */
  private checkSparklingEncounters(): void {
    const encounterRadius = 30; // Distance at which sparklings notice each other
    const competitionRadius = 20; // Distance for resource competition
    
    for (let i = 0; i < this.sparklings.length; i++) {
      const sparklingA = this.sparklings[i];
      const posA = sparklingA.getPosition();
      
      for (let j = i + 1; j < this.sparklings.length; j++) {
        const sparklingB = this.sparklings[j];
        const posB = sparklingB.getPosition();
        
        // Calculate distance between sparklings
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distanceSquared = dx * dx + dy * dy;
        
        // If they're close enough, record the encounter
        if (distanceSquared < encounterRadius * encounterRadius) {
          // Determine the outcome of the encounter based on competition
          let outcomeA: 'neutral' | 'positive' | 'negative' = 'neutral';
          let outcomeB: 'neutral' | 'positive' | 'negative' = 'neutral';
          
          // Check if they're competing for resources
          if (distanceSquared < competitionRadius * competitionRadius) {
            // Both Sparklings are in collecting state - resource competition!
            if (sparklingA.getState() === SparklingState.COLLECTING &&
                sparklingB.getState() === SparklingState.COLLECTING) {
              
              // Compare their competition-related parameters
              const paramsA = sparklingA.getParameters();
              const paramsB = sparklingB.getParameters();
              
              // Calculate competition advantage (combination of relevant parameters)
              const advantageA = paramsA.collectionEfficiency * (1 - paramsA.cooperationTendency);
              const advantageB = paramsB.collectionEfficiency * (1 - paramsB.cooperationTendency);
              
              // The one with higher advantage gets a positive outcome, the other negative
              if (advantageA > advantageB) {
                outcomeA = 'positive';
                outcomeB = 'negative';
                // A wins the competition - reduce B's collection efficiency temporarily
                sparklingB.setCompetitionPenalty(0.5, 5); // 50% penalty for 5 seconds
              } else if (advantageB > advantageA) {
                outcomeA = 'negative';
                outcomeB = 'positive';
                // B wins the competition - reduce A's collection efficiency temporarily
                sparklingA.setCompetitionPenalty(0.5, 5); // 50% penalty for 5 seconds
              } else {
                // Equal advantage - both get slightly negative outcomes
                outcomeA = 'negative';
                outcomeB = 'negative';
                // Both get a small penalty
                sparklingA.setCompetitionPenalty(0.3, 3); // 30% penalty for 3 seconds
                sparklingB.setCompetitionPenalty(0.3, 3); // 30% penalty for 3 seconds
              }
            }
          }
          
          // Record encounter with appropriate outcome
          sparklingA.recordEncounter(sparklingB, outcomeA);
          sparklingB.recordEncounter(sparklingA, outcomeB);
        }
      }
    }
  }

  /**
   * Render the current simulation state
   */
  private render(): void {
    this.renderer.clear();
    
    // Draw the world (terrain and resources)
    this.renderer.drawWorld(this.world);
    
    // Draw all sparklings with territories and interactions
    this.renderer.drawSparklings(this.sparklings, this.showDebug);
    
    // Pass the inference system to the renderer for debug info
    // Also pass the current speed multiplier to show in debug info
    this.renderer.drawDebugInfo(
      this.timeManager.getFPS(), 
      this.world, 
      this.inferenceSystem,
      this.timeManager.getSpeedMultiplier()
    );
  }

  /**
   * Set up event listeners for user input
   */
  private setupEventListeners(): void {
    const startPauseButton = document.getElementById('start-pause');
    if (startPauseButton) {
      startPauseButton.addEventListener('click', () => this.toggleRunning());
    }

    const resetButton = document.getElementById('reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.reset());
    }
    
    // Add debug toggle button
    const debugButton = document.createElement('button');
    debugButton.id = 'toggle-debug';
    debugButton.textContent = 'Toggle Visualization Details';
    debugButton.addEventListener('click', () => this.toggleDebug());
    
    // Add inference API toggle button
    const inferenceToggleButton = document.createElement('button');
    inferenceToggleButton.id = 'toggle-inference';
    inferenceToggleButton.textContent = this.useMockInference ? 'Using Mock Inference' : 'Using API Inference';
    inferenceToggleButton.addEventListener('click', () => this.toggleInferenceMode());
    
    // Add proxy toggle button
    const proxyToggleButton = document.createElement('button');
    proxyToggleButton.id = 'toggle-proxy';
    proxyToggleButton.textContent = this.apiConfig.useProxy ? 'Using Proxy Server' : 'Using Direct API Calls';
    proxyToggleButton.addEventListener('click', () => this.toggleProxyMode());
    
    // Add inference test button
    const runTestsButton = document.createElement('button');
    runTestsButton.id = 'run-inference-tests';
    runTestsButton.textContent = 'Run Inference Tests';
    runTestsButton.addEventListener('click', () => this.runInferenceTests());
    
    // Create speed control container
    const speedControlContainer = document.createElement('div');
    speedControlContainer.id = 'speed-controls';
    speedControlContainer.style.display = 'flex';
    speedControlContainer.style.alignItems = 'center';
    speedControlContainer.style.margin = '5px 0';
    
    // Create speed control label
    const speedLabel = document.createElement('span');
    speedLabel.textContent = 'Speed: ';
    speedLabel.style.marginRight = '10px';
    speedControlContainer.appendChild(speedLabel);
    
    // Create speed buttons
    const speeds = [
      { id: 'speed-1x', value: SimulationSpeed.NORMAL, label: '1x' },
      { id: 'speed-2x', value: SimulationSpeed.DOUBLE, label: '2x' },
      { id: 'speed-5x', value: SimulationSpeed.FAST, label: '5x' },
      { id: 'speed-10x', value: SimulationSpeed.ULTRA, label: '10x' }
    ];
    
    speeds.forEach(speed => {
      const speedButton = document.createElement('button');
      speedButton.id = speed.id;
      speedButton.textContent = speed.label;
      speedButton.className = 'speed-button';
      speedButton.style.margin = '0 5px';
      speedButton.style.padding = '3px 10px';
      speedButton.style.cursor = 'pointer';
      speedButton.addEventListener('click', () => this.setSimulationSpeed(speed.value));
      
      // Set the initial active state
      if (speed.value === SimulationSpeed.NORMAL) {
        speedButton.classList.add('active');
      }
      
      speedControlContainer.appendChild(speedButton);
    });
    
    // Add a bit of CSS for the active state
    const style = document.createElement('style');
    style.textContent = `
      .speed-button.active {
        background-color: #4CAF50;
        color: white;
      }
    `;
    document.head.appendChild(style);
    
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv) {
      controlsDiv.appendChild(speedControlContainer);
      controlsDiv.appendChild(debugButton);
      controlsDiv.appendChild(inferenceToggleButton);
      controlsDiv.appendChild(proxyToggleButton);
      controlsDiv.appendChild(runTestsButton);
    }

    // Create tooltip element for Sparkling hover information
    this.createSparklingTooltip();
    
    // Add mouse move event listener to canvas for Sparkling hover detection
    const canvas = this.renderer.getContext().canvas;
    canvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
    canvas.addEventListener('mouseout', this.hideSparklingTooltip.bind(this));
  }

  /**
   * Add population control UI to the simulation controls
   */
  private setupPopulationControls(): void {
    const controlsDiv = document.getElementById('controls');
    if (!controlsDiv) return;
    
    // Create a container for the unified control panel
    const controlPanel = document.createElement('div');
    controlPanel.id = 'unified-control-panel';
    controlPanel.style.position = 'absolute';
    controlPanel.style.top = '10px';
    controlPanel.style.right = '10px'; // Changed from left to right
    controlPanel.style.maxWidth = '300px';
    controlPanel.style.padding = '10px';
    controlPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    controlPanel.style.color = 'white';
    controlPanel.style.borderRadius = '5px';
    controlPanel.style.zIndex = '100';
    controlPanel.style.maxHeight = '80vh';
    controlPanel.style.overflowY = 'auto';
    controlPanel.style.fontFamily = 'Arial, sans-serif';
    controlPanel.style.fontSize = '14px';
    controlPanel.style.cursor = 'move'; // Indicate it's draggable
    controlPanel.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)'; // Add shadow for better visibility
    
    // Add minimize/expand functionality
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.marginBottom = '10px';
    headerDiv.style.borderBottom = '1px solid #555';
    headerDiv.style.paddingBottom = '5px';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Simulation Controls';
    titleSpan.style.fontWeight = 'bold';
    
    const minimizeButton = document.createElement('button');
    minimizeButton.textContent = '-';
    minimizeButton.style.background = 'transparent';
    minimizeButton.style.border = '1px solid #555';
    minimizeButton.style.color = 'white';
    minimizeButton.style.width = '24px';
    minimizeButton.style.height = '24px';
    minimizeButton.style.cursor = 'pointer';
    minimizeButton.style.borderRadius = '3px';
    minimizeButton.style.display = 'flex';
    minimizeButton.style.justifyContent = 'center';
    minimizeButton.style.alignItems = 'center';
    minimizeButton.title = 'Minimize';
    
    // Variable to hold the content div for toggling
    const contentDiv = document.createElement('div');
    contentDiv.id = 'control-panel-content';
    
    headerDiv.appendChild(titleSpan);
    headerDiv.appendChild(minimizeButton);
    
    // Make the control panel draggable
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    
    headerDiv.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - controlPanel.getBoundingClientRect().left;
      offsetY = e.clientY - controlPanel.getBoundingClientRect().top;
      controlPanel.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        // Keep the panel within the viewport
        const maxX = window.innerWidth - controlPanel.offsetWidth;
        const maxY = window.innerHeight - controlPanel.offsetHeight;
        
        controlPanel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        controlPanel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        controlPanel.style.right = 'auto'; // Clear right positioning when dragging
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      controlPanel.style.cursor = 'move';
    });
    
    // Toggle minimize/expand
    minimizeButton.addEventListener('click', () => {
      if (contentDiv.style.display === 'none') {
        contentDiv.style.display = 'block';
        minimizeButton.textContent = '-';
        minimizeButton.title = 'Minimize';
        controlPanel.style.maxHeight = '80vh';
      } else {
        contentDiv.style.display = 'none';
        minimizeButton.textContent = '+';
        minimizeButton.title = 'Expand';
        controlPanel.style.maxHeight = 'auto';
      }
    });
    
    // Add the header to the panel
    controlPanel.appendChild(headerDiv);
    controlPanel.appendChild(contentDiv);
    
    // Create tabs for different control sections
    const tabContainer = document.createElement('div');
    tabContainer.style.display = 'flex';
    tabContainer.style.marginBottom = '10px';
    tabContainer.style.borderBottom = '1px solid #555';
    
    const tabs = [
      { id: 'tab-basic', label: 'Basic Controls' },
      { id: 'tab-population', label: 'Population' }
    ];
    
    // Type definition for tab contents map
    interface TabContentsMap {
      [key: string]: HTMLElement;
    }
    
    const tabContents: TabContentsMap = {};
    
    tabs.forEach(tab => {
      // Create tab button
      const tabButton = document.createElement('button');
      tabButton.id = tab.id;
      tabButton.textContent = tab.label;
      tabButton.style.padding = '5px 10px';
      tabButton.style.marginRight = '5px';
      tabButton.style.backgroundColor = 'transparent';
      tabButton.style.color = 'white';
      tabButton.style.border = 'none';
      tabButton.style.borderBottom = '2px solid transparent';
      tabButton.style.cursor = 'pointer';
      tabButton.style.outline = 'none';
      
      // Create tab content area
      const tabContent = document.createElement('div');
      tabContent.id = `${tab.id}-content`;
      tabContent.style.display = tab.id === 'tab-basic' ? 'block' : 'none';
      
      // Store content element for later access
      tabContents[tab.id] = tabContent;
      
      // Tab button click handler
      tabButton.addEventListener('click', () => {
        // Update active tab styling
        document.querySelectorAll('[id^="tab-"]').forEach(el => {
          (el as HTMLElement).style.borderBottom = '2px solid transparent';
          (el as HTMLElement).style.fontWeight = 'normal';
        });
        tabButton.style.borderBottom = '2px solid #4CAF50';
        tabButton.style.fontWeight = 'bold';
        
        // Show selected content, hide others
        Object.values(tabContents).forEach(content => {
          (content as HTMLElement).style.display = 'none';
        });
        tabContent.style.display = 'block';
      });
      
      // Add to container
      tabContainer.appendChild(tabButton);
      contentDiv.appendChild(tabContent);
    });
    
    // Set first tab as active
    const firstTab = document.getElementById(tabs[0].id);
    if (firstTab) {
      firstTab.style.borderBottom = '2px solid #4CAF50';
      firstTab.style.fontWeight = 'bold';
    }
    
    contentDiv.insertBefore(tabContainer, contentDiv.firstChild);
    
    // Basic controls section - Move existing controls here
    const basicContent = tabContents['tab-basic'];
    
    // Create basic control buttons
    const startPauseButton = document.createElement('button');
    startPauseButton.id = 'start-pause';
    startPauseButton.textContent = 'Start/Pause';
    startPauseButton.style.margin = '5px';
    startPauseButton.style.padding = '5px 10px';
    startPauseButton.addEventListener('click', () => this.toggleRunning());
    
    const resetButton = document.createElement('button');
    resetButton.id = 'reset';
    resetButton.textContent = 'Reset';
    resetButton.style.margin = '5px';
    resetButton.style.padding = '5px 10px';
    resetButton.addEventListener('click', () => this.reset());
    
    const debugButton = document.createElement('button');
    debugButton.id = 'toggle-debug';
    debugButton.textContent = 'Toggle Details';
    debugButton.style.margin = '5px';
    debugButton.style.padding = '5px 10px';
    debugButton.addEventListener('click', () => this.toggleDebug());
    
    // Create speed control container
    const speedControlContainer = document.createElement('div');
    speedControlContainer.style.margin = '10px 5px';
    
    const speedLabel = document.createElement('div');
    speedLabel.textContent = 'Simulation Speed:';
    speedLabel.style.marginBottom = '5px';
    speedControlContainer.appendChild(speedLabel);
    
    const speedButtonsContainer = document.createElement('div');
    speedButtonsContainer.style.display = 'flex';
    speedButtonsContainer.style.justifyContent = 'space-between';
    
    // Create speed buttons
    const speeds = [
      { id: 'speed-1x', value: SimulationSpeed.NORMAL, label: '1x' },
      { id: 'speed-2x', value: SimulationSpeed.DOUBLE, label: '2x' },
      { id: 'speed-5x', value: SimulationSpeed.FAST, label: '5x' },
      { id: 'speed-10x', value: SimulationSpeed.ULTRA, label: '10x' }
    ];
    
    speeds.forEach(speed => {
      const speedButton = document.createElement('button');
      speedButton.id = speed.id;
      speedButton.textContent = speed.label;
      speedButton.className = 'speed-button';
      speedButton.style.flex = '1';
      speedButton.style.margin = '0 2px';
      speedButton.style.padding = '3px 0';
      speedButton.style.cursor = 'pointer';
      speedButton.addEventListener('click', () => this.setSimulationSpeed(speed.value));
      
      // Set the initial active state
      if (speed.value === SimulationSpeed.NORMAL) {
        speedButton.classList.add('active');
      }
      
      speedButtonsContainer.appendChild(speedButton);
    });
    
    speedControlContainer.appendChild(speedButtonsContainer);
    
    // Add CSS for speed buttons
    const style = document.createElement('style');
    style.textContent = `
      .speed-button.active {
        background-color: #4CAF50;
        color: white;
      }
    `;
    document.head.appendChild(style);
    
    // Add inference controls
    const inferenceControlsContainer = document.createElement('div');
    inferenceControlsContainer.style.margin = '10px 5px';
    
    const inferenceLabel = document.createElement('div');
    inferenceLabel.textContent = 'Inference Settings:';
    inferenceLabel.style.marginBottom = '5px';
    inferenceControlsContainer.appendChild(inferenceLabel);
    
    const inferenceToggleButton = document.createElement('button');
    inferenceToggleButton.id = 'toggle-inference';
    inferenceToggleButton.textContent = this.useMockInference ? 'Using Mock Inference' : 'Using API Inference';
    inferenceToggleButton.style.margin = '5px 0';
    inferenceToggleButton.style.padding = '5px 10px';
    inferenceToggleButton.style.width = '100%';
    inferenceToggleButton.addEventListener('click', () => this.toggleInferenceMode());
    
    const proxyToggleButton = document.createElement('button');
    proxyToggleButton.id = 'toggle-proxy';
    proxyToggleButton.textContent = this.apiConfig.useProxy ? 'Using Proxy Server' : 'Using Direct API Calls';
    proxyToggleButton.style.margin = '5px 0';
    proxyToggleButton.style.padding = '5px 10px';
    proxyToggleButton.style.width = '100%';
    proxyToggleButton.addEventListener('click', () => this.toggleProxyMode());
    
    const runTestsButton = document.createElement('button');
    runTestsButton.id = 'run-inference-tests';
    runTestsButton.textContent = 'Run Inference Tests';
    runTestsButton.style.margin = '5px 0';
    runTestsButton.style.padding = '5px 10px';
    runTestsButton.style.width = '100%';
    runTestsButton.addEventListener('click', () => this.runInferenceTests());
    
    inferenceControlsContainer.appendChild(inferenceToggleButton);
    inferenceControlsContainer.appendChild(proxyToggleButton);
    inferenceControlsContainer.appendChild(runTestsButton);
    
    // Add all elements to the basic controls section
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.appendChild(startPauseButton);
    buttonContainer.appendChild(resetButton);
    buttonContainer.appendChild(debugButton);
    
    basicContent.appendChild(buttonContainer);
    basicContent.appendChild(speedControlContainer);
    basicContent.appendChild(inferenceControlsContainer);
    
    // Population controls section
    const populationContent = tabContents['tab-population'];
    
    // Add auto population control toggle
    const autoPopControlDiv = document.createElement('div');
    autoPopControlDiv.style.marginBottom = '15px';
    autoPopControlDiv.style.display = 'flex';
    autoPopControlDiv.style.alignItems = 'center';
    
    const autoPopControlCheckbox = document.createElement('input');
    autoPopControlCheckbox.type = 'checkbox';
    autoPopControlCheckbox.id = 'auto-population-control';
    autoPopControlCheckbox.checked = this.config.autoPopulationControl;
    autoPopControlCheckbox.style.marginRight = '10px';
    
    const autoPopControlLabel = document.createElement('label');
    autoPopControlLabel.htmlFor = 'auto-population-control';
    autoPopControlLabel.textContent = 'Auto Population Control';
    
    autoPopControlDiv.appendChild(autoPopControlCheckbox);
    autoPopControlDiv.appendChild(autoPopControlLabel);
    
    populationContent.appendChild(autoPopControlDiv);
    
    // Create population metrics display
    this.populationMetricsDiv = document.createElement('div');
    this.populationMetricsDiv.id = 'population-metrics';
    this.populationMetricsDiv.style.marginBottom = '15px';
    this.populationMetricsDiv.style.padding = '8px';
    this.populationMetricsDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.populationMetricsDiv.style.borderRadius = '4px';
    this.populationMetricsDiv.style.fontSize = '12px';
    this.populationMetricsDiv.style.lineHeight = '1.5';
    
    // Initialize metrics display
    this.updatePopulationMetrics();
    
    populationContent.appendChild(this.populationMetricsDiv);
    
    // Create slider controls with labels for population parameters
    const createSliderControl = (
      id: string, 
      label: string, 
      min: number, 
      max: number, 
      value: number, 
      step: number, 
      onChange: (value: number) => void
    ) => {
      const controlDiv = document.createElement('div');
      controlDiv.style.marginBottom = '15px';
      
      const controlLabel = document.createElement('label');
      controlLabel.setAttribute('for', id);
      controlLabel.textContent = label;
      controlLabel.style.marginBottom = '5px';
      controlLabel.style.fontSize = '12px';
      controlLabel.style.display = 'block';
      
      const sliderContainer = document.createElement('div');
      sliderContainer.style.display = 'flex';
      sliderContainer.style.alignItems = 'center';
      
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.id = id;
      slider.min = min.toString();
      slider.max = max.toString();
      slider.value = value.toString();
      slider.step = step.toString();
      slider.style.flex = '1';
      slider.style.marginRight = '10px';
      
      const valueDisplay = document.createElement('span');
      valueDisplay.textContent = value.toString();
      valueDisplay.style.minWidth = '40px';
      valueDisplay.style.fontFamily = 'monospace';
      valueDisplay.style.fontSize = '12px';
      
      // Add input event listener for continuous updating
      slider.addEventListener('input', () => {
        const newValue = parseFloat(slider.value);
        valueDisplay.textContent = newValue.toString();
        onChange(newValue);
      });
      
      // Add change event listener for final value
      slider.addEventListener('change', () => {
        const finalValue = parseFloat(slider.value);
        // Call onChange again to ensure final value is applied
        onChange(finalValue);
      });
      
      // Add to containers
      sliderContainer.appendChild(slider);
      sliderContainer.appendChild(valueDisplay);
      controlDiv.appendChild(controlLabel);
      controlDiv.appendChild(sliderContainer);
      
      return { div: controlDiv, input: slider };
    };
    
    // Create sliders for each population parameter
    const populationSliders = [
      createSliderControl(
        'min-sparkling-count',
        'Minimum Population',
        5, 30, this.config.minSparklingCount, 1,
        (value) => {
          this.config.minSparklingCount = value;
          if (this.config.initialSparklingCount < value) {
            this.config.initialSparklingCount = value;
            const targetSlider = document.getElementById('initial-sparkling-count') as HTMLInputElement;
            if (targetSlider) {
              targetSlider.value = value.toString();
              const valueSpan = targetSlider.nextElementSibling;
              if (valueSpan) valueSpan.textContent = value.toString();
            }
          }
        }
      ),
      
      createSliderControl(
        'initial-sparkling-count',
        'Target Population',
        5, 30, this.config.initialSparklingCount, 1,
        (value) => {
          this.config.initialSparklingCount = value;
          // Ensure min/max constraints
          if (value < this.config.minSparklingCount) {
            this.config.minSparklingCount = value;
            const minSlider = document.getElementById('min-sparkling-count') as HTMLInputElement;
            if (minSlider) {
              minSlider.value = value.toString();
              const valueSpan = minSlider.nextElementSibling;
              if (valueSpan) valueSpan.textContent = value.toString();
            }
          }
          if (value > this.config.maxSparklingCount) {
            this.config.maxSparklingCount = value;
            const maxSlider = document.getElementById('max-sparkling-count') as HTMLInputElement;
            if (maxSlider) {
              maxSlider.value = value.toString();
              const valueSpan = maxSlider.nextElementSibling;
              if (valueSpan) valueSpan.textContent = value.toString();
            }
          }
        }
      ),
      
      createSliderControl(
        'max-sparkling-count',
        'Maximum Population',
        10, 50, this.config.maxSparklingCount, 1,
        (value) => {
          this.config.maxSparklingCount = value;
          if (this.config.initialSparklingCount > value) {
            this.config.initialSparklingCount = value;
            const targetSlider = document.getElementById('initial-sparkling-count') as HTMLInputElement;
            if (targetSlider) {
              targetSlider.value = value.toString();
              const valueSpan = targetSlider.nextElementSibling;
              if (valueSpan) valueSpan.textContent = value.toString();
            }
          }
        }
      ),
      
      createSliderControl(
        'population-balance-range',
        'Balance Range Tolerance',
        1, 10, this.config.populationBalanceRange, 1,
        (value) => this.config.populationBalanceRange = value
      ),
      
      createSliderControl(
        'population-growth-rate',
        'Growth Rate',
        0.01, 0.2, this.config.populationGrowthRate, 0.01,
        (value) => this.config.populationGrowthRate = value
      ),
      
      createSliderControl(
        'population-decline-rate',
        'Decline Rate',
        0.01, 0.2, this.config.populationDeclineRate, 0.01,
        (value) => this.config.populationDeclineRate = value
      ),
      
      createSliderControl(
        'resource-spawn-rate-per-sparkling',
        'Resource Rate Per Sparkling',
        -0.0000050, 0.0000050, this.config.resourceSpawnRatePerSparkling, 0.0000005,
        (value) => {
          // Store the new value in the config
          this.config.resourceSpawnRatePerSparkling = value;
          
          // Immediately apply the change to resource spawning
          this.adjustResourceSpawnRate();
          
          // Format the display value with scientific notation for clarity
          const valueSpan = document.querySelector(`#resource-spawn-rate-per-sparkling + span`) as HTMLElement;
          if (valueSpan) {
            valueSpan.textContent = value.toExponential(7);
          }
          
          console.log(`Resource spawn rate per Sparkling set to: ${value.toExponential(7)}`);
        }
      )
    ];
    
    // Format the resource spawn rate display with scientific notation initially
    const resourceRateSlider = populationSliders[populationSliders.length - 1];
    const resourceRateValueSpan = resourceRateSlider.input.nextElementSibling as HTMLElement;
    if (resourceRateValueSpan) {
      resourceRateValueSpan.textContent = this.config.resourceSpawnRatePerSparkling.toExponential(7);
    }
    
    // Add sliders to container
    populationSliders.forEach(slider => {
      populationContent.appendChild(slider.div);
    });
    
    // Create a list of all control elements for enabling/disabling
    const populationControls = [
      autoPopControlCheckbox,
      ...populationSliders.map(s => s.input)
    ];
    
    // Add event listener for the auto population control checkbox
    autoPopControlCheckbox.addEventListener('change', () => {
      this.config.autoPopulationControl = autoPopControlCheckbox.checked;
      
      // Update the UI elements based on checkbox state
      populationSliders.forEach(slider => {
        slider.input.disabled = !autoPopControlCheckbox.checked;
        slider.div.style.opacity = autoPopControlCheckbox.checked ? '1' : '0.5';
      });
      
      console.log(`Auto population control: ${this.config.autoPopulationControl ? 'enabled' : 'disabled'}`);
    });
    
    // Set initial state of controls based on auto population control setting
    populationSliders.forEach(slider => {
      if (!this.config.autoPopulationControl) {
        slider.input.disabled = true;
        slider.div.style.opacity = '0.5';
      }
    });
    
    // Add Reset Population button
    const resetPopulationButton = document.createElement('button');
    resetPopulationButton.textContent = 'Reset Population';
    resetPopulationButton.style.width = '100%';
    resetPopulationButton.style.padding = '8px 10px';
    resetPopulationButton.style.marginTop = '10px';
    resetPopulationButton.addEventListener('click', () => this.resetPopulation());
    
    populationContent.appendChild(resetPopulationButton);
    
    // Add the control panel to the body instead of the controls div
    document.body.appendChild(controlPanel);
    
    // Hide the original controls div since we've moved everything to our new panel
    if (controlsDiv) {
      controlsDiv.style.display = 'none';
    }
  }

  /**
   * Reset the population to initial settings
   */
  private resetPopulation(): void {
    // Re-create sparklings with initial count
    this.createSparklings();
    console.log(`Population reset to ${this.sparklings.length} Sparklings`);
  }
  
  /**
   * Update the population metrics display
   */
  private updatePopulationMetrics(): void {
    if (!this.populationMetricsDiv) return;
    
    const currentPopulation = this.sparklings.length;
    const targetPopulation = this.config.initialSparklingCount;
    const resourceBalance = this.calculateResourceBalance();
    
    // Set balance color based on value
    let balanceColor = 'white';
    if (resourceBalance > 0.3) balanceColor = '#4caf50'; // Green for abundant
    else if (resourceBalance < -0.3) balanceColor = '#f44336'; // Red for scarce
    else balanceColor = '#ff9800'; // Orange for neutral
    
    // Create metrics HTML
    this.populationMetricsDiv.innerHTML = `
      <div>Current Population: <strong>${currentPopulation}</strong> / Target: <strong>${targetPopulation}</strong></div>
      <div>Min: ${this.config.minSparklingCount} / Max: ${this.config.maxSparklingCount}</div>
      <div>Resource Balance: <strong style="color: ${balanceColor}">${resourceBalance.toFixed(2)}</strong></div>
    `;
  }

  /**
   * Create tooltip element for displaying Sparkling information on hover
   */
  private createSparklingTooltip(): void {
    // Create tooltip element if it doesn't exist
    let tooltipElement = document.getElementById('sparkling-tooltip');
    if (!tooltipElement) {
      tooltipElement = document.createElement('div');
      tooltipElement.id = 'sparkling-tooltip';
      tooltipElement.style.position = 'absolute';
      tooltipElement.style.display = 'none';
      tooltipElement.style.zIndex = '1000';
      tooltipElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
      tooltipElement.style.color = 'white';
      tooltipElement.style.padding = '10px 15px';
      tooltipElement.style.borderRadius = '5px';
      tooltipElement.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
      tooltipElement.style.fontSize = '12px';
      tooltipElement.style.fontFamily = 'monospace';
      tooltipElement.style.minWidth = '450px';  // Increased from 300px
      tooltipElement.style.maxWidth = '600px';  // Increased from 400px
      tooltipElement.style.whiteSpace = 'pre-wrap';
      tooltipElement.style.pointerEvents = 'none'; // Prevent the tooltip from interfering with mouse events
      document.body.appendChild(tooltipElement);
    }
  }

  /**
   * Handle mouse movement over the canvas
   */
  private handleCanvasMouseMove(event: MouseEvent): void {
    const canvas = this.renderer.getContext().canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Check if mouse is over any Sparkling
    const hoveredSparkling = this.findSparklingAtPosition(mouseX, mouseY);
    
    if (hoveredSparkling) {
      this.showSparklingTooltip(hoveredSparkling, event.clientX, event.clientY);
    } else {
      this.hideSparklingTooltip();
    }
  }

  /**
   * Find a Sparkling at the given position
   */
  private findSparklingAtPosition(x: number, y: number): Sparkling | null {
    // Check each Sparkling's position
    for (const sparkling of this.sparklings) {
      const position = sparkling.getPosition();
      const dx = position.x - x;
      const dy = position.y - y;
      const distanceSquared = dx * dx + dy * dy;
      
      // Consider the Sparkling's size (using a radius of 15 for hover detection)
      if (distanceSquared < 15 * 15) {
        return sparkling;
      }
    }
    
    return null;
  }

  /**
   * Show tooltip with detailed information about a Sparkling
   */
  private showSparklingTooltip(sparkling: Sparkling, mouseX: number, mouseY: number): void {
    const tooltipElement = document.getElementById('sparkling-tooltip');
    if (!tooltipElement) return;
    
    // Get Sparkling details
    const id = sparkling.getId();
    const state = sparkling.getState();
    const resourceLevels = sparkling.getResourceLevels();
    const parameters = sparkling.getParameters();
    const profile = sparkling.getProfile();
    const memory = sparkling.getMemory();
    const inferenceStatus = sparkling.getInferenceStatus();
    const lastInference = sparkling.getLastInferenceInfo();
    
    // Format time since last inference
    let lastInferenceText = 'Never';
    if (lastInference.timestamp > 0) {
      const timeSince = (this.timeManager.getCurrentTime() - lastInference.timestamp).toFixed(1);
      lastInferenceText = `${timeSince}s ago`;
      if (lastInference.success) {
        lastInferenceText += ' (Success)';
      } else {
        lastInferenceText += ' (Failed)';
      }
    }
    
    // Create tooltip content with sections
    let content = `<div style="color: #8be9fd; font-weight: bold; border-bottom: 1px solid #6272a4; margin-bottom: 5px;">Sparkling #${id}</div>`;
    
    // Basic status section
    content += `<div style="margin-bottom: 5px;"><span style="color: #ff79c6;">Status:</span> ${state}</div>`;
    content += `<div style="margin-bottom: 5px;"><span style="color: #ff79c6;">Inference:</span> ${inferenceStatus}</div>`;
    
    // Enhanced Resources section with visual indicators
    content += `<div style="color: #f1fa8c; margin-top: 8px; margin-bottom: 3px;">Resources</div>`;
    
    // Calculate percentages for visualization
    const foodPercentage = resourceLevels.food / sparkling.getMaxFood() * 100;
    const energyPercentage = resourceLevels.neuralEnergy / sparkling.getMaxNeuralEnergy() * 100;
    const hungerThresholdPercentage = parameters.hungerThreshold * 100;
    const criticalHungerThresholdPercentage = parameters.criticalHungerThreshold * 100;
    const foodSatiationThresholdPercentage = parameters.foodSatiationThreshold * 100;
    
    // Food level with visual indicators and detailed thresholds
    content += `<div style="margin-left: 10px; margin-bottom: 10px;">`;
    // Add food level text with percentage
    content += `<div style="margin-bottom: 3px;">Food: ${resourceLevels.food.toFixed(1)} / ${sparkling.getMaxFood().toFixed(1)} (${foodPercentage.toFixed(0)}%)</div>`;
    
    // Add visual food bar with threshold markers
    content += `<div style="position: relative; width: 100%; height: 20px; background-color: #2d3748; border-radius: 3px; overflow: hidden; margin-top: 5px;">`;
    
    // Food level fill
    let fillColor = '#48bb78'; // Default green
    if (foodPercentage < hungerThresholdPercentage) {
        fillColor = '#ecc94b'; // Yellow for hungry
    }
    if (foodPercentage < criticalHungerThresholdPercentage) {
        fillColor = '#f56565'; // Red for critical hunger
    }
    
    content += `<div style="position: absolute; height: 100%; width: ${foodPercentage}%; background-color: ${fillColor}; transition: width 0.3s ease;"></div>`;
    
    // Add threshold markers
    // Critical hunger threshold marker
    content += `<div style="position: absolute; height: 100%; left: ${criticalHungerThresholdPercentage}%; width: 2px; background-color: #f56565;" title="Critical Hunger Threshold"></div>`;
    
    // Hunger threshold marker
    content += `<div style="position: absolute; height: 100%; left: ${hungerThresholdPercentage}%; width: 2px; background-color: #ecc94b;" title="Hunger Threshold"></div>`;
    
    // Satiation threshold marker
    content += `<div style="position: absolute; height: 100%; left: ${foodSatiationThresholdPercentage}%; width: 2px; background-color: #48bb78;" title="Food Satiation Threshold"></div>`;
    
    // Add threshold labels
    content += `<div style="position: absolute; top: 2px; left: ${criticalHungerThresholdPercentage + 1}%; font-size: 9px; color: white;">Crit</div>`;
    content += `<div style="position: absolute; top: 2px; left: ${hungerThresholdPercentage + 1}%; font-size: 9px; color: white;">Hungry</div>`;
    content += `<div style="position: absolute; top: 2px; left: ${foodSatiationThresholdPercentage + 1}%; font-size: 9px; color: white;">Satiated</div>`;
    
    content += `</div>`;
    content += `</div>`;
    
    // Threshold descriptions
    content += `<div style="margin-left: 10px; font-size: 11px; margin-bottom: 8px;">`;
    content += `<div><span style="color: #f56565;">■</span> Critical Hunger: ${(parameters.criticalHungerThreshold * 100).toFixed(0)}% (${(parameters.criticalHungerThreshold * sparkling.getMaxFood()).toFixed(1)} units)</div>`;
    content += `<div><span style="color: #ecc94b;">■</span> Hunger Threshold: ${(parameters.hungerThreshold * 100).toFixed(0)}% (${(parameters.hungerThreshold * sparkling.getMaxFood()).toFixed(1)} units)</div>`;
    content += `<div><span style="color: #48bb78;">■</span> Satiation: ${(parameters.foodSatiationThreshold * 100).toFixed(0)}% (${(parameters.foodSatiationThreshold * sparkling.getMaxFood()).toFixed(1)} units)</div>`;
    content += `</div>`;
    
    // Food consumption stats
    content += `<div style="margin-left: 10px; font-size: 11px; margin-bottom: 8px;">`;
    content += `Food Consumption Rate: ${sparkling.getFoodConsumptionRate().toFixed(2)} units/s`;
    content += `</div>`;
    
    // Neural Energy level with visual indicator
    content += `<div style="margin-left: 10px; margin-bottom: 10px;">`;
    content += `<div style="margin-bottom: 3px;">Neural Energy: ${resourceLevels.neuralEnergy.toFixed(1)} / ${sparkling.getMaxNeuralEnergy().toFixed(1)} (${energyPercentage.toFixed(0)}%)</div>`;
    
    // Add visual energy bar
    content += `<div style="position: relative; width: 100%; height: 20px; background-color: #2d3748; border-radius: 3px; overflow: hidden; margin-top: 5px;">`;
    
    // Energy level fill
    let energyFillColor = '#9f7aea'; // Purple for neural energy
    if (energyPercentage < parameters.energyLowThreshold * 100) {
        energyFillColor = '#d53f8c'; // Pink for low energy
    }
    if (energyPercentage < parameters.criticalEnergyThreshold * 100) {
        energyFillColor = '#805ad5'; // Darker purple for critical energy
    }
    if (energyPercentage >= parameters.inferenceThreshold / sparkling.getMaxNeuralEnergy() * 100) {
        energyFillColor = '#667eea'; // Blue for inference-ready
    }
    
    content += `<div style="position: absolute; height: 100%; width: ${energyPercentage}%; background-color: ${energyFillColor};"></div>`;
    
    // Add inference threshold marker
    const inferenceThresholdPercentage = parameters.inferenceThreshold / sparkling.getMaxNeuralEnergy() * 100;
    content += `<div style="position: absolute; height: 100%; left: ${inferenceThresholdPercentage}%; width: 2px; background-color: #667eea;" title="Inference Threshold"></div>`;
    content += `<div style="position: absolute; top: 2px; left: ${inferenceThresholdPercentage + 1}%; font-size: 9px; color: white;">Inference</div>`;
    
    content += `</div>`;
    content += `</div>`;
    
    // Food behavior indicators - NEW
    content += `<div style="color: #f1fa8c; margin-top: 10px; margin-bottom: 3px;">Food Behaviors</div>`;
    content += `<div style="margin-left: 10px;">`;
    
    // Show current food-seeking status
    if (state === SparklingState.SEEKING_FOOD) {
        content += `<div style="color: #ecc94b;">Currently seeking food</div>`;
    } else if (state === SparklingState.COLLECTING && sparkling.isCollectingFood()) {
        content += `<div style="color: #48bb78;">Currently collecting food</div>`;
    }
    
    // Food collection statistics
    content += `<div>Collection Efficiency: ${(parameters.collectionEfficiency * 100).toFixed(0)}%</div>`;
    
    // Time estimates based on current food level and consumption rate
    const foodConsumptionRate = sparkling.getFoodConsumptionRate();
    if (foodConsumptionRate > 0) {
        // Time until critical hunger
        if (foodPercentage > criticalHungerThresholdPercentage) {
            const timeUntilCritical = (resourceLevels.food - parameters.criticalHungerThreshold * sparkling.getMaxFood()) / foodConsumptionRate;
            content += `<div>Time until critical hunger: ${timeUntilCritical.toFixed(1)}s</div>`;
        } else {
            content += `<div style="color: #f56565;">CRITICAL HUNGER STATE</div>`;
        }
        
        // Time until empty
        const timeUntilEmpty = resourceLevels.food / foodConsumptionRate;
        content += `<div>Time until food depleted: ${timeUntilEmpty.toFixed(1)}s</div>`;
    }
    
    // Add known food source count from memory
    const foodMemories = memory.getMemoriesByType(MemoryEventType.RESOURCE_FOUND);
    content += `<div>Known food sources: ${foodMemories.length}</div>`;
    
    content += `</div>`;
    
    // Memory section
    content += `<div style="color: #f1fa8c; margin-top: 8px; margin-bottom: 3px;">Memory</div>`;
    content += `<div style="display: flex; flex-wrap: wrap;">`;
    content += `<div style="margin-left: 10px; flex: 0 0 45%;">`;
    content += `Food Locations: ${memory.getMemoriesByType(MemoryEventType.RESOURCE_FOUND).length}`;
    content += `</div>`;
    content += `<div style="margin-left: 10px; flex: 0 0 45%;">`;
    content += `Energy Locations: ${memory.getMemoriesByType(MemoryEventType.ENERGY_FOUND).length}`;
    content += `</div>`;
    content += `<div style="margin-left: 10px; flex: 0 0 45%;">`;
    content += `Food Memory Importance: ${parameters.foodMemoryImportance.toFixed(2)}`;
    content += `</div>`;
    content += `<div style="margin-left: 10px; flex: 0 0 45%;">`;
    content += `Energy Memory Importance: ${parameters.energyMemoryImportance.toFixed(2)}`;
    content += `</div>`;
    content += `</div>`;
    
    // Inference section
    content += `<div style="color: #f1fa8c; margin-top: 8px; margin-bottom: 3px;">Inference</div>`;
    content += `<div style="margin-left: 10px;">`;
    content += `Energy Threshold: ${parameters.inferenceThreshold.toFixed(1)} (${(parameters.inferenceThreshold / sparkling.getMaxNeuralEnergy() * 100).toFixed(0)}%)`;
    content += `</div>`;
    content += `<div style="margin-left: 10px;">`;
    content += `Interval: ${parameters.inferenceInterval.toFixed(1)}s minimum`;
    content += `</div>`;
    content += `<div style="margin-left: 10px;">`;
    content += `Last Inference: ${lastInferenceText}`;
    content += `</div>`;
    
    if (lastInference.reasoning) {
      content += `<div style="margin-left: 10px; margin-top: 3px; font-style: italic; color: #6272a4;">`;
      content += lastInference.reasoning.length > 100 
        ? lastInference.reasoning.substring(0, 100) + '...' 
        : lastInference.reasoning;
      content += `</div>`;
    }
    
    // Use flex layout for parameters to display them in a two-column format
    content += `<div style="color: #f1fa8c; margin-top: 8px; margin-bottom: 3px;">All Parameters</div>`;
    content += `<div style="display: flex; flex-wrap: wrap;">`;
    
    // Helper function to add a parameter to the display
    const addParameter = (name: string, value: number, unit: string = "", notes: string = "") => {
      content += `<div style="margin-left: 10px; flex: 0 0 45%; margin-bottom: 3px;">`;
      content += `${name}: ${value.toFixed(2)}${unit}${notes ? ` (${notes})` : ''}`;
      content += `</div>`;
    };
    
    // Add all parameters in a more organized way
    // Profile and Key Behavioral Parameters
    addParameter("Food Memory Importance", parameters.foodMemoryImportance);
    addParameter("Energy Memory Importance", parameters.energyMemoryImportance);
    addParameter("Resource Preference", parameters.resourcePreference, "", parameters.resourcePreference < 0 ? 'Food' : parameters.resourcePreference > 0 ? 'Energy' : 'Neutral');
    addParameter("Memory Trust Factor", parameters.memoryTrustFactor);
    addParameter("Novelty Preference", parameters.noveltyPreference);
    addParameter("Persistence Factor", parameters.persistenceFactor);
    addParameter("Cooperation Tendency", parameters.cooperationTendency);
    addParameter("Collection Efficiency", parameters.collectionEfficiency);
    
    // Thresholds and Ranges
    addParameter("Hunger Threshold", parameters.hungerThreshold, "", `${(parameters.hungerThreshold * 100).toFixed(0)}%`);
    addParameter("Critical Hunger", parameters.criticalHungerThreshold, "", `${(parameters.criticalHungerThreshold * 100).toFixed(0)}%`);
    addParameter("Energy Low Threshold", parameters.energyLowThreshold, "", `${(parameters.energyLowThreshold * 100).toFixed(0)}%`);
    addParameter("Critical Energy", parameters.criticalEnergyThreshold, "", `${(parameters.criticalEnergyThreshold * 100).toFixed(0)}%`);
    addParameter("Food Satiation", parameters.foodSatiationThreshold, "", `${(parameters.foodSatiationThreshold * 100).toFixed(0)}%`);
    addParameter("Energy Satiation", parameters.energySatiationThreshold, "", `${(parameters.energySatiationThreshold * 100).toFixed(0)}%`);
    
    // Activity Parameters
    addParameter("Personal Space", parameters.personalSpaceFactor, " units");
    addParameter("Exploration Range", parameters.explorationRange, " units");
    addParameter("Exploration Duration", parameters.explorationDuration, "s");
    addParameter("Rest Duration", parameters.restDuration, "s");
    
    // Inference Parameters
    addParameter("Inference Threshold", parameters.inferenceThreshold, "", `${(parameters.inferenceThreshold / sparkling.getMaxNeuralEnergy() * 100).toFixed(0)}%`);
    addParameter("Inference Interval", parameters.inferenceInterval, "s");
    
    content += `</div>`;
    
    tooltipElement.innerHTML = content;
    
    // Position the tooltip near the mouse but ensure it stays in viewport
    const tooltipWidth = tooltipElement.offsetWidth || 450;
    const tooltipHeight = tooltipElement.offsetHeight || 300;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Add offset to prevent tooltip from appearing directly under the cursor
    let tooltipX = mouseX + 15;
    let tooltipY = mouseY + 15;
    
    // Ensure tooltip stays within window bounds
    if (tooltipX + tooltipWidth > windowWidth) {
      tooltipX = mouseX - tooltipWidth - 15;
    }
    
    if (tooltipY + tooltipHeight > windowHeight) {
      tooltipY = windowHeight - tooltipHeight - 15;
    }
    
    // Position and show the tooltip
    tooltipElement.style.left = `${tooltipX}px`;
    tooltipElement.style.top = `${tooltipY}px`;
    tooltipElement.style.display = 'block';
  }

  /**
   * Hide the Sparkling tooltip
   */
  private hideSparklingTooltip(): void {
    const tooltipElement = document.getElementById('sparkling-tooltip');
    if (tooltipElement) {
      tooltipElement.style.display = 'none';
    }
  }

  /**
   * Check if a Sparkling is currently fading out
   */
  private isSparklingFadingOut(sparkling: Sparkling): boolean {
    return sparkling.isFading();
  }

  /**
   * Get the current configuration
   */
  public getConfig(): SimulationConfig {
    return this.config;
  }
  
  /**
   * Get the current API configuration
   */
  public getApiConfig(): AnthropicConfig {
    return this.apiConfig;
  }
  
  /**
   * Get the world
   */
  public getWorld(): World {
    return this.world;
  }
  
  /**
   * Get all sparklings
   */
  public getSparklings(): Sparkling[] {
    return [...this.sparklings];
  }
  
  /**
   * Get the inference system
   */
  public getInferenceSystem(): InferenceSystem {
    return this.inferenceSystem;
  }
  
  /**
   * Get the inference quality tester
   */
  public getInferenceQualityTester(): InferenceQualityTester {
    return this.inferenceQualityTester;
  }
}