# Sparklings: Architecture Overview

This document provides a detailed overview of the architecture for the Sparklings Neural Energy Simulation, focusing on the system design, component relationships, and the AI integration mechanism.

## System Architecture

Sparklings is primarily a client-side application with a minimal backend requirement only for API proxying. The architecture follows a modular design pattern with clear separation of concerns.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Client                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │             │    │             │    │                     │  │
│  │  Rendering  │◄───│ Simulation  │◄───│ User Interface      │  │
│  │  System     │    │ Core        │    │ Controls            │  │
│  │             │    │             │    │                     │  │
│  └─────┬───────┘    └──────┬──────┘    └─────────────────────┘  │
│        │                   │                                     │
│        ▼                   ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │                      Entities                           │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │    │
│  │  │ Sparklings  │ │    World    │ │ Memory System   │   │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                │                                 │
│                                ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │                  Inference System                       │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │    │
│  │  │ Prompt      │ │ Parameter   │ │ Test Framework  │   │    │
│  │  │ Generation  │ │ Validation  │ │                 │   │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                │                                 │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Backend Proxy                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │                  API Forwarding                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                │                                 │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Anthropic API                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components 

### 1. Simulation Core (src/core/)

The simulation core manages the central game loop and orchestrates the interactions between all simulation entities.

**Key files:**
- `simulation.ts`: Main simulation controller
- `world.ts`: Manages the grid-based world, terrain, and resources
- `inference.ts`: Handles the neural energy inference system
- `inferenceQualityTester.ts`: Testing framework for inference quality

### 2. Entities (src/entities/)

The entities module contains the core simulation objects that populate the world.

**Key files:**
- `sparkling.ts`: Implementation of the Sparkling entity
- `sparklingTypes.ts`: Type definitions for Sparkling states and properties
- `memory.ts`: Memory system implementation
- `memoryTypes.ts`: Type definitions for different memory types
- `decisionParameters.ts`: Parameter definitions for Sparkling decision-making
- `decisionParameterProfiles.ts`: Preset parameter profiles

### 3. Rendering System (src/rendering/)

The rendering system is responsible for visualizing the simulation on the canvas.

**Key files:**
- `renderer.ts`: Main rendering controller

### 4. Configuration (src/config/)

Configuration settings for the simulation.

**Key files:**
- `config.ts`: General simulation configuration
- `apiConfig.ts`: Anthropic API configuration

### 5. Utilities (src/utils/)

Utility functions and helpers.

**Key files:**
- `time.ts`: Time management for the simulation loop

## Data Flow

1. The simulation loop updates all entities at regular intervals.
2. Sparklings observe the world, update their memory, and make decisions.
3. When neural energy threshold is reached, the inference process is triggered.
4. Inference results update Sparkling parameters, influencing future decisions.
5. The renderer visualizes the current state of the simulation.

## Model Inference Architecture

### Inference Flow

The neural energy inference system is a core mechanic that enables Sparklings to "evolve" their decision-making. The process follows this flow:

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ Neural Energy │       │  Inference    │       │  Parameter    │
│ Accumulation  │──────►│  Triggering   │──────►│  Collection   │
└───────────────┘       └───────────────┘       └───────┬───────┘
                                                        │
                                                        ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  Parameter    │       │    Response   │       │    Prompt     │
│  Update       │◄──────│  Processing   │◄──────│  Generation   │
└───────┬───────┘       └───────────────┘       └───────┬───────┘
        │                                               │
        │                                               ▼
        │                                       ┌───────────────┐
        │                                       │   API Call    │
        │                                       │ (or Mock)     │
        │                                       └───────┬───────┘
        │                                               │
        ▼                                               │
┌───────────────┐                                       │
│   Memory      │◄──────────────────────────────────────┘
│   Storage     │
└───────────────┘
```

### Detailed Inference Process

1. **Energy Accumulation**: Sparklings collect neural energy crystals from the world.

2. **Inference Triggering**:
   - When neural energy exceeds the inference threshold (default: 70)
   - After a minimum cooldown period (default: 15 seconds)
   - When the Sparkling's state allows for inference

3. **Parameter Collection**:
   - Current state and position
   - Resource levels (food, neural energy)
   - Memory contents (resources, terrain, encounters)
   - Current decision parameters

4. **Prompt Generation**:
   - `InferenceSystem.generatePrompt()` creates a structured prompt
   - Includes formatted memory information, current state, and parameters
   - Previous inference reasoning (if available)

5. **API Call**:
   - Uses `fetch()` to call the Anthropic API
   - Can be toggled to use mock inference for development
   - Handles errors and timeouts gracefully

6. **Response Processing**:
   - Parses JSON response from the API
   - Extracts reasoning and parameter updates
   - Validates parameter ranges

7. **Parameter Update**:
   - Updates the Sparkling's decision parameters
   - Records the reasoning for future reference

8. **Memory Storage**:
   - Stores inference event in memory with reasoning
   - Updates visualization to show inference events

### Mock vs Real Inference

The system supports two inference modes:

1. **Mock Inference** (`mockInference()` method):
   - Used for development and testing
   - Generates deterministic responses based on Sparkling state
   - No external API calls required
   - Primarily adjusts parameters based on resource levels

2. **Real Inference** (`callAnthropicApi()` method):
   - Uses the Anthropic API for true AI-driven parameter updates
   - Requires valid API credentials
   - Provides more nuanced and context-aware reasoning
   - Can be toggled on/off via UI controls

### Testing Framework

The inference system includes a testing framework (`InferenceQualityTester`) that:

1. Defines test cases with expected outcomes
2. Creates controlled test environments
3. Runs inference in these environments
4. Validates results against expectations
5. Generates quality metrics and reports

## Front-End vs. Back-End

### Front-End (Client-Side)

The entire simulation logic runs in the browser:

- **Simulation Core**: All game logic, physics, and entity management
- **Rendering**: Canvas-based visualization
- **Inference Logic**: Prompt generation and response processing
- **Memory Management**: Entity memory systems
- **User Interface**: Controls and visualization options

The front-end is built with TypeScript and bundled with Webpack.

### Back-End (Server-Side)

The back-end requirements are minimal:

- **API Proxy**: The only required backend component is a simple proxy server to forward requests to the Anthropic API
- **Purpose**: Protects API keys and handles CORS issues
- **Implementation**: Not included in the current codebase as it's environment-dependent

For local development, the API proxy can be:
- A simple Express server
- A serverless function (AWS Lambda, Vercel Functions)
- A proxy middleware in the development server

For production, options include:
- Edge functions (Cloudflare Workers, Vercel Edge)
- Lightweight API routes on a hosting platform
- Simple proxy on a traditional server

## Configuration Management

Configuration is managed through:

1. **SimulationConfig** (`config.ts`):
   - World dimensions and properties
   - Sparkling attributes and limits
   - Resource spawning rates
   - General simulation parameters

2. **AnthropicConfig** (`apiConfig.ts`):
   - API key management
   - Model selection
   - Temperature and token settings
   - Endpoint configuration

## Performance Considerations

The architecture is designed with performance in mind:

1. **Rendering Optimization**:
   - Only renders changed elements
   - Uses efficient canvas operations

2. **Inference Batching**:
   - Staggers inference requests to avoid API flooding
   - Implements cooldown periods between inferences

3. **Memory Management**:
   - Limited memory capacity per Sparkling
   - FIFO system with importance-based eviction

4. **Grid-Based Collision**:
   - Uses grid cells for efficient collision detection
   - Avoids O(n²) entity comparisons

## Future Architectural Extensions

The architecture is designed to be extensible for future features:

1. **Multiplayer Extensions**:
   - WebSocket integration for multi-user observations
   - Shared simulation state

2. **Advanced AI Integration**:
   - Multi-model inference comparison
   - Adaptive inference thresholds

3. **Enhanced Visualization**:
   - WebGL rendering for larger simulations
   - 3D visualization options

4. **Data Collection & Analysis**:
   - Telemetry for Sparkling behaviors
   - Machine learning analysis of simulation outcomes