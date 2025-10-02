import React, { createContext, useContext, useMemo } from 'react';
import type { GlobalToolIndexModel, Tool, ToolCategory } from '@debrief/shared-types/src/types/tools/global_tool_index';
import type { DebriefFeature } from '@debrief/shared-types';
import { ToolFilterService } from '../services/ToolFilterService';

/**
 * Enhanced tool type that includes category information
 */
export interface ToolWithCategory extends Tool {
  category?: string;
}

/**
 * Context value providing tool execution capabilities
 */
export interface ToolExecutionContextValue {
  /** Tools that are applicable to all selected features (intersection semantics) */
  applicableTools: ToolWithCategory[];
  /** Set of applicable tool names for quick lookup */
  applicableToolNames: Set<string>;
  /** Warnings from the filtering process */
  warnings: string[];
  /** Execute a tool command */
  executeToolCommand: (tool: Tool) => void;
}

const ToolExecutionContext = createContext<ToolExecutionContextValue | null>(null);

/**
 * Helper to collect all tools from tree structure, preserving category information
 */
function collectToolsFromTree(nodes: Array<Tool | ToolCategory>, parentCategory?: string): ToolWithCategory[] {
  const tools: ToolWithCategory[] = [];
  for (const node of nodes) {
    if (node.type === 'tool') {
      // Add tool with category information
      tools.push({ ...(node as Tool), category: parentCategory });
    } else if (node.type === 'category' && 'children' in node && Array.isArray(node.children)) {
      // Recurse into category with the category name
      tools.push(...collectToolsFromTree(node.children, node.name));
    }
  }
  return tools;
}

export interface ToolExecutionProviderProps {
  /** The tool list containing all available tools */
  toolList: GlobalToolIndexModel;
  /** Currently selected features */
  selectedFeatures: DebriefFeature[];
  /** Callback when a tool should be executed */
  onCommandExecute: (tool: Tool, selectedFeatures: DebriefFeature[]) => void;
  /** Child components */
  children: React.ReactNode;
}

/**
 * Provider component that manages tool execution state and filtering.
 * This performs tool applicability filtering exactly once per selection change,
 * with results shared by all consumers (ToolExecuteButton, context menu, etc.)
 */
export const ToolExecutionProvider: React.FC<ToolExecutionProviderProps> = ({
  toolList,
  selectedFeatures,
  onCommandExecute,
  children,
}) => {
  // Create a singleton instance of ToolFilterService to ensure caching works properly
  const toolFilterService = useMemo(() => new ToolFilterService(), []);

  // Compute applicable tools exactly once per selection change
  // This is the CRITICAL performance requirement - filtering happens once and is shared
  const { applicableTools, applicableToolNames, warnings } = useMemo(() => {
    // Collect all tools from tree structure
    const allTools = collectToolsFromTree(toolList.root);

    if (allTools.length === 0) {
      return { applicableTools: [], applicableToolNames: new Set<string>(), warnings: [] };
    }

    try {
      const toolsData = { tools: allTools };
      const result = toolFilterService.getApplicableTools(selectedFeatures, toolsData);
      const applicableNames = new Set(result.tools.map(tool => tool.name));

      return {
        applicableTools: result.tools,
        applicableToolNames: applicableNames,
        warnings: result.warnings
      };
    } catch (error) {
      console.error('Error filtering tools:', error);
      return {
        applicableTools: allTools,
        applicableToolNames: new Set(allTools.map(tool => tool.name)),
        warnings: ['Error filtering tools - showing all available tools']
      };
    }
  }, [toolList.root, selectedFeatures, toolFilterService]);

  // Wrap the command execution callback to include selected features
  const executeToolCommand = useMemo(
    () => (tool: Tool) => {
      onCommandExecute(tool, selectedFeatures);
    },
    [onCommandExecute, selectedFeatures]
  );

  const contextValue: ToolExecutionContextValue = useMemo(
    () => ({
      applicableTools,
      applicableToolNames,
      warnings,
      executeToolCommand,
    }),
    [applicableTools, applicableToolNames, warnings, executeToolCommand]
  );

  return (
    <ToolExecutionContext.Provider value={contextValue}>
      {children}
    </ToolExecutionContext.Provider>
  );
};

/**
 * Hook to access tool execution context.
 * Must be used within a ToolExecutionProvider.
 */
export function useToolExecution(): ToolExecutionContextValue {
  const context = useContext(ToolExecutionContext);
  if (!context) {
    throw new Error('useToolExecution must be used within a ToolExecutionProvider');
  }
  return context;
}
