// filepath: /workspaces/codespaces-blank/src/entities/sparkling/sparklingRenderer.ts
import { SparklingCore } from "./sparklingCore";
import { Position, SparklingState, InferenceStatus } from "../sparklingTypes";
import { MemoryEventType, InferenceMemoryEntry } from "../memoryTypes";

/**
 * Handles rendering of Sparkling entities
 */
export class SparklingRenderer {
  private sparklingCore: SparklingCore;
  
  constructor(sparklingCore: SparklingCore) {
    this.sparklingCore = sparklingCore;
  }
  
  /**
   * Render the Sparkling on the canvas
   */
  public render(context: CanvasRenderingContext2D, debug: boolean = false): void {
    const core = this.sparklingCore as any;
    
    // If this Sparkling is newly spawned, render spawn animation
    if (core.isNewlySpawned) {
      this.renderSpawnAnimation(context);
      
      // Clear the newly spawned flag after a short time
      if (!core.spawnAnimationTimer) {
        core.spawnAnimationTimer = 0;
      } else {
        core.spawnAnimationTimer += 0.016; // Approximate for one frame at 60 FPS
        if (core.spawnAnimationTimer > 2) { // 2 seconds for the animation
          core.isNewlySpawned = false;
          core.spawnAnimationTimer = 0;
        }
      }
    }
    
    // If the Sparkling is fading out, render with appropriate opacity
    if (core.isFadingOut) {
      this.renderFadingOut(context, debug);
      return;
    }
    
    // Regular rendering for normal Sparklings
    this.renderNormal(context, debug);
  }
  
  /**
   * Render spawn animation for newly spawned Sparklings
   */
  private renderSpawnAnimation(context: CanvasRenderingContext2D): void {
    const core = this.sparklingCore as any;
    const position = core.position;
    
    // Get animation progress from 0 to 1
    const animProgress = Math.min(1, core.spawnAnimationTimer / 2);
    
    // Calculate size that grows from 0 to full size
    const targetSize = 10 + (core.food / core.stats.maxFood) * 5;
    const currentSize = targetSize * animProgress;
    
    // Opacity that increases during animation
    const opacity = 0.3 + 0.7 * animProgress;
    
    // Draw expanding rings
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringProgress = Math.max(0, Math.min(1, (animProgress * 2) - (i * 0.3)));
      if (ringProgress <= 0) continue;
      
      const ringSize = currentSize + (targetSize * 2 * ringProgress);
      const ringOpacity = 0.7 * (1 - ringProgress) * opacity;
      
      context.beginPath();
      context.arc(position.x, position.y, ringSize, 0, Math.PI * 2);
      context.fillStyle = `rgba(${parseInt(core.color.substr(1, 2), 16)}, ${parseInt(core.color.substr(3, 2), 16)}, ${parseInt(core.color.substr(5, 2), 16)}, ${ringOpacity})`;
      context.fill();
    }
    
    // Draw main body with growing size
    context.beginPath();
    context.arc(position.x, position.y, currentSize, 0, Math.PI * 2);
    context.fillStyle = `rgba(${parseInt(core.color.substr(1, 2), 16)}, ${parseInt(core.color.substr(3, 2), 16)}, ${parseInt(core.color.substr(5, 2), 16)}, ${opacity})`;
    context.fill();
    
    // Draw sparkles
    const sparkleCount = 8;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / sparkleCount) * Math.PI * 2;
      const sparkleProgress = Math.min(1, animProgress * 2);
      const distance = targetSize * 3 * sparkleProgress;
      
      const sparkleX = position.x + Math.cos(angle) * distance;
      const sparkleY = position.y + Math.sin(angle) * distance;
      const sparkleSize = 2 * (1 - sparkleProgress);
      
      context.beginPath();
      context.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 255, 255, 0.7)';
      context.fill();
    }
    
    // Draw "New" text above the Sparkling
    if (animProgress > 0.3) {
      const textOpacity = Math.min(1, (animProgress - 0.3) * 2);
      context.font = '10px Arial';
      context.fillStyle = `rgba(255, 255, 255, ${textOpacity})`;
      context.textAlign = 'center';
      context.fillText('New', position.x, position.y - targetSize - 10);
    }
  }
  
  /**
   * Render Sparkling that is fading out
   */
  private renderFadingOut(context: CanvasRenderingContext2D, debug: boolean = false): void {
    const core = this.sparklingCore as any;
    const position = core.position;
    
    // Calculate the body size based on food level
    const bodySize = 10 + (core.food / core.stats.maxFood) * 5;
    
    // Calculate opacity based on fadeout progress
    const opacity = Math.max(0, 1 - core.fadeoutProgress);
    
    // Draw the main body with reduced opacity
    context.fillStyle = `rgba(${parseInt(core.color.substr(1, 2), 16)}, ${parseInt(core.color.substr(3, 2), 16)}, ${parseInt(core.color.substr(5, 2), 16)}, ${opacity})`;
    context.beginPath();
    context.arc(position.x, position.y, bodySize, 0, Math.PI * 2);
    context.fill();
    
    // Draw a glow effect that expands as the Sparkling fades out
    const glowSize = bodySize + (10 * core.fadeoutProgress);
    context.fillStyle = `rgba(${parseInt(core.color.substr(1, 2), 16)}, ${parseInt(core.color.substr(3, 2), 16)}, ${parseInt(core.color.substr(5, 2), 16)}, ${0.2 * opacity})`;
    context.beginPath();
    context.arc(position.x, position.y, glowSize, 0, Math.PI * 2);
    context.fill();
    
    // Draw dissipating particles
    const particleCount = Math.floor(10 * core.fadeoutProgress);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = bodySize + (Math.random() * 20 * core.fadeoutProgress);
      
      const particleX = position.x + Math.cos(angle) * distance;
      const particleY = position.y + Math.sin(angle) * distance;
      const particleSize = 1 + Math.random() * 2;
      
      context.beginPath();
      context.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
      context.fillStyle = `rgba(${parseInt(core.color.substr(1, 2), 16)}, ${parseInt(core.color.substr(3, 2), 16)}, ${parseInt(core.color.substr(5, 2), 16)}, ${0.5 * opacity})`;
      context.fill();
    }
    
    // Draw "Fading" text
    if (debug) {
      context.font = '10px Arial';
      context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      context.textAlign = 'center';
      context.fillText('Fading', position.x, position.y - bodySize - 5);
    }
  }
  
  /**
   * Render normal (non-fading) Sparkling
   */
  private renderNormal(context: CanvasRenderingContext2D, debug: boolean = false): void {
    const core = this.sparklingCore as any;
    const position = core.position;
    
    // Calculate the body size based on food level
    const bodySize = 10 + (core.food / core.stats.maxFood) * 5;
    const foodRatio = core.food / core.stats.maxFood;
    
    // Determine body color based on food level - add pulsing effect for low food
    let bodyColor = core.color;
    if (foodRatio < core.parameters.criticalHungerThreshold) {
      // Critical hunger - pulsing red tint
      const pulseIntensity = 0.4 + 0.3 * Math.sin(core.totalTime * 4);
      bodyColor = this.blendColors(core.color, `rgba(255, 50, 0, ${pulseIntensity})`);
    } else if (foodRatio < core.parameters.hungerThreshold) {
      // Low food - slight yellow tint
      bodyColor = this.blendColors(core.color, 'rgba(255, 200, 0, 0.3)');
    }
    
    // Draw the main body
    context.fillStyle = bodyColor;
    context.beginPath();
    context.arc(position.x, position.y, bodySize, 0, Math.PI * 2);
    context.fill();
    
    // Draw a glow effect for neural energy level
    const energyRatio = core.neuralEnergy / core.stats.maxNeuralEnergy;
    if (energyRatio > 0) {
      // Calculate the size of the energy glow
      const glowSize = bodySize + 5 * energyRatio;
      
      // Use more intense glow during inference
      let glowOpacity = 0.3 * energyRatio;
      let glowColor = `rgba(150, 50, 200, ${glowOpacity})`;
      
      // Modify the glow based on inference status
      if (core.inferenceStatus !== "IDLE") {
        // Pulsing effect during inference
        const pulseRate = core.inferenceStatus === "THINKING" ? 4 : 2;
        const pulseIntensity = 0.5 + 0.5 * Math.sin(core.totalTime * pulseRate);
        
        glowOpacity = 0.4 * energyRatio * pulseIntensity;
        glowColor = `rgba(180, 70, 220, ${glowOpacity})`;
      }
      
      context.fillStyle = glowColor;
      context.beginPath();
      context.arc(position.x, position.y, glowSize, 0, Math.PI * 2);
      context.fill();
      
      // Draw secondary outer glow for high neural energy
      if (energyRatio > 0.7 || core.inferenceStatus !== "IDLE") {
        const outerGlowSize = glowSize + 4;
        const outerOpacity = core.inferenceStatus !== "IDLE" ? 
                            0.2 * (0.7 + 0.3 * Math.sin(core.totalTime * 5)) :
                            0.1 * energyRatio;
        
        context.fillStyle = `rgba(160, 60, 220, ${outerOpacity})`;
        context.beginPath();
        context.arc(position.x, position.y, outerGlowSize, 0, Math.PI * 2);
        context.fill();
      }
      
      // Draw "ready for inference" indicator when close to threshold
      if (energyRatio >= 0.6 && energyRatio < core.parameters.inferenceThreshold / core.stats.maxNeuralEnergy && 
          core.inferenceStatus === "IDLE" && 
          core.totalTime - core.lastInferenceTime >= core.parameters.inferenceInterval) {
        // Draw a dotted circle to indicate approaching inference threshold
        const readyGlowSize = glowSize + 6;
        context.strokeStyle = `rgba(180, 100, 240, ${0.3 + 0.2 * Math.sin(core.totalTime * 3)})`;
        context.setLineDash([3, 3]);
        context.beginPath();
        context.arc(position.x, position.y, readyGlowSize, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
        
        // Show percentage to threshold
        if (debug) {
          const percentToThreshold = (core.neuralEnergy / core.parameters.inferenceThreshold * 100).toFixed(0);
          context.fillStyle = 'rgba(180, 100, 240, 0.9)';
          context.font = '8px Arial';
          context.textAlign = 'center';
          context.fillText(
            `${percentToThreshold}%`,
            position.x,
            position.y - bodySize - 20
          );
        }
      }
    }
    
    // Draw food level indicators - always visible 
    const foodBarWidth = 24;
    const foodBarHeight = 3;
    const foodBarX = position.x - foodBarWidth / 2;
    const foodBarY = position.y + bodySize + 5;
    
    // Food bar background
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(foodBarX, foodBarY, foodBarWidth, foodBarHeight);
    
    // Food level with color based on level
    let foodBarColor;
    if (foodRatio < core.parameters.criticalHungerThreshold) {
      // Critical - red with enhanced pulsing effect for the entire bar
      const pulseIntensity = 0.7 + 0.3 * Math.sin(core.totalTime * 4);
      foodBarColor = `rgba(255, 50, 0, ${pulseIntensity})`;
      
      // Add a pulsing outline around the entire food bar for critical state
      const outlinePulse = 0.5 + 0.5 * Math.sin(core.totalTime * 5);
      context.strokeStyle = `rgba(255, 0, 0, ${outlinePulse})`;
      context.lineWidth = 1.5;
      context.strokeRect(foodBarX - 1, foodBarY - 1, foodBarWidth + 2, foodBarHeight + 2);
      context.lineWidth = 1;
    } else if (foodRatio < core.parameters.hungerThreshold) {
      // Low - yellow/orange
      foodBarColor = 'rgba(255, 150, 0, 0.8)';
    } else if (foodRatio > core.parameters.foodSatiationThreshold) {
      // High - green
      foodBarColor = 'rgba(76, 175, 80, 0.8)';
    } else {
      // Normal - gold
      foodBarColor = 'rgba(255, 215, 0, 0.8)';
    }
    
    context.fillStyle = foodBarColor;
    context.fillRect(foodBarX, foodBarY, foodBarWidth * foodRatio, foodBarHeight);
    
    // Draw threshold markers
    // Critical threshold
    let thresholdX = foodBarX + (core.parameters.criticalHungerThreshold) * foodBarWidth;
    context.strokeStyle = 'rgba(255, 50, 0, 0.7)';
    context.beginPath();
    context.moveTo(thresholdX, foodBarY - 1);
    context.lineTo(thresholdX, foodBarY + foodBarHeight + 1);
    context.stroke();
    
    // Hunger threshold
    thresholdX = foodBarX + (core.parameters.hungerThreshold) * foodBarWidth;
    context.strokeStyle = 'rgba(255, 150, 0, 0.7)';
    context.beginPath();
    context.moveTo(thresholdX, foodBarY - 1);
    context.lineTo(thresholdX, foodBarY + foodBarHeight + 1);
    context.stroke();
    
    // Show food percentage when low or in debug mode
    if (foodRatio < core.parameters.hungerThreshold || debug) {
      context.fillStyle = foodRatio < core.parameters.criticalHungerThreshold ? 
                          'rgba(255, 100, 100, 0.9)' : 'rgba(255, 255, 255, 0.9)';
      context.font = '7px Arial';
      context.textAlign = 'center';
      context.fillText(
        `${(foodRatio * 100).toFixed(0)}%`,
        foodBarX + foodBarWidth / 2,
        foodBarY + foodBarHeight + 7
      );
    }
    
    // Draw inference status indicator if actively inferring
    if (core.inferenceStatus !== "IDLE") {
      // Draw thinking animation
      const statusText = this.getInferenceStatusText(core.inferenceStatus);
      const dotsCount = Math.floor((core.inferenceTimer * 2) % 4);
      const dots = '.'.repeat(dotsCount);
      
      context.fillStyle = 'rgba(255, 255, 255, 0.9)';
      context.font = '8px Arial';
      context.textAlign = 'center';
      context.fillText(
        `${statusText}${dots}`, 
        position.x, 
        position.y - bodySize - 10
      );
    } else {
      // Draw "Inference Ready" text when at or above threshold
      if (energyRatio >= core.parameters.inferenceThreshold / core.stats.maxNeuralEnergy && 
          core.totalTime - core.lastInferenceTime >= core.parameters.inferenceInterval) {
        context.fillStyle = 'rgba(180, 100, 240, 0.9)';
        context.font = '8px Arial';
        context.textAlign = 'center';
        context.fillText(
          'inference ready', 
          position.x, 
          position.y - bodySize - 10
        );
      } else {
        // Draw regular state label when not inferring
        context.fillStyle = 'white';
        context.font = '8px Arial';
        context.textAlign = 'center';
        context.fillText(
          this.getStateLabel(core.state), 
          position.x, 
          position.y - bodySize - 10
        );
      }
    }
    
    // Draw territory and home indicators if debug is enabled
    if (debug) {
      // Draw territory circle if territory is defined
      if (core.territoryCenter) {
        context.strokeStyle = `rgba(${parseInt(core.color.substr(1, 2), 16)}, ${parseInt(core.color.substr(3, 2), 16)}, ${parseInt(core.color.substr(5, 2), 16)}, 0.3)`;
        context.setLineDash([2, 2]);
        context.beginPath();
        context.arc(core.territoryCenter.x, core.territoryCenter.y, core.territoryRadius, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
      }
      
      // Draw home point marker
      if (core.homePosition) {
        context.strokeStyle = `rgba(${parseInt(core.color.substr(1, 2), 16)}, ${parseInt(core.color.substr(3, 2), 16)}, ${parseInt(core.color.substr(5, 2), 16)}, 0.3)`;
        context.setLineDash([2, 2]);
        context.beginPath();
        context.moveTo(position.x, position.y);
        context.lineTo(core.homePosition.x, core.homePosition.y);
        context.stroke();
        context.setLineDash([]);
        
        // Draw a little house/home symbol
        context.fillStyle = core.color;
        context.beginPath();
        context.arc(core.homePosition.x, core.homePosition.y, 3, 0, Math.PI * 2);
        context.fill();
      }
      
      // If there's a target position, draw a line to it
      if (core.targetPosition) {
        context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        context.setLineDash([2, 2]);
        context.beginPath();
        context.moveTo(position.x, position.y);
        context.lineTo(core.targetPosition.x, core.targetPosition.y);
        context.stroke();
        context.setLineDash([]);
        
        // Draw a target marker
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.beginPath();
        context.arc(core.targetPosition.x, core.targetPosition.y, 3, 0, Math.PI * 2);
        context.stroke();
      }
    }
    
    // If in debug mode, draw additional debug information
    if (debug) {
      this.renderDebugInfo(context);
    }
  }
  
  /**
   * Helper method to blend two colors for visual effects
   */
  private blendColors(color1: string, color2: string): string {
    // Simple implementation for hex or rgba colors
    if (color2.startsWith('rgba')) {
      // Extract alpha from rgba color
      const match = color2.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
      if (match) {
        const r2 = parseInt(match[1], 10);
        const g2 = parseInt(match[2], 10);
        const b2 = parseInt(match[3], 10);
        const a2 = parseFloat(match[4]);
        
        // Extract rgb from first color (hex or rgb)
        const parsed = this.parseColor(color1);
        const r1 = parsed.r;
        const g1 = parsed.g;
        const b1 = parsed.b;
        
        // Blend colors
        const r = Math.round(r1 * (1 - a2) + r2 * a2);
        const g = Math.round(g1 * (1 - a2) + g2 * a2);
        const b = Math.round(b1 * (1 - a2) + b2 * a2);
        
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
    
    return color1; // Fallback
  }
  
  /**
   * Helper to parse color string into RGB values
   */
  private parseColor(color: string): { r: number, g: number, b: number } {
    if (color.startsWith('#')) {
      const r = parseInt(color.substr(1, 2), 16);
      const g = parseInt(color.substr(3, 2), 16);
      const b = parseInt(color.substr(5, 2), 16);
      return { r, g, b };
    } else if (color.startsWith('rgb')) {
      const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
      if (match) {
        return {
          r: parseInt(match[1], 10),
          g: parseInt(match[2], 10),
          b: parseInt(match[3], 10)
        };
      }
    } else if (color.startsWith('hsl')) {
      // Convert HSL to RGB
      const match = color.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
      if (match) {
        const h = parseInt(match[1], 10) / 360;
        const s = parseInt(match[2], 10) / 100;
        const l = parseInt(match[3], 10) / 100;
        
        // Convert HSL to RGB
        let r, g, b;
        
        if (s === 0) {
          r = g = b = l; // achromatic
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
          r: Math.round(r * 255),
          g: Math.round(g * 255),
          b: Math.round(b * 255)
        };
      }
    }
    
    return { r: 255, g: 255, b: 255 }; // Default to white if parsing fails
  }
  
  /**
   * Get text description for the current inference status
   */
  private getInferenceStatusText(status: InferenceStatus): string {
    switch (status) {
      case InferenceStatus.PREPARING: return "preparing";
      case InferenceStatus.THINKING: return "thinking";
      case InferenceStatus.PROCESSING: return "processing";
      default: return "";
    }
  }
  
  /**
   * Get a label for the current state
   */
  private getStateLabel(state: SparklingState): string {
    switch (state) {
      case SparklingState.IDLE: return "idle";
      case SparklingState.EXPLORING: return "exploring";
      case SparklingState.SEEKING_FOOD: return "hungry";
      case SparklingState.SEEKING_ENERGY: return "low energy";
      case SparklingState.COLLECTING: return "collecting";
      case SparklingState.RESTING: return "resting";
      case SparklingState.COMPETING: return "competing";
      default: return "";
    }
  }
  
  /**
   * Wrap text to multiple lines for rendering
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      // Simple width estimate
      const testWidth = testLine.length * 4; // Approximate width per character
      
      if (testWidth > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.slice(0, 3); // Limit to 3 lines
  }
  
  /**
   * Render visual indicators for key parameters
   */
  private renderParameterIndicators(
    context: CanvasRenderingContext2D,
    position: Position,
    parameters: any
  ): void {
    const x = position.x;
    const y = position.y + 20;
    const spacing = 5;
    const width = 30;
    const height = 3;
    
    // Helper for drawing parameter bars
    const drawBar = (yOffset: number, value: number, color: string) => {
      context.fillStyle = 'rgba(0, 0, 0, 0.5)';
      context.fillRect(x - width/2, y + yOffset, width, height);
      
      context.fillStyle = color;
      context.fillRect(x - width/2, y + yOffset, width * Math.max(0, Math.min(1, value)), height);
    };
    
    // Draw key parameter indicators
    drawBar(0, parameters.resourcePreference * 0.5 + 0.5, 'rgba(156, 39, 176, 0.7)'); // Energy vs food preference
    drawBar(spacing, parameters.cooperationTendency * 0.5 + 0.5, 'rgba(76, 175, 80, 0.7)'); // Cooperation tendency
    drawBar(spacing * 2, parameters.noveltyPreference, 'rgba(33, 150, 243, 0.7)'); // Novelty preference
    drawBar(spacing * 3, parameters.memoryTrustFactor, 'rgba(255, 152, 0, 0.7)'); // Memory trust
  }
  
  /**
   * Render the Sparkling's memory
   */
  private renderMemory(
    context: CanvasRenderingContext2D,
    position: Position,
    memory: any,
    color: string,
    totalTime: number
  ): void {
    const memories = memory.getAllMemories();
    
    // Only draw connections to the most important memories
    if (memories.length > 0) {
      // Sort memories by importance (high to low)
      const sortedMemories = [...memories].sort((a, b) => b.importance - a.importance);
      
      // Get important food and energy memories (only the top ones)
      const importantFoodMemories = sortedMemories
        .filter((m: any) => m.type === MemoryEventType.RESOURCE_FOUND)
        .slice(0, 3); // Show only top 3 food memories
        
      const importantEnergyMemories = sortedMemories
        .filter((m: any) => m.type === MemoryEventType.ENERGY_FOUND)
        .slice(0, 2); // Show only top 2 energy memories
        
      // Draw connections to important food memories
      if (importantFoodMemories.length > 0) {
        context.strokeStyle = 'rgba(255, 150, 0, 0.4)'; // Orange for food
        context.beginPath();
        context.moveTo(position.x, position.y);
        
        importantFoodMemories.forEach((memory: any) => {
          context.lineTo(memory.position.x, memory.position.y);
          context.moveTo(position.x, position.y); // Move back to start for next line
        });
        
        context.stroke();
      }
      
      // Draw connections to important energy memories
      if (importantEnergyMemories.length > 0) {
        context.strokeStyle = 'rgba(156, 39, 176, 0.4)'; // Purple for energy
        context.beginPath();
        context.moveTo(position.x, position.y);
        
        importantEnergyMemories.forEach((memory: any) => {
          context.lineTo(memory.position.x, memory.position.y);
          context.moveTo(position.x, position.y); // Move back to start for next line
        });
        
        context.stroke();
      }
    }
    
    // Draw symbols for each type of memory - only show the important ones
    const importantMemories = memories.filter((m: any) => 
      (m.type === MemoryEventType.RESOURCE_FOUND && m.importance > 0.6) || 
      (m.type === MemoryEventType.ENERGY_FOUND && m.importance > 0.6) ||
      m.type === MemoryEventType.INFERENCE_PERFORMED
    );
    
    for (const memory of importantMemories) {
      let symbol = '';
      let color = 'white';
      
      switch (memory.type) {
        case MemoryEventType.RESOURCE_FOUND:
          symbol = '🍎';
          color = 'rgba(255, 215, 0, 0.7)';
          break;
        case MemoryEventType.RESOURCE_DEPLETED:
          symbol = '✘';
          color = 'rgba(255, 150, 0, 0.4)';
          break;
        case MemoryEventType.ENERGY_FOUND:
          symbol = '⚡';
          color = 'rgba(156, 39, 176, 0.7)';
          break;
        case MemoryEventType.ENERGY_DEPLETED:
          symbol = '✘';
          color = 'rgba(156, 39, 176, 0.4)';
          break;
        case MemoryEventType.TERRAIN_DISCOVERED:
          symbol = '⬢';
          color = 'rgba(76, 175, 80, 0.5)';
          break;
        case MemoryEventType.SPARKLING_ENCOUNTER:
          symbol = '👁️';
          color = 'rgba(233, 30, 99, 0.7)';
          break;
        case MemoryEventType.INFERENCE_PERFORMED:
          symbol = '🧠';
          color = 'rgba(33, 150, 243, 0.7)';
          break;
      }
      
      // Draw small dot for the memory
      context.fillStyle = color;
      context.beginPath();
      context.arc(memory.position.x, memory.position.y, 2, 0, Math.PI * 2);
      context.fill();
      
      // Draw symbol or emoji for the memory type
      if (symbol) {
        context.font = '8px Arial';
        context.fillText(symbol, memory.position.x, memory.position.y - 5);
      }
      
      // For inference memories, draw a special indicator
      if (memory.type === MemoryEventType.INFERENCE_PERFORMED) {
        const inferenceMemory = memory as InferenceMemoryEntry;
        
        // Draw a larger glow for inference locations
        const glowSize = inferenceMemory.success ? 8 : 5;
        context.fillStyle = `rgba(33, 150, 243, ${inferenceMemory.success ? 0.3 : 0.15})`;
        context.beginPath();
        context.arc(memory.position.x, memory.position.y, glowSize, 0, Math.PI * 2);
        context.fill();
        
        // Draw a small label for successful inferences
        if (inferenceMemory.success) {
          context.fillStyle = 'rgba(255, 255, 255, 0.7)';
          context.font = '6px Arial';
          context.fillText('inference', memory.position.x, memory.position.y + 8);
        }
      }
    }
  }
  
  /**
   * Render debug information for the Sparkling
   */
  private renderDebugInfo(context: CanvasRenderingContext2D): void {
    const core = this.sparklingCore as any;
    const position = core.position;
    
    // Draw ID
    context.fillStyle = 'white';
    context.font = '10px Arial';
    context.textAlign = 'center';
    context.fillText(
      `#${core.id}`, 
      position.x, 
      position.y - 25
    );
    
    // Draw memory connections
    this.renderMemory(
      context,
      position,
      core.memory,
      core.color,
      core.totalTime
    );
    
    // Draw parameter indicators
    this.renderParameterIndicators(
      context,
      position,
      core.parameters
    );
    
    // Draw profile type
    context.fillStyle = 'rgba(255, 255, 255, 0.7)';
    context.font = '7px Arial';
    context.textAlign = 'center';
    context.fillText(
      core.profile,
      position.x,
      position.y - 35
    );
  }
}