import { InferenceSystem } from '@core/inference';
import { Memory } from '@entities/memory';
import { DecisionParameters } from '@entities/decisionParameters';
import { MemoryEventType } from '@entities/memoryTypes';
import { SparklingState } from '@entities/sparklingTypes';

/**
 * Interface for inference test case
 */
interface InferenceTestCase {
  sparklingId: number;
  initialParameters: DecisionParameters;
  testDescription: string;
  expectedOutcome: {
    parameterChanges: string[];
    shouldAdjustResourcePreference: boolean;
    shouldAdjustMemoryTrust: boolean;
    shouldAdjustExploration: boolean;
  };
}

/**
 * Interface for inference test results
 */
interface InferenceTestResult {
  testCase: InferenceTestCase;
  success: boolean;
  updatedParameters: Partial<DecisionParameters>;
  reasoning: string;
  passedExpectations: string[];
  failedExpectations: string[];
}

/**
 * Class for testing inference quality
 */
export class InferenceQualityTester {
  private inferenceSystem: InferenceSystem;
  private testResults: InferenceTestResult[] = [];
  private testCases: InferenceTestCase[] = [];
  
  constructor() {
    this.inferenceSystem = InferenceSystem.getInstance();
    this.initializeTestCases();
  }
  
  /**
   * Initialize the test cases
   */
  private initializeTestCases(): void {
    // Test case 1: Low food scenario
    this.testCases.push({
      sparklingId: 999,
      initialParameters: {
        hungerThreshold: 0.4,
        criticalHungerThreshold: 0.2,
        foodSatiationThreshold: 0.8,
        energyLowThreshold: 0.4,
        criticalEnergyThreshold: 0.2,
        energySatiationThreshold: 0.8,
        resourcePreference: 0,  // Neutral
        collectionEfficiency: 1,
        explorationRange: 200,
        explorationDuration: 15,
        restDuration: 5,
        personalSpaceFactor: 30,
        memoryTrustFactor: 0.5,
        noveltyPreference: 0.5,
        persistenceFactor: 0.5,
        cooperationTendency: 0.5,
        inferenceThreshold: 70, // Default energy threshold for inference
        inferenceInterval: 15,  // Default seconds between inferences
        foodMemoryImportance: 0.5, // Neutral food memory importance
        energyMemoryImportance: 0.5 // Neutral energy memory importance
      },
      testDescription: "Low food, high energy scenario",
      expectedOutcome: {
        parameterChanges: ["resourcePreference"],
        shouldAdjustResourcePreference: true,
        shouldAdjustMemoryTrust: false,
        shouldAdjustExploration: false
      }
    });
    
    // Test case 2: Low energy scenario
    this.testCases.push({
      sparklingId: 998,
      initialParameters: {
        hungerThreshold: 0.4,
        criticalHungerThreshold: 0.2,
        foodSatiationThreshold: 0.8,
        energyLowThreshold: 0.4,
        criticalEnergyThreshold: 0.2,
        energySatiationThreshold: 0.8,
        resourcePreference: 0,  // Neutral
        collectionEfficiency: 1,
        explorationRange: 200,
        explorationDuration: 15,
        restDuration: 5,
        personalSpaceFactor: 30,
        memoryTrustFactor: 0.5,
        noveltyPreference: 0.5,
        persistenceFactor: 0.5,
        cooperationTendency: 0.5,
        inferenceThreshold: 70, // Default energy threshold for inference
        inferenceInterval: 15,  // Default seconds between inferences
        foodMemoryImportance: 0.5, // Neutral food memory importance
        energyMemoryImportance: 0.5 // Neutral energy memory importance
      },
      testDescription: "High food, low energy scenario",
      expectedOutcome: {
        parameterChanges: ["resourcePreference"],
        shouldAdjustResourcePreference: true,
        shouldAdjustMemoryTrust: false,
        shouldAdjustExploration: false
      }
    });
    
    // Test case 3: Missing memories scenario
    this.testCases.push({
      sparklingId: 997,
      initialParameters: {
        hungerThreshold: 0.4,
        criticalHungerThreshold: 0.2,
        foodSatiationThreshold: 0.8,
        energyLowThreshold: 0.4,
        criticalEnergyThreshold: 0.2,
        energySatiationThreshold: 0.8,
        resourcePreference: 0,  // Neutral
        collectionEfficiency: 1,
        explorationRange: 200,
        explorationDuration: 15,
        restDuration: 5,
        personalSpaceFactor: 30,
        memoryTrustFactor: 0.5,
        noveltyPreference: 0.5,
        persistenceFactor: 0.5,
        cooperationTendency: 0.5,
        inferenceThreshold: 70, // Default energy threshold for inference
        inferenceInterval: 15,  // Default seconds between inferences
        foodMemoryImportance: 0.5, // Neutral food memory importance
        energyMemoryImportance: 0.5 // Neutral energy memory importance
      },
      testDescription: "Missing resource memories",
      expectedOutcome: {
        parameterChanges: ["explorationRange", "noveltyPreference"],
        shouldAdjustResourcePreference: false,
        shouldAdjustMemoryTrust: false,
        shouldAdjustExploration: true
      }
    });
  }
  
  /**
   * Run all test cases
   */
  public async runAllTests(): Promise<InferenceTestResult[]> {
    // Clear previous results
    this.testResults = [];
    
    // Run each test case
    for (const testCase of this.testCases) {
      const result = await this.runTestCase(testCase);
      this.testResults.push(result);
      console.log(`Test case "${testCase.testDescription}": ${result.success ? 'PASSED' : 'FAILED'}`);
      if (!result.success) {
        console.log(`Failed expectations: ${result.failedExpectations.join(', ')}`);
      }
    }
    
    return this.testResults;
  }
  
  /**
   * Run a single test case
   */
  private async runTestCase(testCase: InferenceTestCase): Promise<InferenceTestResult> {
    // Create a test memory
    const memory = new Memory({ memorySize: 20 } as any);
    
    // Set up test memory state based on the test case
    this.setupTestMemory(memory, testCase);
    
    // Run the inference
    const inferenceResult = await this.inferenceSystem.performInference(
      testCase.sparklingId,
      testCase.sparklingId === 999 ? SparklingState.SEEKING_FOOD : SparklingState.SEEKING_ENERGY,
      testCase.sparklingId === 999 
        ? { food: 20, neuralEnergy: 80 }  // Low food, high energy
        : { food: 80, neuralEnergy: 20 }, // High food, low energy
      { maxFood: 100, maxNeuralEnergy: 100 },
      memory,
      testCase.initialParameters
    );
    
    // Evaluate the result
    const passedExpectations: string[] = [];
    const failedExpectations: string[] = [];
    
    // Check if resource preference was adjusted as expected
    if (testCase.expectedOutcome.shouldAdjustResourcePreference) {
      if ('resourcePreference' in inferenceResult.updatedParameters) {
        passedExpectations.push('Resource preference was adjusted');
      } else {
        failedExpectations.push('Resource preference was not adjusted');
      }
    }
    
    // Check if memory trust was adjusted as expected
    if (testCase.expectedOutcome.shouldAdjustMemoryTrust) {
      if ('memoryTrustFactor' in inferenceResult.updatedParameters) {
        passedExpectations.push('Memory trust was adjusted');
      } else {
        failedExpectations.push('Memory trust was not adjusted');
      }
    }
    
    // Check if exploration parameters were adjusted as expected
    if (testCase.expectedOutcome.shouldAdjustExploration) {
      if ('explorationRange' in inferenceResult.updatedParameters || 
          'noveltyPreference' in inferenceResult.updatedParameters) {
        passedExpectations.push('Exploration parameters were adjusted');
      } else {
        failedExpectations.push('Exploration parameters were not adjusted');
      }
    }
    
    // Check if all expected parameter changes were made
    for (const paramName of testCase.expectedOutcome.parameterChanges) {
      if (paramName in inferenceResult.updatedParameters) {
        passedExpectations.push(`Parameter ${paramName} was changed`);
      } else {
        failedExpectations.push(`Parameter ${paramName} was not changed`);
      }
    }
    
    return {
      testCase,
      success: failedExpectations.length === 0,
      updatedParameters: inferenceResult.updatedParameters,
      reasoning: inferenceResult.reasoning,
      passedExpectations,
      failedExpectations
    };
  }
  
  /**
   * Set up test memory state based on the test case
   */
  private setupTestMemory(memory: Memory, testCase: InferenceTestCase): void {
    // Set up different memory states for different test cases
    switch (testCase.sparklingId) {
      case 999: // Low food scenario
        // Add some food memories
        memory.addResourceMemory(MemoryEventType.RESOURCE_DEPLETED, { x: 100, y: 100 }, 0);
        memory.addResourceMemory(MemoryEventType.RESOURCE_DEPLETED, { x: 200, y: 200 }, 0);
        
        // Add some energy memories
        memory.addEnergyMemory(MemoryEventType.ENERGY_FOUND, { x: 300, y: 300 }, 50);
        memory.addEnergyMemory(MemoryEventType.ENERGY_FOUND, { x: 400, y: 400 }, 40);
        break;
        
      case 998: // Low energy scenario
        // Add some food memories
        memory.addResourceMemory(MemoryEventType.RESOURCE_FOUND, { x: 100, y: 100 }, 50);
        memory.addResourceMemory(MemoryEventType.RESOURCE_FOUND, { x: 200, y: 200 }, 40);
        
        // Add some energy memories
        memory.addEnergyMemory(MemoryEventType.ENERGY_DEPLETED, { x: 300, y: 300 }, 0);
        memory.addEnergyMemory(MemoryEventType.ENERGY_DEPLETED, { x: 400, y: 400 }, 0);
        break;
        
      case 997: // Missing memories scenario
        // No memories added to test exploration adjustment
        break;
    }
    
    // Update memory's internal time
    memory.updateTime(100);
  }
  
  /**
   * Get the test results
   */
  public getTestResults(): InferenceTestResult[] {
    return this.testResults;
  }
  
  /**
   * Get the success rate of the tests
   */
  public getSuccessRate(): number {
    if (this.testResults.length === 0) return 0;
    
    const successfulTests = this.testResults.filter(result => result.success).length;
    return successfulTests / this.testResults.length;
  }
  
  /**
   * Get a summary of the test results
   */
  public getTestSummary(): string {
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(result => result.success).length;
    const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;
    
    let summary = `Inference Quality Test Results:\n`;
    summary += `Total tests: ${totalTests}\n`;
    summary += `Successful tests: ${successfulTests}\n`;
    summary += `Success rate: ${successRate.toFixed(2)}%\n\n`;
    
    // Add details for each test
    this.testResults.forEach((result, index) => {
      summary += `Test ${index + 1}: ${result.testCase.testDescription}\n`;
      summary += `  Outcome: ${result.success ? 'PASSED' : 'FAILED'}\n`;
      if (result.failedExpectations.length > 0) {
        summary += `  Failed expectations: ${result.failedExpectations.join(', ')}\n`;
      }
      summary += `  Parameter changes: ${Object.keys(result.updatedParameters).join(', ')}\n`;
      summary += `  Reasoning: ${result.reasoning.substring(0, 100)}...\n\n`;
    });
    
    // Add system metrics
    const metrics = this.inferenceSystem.getInferenceQualityMetrics();
    summary += `System Metrics:\n`;
    summary += `  Total inferences: ${metrics.totalInferences}\n`;
    summary += `  Successful inferences: ${metrics.successfulInferences}\n`;
    summary += `  Failed inferences: ${metrics.failedInferences}\n`;
    summary += `  Average response time: ${metrics.averageResponseTime.toFixed(2)}ms\n`;
    
    return summary;
  }
}