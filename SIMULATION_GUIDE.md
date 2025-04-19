# Sparklings Simulation Guide

Welcome to the Sparklings Neural Energy Simulation! This guide will help you understand what you're seeing in the simulation and how the little Sparklings behave in their world.

## Simulation Story

Imagine a world where tiny, glowing entities called Sparklings live out their existence. They wander across varied landscapes—lush forests, open plains, barren deserts, and rugged mountains—each seeking to satisfy their two fundamental needs: food and a special resource called neural energy.

When you watch the simulation, you'll witness a living ecosystem unfold before your eyes. Each Sparkling has its own "personality" (represented by behavioral parameters) that influences how it makes decisions:

Some Sparklings are explorers at heart, constantly venturing into unknown territories to discover new resources. Others are careful gatherers, meticulously collecting and remembering the locations of the richest food sources. Some prioritize neural energy, which lets them make better decisions, while others focus on maintaining a healthy food supply.

As Sparklings move about their world, they remember important locations and encounters. When two Sparklings cross paths near a valuable resource, you might witness a competition—indicated by red lines connecting them. The outcome of these competitions depends on each Sparkling's parameters, current state, and sometimes just a bit of luck.

Well-fed Sparklings often establish territories around resource-rich areas, visible as translucent circles matching their color. The size of these territories reflects their personality—less cooperative Sparklings claim larger areas and defend them more aggressively.

What makes this simulation special is that Sparklings can actually learn and adapt. When they collect enough neural energy (the purple resource), they can perform deeper reasoning that might adjust their behavioral parameters. You'll see this happening when a blue marker appears, indicating a Sparkling has "thought" about its situation and potentially adjusted its approach to the world.

Over time, you'll notice patterns emerge. Some Sparklings become territorial resource guardians, others become efficient gatherers, and some become explorers constantly seeking new opportunities. These behaviors aren't explicitly programmed—they emerge naturally from the interaction of simple rules, parameters, and the Sparklings' experiences in their world.

## What are Sparklings?

Sparklings are small autonomous entities that live in a simulated 2D world. Each Sparkling has:
- Food resources they need to survive
- Neural energy they collect to power their decision-making
- A memory of places and events they've encountered
- A unique set of behavioral parameters that influence how they act

## The World

The simulation world consists of different terrain types that affect how Sparklings move and how resources spawn:

- **Plains** (light green): Neutral terrain, easy to traverse
- **Mountains** (gray): Difficult to move through but rich in neural energy
- **Forest** (dark green): Moderate movement cost but rich in food
- **Desert** (yellow): Moderate movement cost, poor in resources

## Resources

There are two types of resources in the simulation:
- **Food** (golden circles): Needed for Sparklings to sustain themselves
- **Neural Energy** (purple circles): Powers Sparklings' decision-making abilities

## Sparkling States

Sparklings can be in different states, indicated by their behavior and sometimes their appearance:
- **Idle**: Resting, not actively seeking anything
- **Exploring**: Randomly moving to discover resources
- **Seeking Food**: Actively looking for food resources
- **Seeking Energy**: Actively looking for neural energy
- **Collecting**: Gathering resources they've found
- **Resting**: Recovering and processing information
- **Competing**: Engaged in competition with another Sparkling

## Territories

When a Sparkling has collected enough food (appears well-fed), it may establish a territory around resource-rich areas. Territories appear as translucent circles matching the Sparkling's color and are only visible when:
- You have selected a Sparkling or enabled detailed view
- The Sparkling is in the COLLECTING, COMPETING, or RESTING state
- The Sparkling has established a territory (usually around valuable resources)

The size of a territory is influenced by the Sparkling's personal space preference and cooperation tendency.

## Interactions Between Sparklings

Sparklings interact with each other in several ways:
- **Neutral Encounters** (thin white lines): Basic awareness of each other
- **Potential Competition** (yellow dashed lines with ⚠️): When collecting Sparklings detect each other
- **Active Competition** (red lines with ⚔️): Direct competition for resources

## Intelligence & Decision Making

What makes Sparklings special is their ability to learn and adapt through:
- **Memory System**: They remember resource locations and encounters
- **Neural Energy**: They collect this special energy to power more advanced thinking
- **Parameter Adjustment**: Their behavioral parameters gradually shift based on their experiences
- **AI-Powered Reasoning**: When they have enough neural energy, they can perform deeper reasoning

## Behavioral Parameters

Each Sparkling has unique behavioral parameters that influence how they make decisions:
- Food vs. Energy preference
- Exploration vs. Exploitation tendency
- Cooperation vs. Competition tendency
- Memory importance weights
- Various thresholds for actions

## How to Read the Simulation

- **Sparkling Colors**: Each Sparkling has a unique color to help you track them
- **Lines Between Sparklings**: Show different types of interactions
- **Territories**: Translucent circles showing a Sparkling's claimed area
- **Resource Dots**: Gold (food) and purple (neural energy) circles
- **Inference Indicators**: Blue markers show where a Sparkling has performed deeper reasoning

## Simulation Controls

- **Start/Stop**: Control the simulation flow
- **Select Sparklings**: Click on a Sparkling to see detailed information
- **Debug Panel**: Shows technical information about the simulation state

As the simulation runs, watch how Sparklings establish territories, compete for resources, and adapt their behavior over time!

## Current Features (April 2025)

- **Competition and Territories**: Sparklings establish territories and compete for resources
- **Memory System**: Sparklings remember resource locations and encounters
- **Neural Energy Processing**: Sparklings collect and use neural energy for decision-making
- **AI-Powered Reasoning**: Sparklings can perform deeper reasoning with enough neural energy
- **Parameter Adjustment**: Sparklings can adapt their behavioral parameters over time
- **Visual Interaction Indicators**: Competition is visualized with special effects
- **Behavioral Profiles**: Sparklings can have preset behavioral tendencies (Gatherer, Explorer, etc.)

*Note: This simulation is continuously evolving with new features being added regularly.*