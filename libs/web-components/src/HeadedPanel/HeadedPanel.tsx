import React from 'react';
import { VscodeLabel } from '@vscode-elements/react-elements';
import './HeadedPanel.css';

export interface HeadedPanelProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}

export const HeadedPanel: React.FC<HeadedPanelProps> = ({
  title,
  icon,
  children,
  className = '',
  style,
  contentStyle,
}) => {
  return (
    <div className={`headed-panel ${className}`} data-testid="headed-panel" style={style}>
      <div className="headed-panel-header" data-testid="headed-panel-header">
        {icon && <span className="headed-panel-icon">{icon}</span>}
        <VscodeLabel className="headed-panel-title">{title}</VscodeLabel>
      </div>
      <div className="headed-panel-content" data-testid="headed-panel-content" style={contentStyle}>
        {children}
      </div>
    </div>
  );
};
