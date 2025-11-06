# Type Safety Guide for Debrief Python Scripts

This guide explains how to write type-safe Python code when working with the Debrief MCP client and Pydantic models.

## Understanding Union Types

When you get features from the MCP client, they come back as a **union type**:

```python
feature_collection = client.get_features()
# feature_collection.features is List[DebriefTrackFeature | DebriefPointFeature | DebriefAnnotationFeature]
```

This means each feature could be any one of these three types. To access type-specific properties safely, you need to **narrow the type** using `isinstance()`.

## Pattern 1: Type Narrowing with isinstance()

### ❌ Incorrect (causes Pylance errors):
```python
for feature in feature_collection.features:
    # ERROR: .lower() doesn't exist on int
    if 'paris' in feature.id.lower():
        # ERROR: Not all feature types have .color
        print(feature.properties.color)
```

### ✅ Correct (type-safe):
```python
from debrief.types.features.point import DebriefPointFeature

for feature in feature_collection.features:
    # Narrow to DebriefPointFeature specifically
    if isinstance(feature, DebriefPointFeature):
        # Now feature.properties is PointProperties (not a union)
        # And Pylance knows exactly what properties are available
        if isinstance(feature.id, str) and 'paris' in feature.id.lower():
            if feature.properties and hasattr(feature.properties, 'color'):
                print(feature.properties.color)
```

## Pattern 2: Handling Optional ID Fields

Feature IDs can be `str | int | None`, so you need to check the type:

### ❌ Incorrect:
```python
if feature.id in selected_ids:  # ERROR: id might be None
    ...
```

### ✅ Correct:
```python
if feature.id is not None and feature.id in selected_ids:
    ...
```

Or if you need string methods:
```python
if isinstance(feature.id, str) and 'keyword' in feature.id.lower():
    ...
```

## Pattern 3: Working with Geometry

After type narrowing, geometry types are specific:

### ✅ Type-safe geometry access:
```python
if isinstance(feature, DebriefPointFeature):
    # feature.geometry is now Point (not a union)
    if feature.geometry and feature.geometry.coordinates:
        lon, lat = feature.geometry.coordinates
        # Safe to manipulate coordinates
        feature.geometry.coordinates = [lon + 1.0, lat + 1.0]
```

## Pattern 4: Checking for Optional Properties

Not all feature types have all properties. Use `hasattr()` for dynamic checks:

```python
if isinstance(feature, DebriefPointFeature):
    if feature.properties and hasattr(feature.properties, 'color'):
        current_color = feature.properties.color
        feature.properties.color = '#FF0000'
```

## Why This Matters

1. **IDE Autocomplete**: With proper type narrowing, your IDE knows exactly what properties and methods are available
2. **Catch Errors Early**: Pylance catches type errors before you run the code
3. **Runtime Safety**: Pydantic validates data at runtime, ensuring type correctness
4. **Better Documentation**: Code is self-documenting when types are explicit

## Example: Complete Type-Safe Script

See `toggle_paris_color.py` for a complete example demonstrating:
- Type narrowing with `isinstance()`
- Handling optional IDs with type checks
- Safe property access with `hasattr()`
- Clear error messages when validation fails

## Common Pylance Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot access attribute "lower" for class "StrictInt"` | Calling `.lower()` on `id` which could be `int` | Add `isinstance(feature.id, str)` check |
| `Cannot access attribute "color" for class "TrackProperties"` | Accessing property that doesn't exist on all types | Use `isinstance()` to narrow to specific feature type |
| `"color" is not a known attribute of "None"` | Properties might be None | Check `if feature.properties and hasattr(...)` |

## Best Practices

1. ✅ Always use `isinstance()` to narrow union types before accessing type-specific properties
2. ✅ Check for `None` before accessing optional fields
3. ✅ Use `hasattr()` when you're not sure if a property exists
4. ✅ Let Pydantic validation catch runtime errors (don't suppress with `# type: ignore`)
5. ✅ Use type annotations in your own functions for consistency

## Additional Resources

- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Python Type Narrowing](https://mypy.readthedocs.io/en/stable/type_narrowing.html)
- [Pylance Type Checking](https://github.com/microsoft/pylance-release)
