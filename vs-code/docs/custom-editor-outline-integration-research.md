# VS Code Custom Editor Outline Integration Research

**Date**: December 2024  
**Context**: Research conducted while implementing outline panel integration for the Debrief VS Code Extension's custom GeoJSON editor

## Executive Summary

VS Code custom editors do not automatically integrate with the built-in Outline view. This research documents the challenges, limitations, and working solutions for enabling DocumentSymbolProvider functionality in custom editors.

## Problem Statement

When implementing a `CustomTextEditorProvider` for `.plot.json` files, the VS Code Outline view displays "The active editor cannot provide outline information" despite registering a `DocumentSymbolProvider`. The challenge is enabling the built-in outline functionality for custom editors that render content in webviews.

## VS Code API Limitations

### Known Issues from Microsoft

1. **Issue #97095**: "Support DocumentSymbolProvider in CustomTextEditor"
   - **Status**: Open feature request since 2020
   - **Problem**: CustomTextEditor should support DocumentSymbolProvider since it uses TextDocument
   - **Microsoft Response**: "Using document symbol notion doesn't make a lot of sense" for custom editors

2. **Issue #101476**: "Support outline for custom editors"
   - **Status**: Open
   - **Discussion**: Custom editors would need to handle symbol navigation themselves

3. **Issue #121120**: "DocumentSymbolProvider does not work with VirtualDocuments"
   - **Impact**: Limits integration with virtual document schemes

### Root Cause

Custom editors create a separation between the webview presentation and the underlying `TextDocument`. VS Code's outline functionality expects the "active editor" to be a text editor that can be queried via `DocumentSymbolProvider`, but custom editors present as webviews that don't automatically trigger this mechanism.

## Research Methodology

### Official Microsoft Resources

**VS Code Extension Samples**: https://github.com/microsoft/vscode-extension-samples
- **Custom Editor Sample**: `/custom-editor-sample/src/catScratchEditor.ts`
- **Finding**: No DocumentSymbolProvider integration demonstrated
- **Limitation**: Microsoft's own samples don't address this use case

### Open Source Projects Analysis

1. **Visual XML Schema Editor**
   - **Repository**: https://github.com/amtech/XML-vscode-visual-xml-schema-editor
   - **Implementation**: CustomTextEditorProvider for XML visual editing
   - **Outline Support**: Not implemented

2. **AL Code Outline Extension**
   - **Repository**: https://github.com/anzwdev/al-code-outline
   - **Approach**: Custom tree view instead of built-in outline integration
   - **Pattern**: Bypasses the problem by creating separate UI

### Community Solutions

Stack Overflow and VS Code community discussions reveal this as a common problem with limited working solutions. Most developers either:
- Create custom tree views as alternatives
- Accept the limitation and forgo outline functionality
- Implement complex workarounds

## Working Integration Patterns

### Pattern 1: Dual Registration Architecture

The most reliable approach involves separate but coordinated registration:

```typescript
// 1. Register custom editor
context.subscriptions.push(PlotJsonEditorProvider.register(context));

// 2. Register DocumentSymbolProvider for same file type
context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
        { language: 'plot-json' },
        new GeoJsonDocumentSymbolProvider()
    )
);
```

**Requirements**:
- Custom language definition in `package.json`
- File type association with custom language
- DocumentSymbolProvider that filters for specific file patterns

### Pattern 2: Document Activation Trigger

Force VS Code to recognize the underlying TextDocument:

```typescript
public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
    // Briefly activate the text document to trigger language services
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.toString() !== document.uri.toString()) {
        await vscode.window.showTextDocument(document, { 
            preserveFocus: true, 
            preview: true,
            viewColumn: vscode.ViewColumn.Active 
        });
        // Return focus to custom editor
        webviewPanel.reveal();
    }
}
```

**Benefits**:
- Registers document with VS Code's language services
- Triggers DocumentSymbolProvider without user-visible disruption
- Maintains focus on custom editor UI

### Pattern 3: Hierarchical DocumentSymbol Structure

Create meaningful outline hierarchy using VS Code's symbol system:

```typescript
export class GeoJsonDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
        // Group features by geometry type
        const geometrySymbol = new vscode.DocumentSymbol(
            geometryType,                           // Label
            `${features.length} features`,          // Detail
            vscode.SymbolKind.Class,               // Icon
            new vscode.Range(0, 0, 0, 0),          // Full range
            new vscode.Range(0, 0, 0, 0)           // Selection range
        );
        
        // Add individual features as children
        features.forEach((feature, index) => {
            const featureSymbol = new vscode.DocumentSymbol(
                this.getFeatureLabel(feature, index),
                this.getFeatureDetail(feature),
                this.getSymbolKind(feature.geometry.type),
                new vscode.Range(index, 0, index + 1, 0),  // Encode index in range
                new vscode.Range(index, 0, index + 1, 0)
            );
            geometrySymbol.children.push(featureSymbol);
        });
        
        return [geometrySymbol];
    }
}
```

**Key Techniques**:
- Use `range.start.line` to encode feature indices for selection tracking
- Apply appropriate `SymbolKind` values for visual consistency
- Create hierarchical structure with parent/child relationships

## Implementation Requirements

### Package.json Configuration

```json
{
  "contributes": {
    "languages": [
      {
        "id": "plot-json",
        "aliases": ["Plot JSON", "plot-json"],
        "extensions": [".plot.json"],
        "configuration": "./language-configuration.json"
      }
    ],
    "customEditors": [
      {
        "viewType": "plotJsonEditor",
        "displayName": "Plot JSON Viewer",
        "selector": [{"filenamePattern": "*.plot.json"}]
      }
    ]
  }
}
```

### Language Configuration

Minimal `language-configuration.json` for JSON-like files:

```json
{
    "brackets": [
        ["{", "}"],
        ["[", "]"]
    ],
    "autoClosingPairs": [
        ["{", "}"],
        ["[", "]"],
        ["\"", "\""]
    ]
}
```

## Alternative Approaches

### Custom Tree View Pattern

When outline integration proves impossible, create dedicated tree views:

```typescript
// Custom tree view as outline alternative
const outlineView = vscode.window.createTreeView('geoJsonOutline', {
    treeDataProvider: customTreeProvider,
    showCollapseAll: true
});
```

**Pros**:
- Complete control over UI and behavior
- No VS Code API limitations
- Can add custom context menus and actions

**Cons**:
- Not integrated with standard outline UX
- Additional UI real estate required
- Users must learn extension-specific interface

### Hybrid Approach

Combine both strategies for maximum compatibility:

1. Implement DocumentSymbolProvider for outline integration
2. Provide custom tree view as fallback
3. Allow users to choose preferred method via settings

## Best Practices

### Error Handling
```typescript
provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    try {
        // Only process specific file types
        if (!document.fileName.endsWith('.plot.json')) {
            return [];
        }
        
        const content = document.getText();
        if (!content.trim()) {
            return [];
        }
        
        // Parse and process content
        const data = JSON.parse(content);
        return this.createSymbolHierarchy(data);
        
    } catch (error) {
        console.error('Error creating document symbols:', error);
        return [];
    }
}
```

### Performance Considerations
- Filter documents early to avoid unnecessary processing
- Cache symbol creation for large documents
- Use appropriate debouncing for document change events
- Minimize symbol hierarchy depth for better UX

### User Experience
- Use meaningful symbol names (prefer `properties.name` over generic labels)
- Apply consistent symbol kinds for visual coherence
- Ensure symbol ranges map to meaningful document positions
- Provide graceful degradation when content is malformed

## Limitations and Workarounds

### Current Limitations

1. **Navigation Gap**: Clicking outline symbols doesn't automatically navigate within custom editor
2. **Activation Timing**: Document activation must be carefully timed to avoid UI flicker
3. **API Constraints**: VS Code's custom editor API doesn't officially support outline integration
4. **Testing Complexity**: Integration requires full VS Code environment testing

### Proven Workarounds

1. **Selection Event Bridge**: Monitor outline selection to trigger custom editor highlighting
2. **Document State Synchronization**: Keep outline updated when custom editor modifies content
3. **Graceful Fallback**: Provide alternative navigation when outline integration fails

## Future Considerations

### VS Code API Evolution

Microsoft's stance suggests official support is unlikely in the near term. The API team considers outline functionality orthogonal to custom editor use cases. However, community pressure may eventually drive official support.

### Extension Strategy

- Monitor VS Code release notes for outline API changes
- Maintain fallback approaches for broad compatibility
- Consider contributing to VS Code open source to improve custom editor APIs

## Conclusion

VS Code custom editor outline integration requires careful implementation of workarounds rather than official API support. However, testing reveals significant challenges with the recommended approaches.

### Testing Results (December 2024)

During implementation testing of the Debrief VS Code Extension, the following critical issues were discovered:

#### Document Activation Conflict
The recommended Pattern 2 (Document Activation Trigger) creates an irreconcilable conflict:
- **When document activation is applied**: Outline panel populates correctly, but custom editor displays the text document instead of the webview
- **When document activation is removed**: Custom editor displays the webview correctly, but outline panel shows "The active editor cannot provide outline information"

#### Alternative Approaches Tested
1. **ViewColumn.Beside + Close**: Opening text document in side column then closing it still interferes with custom editor display
2. **setTimeout + executeDocumentSymbolProvider**: Background API calls do not trigger outline population
3. **Direct API invocation**: `vscode.executeDocumentSymbolProvider` calls work but don't populate the outline panel UI

#### Root Cause Analysis
The fundamental issue is that VS Code's outline panel specifically looks for the "active editor" to be a text editor that can provide symbols. Custom editors present as webviews, creating a chicken-and-egg problem:
- To populate outline: Text document must be the active editor
- To show custom UI: Webview must be the active editor
- These states are mutually exclusive in current VS Code architecture

### Recommended Solutions

Given these findings, the most practical approaches are:

Success depends on:
- Proper language registration and file type association
- **Choice between outline integration OR custom editor display** (not both simultaneously)
- Robust DocumentSymbolProvider implementation for when text editor is active
- Custom tree view as primary solution for outline-like functionality
- Graceful error handling and fallback approaches

#### Primary Recommendation: Custom Tree View
The most reliable solution remains creating a dedicated tree view that bypasses VS Code's outline system entirely:

```typescript
// Custom tree view as outline alternative - most reliable approach
const outlineView = vscode.window.createTreeView('geoJsonOutline', {
    treeDataProvider: customTreeProvider,
    showCollapseAll: true
});
```

#### Secondary Recommendation: User Choice
Allow users to choose between outline integration (text editor) and visual editing (custom editor) via settings or commands.

While challenging, custom tree views provide outline-like functionality without the integration conflicts, making them the preferred solution for complex custom editors requiring both visual editing and structured navigation.

## References

- [VS Code Extension API Documentation](https://code.visualstudio.com/api)
- [Microsoft VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [VS Code Issue #97095: Support DocumentSymbolProvider in CustomTextEditor](https://github.com/microsoft/vscode/issues/97095)
- [VS Code Issue #101476: Support outline for custom editors](https://github.com/microsoft/vscode/issues/101476)
- [Custom Editor API Reference](https://code.visualstudio.com/api/extension-guides/custom-editors)