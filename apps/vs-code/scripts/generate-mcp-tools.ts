/**
 * Generate MCP tool index for Debrief State Server
 *
 * This script generates a JSON file containing tool definitions
 * for the Model Context Protocol (MCP) implementation.
 * The tools expose Debrief plot manipulation capabilities to LLM clients.
 */

import * as fs from 'fs';
import * as path from 'path';

interface McpTool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, unknown>;
        required?: string[];
    };
}

interface McpToolIndex {
    tools: McpTool[];
}

/**
 * Define Debrief State Server MCP tools
 */
const tools: McpTool[] = [
    {
        name: 'debrief_get_selection',
        description: 'Get the currently selected feature IDs from a Debrief plot',
        inputSchema: {
            type: 'object',
            properties: {
                filename: {
                    type: 'string',
                    description: 'Optional filename of the plot file (e.g., "mission1.plot.json"). If omitted and only one plot is open, it will be used automatically.'
                }
            }
        }
    },
    {
        name: 'debrief_get_features',
        description: 'Get the complete GeoJSON FeatureCollection from a Debrief plot, including all tracks, points, and annotations',
        inputSchema: {
            type: 'object',
            properties: {
                filename: {
                    type: 'string',
                    description: 'Optional filename of the plot file. If omitted and only one plot is open, it will be used automatically.'
                }
            }
        }
    },
    {
        name: 'debrief_apply_command',
        description: 'Apply a DebriefCommand to update the plot state. This can update the FeatureCollection, modify features, or trigger plot operations.',
        inputSchema: {
            type: 'object',
            properties: {
                command: {
                    type: 'object',
                    description: 'The DebriefCommand object containing the operation to perform and its parameters'
                },
                filename: {
                    type: 'string',
                    description: 'Optional filename of the plot file. If omitted and only one plot is open, it will be used automatically.'
                }
            },
            required: ['command']
        }
    },
    {
        name: 'debrief_get_time',
        description: 'Get the current time state (current time, start time, end time) for a Debrief plot',
        inputSchema: {
            type: 'object',
            properties: {
                filename: {
                    type: 'string',
                    description: 'Optional filename of the plot file. If omitted and only one plot is open, it will be used automatically.'
                }
            }
        }
    },
    {
        name: 'debrief_set_time',
        description: 'Set the time state (current time, start time, end time) for a Debrief plot. Useful for temporal analysis and time-based filtering.',
        inputSchema: {
            type: 'object',
            properties: {
                timeState: {
                    type: 'object',
                    description: 'TimeState object with "current", "start", and "end" properties (all ISO 8601 timestamp strings)',
                    properties: {
                        current: {
                            type: 'string',
                            description: 'Current time (ISO 8601 format)'
                        },
                        start: {
                            type: 'string',
                            description: 'Start time of the temporal range (ISO 8601 format)'
                        },
                        end: {
                            type: 'string',
                            description: 'End time of the temporal range (ISO 8601 format)'
                        }
                    }
                },
                filename: {
                    type: 'string',
                    description: 'Optional filename of the plot file. If omitted and only one plot is open, it will be used automatically.'
                }
            },
            required: ['timeState']
        }
    },
    {
        name: 'debrief_get_viewport',
        description: 'Get the current viewport bounds (geographic bounding box) for a Debrief plot map',
        inputSchema: {
            type: 'object',
            properties: {
                filename: {
                    type: 'string',
                    description: 'Optional filename of the plot file. If omitted and only one plot is open, it will be used automatically.'
                }
            }
        }
    },
    {
        name: 'debrief_set_viewport',
        description: 'Set the viewport bounds for a Debrief plot map. This pans and zooms the map to show the specified geographic area.',
        inputSchema: {
            type: 'object',
            properties: {
                viewportState: {
                    type: 'object',
                    description: 'ViewportState object with "bounds" property (array of 4 numbers: [west, south, east, north])',
                    properties: {
                        bounds: {
                            type: 'array',
                            description: 'Geographic bounding box as [west, south, east, north] in decimal degrees',
                            items: {
                                type: 'number'
                            },
                            minItems: 4,
                            maxItems: 4
                        }
                    }
                },
                filename: {
                    type: 'string',
                    description: 'Optional filename of the plot file. If omitted and only one plot is open, it will be used automatically.'
                }
            },
            required: ['viewportState']
        }
    }
];

/**
 * Generate and write the MCP tool index
 */
function generateToolIndex(): void {
    const toolIndex: McpToolIndex = { tools };

    // Output path relative to compiled dist directory
    const outputDir = path.join(__dirname, '..', 'dist');
    const outputPath = path.join(outputDir, 'mcp-tools.json');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write tool index
    fs.writeFileSync(outputPath, JSON.stringify(toolIndex, null, 2), 'utf-8');

    console.warn(`✅ Generated MCP tool index: ${outputPath}`);
    console.warn(`   ${tools.length} tools defined`);
}

// Run generation
generateToolIndex();
