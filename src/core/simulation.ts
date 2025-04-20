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
  }
  
  /**
   * Remove Sparklings that have completed their fadeout process
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