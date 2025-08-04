# Design Document

## Overview

The infinite loop issue in the main page component is caused by improper useEffect dependency management. The current implementation includes memoized functions as dependencies, which still recreate due to their own dependencies changing, causing circular re-renders.

## Architecture

### Current Problem Pattern
```typescript
// ❌ Problematic pattern
const loadImoveis = useCallback(async () => {
  // API call logic
}, [currentPage, selectedType, selectedCity, searchTerm]); // Dependencies change frequently

useEffect(() => {
  loadInitialData();
}, [loadImoveis]); // This recreates when loadImoveis dependencies change

useEffect(() => {
  loadImoveis(true);
}, [selectedType, selectedCity, searchTerm, loadImoveis]); // Circular dependency
```

### Solution Pattern
```typescript
// ✅ Fixed pattern
useEffect(() => {
  // Direct API call without function dependency
  const loadData = async () => {
    // API logic here
  };
  loadData();
}, [currentPage, selectedType, selectedCity, searchTerm]); // Direct dependencies only
```

## Components and Interfaces

### State Management
- **Loading States**: Separate loading states for initial load and subsequent loads
- **Data States**: Cities, properties, featured properties with proper initialization
- **Filter States**: City, type, search term with controlled updates
- **Pagination States**: Current page, total pages, total items

### Effect Separation
1. **Initial Load Effect**: Runs once on mount, loads cities and featured properties
2. **Properties Load Effect**: Runs when filters or pagination change
3. **Client-side Effects**: Hero carousel, parallax, etc.

## Data Models

### API Call Structure
```typescript
interface PropertyFilters {
  page: number;
  limit: number;
  tipo?: string;
  cidade_id?: string;
  search?: string;
}

interface PropertyResponse {
  data: PublicImovel[];
  pagination: {
    totalPages: number;
    total: number;
  };
}
```

## Error Handling

### Infinite Loop Prevention
- Remove function dependencies from useEffect
- Use direct state dependencies only
- Implement proper loading states to prevent concurrent calls
- Add error boundaries for graceful failure handling

### API Error Handling
- Catch and log API errors
- Set empty arrays as fallback data
- Maintain loading states during error scenarios

## Testing Strategy

### Unit Tests
- Test useEffect dependency arrays
- Test state updates don't cause infinite loops
- Test API call deduplication
- Test loading state management

### Integration Tests
- Test full page load cycle
- Test filter changes trigger correct API calls
- Test pagination works without loops
- Test error scenarios don't break the page

### Performance Tests
- Monitor re-render count
- Verify API calls are not duplicated
- Test memory usage during navigation