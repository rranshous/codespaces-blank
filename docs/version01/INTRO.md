# Sparklings: Neural Energy Simulation

## Concept Overview

Sparklings is a grid-based simulation that explores the relationship between resource collection and intelligence. In this world, small luminous creatures called Sparklings compete for two essential resources: food for survival and neural energy that powers their decision-making abilities.

What makes this simulation unique is that neural energy directly translates to "thinking time" - when Sparklings accumulate enough neural energy, they can trigger an AI inference that improves their decision-making parameters. More intelligent Sparklings make better decisions about resource collection, creating a positive feedback loop between resource acquisition and intelligence.

## Core Elements

### World
- 2D grid (100x100 cells)
- Simple terrain types: plains, water, rocky areas
- Resources that spawn and replenish over time
- Fixed number of Sparklings (10-20 for MVP)

### Resources
1. **Food**
   - Essential for survival
   - Depletes over time as Sparklings consume it
   - Regenerates naturally in suitable areas
   - Sparklings die if they run out of food

2. **Neural Energy Crystals**
   - Concentrated sources of thinking power
   - Rarer than food, found in specific locations
   - Used exclusively to power inference/thinking
   - Different qualities possible (basic/refined)

### Sparklings

Sparklings are the primary entities in the simulation. Each Sparkling has:

- **Visual Representation**: Small, glowing entities with brightness representing intelligence
- **Position**: Location on the 2D grid
- **Food Level**: Current food reserves (0-100)
- **Neural Energy**: Current neural energy reserves (0-100)

### Behavioral System

Each Sparkling operates on a simple state machine with three primary states:

1. **Foraging**: Searching for and moving toward food
2. **Crystal Seeking**: Searching for and moving toward neural energy
3. **Fleeing**: Moving away from perceived threats

Transitions between states are governed by numerical parameters:
- **ForagingThreshold**: How hungry before prioritizing food
- **CrystalDesireThreshold**: Desire level for neural energy
- **FleeingThreshold**: Danger level that triggers flight

Action parameters within each state include:
- **ForagingRadius**: How far to look for food
- **CrystalSeekingRadius**: How far to look for neural energy
- **ExplorationRate**: Tendency to explore vs. exploit
- **RiskTolerance**: Willingness to enter potentially dangerous areas

### Memory System

Each Sparkling has limited memory capacity storing:
- Last 3 food locations observed
- Last 2 crystal locations observed
- Last 2 dangerous locations encountered
- Last 3 encounters with other Sparklings
- Previous reasoning from last inference (text)

Memory updates automatically as Sparklings make observations, with new entries replacing the oldest ones (FIFO).

## Intelligence Mechanics

### Neural Energy Usage

When a Sparkling accumulates sufficient neural energy, it can spend that energy to trigger an "inference" or thinking session:

1. Current status (position, food level, etc.) and memory are formatted into a prompt
2. This is sent to an AI model (Anthropic API)
3. The model returns updated behavioral parameters
4. These new parameters influence the Sparkling's decision-making
5. The model's reasoning is stored in memory for future reference

### Intelligence Benefits

More intelligent Sparklings (those who frequently use neural energy for inference):
- Make better decisions about resource allocation
- Are more effective at finding and collecting both food and neural energy
- Can better predict dangers and avoid them
- May develop strategies for competing with other Sparklings

## Competition Mechanics

Sparklings compete in several ways:
1. **Resource Competition**: First to reach a resource claims it
2. **Energy Stealing**: May potentially steal neural energy from others
3. **Territorial Behavior**: Advantages when operating in familiar areas

## Simulation Flow

1. Initialize world with terrain, resources, and Sparklings
2. For each simulation tick:
   - Update resource spawning
   - Each Sparkling observes surroundings and updates memory
   - Check for neural energy expenditure (inference triggers)
   - Process inference results for Sparklings that "thought"
   - Update Sparkling states based on parameters
   - Move Sparklings according to their current state
   - Handle interactions (resource collection, encounters)
   - Update visualization

## Visual Representation

- Grid-based world with simple terrain visualization
- Sparklings represented as colored circles
- Color brightness indicates neural energy level
- Simple UI controls for starting/stopping simulation
- Optional debugging panel to observe Sparkling states

## Technical Constraints

- Browser-based implementation with TypeScript
- Canvas for rendering
- Minimal backend only for proxying API requests
- All simulation logic and state maintained in the browser

## Future Extensions (Post-MVP)

- Variable population (reproduction/death)
- Multiple Sparkling species with different instincts
- More complex environments and challenges
- Tiered intelligence levels with different capabilities
- Social behaviors and cooperation
- User interaction with the simulation

## Implementation Priority

1. Core simulation loop and grid-based world
2. Basic Sparkling behavior with state machines
3. Resource spawning and collection
4. Memory system implementation
5. Integration with AI inference
6. Visualization and UI controls
7. Competition mechanics