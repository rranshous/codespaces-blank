# SIMULATION_FEATURES

This document provides a comprehensive technical description of the currently implemented features in the Sparklings Neural Energy Simulation as of April 19, 2025.

## Simulation Overview

The Sparklings Neural Energy Simulation is a technical implementation of an artificial life ecosystem that models autonomous agents (Sparklings) operating in a resource-constrained environment. The simulation demonstrates emergent behavior through the combination of deterministic rules, probabilistic elements, parameter-driven decision making, and neural-network-augmented reasoning.

At runtime, the simulation engine orchestrates the following processes:

1. **Initialization Phase**: The system generates a heterogeneous 2D world with distinct terrain types, spawns resources according to terrain-specific algorithms, and creates Sparkling entities with individualized parameter profiles.

2. **Simulation Loop**: For each time step, the engine:
   - Updates world state (resource regeneration, environmental conditions)
   - Processes each Sparkling's sensory input (resource detection, entity detection)
   - Updates each Sparkling's internal state (food/energy levels, memory management)
   - Determines state transitions for each Sparkling based on internal conditions and decision parameters
   - Calculates and applies movement, collection, and interaction outcomes
   - Processes competitions and territory claims
   - Triggers inference events when neural energy thresholds are reached
   - Updates visualization components

3. **Inference Processing**: When a Sparkling accumulates sufficient neural energy, the system:
   - Constructs a comprehensive context from the Sparkling's state, memory, and parameters
   - Generates a prompt for the AI reasoning system
   - Processes the AI response to extract parameter adjustments and reasoning
   - Applies parameter changes and stores reasoning data
   - Depletes neural energy according to inference cost

4. **Interaction Resolution**: When Sparklings interact (especially during competition):
   - Detection thresholds and awareness checks are calculated
   - Competition triggers are evaluated (proximity, resource contention, territory overlap)
   - Competition outcomes are determined through parameter-weighted probabilistic calculations
   - Winners gain advantages while losers experience temporary penalties
   - Interaction data is recorded in Sparklings' memories
   - Visual indicators reflect interaction types and outcomes

This system demonstrates complex emergent behavior patterns arising from seemingly simple rules and parameters. Sparklings with different parameter profiles develop distinct "personalities" and strategies for resource acquisition and territory management. The neural-augmented reasoning allows Sparklings to adapt their parameters over time, leading to evolutionary-like optimization of behavior for their specific environmental niche.

## Core Simulation Engine

### World System
- 2D grid-based world with configurable dimensions
- Four distinct terrain types: PLAINS, MOUNTAINS, FOREST, and DESERT
- Each terrain type has unique properties:
  - Movement cost multiplier (affects Sparkling travel speed)
  - Resource multiplier (affects food spawn rate)
  - Neural energy multiplier (affects neural energy spawn rate)
  - Visual representation (color-coded)
- Procedural terrain generation using noise algorithms
- Configurable cell size and grid visualization
- Resource system with separate handling for food and neural energy
- Dynamic resource regeneration based on terrain type and time

### Time System
- Discrete time steps for simulation progression
- Delta time handling for consistent simulation speed regardless of frame rate
- Configurable simulation speed
- Simulation time tracking (minutes/seconds)
- Pause/resume functionality

### Resource Management
- Food and neural energy as distinct resource types
- Resource values stored per grid cell
- Dynamic resource spawning based on terrain types
- Resource depletion when collected by Sparklings
- Gradual resource regeneration over time
- Visual representation with size indicating quantity

## Sparklings

### Core Attributes
- Position and movement in continuous 2D space
- Food storage with configurable maximum capacity
- Neural energy storage with configurable maximum capacity
- Size visualization based on food/energy levels
- Unique identifier and visual differentiation
- State machine for behavior management
- Movement with variable speed based on terrain
- Collision detection with world boundaries

### State System
- Seven distinct states: IDLE, EXPLORING, SEEKING_FOOD, SEEKING_ENERGY, COLLECTING, RESTING, COMPETING
- State transitions based on:
  - Current food and energy levels
  - Memory of resource locations
  - Nearby resource detection
  - Interaction with other Sparklings
  - Time spent in current state
  - Decision parameters
- Each state has specific behavior patterns and visual indicators
- State duration tracking with configurable minimum durations

### Sensory System
- Configurable sensor radius for detecting:
  - Nearby resources
  - Other Sparklings
  - Terrain features
- Field of view considerations
- Sensor effectiveness modifiers based on state
- Probability-based detection to simulate imperfect sensing

### Territory System
- Territory establishment in resource-rich areas
- Territory represented as a circular area with configurable radius
- Territory radius influenced by behavioral parameters (personal space preference, cooperation tendency)
- Territory visibility during specific states (COLLECTING, COMPETING, RESTING)
- Territory abandonment when moving far from center
- Visual representation as translucent circle matching Sparkling color

## Memory and Intelligence

### Memory System
- FIFO (First-In-First-Out) memory structure with configurable capacity
- Memory entries for:
  - Resource locations (food and neural energy)
  - Encounters with other Sparklings
  - Significant events
- Memory prioritization based on:
  - Resource quantity
  - Resource type preference
  - Recency
  - Custom importance factors
- Memory decay over time
- Duplicate detection to consolidate similar memories
- Separate importance multipliers for food and energy memories
- Memory pruning when capacity exceeded

### Decision Parameter System
- 16 configurable behavioral parameters:
  - resourcePreference: preference for food vs. neural energy (-1.0 to 1.0)
  - explorationTendency: preference for exploring vs. exploiting (0.0 to 1.0)
  - foodCollectionEfficiency: efficiency in collecting food (0.1 to 1.0)
  - energyCollectionEfficiency: efficiency in collecting neural energy (0.1 to 1.0)
  - movementEfficiency: efficiency in movement (0.1 to 1.0)
  - foodSatiationThreshold: food level considered satisfactory (0.4 to 0.9)
  - energySatiationThreshold: energy level considered satisfactory (0.4 to 0.9)
  - foodUrgencyThreshold: food level considered critically low (0.1 to 0.4)
  - energyUrgencyThreshold: energy level considered critically low (0.1 to 0.4)
  - inferenceThreshold: neural energy threshold for inference (0.3 to 0.9)
  - cooperationTendency: tendency to cooperate vs. compete (0.0 to 1.0)
  - personalSpacePreference: preferred distance from others (5.0 to 50.0)
  - foodMemoryImportance: importance of food memories (0.5 to 2.0)
  - energyMemoryImportance: importance of energy memories (0.5 to 2.0)
  - restingThreshold: threshold for entering resting state (0.0 to 0.5)
  - exploitationEfficiency: efficiency in exploiting known resources (0.1 to 1.0)
- Parameter influence on all decision-making processes
- Parameter constraints and validation
- Preset behavioral profiles:
  - BALANCED: Neutral parameters
  - EXPLORER: High exploration, average collection
  - GATHERER: High food collection, lower exploration
  - ENERGY_SEEKER: Focused on neural energy
  - EFFICIENT: Optimized for efficiency in all actions
  - COOPERATIVE: High cooperation, modest personal space
  - TERRITORIAL: Low cooperation, large personal space
- Dynamic parameter adjustment through inference

### Neural Energy System
- Neural energy collection from environment
- Energy consumption for basic functions
- Energy storage with maximum capacity
- Energy depletion rates configurable per state
- Energy threshold for triggering inference
- Visual representation of energy levels
- Energy as "currency" for advanced reasoning

### Inference System
- AI-powered reasoning triggered by neural energy thresholds
- Prompt construction from:
  - Current state
  - Memory contents
  - Behavioral parameters
  - Environmental context
- Processing of AI responses to extract:
  - Parameter adjustments
  - Reasoning explanations
  - Action recommendations
- Validation of inference responses
- Neural energy cost for inference
- Cooldown period between inferences
- Configurable between mock (local) and real (API) inference
- Quality metrics and tracking system
- Visual indicators for inference locations
- Recent inference history storage

### API Integration
- Connection to external AI services (Anthropic Claude)
- API key management
- Request rate limiting
- Error handling and retry logic
- Response validation
- Proxy server support for secure API access
- Fallback to mock inference on API failure
- Configuration options for API endpoints and parameters

## Interaction Systems

### Competition Mechanics
- Detection of nearby Sparklings
- Competition triggers:
  - Both Sparklings in COLLECTING state near same resource
  - Distance threshold detection
  - Resource scarcity considerations
- Competition resolution based on:
  - Collection efficiency parameters
  - Cooperation tendency
  - Current food/energy levels
  - Random chance element
- Competition penalties:
  - Reduced collection efficiency for loser
  - Temporary state change to COMPETING
  - Time-based penalty duration
- Visual indicators for competition:
  - Red connecting lines
  - Crossed swords symbol
  - Animation effects

### Territorial Behavior
- Territory establishment conditions:
  - High food level (above 80% of satiation threshold)
  - Currently in COLLECTING state
  - Resource-rich area discovered
- Territory defense against other Sparklings
- Territory size calculation:
  - Base radius (configurable)
  - Modified by personal space preference
  - Modified by cooperation tendency (less cooperative = larger territory)
- Territorial advantage in competitions within own territory
- Visual representation with color-matching translucent circles
- Territory abandonment after prolonged absence

### Sparkling-to-Sparkling Interaction
- Detection range for awareness of other Sparklings
- Proximity effects on behavior
- Three interaction types:
  - Neutral encounter (basic awareness)
  - Potential competition (one collecting, one approaching)
  - Active competition (direct resource conflict)
- Visual indicators for interaction types:
  - White lines for neutral encounters
  - Yellow dashed lines with warning symbol for potential competition
  - Red lines with combat symbol for active competition
- Encounter recording in memory system
- Encounter influence on future decision-making

## Visualization Systems

### Rendering Engine
- Canvas-based rendering system
- Responsive scaling to window size
- Color-coded terrain visualization
- Resource visualization with size indicating quantity
- Sparkling visualization with:
  - Unique colors for identification
  - Size reflecting food/energy levels
  - Basic state indications
- Territory visualization with translucent circles
- Interaction visualization with colored lines and symbols
- Memory visualization (selected Sparkling only)
- Grid overlay option
- Map legend with explanation of visual elements

### UI Components
- Basic simulation control panel (start/stop)
- Sparkling selection system
- Detailed view for selected Sparkling:
  - Current state
  - Food and energy levels
  - All behavioral parameters
  - Recent memory contents
  - Territory information
- Parameter visualization with descriptive labels
- Debug panel with:
  - FPS counter
  - World information
  - Simulation time
  - Inference system status
  - API configuration status
  - Recent inferences display

### Current Debugging Features
- Basic logging system
- Parameter inspection tools
- State transition logging
- Memory inspection for selected Sparkling
- Inference quality testing
- Real-time simulation statistics

## Configuration System

### Simulation Parameters
- World dimensions
- Number of Sparklings
- Starting parameters for Sparklings
- Resource spawn rates
- Terrain generation parameters
- Visualization options
- Performance settings
- API configuration

### Profile System
- Preset behavioral profiles
- Profile application to Sparklings
- Profile distribution options (random, specific)

## Planned Upcoming Features

### Advanced Competition (Next Priority)
- Energy stealing mechanics
- Enhanced territorial advantages system
- Danger representation and avoidance
- Improved competition visualization

The Sparklings Neural Energy Simulation is continuously evolving. This document will be updated as new features are implemented.