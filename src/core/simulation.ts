import { SimulationConfig, getConfig } from '@config/config';
import { AnthropicConfig, getAnthropicConfig, isApiConfigValid } from '@config/apiConfig';
import { Renderer } from '@rendering/renderer';
import { TimeManager } from '@utils/time';
import { World, WorldGenerationOptions } from '@core/world';
import { Sparkling } from '@entities/sparkling';
import { Position } from '@entities/sparklingTypes';
import { BehavioralProfile } from '@entities/decisionParameters';
import { InferenceSystem } from '@core/inference';
import { InferenceQualityTester } from '@core/inferenceQualityTester';

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
    
    // Create the initial sparklings
    for (let i = 0; i < this.config.initialSparklingCount; i++) {
      // Generate a random position within the world
      const position: Position = {
        x: Math.random() * this.config.worldWidth,
        y: Math.random() * this.config.worldHeight
      };
      
      // Create a new sparkling
      const sparkling = new Sparkling(i, position, this.config);
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
    
    // Pause simulation while running tests
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.stop();
    }
    
    // Use mock inference for tests to avoid API costs
    const previousMode = this.useMockInference;
    this.inferenceSystem.setUseMockInference(true);
    
    // Run the tests
    await this.inferenceQualityTester.runAllTests();
    
    // Display the results
    const testSummary = this.inferenceQualityTester.getTestSummary();
    console.log(testSummary);
    
    // Create or update test results element
    let resultsElement = document.getElementById('inference-test-results');
    if (!resultsElement) {
      resultsElement = document.createElement('div');
      resultsElement.id = 'inference-test-results';
      resultsElement.style.position = 'absolute';
      resultsElement.style.top = '100px';
      resultsElement.style.left = '20px';
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
      document.body.appendChild(resultsElement);
    }
    
    resultsElement.textContent = testSummary;
    
    // Restore previous inference mode
    this.inferenceSystem.setUseMockInference(previousMode);
    
    // Resume simulation if it was running
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Main animation loop
   */
  private animationLoop(timestamp: number): void {
    this.timeManager.update(timestamp);
    
    this.update(this.timeManager.getDeltaTime());
    this.render();
    
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
    }
  }

  /**
   * Update the simulation state
   */
  private update(deltaTime: number): void {
    // Spawn new resources in the world
    this.world.spawnResources(deltaTime);
    
    // Update all sparklings
    for (const sparkling of this.sparklings) {
      sparkling.update(deltaTime, this.world);
    }
    
    // Check for sparkling encounters
    this.checkSparklingEncounters();
  }

  /**
   * Check for encounters between sparklings
   */
  private checkSparklingEncounters(): void {
    const encounterRadius = 30; // Distance at which sparklings notice each other
    
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
          // For now, encounters are always neutral
          // In future implementations, this could depend on competition or cooperation
          sparklingA.recordEncounter(sparklingB, 'neutral');
          sparklingB.recordEncounter(sparklingA, 'neutral');
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
    
    // Draw all sparklings
    for (const sparkling of this.sparklings) {
      sparkling.render(this.renderer.getContext(), this.showDebug);
    }
    
    this.renderer.drawDebugInfo(this.timeManager.getFPS(), this.world);
    
    // Draw additional debug information if enabled
    if (this.showDebug) {
      this.drawMemoryStats();
    }
  }
  
  /**
   * Draw memory statistics for debugging
   */
  private drawMemoryStats(): void {
    const context = this.renderer.getContext();
    context.fillStyle = 'white';
    context.font = '12px Arial';
    context.textAlign = 'right';
    
    // Position on right side
    const rightEdge = this.renderer.getContext().canvas.width - 10;
    
    // Start below the world dimensions info
    let y = 120;
    
    context.fillText('Memory Stats:', rightEdge, y);
    y += 20;
    
    for (const sparkling of this.sparklings) {
      const memory = sparkling.getMemory();
      context.fillText(
        `Sparkling ${sparkling.getId()}: ${memory.getCount()}/${memory.getCapacity()} memories`,
        rightEdge, 
        y
      );
      y += 20;
    }
    
    // Show inference stats
    y += 10;
    context.fillText('Inference Stats:', rightEdge, y);
    y += 20;
    
    const metrics = this.inferenceSystem.getInferenceQualityMetrics();
    context.fillText(`Total inferences: ${metrics.totalInferences}`, rightEdge, y);
    y += 20;
    
    context.fillText(`Success rate: ${
      metrics.totalInferences ? 
      ((metrics.successfulInferences / metrics.totalInferences) * 100).toFixed(1) + '%' : 
      'N/A'
    }`, rightEdge, y);
    y += 20;
    
    context.fillText(`Avg response time: ${
      metrics.averageResponseTime.toFixed(2)
    }ms`, rightEdge, y);
    
    // Reset text alignment for other rendering
    context.textAlign = 'left';
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
    debugButton.textContent = 'Toggle Memory View';
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
    
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv) {
      controlsDiv.appendChild(debugButton);
      controlsDiv.appendChild(inferenceToggleButton);
      controlsDiv.appendChild(proxyToggleButton);
      controlsDiv.appendChild(runTestsButton);
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