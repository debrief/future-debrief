import React, { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToolFilterService } from './ToolFilterService';
import { OutlineView } from '../OutlineView/OutlineView';
import type { DebriefFeature, DebriefFeatureCollection } from '@debrief/shared-types';

// Enhanced interactive demonstration with real OutlineView integration
const EnhancedInteractiveDemo: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plotData, setPlotData] = useState<DebriefFeatureCollection | null>(null);
  const [toolsData, setToolsData] = useState<any>(null);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [service] = useState(() => new ToolFilterService());

  // Load real data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [plotResponse, toolsResponse] = await Promise.all([
          fetch('/large-sample.plot.json'),
          fetch('/tool-index.json')
        ]);

        if (!plotResponse.ok) throw new Error(`Failed to load plot data: ${plotResponse.statusText}`);
        if (!toolsResponse.ok) throw new Error(`Failed to load tools data: ${toolsResponse.statusText}`);

        const [plotJson, toolsJson] = await Promise.all([
          plotResponse.json(),
          toolsResponse.json()
        ]);

        setPlotData(plotJson);
        setToolsData(toolsJson);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle feature selection changes from OutlineView
  const handleSelectionChange = (ids: string[]) => {
    setSelectedFeatureIds(ids);
  };

  // Detailed parameter matching analysis
  const analyzeParameterMatching = (tool: any, selectedFeatures: DebriefFeature[]) => {
    if (!tool.inputSchema?.properties) {
      return {
        isCompatible: selectedFeatures.length > 0, // Tools without schemas work with any selection
        details: [],
        summary: 'No parameters',
        executionNotes: selectedFeatures.length > 0 ? 'Tool accepts any input' : 'No features selected'
      };
    }

    const properties = tool.inputSchema.properties;
    const required = tool.inputSchema.required || [];
    const availableTypes = selectedFeatures.map(f => f.properties?.dataType).filter(Boolean);
    const availableTypeSet = new Set(availableTypes);

    const details: {
      text: string;
      matchStatus: 'matched' | 'missing' | 'partial';
      isRequired: boolean;
      expectedType?: string;
      availableCount?: number;
    }[] = [];

    let requiredMatched = 0;
    let optionalMatched = 0;
    let executionNotes: string[] = [];

    Object.entries(properties).forEach(([paramName, schema]: [string, any]) => {
      const isRequired = required.includes(paramName);
      const description = schema.description || 'No description';

      // Determine expected feature type from parameter name and description
      let expectedType: string | null = null;
      let matchStatus: 'matched' | 'missing' | 'partial' = 'missing';
      let availableCount = 0;

      // Pattern matching for feature types
      if (paramName.includes('track') || description.toLowerCase().includes('track')) {
        expectedType = 'track';
        availableCount = selectedFeatures.filter(f => f.properties?.dataType === 'track').length;
      } else if (paramName.includes('point') || description.toLowerCase().includes('point')) {
        expectedType = 'reference-point';
        availableCount = selectedFeatures.filter(f => f.properties?.dataType === 'reference-point').length;
      } else if (paramName.includes('zone') || paramName.includes('polygon') || description.toLowerCase().includes('zone')) {
        expectedType = 'zone';
        availableCount = selectedFeatures.filter(f => f.properties?.dataType === 'zone').length;
      } else if (paramName.includes('feature') || description.toLowerCase().includes('feature')) {
        // Generic feature parameter - accepts any feature type
        expectedType = 'any';
        availableCount = selectedFeatures.length;
      } else {
        // Non-feature parameter (like from_speed, current_time_state, etc.)
        // These are configuration parameters, not feature inputs
        expectedType = 'config';
        availableCount = 0; // Configuration parameters are never "available" from selected features
      }

      // Determine match status
      if (expectedType === 'any' && selectedFeatures.length > 0) {
        matchStatus = 'matched';
        if (isRequired) requiredMatched++;
        else optionalMatched++;
      } else if (expectedType === 'config') {
        // Configuration parameters are always missing from feature selection
        // Required config params make tool incompatible, optional ones are just missing
        matchStatus = 'missing';
        // Don't count required config params as matched
      } else if (expectedType && availableCount > 0) {
        matchStatus = 'matched';
        if (isRequired) requiredMatched++;
        else optionalMatched++;

        // Check if parameter expects array vs single feature
        if (schema.type === 'array' && availableCount > 1) {
          executionNotes.push(`${paramName}: Will provide ${availableCount} ${expectedType} features as array`);
        } else if (schema.type !== 'array' && availableCount > 1) {
          executionNotes.push(`${paramName}: Will execute tool ${availableCount} times (once per ${expectedType} feature)`);
        }
      } else {
        matchStatus = 'missing';
      }

      const requiredFlag = isRequired ? ' (required)' : ' (optional)';
      details.push({
        text: `${paramName}${requiredFlag}: ${description}`,
        matchStatus,
        isRequired,
        expectedType: expectedType || undefined,
        availableCount
      });
    });

    const isCompatible = requiredMatched === required.length;
    const paramCount = Object.keys(properties).length;
    const summary = `${paramCount} parameter${paramCount !== 1 ? 's' : ''} (${requiredMatched}/${required.length} required matched)`;

    return {
      isCompatible,
      details,
      summary,
      executionNotes: executionNotes.join('; ') || (isCompatible ? 'Tool will execute normally' : 'Missing required parameters')
    };
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        fontSize: '16px',
        color: '#666'
      }}>
        Loading real data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        fontSize: '16px',
        color: '#d32f2f',
        backgroundColor: '#ffebee',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        padding: '20px'
      }}>
        ❌ Error loading data: {error}
      </div>
    );
  }

  if (!plotData || !toolsData) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        fontSize: '16px',
        color: '#666'
      }}>
        No data available
      </div>
    );
  }

  const selectedFeatures = plotData.features.filter(f => selectedFeatureIds.includes(String(f.id)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '800px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Enhanced ToolFilter Service - Interactive Demonstration</h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          Select features in the OutlineView to see real-time tool compatibility analysis.
          Tools are automatically filtered based on parameter schema matching.
        </p>
      </div>

      {/* Main content area */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left panel - OutlineView */}
        <div style={{
          flex: '0 0 300px',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ddd',
            fontWeight: 'bold'
          }}>
            Features ({plotData.features.length})
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {/* Import and use the real OutlineView component with dark background */}
            <div style={{
              backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
              color: 'var(--vscode-editor-foreground, #cccccc)',
              height: '100%',
              fontFamily: 'var(--vscode-font-family, "Segoe UI", system-ui, sans-serif)',
              fontSize: 'var(--vscode-font-size, 13px)'
            }}>
              <OutlineView
                featureCollection={plotData}
                selectedFeatureIds={selectedFeatureIds}
                onSelectionChange={handleSelectionChange}
              />
            </div>
          </div>
        </div>

        {/* Right panel - Tools Table */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ddd',
            fontWeight: 'bold'
          }}>
            Tool Compatibility Analysis ({toolsData.tools.length} tools)
          </div>

          {/* Selection status */}
          <div style={{
            padding: '12px',
            backgroundColor: selectedFeatures.length === 0 ? '#fff3cd' : '#d4edda',
            borderBottom: '1px solid #ddd',
            fontSize: '14px'
          }}>
            {selectedFeatures.length === 0 ? (
              <span style={{ color: '#856404' }}>
                ⚠️ No features selected for analysis - all tools are disabled
              </span>
            ) : (
              <span style={{ color: '#155724' }}>
                ✓ {selectedFeatures.length} feature(s) selected: {selectedFeatures.map(f => f.properties?.name || f.id).join(', ')}
              </span>
            )}
          </div>

          {/* Tools table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Tool Name</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>Parameters</th>
                </tr>
              </thead>
              <tbody>
                {toolsData.tools.map((tool: any, index: number) => {
                  const analysis = analyzeParameterMatching(tool, selectedFeatures);

                  return (
                    <tr key={index} style={{
                      backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
                      opacity: analysis.isCompatible ? 1 : 0.6
                    }}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: analysis.isCompatible ? 'bold' : 'normal' }}>
                        {analysis.isCompatible ? '🟢' : '🔴'} {tool.name}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                        <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                          {analysis.summary}
                        </div>
                        {analysis.details.length > 0 && (
                          <ul style={{
                            margin: '0 0 8px 0',
                            paddingLeft: '16px',
                            fontSize: '11px',
                            lineHeight: '1.3'
                          }}>
                            {analysis.details.map((detail, idx) => {
                              // Color coding for parameter status
                              let backgroundColor = 'transparent';
                              let color = 'inherit';
                              let icon = '';

                              if (detail.matchStatus === 'matched') {
                                backgroundColor = '#d4edda';
                                color = '#155724';
                                icon = '✓ ';
                              } else if (detail.matchStatus === 'missing' && detail.isRequired) {
                                backgroundColor = '#f8d7da';
                                color = '#721c24';
                                icon = '✗ ';
                              } else if (detail.matchStatus === 'missing' && !detail.isRequired) {
                                backgroundColor = '#fff3cd';
                                color = '#856404';
                                icon = '⚠ ';
                              }

                              return (
                                <li key={idx} style={{
                                  margin: '2px 0',
                                  padding: '2px 4px',
                                  borderRadius: '3px',
                                  backgroundColor,
                                  color,
                                  fontWeight: detail.isRequired ? 'bold' : 'normal'
                                }}>
                                  {icon}{detail.text}
                                  {detail.expectedType && detail.expectedType !== 'any' && (
                                    <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>
                                      {detail.expectedType === 'config'
                                        ? '(configuration parameter)'
                                        : `(expects ${detail.expectedType}, found ${detail.availableCount || 0})`
                                      }
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {analysis.executionNotes && (
                          <div style={{
                            fontSize: '10px',
                            fontStyle: 'italic',
                            color: '#666',
                            backgroundColor: '#f8f9fa',
                            padding: '4px',
                            borderRadius: '3px',
                            marginTop: '4px'
                          }}>
                            {analysis.executionNotes}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Story configuration
const meta: Meta<typeof EnhancedInteractiveDemo> = {
  title: 'Services/ToolFilterService',
  component: EnhancedInteractiveDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Interactive demonstration of the ToolFilterService for intelligent tool-feature matching with real data'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof EnhancedInteractiveDemo>;

/**
 * Interactive demonstration with real OutlineView integration and dynamic tool filtering based on feature selection.
 * Select features to see tools automatically enabled/disabled based on compatibility.
 */
export const EnhancedInteractive: Story = {
  render: () => <EnhancedInteractiveDemo />,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Interactive demonstration with real OutlineView integration and dynamic tool filtering based on feature selection. Select features to see tools automatically enabled/disabled based on compatibility.'
      }
    }
  }
};