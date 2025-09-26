import { useState } from 'react';
import type { Tool } from '../types';

interface SidebarProps {
  tools: Tool[];
  selectedTool: Tool | null;
  onToolSelect: (tool: Tool | null) => void;
  loading: boolean;
}

export function Sidebar({ tools, selectedTool, onToolSelect, loading }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 
          className="vault-title" 
          onClick={() => onToolSelect(null)}
          style={{ cursor: 'pointer' }}
        >
          ToolVault
        </h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="tools-list">
        {loading ? (
          <div className="loading-message">Loading tools...</div>
        ) : filteredTools.length === 0 ? (
          <div className="no-tools-message">
            {searchTerm ? 'No tools match your search.' : 'No tools available.'}
          </div>
        ) : (
          filteredTools.map((tool) => (
            <div
              key={tool.name}
              className={`tool-item ${selectedTool?.name === tool.name ? 'selected' : ''}`}
              onClick={() => onToolSelect(tool)}
              data-testid={`tool-${tool.name}`}
              data-tool-name={tool.name}
            >
              <div className="tool-name">{tool.name}</div>
              <div className="tool-description">{tool.description}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}