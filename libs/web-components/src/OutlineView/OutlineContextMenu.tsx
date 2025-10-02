import React, { useEffect, useRef, useCallback } from 'react';
import type { Tool } from '@debrief/shared-types/src/types/tools/global_tool_index';
import { useToolExecution, type ToolWithCategory } from '../contexts/ToolExecutionContext';
import './OutlineContextMenu.css';

export interface OutlineContextMenuProps {
  /** Position where the menu should appear */
  position: { x: number; y: number };
  /** Callback when a tool is selected */
  onToolSelect: (tool: Tool) => void;
  /** Callback when the menu should close */
  onClose: () => void;
}

/**
 * Group tools by their category property.
 * Tools come with a category property attached from the tree structure.
 */
function groupToolsByCategory(tools: ToolWithCategory[]): Map<string, ToolWithCategory[]> {
  const categories = new Map<string, ToolWithCategory[]>();

  for (const tool of tools) {
    // Use the category property that was preserved when collecting tools from the tree
    const category = tool.category || 'uncategorized';

    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(tool);
  }

  return categories;
}

/**
 * Context menu component that displays applicable tools organized by category.
 * Consumes ToolExecutionContext to get filtered tools.
 */
export const OutlineContextMenu: React.FC<OutlineContextMenuProps> = ({
  position,
  onToolSelect,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { applicableTools } = useToolExecution();
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  // Group tools by category
  const categorizedTools = React.useMemo(
    () => groupToolsByCategory(applicableTools),
    [applicableTools]
  );

  // Initialize all categories as expanded
  React.useEffect(() => {
    setExpandedCategories(new Set(Array.from(categorizedTools.keys())));
  }, [categorizedTools]);

  // Handle click outside to close menu
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    // Add click outside listener after a short delay to avoid closing immediately
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Handle Escape key to close menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleToolClick = (tool: Tool) => {
    onToolSelect(tool);
    onClose();
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // If no applicable tools, show a message
  if (applicableTools.length === 0) {
    return (
      <div
        ref={menuRef}
        className="outline-context-menu"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className="context-menu-empty">No applicable tools</div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="outline-context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {Array.from(categorizedTools.entries()).map(([category, tools]) => {
        const isExpanded = expandedCategories.has(category);

        return (
          <div key={category} className="context-menu-category">
            <button
              className="context-menu-category-header"
              onClick={() => toggleCategory(category)}
              type="button"
            >
              <span className="category-arrow">{isExpanded ? '▼' : '▶'}</span>
              <span className="category-name">{category}</span>
            </button>
            {isExpanded && (
              <div className="context-menu-category-items">
                {tools.map((tool) => (
                  <button
                    key={tool.name}
                    className="context-menu-item"
                    onClick={() => handleToolClick(tool)}
                    type="button"
                  >
                    <span className="tool-name">{tool.name}</span>
                    {tool.description && (
                      <span className="tool-description">{tool.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
