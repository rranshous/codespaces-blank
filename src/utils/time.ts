/**
 * Time utilities for the simulation
 */

/**
 * Available simulation speed multipliers
 */
export enum SimulationSpeed {
  NORMAL = 1,
  DOUBLE = 2,
  FAST = 5,
  ULTRA = 10
}

/**
 * A class to handle time tracking and delta time calculation
 */
export class TimeManager {
  private lastTimestamp: number = 0;
  private deltaTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 1000; // Update FPS once per second
  private lastFpsUpdate: number = 0;
  private accumulatedTime: number = 0;
  private speedMultiplier: SimulationSpeed = SimulationSpeed.NORMAL;
  private frameSkipThreshold: number = 0.1; // If deltaTime exceeds this, we'll skip frames

  /**
   * Updates time values based on the current timestamp
   * @param timestamp Current timestamp from requestAnimationFrame
   */
  public update(timestamp: number): void {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      this.lastFpsUpdate = timestamp;
      return;
    }

    // Calculate base delta time in seconds
    const baseDeltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    
    // Apply speed multiplier to the delta time
    this.deltaTime = baseDeltaTime * this.speedMultiplier;
    
    // Update accumulated time
    this.accumulatedTime += this.deltaTime;

    // Update FPS calculation
    this.frameCount++;
    if (timestamp - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.fps = this.frameCount * 1000 / (timestamp - this.lastFpsUpdate);
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
    }
  }

  /**
   * Get the time elapsed since the last frame in seconds
   */
  public getDeltaTime(): number {
    return this.deltaTime;
  }

  /**
   * Get the current calculated FPS
   */
  public getFPS(): number {
    return this.fps;
  }

  /**
   * Get the current simulation time
   */
  public getCurrentTime(): number {
    return this.accumulatedTime;
  }

  /**
   * Get the current speed multiplier
   */
  public getSpeedMultiplier(): SimulationSpeed {
    return this.speedMultiplier;
  }

  /**
   * Set the simulation speed multiplier
   * @param speed The speed multiplier to set
   */
  public setSpeedMultiplier(speed: SimulationSpeed): void {
    this.speedMultiplier = speed;
  }

  /**
   * Check if frame skipping should be applied based on current multiplier
   * Higher speed multipliers may benefit from skipping rendering frames
   */
  public shouldSkipFrame(): boolean {
    // Only consider skipping frames at the FAST or ULTRA speeds
    if (this.speedMultiplier < SimulationSpeed.FAST) {
      return false;
    }
    
    // For high speeds, implement a simple frame skipping algorithm
    // In ULTRA mode, render only 1 in every 3 frames
    if (this.speedMultiplier === SimulationSpeed.ULTRA) {
      return (this.frameCount % 3) !== 0;
    }
    
    // In FAST mode, render every other frame
    if (this.speedMultiplier === SimulationSpeed.FAST) {
      return (this.frameCount % 2) !== 0;
    }
    
    return false;
  }

  /**
   * Reset the time manager
   */
  public reset(): void {
    this.lastTimestamp = 0;
    this.deltaTime = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.accumulatedTime = 0;
    // Don't reset speedMultiplier to preserve user's preference
  }
}