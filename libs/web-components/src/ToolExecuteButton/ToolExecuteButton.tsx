import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { Tool } from '@debrief/shared-types/src/types/tools/tool_list_response';
import type { GlobalToolIndexModel, Tool as ToolNode, ToolCategory } from '@debrief/shared-types/src/types/tools/global_tool_index';
import type { DebriefFeature } from '@debrief/shared-types';
import { useToolExecution } from '../contexts/ToolExecutionContext';
import './ToolExecuteButton.css';

// Helper to collect all tools from tree structure
function collectToolsFromTree(nodes: (ToolNode | ToolCategory)[]): Tool[] {
  const tools: Tool[] = [];
  for (const node of nodes) {
    if (node.type === 'tool') {
      tools.push(node);
    } else if (node.type === 'category' && node.children) {
      tools.push(...collectToolsFromTree(node.children));
    }
  }
  return tools;
}

export interface ToolExecuteButtonProps {
  toolList: GlobalToolIndexModel;
  selectedFeatures: DebriefFeature[];
  onCommandExecute: (tool: Tool) => void;
  disabled?: boolean;
  buttonText?: string;
  menuPosition?: 'bottom' | 'top';
  enableSmartFiltering?: boolean;
}

// Helper to collect all category keys for initial expansion
function collectCategoryKeys(nodes: (ToolNode | ToolCategory)[], depth = 0): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.type === 'category') {
      const categoryKey = `${depth}-${node.name}`;
      keys.push(categoryKey);
      if (node.children) {
        keys.push(...collectCategoryKeys(node.children, depth + 1));
      }
    }
  }
  return keys;
}

export const ToolExecuteButton: React.FC<ToolExecuteButtonProps> = ({
  toolList,
  selectedFeatures,
  onCommandExecute,
  disabled = false,
  buttonText = 'Run Tools',
  menuPosition = 'bottom',
  enableSmartFiltering = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filterWarnings, setFilterWarnings] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllState, setShowAllState] = useState(true); // Default to showing all tools
  const [showDescriptionsState, setShowDescriptionsState] = useState(true); // Default to showing descriptions

  // Initialize with all categories expanded
  const initialExpandedCategories = useMemo(() => {
    return new Set(collectCategoryKeys(toolList.root));
  }, [toolList.root]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(initialExpandedCategories);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get applicable tools from context - filtering happens once in the provider
  const { applicableTools, applicableToolNames, warnings: contextWarnings } = useToolExecution();

  // Collect all tools from tree structure for display purposes
  const allTools = useMemo(() => collectToolsFromTree(toolList.root), [toolList.root]);

  // Determine which tools to display based on showAllState and enableSmartFiltering
  const availableTools = useMemo(() => {
    if (!enableSmartFiltering || showAllState) {
      // Show all tools when filtering is disabled or showAll is toggled
      return allTools;
    }
    // Show only applicable tools when filtering is enabled and showAll is off
    return applicableTools;
  }, [enableSmartFiltering, showAllState, allTools, applicableTools]);

  // Determine warnings to display
  const warnings = useMemo(() => {
    if (!enableSmartFiltering || showAllState) {
      // No warnings when showing all tools
      return [];
    }
    // Show warnings when filtering is active
    return contextWarnings;
  }, [enableSmartFiltering, showAllState, contextWarnings]);

  // Update filter warnings based on computed results
  React.useEffect(() => {
    setFilterWarnings(warnings);
  }, [warnings]);

  // Filter tree nodes based on search query and applicable tools
  const filterTreeNodes = useCallback((nodes: (ToolNode | ToolCategory)[]): (ToolNode | ToolCategory)[] => {
    const query = searchQuery.toLowerCase();
    const filtered: (ToolNode | ToolCategory)[] = [];

    for (const node of nodes) {
      if (node.type === 'tool') {
        // Check if tool matches search and is in available tools
        const isAvailable = availableTools.some(t => t.name === node.name);
        const matchesSearch = !query ||
          node.name.toLowerCase().includes(query) ||
          (node.description && node.description.toLowerCase().includes(query));

        if (isAvailable && matchesSearch) {
          filtered.push(node);
        }
      } else if (node.type === 'category') {
        // Recursively filter category children
        const filteredChildren = filterTreeNodes(node.children);
        if (filteredChildren.length > 0) {
          filtered.push({
            ...node,
            children: filteredChildren
          });
        }
      }
    }

    return filtered;
  }, [searchQuery, availableTools]);

  const filteredTreeNodes = useMemo(() => {
    return filterTreeNodes(toolList.root);
  }, [toolList.root, filterTreeNodes]);

  const handleButtonClick = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const handleCommandSelect = useCallback((tool: Tool, isApplicable: boolean) => {
    // Only execute if tool is applicable
    if (!isApplicable) {
      return;
    }

    onCommandExecute(tool);
    setIsMenuOpen(false);
  }, [onCommandExecute]);

  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  }, []);

  const handleClickOutside = useCallback((event: Event) => {
    if (
      menuRef.current &&
      buttonRef.current &&
      !menuRef.current.contains(event.target as Node) &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setIsMenuOpen(false);
    }
  }, []);

  // Handle click outside to close menu
  React.useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMenuOpen, handleClickOutside]);

  // Recursive function to render tree nodes
  const renderTreeNodes = useCallback((nodes: (ToolNode | ToolCategory)[], depth = 0): React.ReactNode => {
    return nodes.map((node, index) => {
      if (node.type === 'tool') {
        const isApplicable = applicableToolNames.has(node.name);
        const isDisabled = enableSmartFiltering && showAllState && !isApplicable;

        return (
          <button
            key={`${depth}-${node.name}-${index}`}
            className={`tool-menu-item ${isDisabled ? 'disabled' : ''}`}
            style={{ paddingLeft: `${depth * 20 + 10}px` }}
            onClick={() => handleCommandSelect(node as Tool, isApplicable)}
            role="menuitem"
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            <div className="tool-name">{node.name}</div>
            {showDescriptionsState && (
              <div className="tool-description">{node.description}</div>
            )}
          </button>
        );
      } else if (node.type === 'category') {
        const categoryKey = `${depth}-${node.name}`;
        const isExpanded = expandedCategories.has(categoryKey);

        return (
          <div key={categoryKey} className="tool-category">
            <button
              className="category-header"
              style={{ paddingLeft: `${depth * 20 + 10}px` }}
              onClick={() => toggleCategory(categoryKey)}
              type="button"
              aria-expanded={isExpanded}
            >
              <span className="category-arrow">{isExpanded ? '▼' : '▶'}</span>
              <span className="category-name">{node.name}</span>
            </button>
            {isExpanded && (
              <div className="category-children">
                {renderTreeNodes(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }
      return null;
    });
  }, [applicableToolNames, enableSmartFiltering, showAllState, showDescriptionsState,
      expandedCategories, toggleCategory, handleCommandSelect]);

  const menuClassName = `tool-execute-menu ${menuPosition === 'top' ? 'menu-top' : 'menu-bottom'}`;

  return (
    <div className="tool-execute-button-container">
      <button
        ref={buttonRef}
        className={`tool-execute-button ${disabled ? 'disabled' : ''}`}
        onClick={handleButtonClick}
        disabled={disabled}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
      >
        {buttonText}
        <span className="dropdown-arrow" aria-hidden="true">
          ▼
        </span>
      </button>

      {isMenuOpen && (
        <div ref={menuRef} className={menuClassName} role="menu">
          {/* Search box at the top */}
          <div className="search-box">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools..."
              className="search-input"
            />
            <div className="toggle-buttons">
              <button
                className={`toggle-button ${showAllState ? 'active' : ''}`}
                onClick={() => setShowAllState(!showAllState)}
                title="Show all tools"
                aria-label="Toggle show all tools"
                type="button"
              >
                <span className="toggle-icon">⊕</span>
              </button>
              <button
                className={`toggle-button ${showDescriptionsState ? 'active' : ''}`}
                onClick={() => setShowDescriptionsState(!showDescriptionsState)}
                title="Show descriptions"
                aria-label="Toggle show descriptions"
                type="button"
              >
                <span className="toggle-icon">ⓘ</span>
              </button>
            </div>
          </div>

          {/* Only show warnings when showAllState is true - when filtering is disabled, warnings about filtered tools are not relevant */}
          {filterWarnings.length > 0 && showAllState && (
            <div className="filter-warnings">
              {filterWarnings.map((warning, index) => (
                <div key={index} className="filter-warning">
                  ⚠️ {warning}
                </div>
              ))}
            </div>
          )}

          {filteredTreeNodes.length === 0 ? (
            <div className="no-tools-message">
              {searchQuery.trim() ? (
                `No tools found matching "${searchQuery}"`
              ) : (
                <>
                  No tools available
                  {enableSmartFiltering && selectedFeatures.length > 0 &&
                    ` for ${selectedFeatures.length} selected feature(s)`
                  }
                </>
              )}
            </div>
          ) : (
            <div className="tools-list">
              {renderTreeNodes(filteredTreeNodes)}
            </div>
          )}

          {/* Only show the smart filtering note when showAllState is true */}
          {enableSmartFiltering && selectedFeatures.length === 0 && showAllState && (
            <div className="smart-filtering-note">
              Select features to see filtered tools
            </div>
          )}
        </div>
      )}
    </div>
  );
};