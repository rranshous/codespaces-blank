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