import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { ToolListResponse, Tool } from '@debrief/shared-types/src/types/tools/tool_list_response';
import type { DebriefFeature } from '@debrief/shared-types';
import { ToolFilterService } from '../services/ToolFilterService';
import './ToolExecuteButton.css';

export interface SelectedCommand {
  tool: Tool;
  parameters?: Record<string, unknown>;
}

export interface ToolExecuteButtonProps {
  toolList: ToolListResponse;
  selectedFeatures: DebriefFeature[];
  onCommandExecute: (command: SelectedCommand) => void;
  disabled?: boolean;
  buttonText?: string;
  menuPosition?: 'bottom' | 'top';
  enableSmartFiltering?: boolean;
  showAll?: boolean; // When true, shows all tools regardless of filtering. When false, shows only applicable tools
  showDescriptions?: boolean; // When true, shows tool descriptions in dropdown. When false, shows only names
}

export const ToolExecuteButton: React.FC<ToolExecuteButtonProps> = ({
  toolList,
  selectedFeatures,
  onCommandExecute,
  disabled = false,
  buttonText = 'Execute Tools',
  menuPosition = 'bottom',
  enableSmartFiltering = false,
  showAll = true, // Default to showing all tools for backward compatibility
  showDescriptions = true, // Default to showing descriptions for backward compatibility
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filterWarnings, setFilterWarnings] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toolFilterService = useMemo(() => new ToolFilterService(), []);

  // Get applicable tools from filter service and track which tools are available
  const { availableTools, applicableToolNames, warnings } = useMemo(() => {
    if (!enableSmartFiltering || !toolList.tools) {
      // Phase 1: Show all tools, all are considered applicable
      const tools = toolList.tools || [];
      const toolNames = new Set(tools.map(tool => tool.name));
      return { availableTools: tools, applicableToolNames: toolNames, warnings: [] };
    }

    // Phase 2: Use ToolFilterService
    try {
      const toolsData = { tools: toolList.tools };
      const result = toolFilterService.getApplicableTools(selectedFeatures, toolsData);
      const applicableNames = new Set(result.tools.map(tool => tool.name));

      // Return filtered tools or all tools based on showAll prop
      const tools = showAll ? toolList.tools || [] : result.tools;

      // Determine warnings based on filtering state
      const warnings = !showAll ? result.warnings : [];

      return { availableTools: tools, applicableToolNames: applicableNames, warnings };
    } catch (error) {
      console.error('Error filtering tools:', error);
      const tools = toolList.tools || [];
      const toolNames = new Set(tools.map(tool => tool.name));
      return {
        availableTools: tools,
        applicableToolNames: toolNames,
        warnings: ['Error filtering tools - showing all available tools']
      };
    }
  }, [toolList.tools, selectedFeatures, enableSmartFiltering, showAll, toolFilterService]);

  // Update filter warnings based on computed results
  React.useEffect(() => {
    setFilterWarnings(warnings);
  }, [warnings]);

  // Apply search filtering to the available tools
  const searchFilteredTools = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableTools;
    }

    const query = searchQuery.toLowerCase();
    return availableTools.filter(tool =>
      tool.name.toLowerCase().includes(query) ||
      (tool.description && tool.description.toLowerCase().includes(query))
    );
  }, [availableTools, searchQuery]);

  const handleButtonClick = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const handleCommandSelect = useCallback((tool: Tool, isApplicable: boolean) => {
    // Only execute if tool is applicable
    if (!isApplicable) {
      return;
    }

    const command: SelectedCommand = {
      tool,
      parameters: {} // Could be extended later for parameter collection
    };

    onCommandExecute(command);
    setIsMenuOpen(false);
  }, [onCommandExecute]);

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
          </div>

          {/* Only show warnings when showAll is true - when filtering is disabled, warnings about filtered tools are not relevant */}
          {filterWarnings.length > 0 && showAll && (
            <div className="filter-warnings">
              {filterWarnings.map((warning, index) => (
                <div key={index} className="filter-warning">
                  ⚠️ {warning}
                </div>
              ))}
            </div>
          )}

          {searchFilteredTools.length === 0 ? (
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
              {searchFilteredTools.map((tool) => {
                const isApplicable = applicableToolNames.has(tool.name);
                const isDisabled = enableSmartFiltering && showAll && !isApplicable;

                return (
                  <button
                    key={tool.name}
                    className={`tool-menu-item ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => handleCommandSelect(tool, isApplicable)}
                    role="menuitem"
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                  >
                    <div className="tool-name">{tool.name}</div>
                    {showDescriptions && (
                      <div className="tool-description">{tool.description}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Only show the smart filtering note when showAll is true */}
          {enableSmartFiltering && selectedFeatures.length === 0 && showAll && (
            <div className="smart-filtering-note">
              Select features to see filtered tools
            </div>
          )}
        </div>
      )}
    </div>
  );
};