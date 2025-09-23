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

  // Use the ToolFilterService to determine tool compatibility
  const getToolCompatibilityData = (selectedFeatures: DebriefFeature[]) => {
    if (!toolsData) return new Map();

    const result = service.getApplicableTools(selectedFeatures, toolsData);
    const applicableToolNames = new Set(result.tools.map(t => t.name));

    // Create a map with compatibility info for each tool
    const compatibilityMap = new Map();

    toolsData.tools.forEach(tool => {
      compatibilityMap.set(tool.name, {
        isCompatible: applicableToolNames.has(tool.name)
      });
    });

    return compatibilityMap;
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
                {(() => {
                  const compatibilityData = getToolCompatibilityData(selectedFeatures);

                  return toolsData.tools.map((tool: any, index: number) => {
                    const toolCompatibility = compatibilityData.get(tool.name) || { isCompatible: false };
                    const paramCount = tool.inputSchema?.properties ? Object.keys(tool.inputSchema.properties).length : 0;
                    const requiredCount = tool.inputSchema?.required?.length || 0;

                    return (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
                        opacity: toolCompatibility.isCompatible ? 1 : 0.6
                      }}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: toolCompatibility.isCompatible ? 'bold' : 'normal' }}>
                          {toolCompatibility.isCompatible ? '🟢' : '🔴'} {tool.name}
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                            {paramCount} parameter{paramCount !== 1 ? 's' : ''} ({requiredCount} required)
                          </div>
                          {tool.inputSchema?.properties && (
                            <ul style={{
                              margin: '0 0 8px 0',
                              paddingLeft: '16px',
                              fontSize: '11px',
                              lineHeight: '1.3'
                            }}>
                              {Object.entries(tool.inputSchema.properties).map(([paramName, schema]: [string, any], idx) => {
                                const isRequired = tool.inputSchema.required?.includes(paramName) || false;
                                const description = schema.description || 'No description';
                                const requiredFlag = isRequired ? ' (required)' : ' (optional)';

                                // Simple display - let ToolFilterService handle the actual validation
                                let backgroundColor = 'transparent';
                                let color = 'inherit';
                                let icon = '';

                                if (toolCompatibility.isCompatible) {
                                  // If tool is compatible, show all parameters as satisfied
                                  backgroundColor = '#d4edda';
                                  color = '#155724';
                                  icon = '✓ ';
                                } else {
                                  // If tool is not compatible, show required params as missing
                                  if (isRequired) {
                                    backgroundColor = '#f8d7da';
                                    color = '#721c24';
                                    icon = '✗ ';
                                  } else {
                                    backgroundColor = '#fff3cd';
                                    color = '#856404';
                                    icon = '⚠ ';
                                  }
                                }

                                return (
                                  <li key={idx} style={{
                                    margin: '2px 0',
                                    padding: '2px 4px',
                                    borderRadius: '3px',
                                    backgroundColor,
                                    color,
                                    fontWeight: isRequired ? 'bold' : 'normal'
                                  }}>
                                    {icon}{paramName}{requiredFlag}: {description}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {!toolCompatibility.isCompatible && (
                            <div style={{
                              fontSize: '10px',
                              fontStyle: 'italic',
                              color: '#666',
                              backgroundColor: '#f8f9fa',
                              padding: '4px',
                              borderRadius: '3px',
                              marginTop: '4px'
                            }}>
                              Tool validation handled by ToolFilterService
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
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