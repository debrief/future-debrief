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

  const availableTools = useMemo(() => {
    if (!enableSmartFiltering || !toolList.tools) {
      // Phase 1: Show all tools
      return toolList.tools || [];
    }

    // Phase 2: Use ToolFilterService but respect showAll setting
    try {
      const toolsData = { tools: toolList.tools };
      const result = toolFilterService.getApplicableTools(selectedFeatures, toolsData);

      // Update warnings only when filtering is active
      if (!showAll) {
        setFilterWarnings(result.warnings);
      } else {
        setFilterWarnings([]); // Clear warnings when showing all
      }

      // Return filtered tools or all tools based on showAll prop
      return showAll ? toolList.tools || [] : result.tools;
    } catch (error) {
      console.error('Error filtering tools:', error);
      setFilterWarnings(['Error filtering tools - showing all available tools']);
      return toolList.tools || [];
    }
  }, [toolList.tools, selectedFeatures, enableSmartFiltering, showAll, toolFilterService]);

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

  const handleCommandSelect = useCallback((tool: Tool) => {
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
              {searchFilteredTools.map((tool) => (
                <button
                  key={tool.name}
                  className="tool-menu-item"
                  onClick={() => handleCommandSelect(tool)}
                  role="menuitem"
                >
                  <div className="tool-name">{tool.name}</div>
                  {showDescriptions && (
                    <div className="tool-description">{tool.description}</div>
                  )}
                </button>
              ))}
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