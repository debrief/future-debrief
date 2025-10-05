/**
 * MCP Tool Index Generator
 *
 * Generates a JSON file containing tool metadata for MCP protocol.
 * This file is pre-generated at build time and loaded by the server.
 */

const fs = require('fs');
const path = require('path');

const tools = [
    {
        name: "debrief_get_features",
        description: "Get the complete feature collection from a plot",
        inputSchema: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "Optional plot filename. If omitted, uses the single open plot or returns error if multiple plots are open"
                }
            }
        }
    },
    {
        name: "debrief_set_features",
        description: "Replace the entire feature collection in a plot",
        inputSchema: {
            type: "object",
            properties: {
                featureCollection: {
                    type: "object",
                    description: "GeoJSON FeatureCollection to set"
                },
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            },
            required: ["featureCollection"]
        }
    },
    {
        name: "debrief_get_selection",
        description: "Get the currently selected features",
        inputSchema: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            }
        }
    },
    {
        name: "debrief_set_selection",
        description: "Set the selected features by ID",
        inputSchema: {
            type: "object",
            properties: {
                ids: {
                    type: "array",
                    items: {
                        anyOf: [
                            { type: "string" },
                            { type: "number" }
                        ]
                    },
                    description: "Feature IDs to select"
                },
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            },
            required: ["ids"]
        }
    },
    {
        name: "debrief_update_features",
        description: "Update specific features by ID",
        inputSchema: {
            type: "object",
            properties: {
                features: {
                    type: "array",
                    description: "Array of features to update (must have IDs)"
                },
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            },
            required: ["features"]
        }
    },
    {
        name: "debrief_add_features",
        description: "Add new features to the plot",
        inputSchema: {
            type: "object",
            properties: {
                features: {
                    type: "array",
                    description: "Array of features to add"
                },
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            },
            required: ["features"]
        }
    },
    {
        name: "debrief_delete_features",
        description: "Delete features by ID",
        inputSchema: {
            type: "object",
            properties: {
                ids: {
                    type: "array",
                    items: {
                        anyOf: [
                            { type: "string" },
                            { type: "number" }
                        ]
                    },
                    description: "Feature IDs to delete"
                },
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            },
            required: ["ids"]
        }
    },
    {
        name: "debrief_zoom_to_selection",
        description: "Zoom the map view to fit the selected features",
        inputSchema: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            }
        }
    },
    {
        name: "debrief_list_plots",
        description: "List all currently open plot files",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "debrief_get_time",
        description: "Get the current time state",
        inputSchema: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            }
        }
    },
    {
        name: "debrief_set_time",
        description: "Set the time state",
        inputSchema: {
            type: "object",
            properties: {
                timeState: {
                    type: "object",
                    properties: {
                        current: { type: "string" },
                        start: { type: "string" },
                        end: { type: "string" }
                    },
                    required: ["current", "start", "end"]
                },
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            },
            required: ["timeState"]
        }
    },
    {
        name: "debrief_get_viewport",
        description: "Get the current viewport state",
        inputSchema: {
            type: "object",
            properties: {
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            }
        }
    },
    {
        name: "debrief_set_viewport",
        description: "Set the viewport state",
        inputSchema: {
            type: "object",
            properties: {
                viewportState: {
                    type: "object",
                    properties: {
                        bounds: {
                            type: "array",
                            items: { type: "number" },
                            minItems: 4,
                            maxItems: 4
                        }
                    },
                    required: ["bounds"]
                },
                filename: {
                    type: "string",
                    description: "Optional plot filename"
                }
            },
            required: ["viewportState"]
        }
    },
    {
        name: "debrief_notify",
        description: "Show a notification message in VS Code",
        inputSchema: {
            type: "object",
            properties: {
                message: {
                    type: "string",
                    description: "Message to display"
                }
            },
            required: ["message"]
        }
    }
];

// Write to dist directory
const outputPath = path.join(__dirname, '..', 'dist', 'mcp-tools.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({ tools }, null, 2));

console.warn(`Generated MCP tool index at ${outputPath}`);
console.warn(`Total tools: ${tools.length}`);
