/**
 * Time utilities for the simulation
 */

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

    // Calculate delta time in seconds
    this.deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    
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
   * Reset the time manager
   */
  public reset(): void {
    this.lastTimestamp = 0;
    this.deltaTime = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.accumulatedTime = 0;
  }
}