# Development Lessons Learned

This document captures important lessons, insights, and best practices we've discovered during the development of the Sparklings Neural Energy Simulation. It serves as a knowledge base to prevent recurring issues and improve our development process.

## Code Architecture

### Parameter Management

1. **Decision Parameter Updates**: When adding a new decision parameter to the `DecisionParameters` interface, we need to update multiple parts of the codebase:
   - Update the inference system's prompt generation to include the new parameter in both:
     - The "Current Instincts" section where current values are displayed
     - The "Response Format" section where expected parameters are listed
   - Add the parameter to validation ranges in `validateParameterUpdates` method
   - Add the parameter to the list of valid parameter names in `isValidParameterName`
   - Update test cases in the InferenceQualityTester
   - Update any UI components that display parameters
   - Ensure all default parameter profiles include the new parameter
   - Ensure the parameter is properly passed between components (e.g., from Sparkling to Memory)

2. **Parameter Dependencies**: Some parameters have dependencies on others, and changing one parameter may require adjusting related parameters to maintain balance.

### Entity Lifecycle Management

1. **Fadeout Mechanics**: When implementing entity fadeout processes:
   - Use a dedicated state (e.g., FADING) for entities that are in the process of being removed
   - Implement a multi-step process: mark for removal → visual fadeout → actual removal
   - Handle update logic differently for fading entities (e.g., skip normal resource consumption)
   - Use separate flags for tracking the fadeout progress and completion status
   - Ensure renderer properly handles visualization of the fading state with appropriate visual cues

2. **Entity Removal**: When removing entities from collections:
   - Use a two-phase approach: identify entities to remove, then filter the collection
   - Log removal events for debugging purposes
   - Ensure any references to removed entities are properly handled to avoid memory leaks
   - Consider performance implications of frequent collection filtering

## Memory System

1. **Memory Importance**: Memory importance parameters need to be properly passed from Sparkling to Memory instances, and they should be updated when the Sparkling's parameters change.

2. **Memory Pruning**: The memory pruning system is sensitive to importance values, so make sure these are properly balanced to avoid biasing Sparklings toward certain memory types.

## Inference System

1. **API Response Handling**: The Anthropic API response parsing needs robust error handling to deal with malformed JSON, unexpected control characters, and other potential issues.

2. **Mock Inference**: The mock inference system is valuable for testing and development, but must be kept in sync with the real inference logic.

3. **Parameter Name Case**: Always use camelCase for parameter names in the inference system prompt and response parsing.

## Performance Optimization

1. **Memory Management**: Be careful with high-frequency memory operations, as they can lead to memory leaks and performance issues.

2. **Resource Calculations**: Resource-intensive calculations should be optimized and cached when possible.

## Testing and Validation

1. **Build After Changes**: Always build the project after making changes to ensure there are no TypeScript errors or other issues.

2. **Test Cases**: Update test cases when adding new features to ensure they work correctly in all scenarios.

3. **Parameter Validation**: All parameter updates should be validated to ensure they're within valid ranges.

## Documentation

1. **Implementation Progress**: Keep the implementation progress document updated as changes are made to help track development status.

2. **Code Comments**: Important logic should be well-commented to explain why certain decisions were made.

3. **Documentation Review**: Frequently review high-level documentation for correctness and completeness. This helps ensure that documents like SIMULATION_FEATURES.md remain accurate as features are added or modified, preventing discrepancies between documentation and implementation.

4. **Feature Documentation**: Update feature documentation in real-time as implementations are completed, rather than waiting until the end of a development cycle. This ensures that documentation always reflects the current state of the application.

## Code Organization

1. **Component-Based Architecture**: For complex entities like Sparklings, using a component-based architecture with separate modules for different aspects of functionality (rendering, movement, resources, decisions, etc.) improves code organization and maintainability.

2. **File Size Limits**: Keeping files under 1000 lines makes the codebase more maintainable. When a file grows too large, consider breaking it into smaller modules based on functional responsibilities.

3. **Composition Over Deep Inheritance**: Using composition to combine specialized components is more flexible than relying on complex inheritance hierarchies, especially for entities with many different behaviors.

4. **Protected vs Private**: Using protected access modifiers in base classes allows derived classes to access necessary properties, while still maintaining encapsulation from outside code.

5. **Internal Access Patterns**: When refactoring existing code into a component-based architecture, careful consideration is needed for how components access shared state. Consider using a core component with protected members that can be safely accessed by specialized components.

## Refactoring and Module Management

1. **Naming Consistency**: When implementing properties and methods that involve the same concept:
   - Maintain consistent naming between property names and their related methods
   - Inconsistent names like `isReadyToRemove` (property) vs `isReadyToBeRemoved()` (method) cause TypeScript errors
   - Document naming patterns in comments to help maintain consistency

2. **Module Re-exports**: When refactoring monolithic classes into a modular structure:
   - Consider using re-export files to maintain backward compatibility
   - A simple file that re-exports from the new location (e.g., `export { Sparkling } from './sparkling/index';`) can avoid breaking changes in import paths
   - This technique allows gradual migration without requiring simultaneous updates to all import statements

3. **Type Visibility**: When using TypeScript:
   - Remember that all public methods from parent classes need to be defined in child classes if they override implementation
   - Protected members from parent classes are not automatically visible to external code through the child class
   - Be cautious with `super` calls using `this` as context, as TypeScript may see method/property type mismatches