import React from 'react';
import { VscodeLabel, VscodeTextfield, VscodeCheckbox, VscodeDivider } from '@vscode-elements/react-elements';
import './PropertiesView.css';

export interface Property {
  key: string;
  value: string | number | boolean;
  type?: 'string' | 'number' | 'boolean';
}

export interface PropertiesViewProps {
  properties?: Property[];
  title?: string;
  onPropertyChange?: (key: string, value: string | number | boolean) => void;
  readonly?: boolean;
  className?: string;
}

export const PropertiesView: React.FC<PropertiesViewProps> = ({
  properties = [],
  title = 'Properties',
  onPropertyChange,
  readonly = false,
  className = '',
}) => {
  const handlePropertyChange = (key: string, newValue: string | number | boolean) => {
    if (onPropertyChange && !readonly) {
      onPropertyChange(key, newValue);
    }
  };

  const renderPropertyInput = (property: Property, index: number) => {
    const isReadonly = readonly;
    
    if (typeof property.value === 'boolean') {
      return (
        <VscodeCheckbox
          checked={property.value}
          disabled={isReadonly}
          onChange={(e: Event) => {
            const target = e.target as HTMLInputElement;
            handlePropertyChange(property.key, target.checked);
          }}
          data-testid={`property-${property.key}-input`}
        >
          {property.key}
        </VscodeCheckbox>
      );
    }
    
    return (
      <div className="property-row">
        <VscodeLabel className="property-label">
          {property.key}
        </VscodeLabel>
        <VscodeTextfield
          value={String(property.value)}
          disabled={isReadonly}
          type={typeof property.value === 'number' ? 'number' : 'text'}
          onChange={(e: Event) => {
            const target = e.target as HTMLInputElement;
            const newValue = typeof property.value === 'number' 
              ? parseFloat(target.value) || 0
              : target.value;
            handlePropertyChange(property.key, newValue);
          }}
          data-testid={`property-${property.key}-input`}
          className="property-input"
        />
      </div>
    );
  };

  return (
    <div className={`properties-view ${className}`} data-testid="properties-view">
      <div className="properties-header">
        <VscodeLabel className="properties-title">{title}</VscodeLabel>
        {readonly && (
          <VscodeLabel className="readonly-indicator">Read-only</VscodeLabel>
        )}
      </div>
      
      <VscodeDivider />
      
      <div className="properties-list">
        {properties.length === 0 ? (
          <VscodeLabel className="no-properties">No properties to display</VscodeLabel>
        ) : (
          properties.map((property, index) => (
            <div key={`${property.key}-${index}`} className="property-item">
              {renderPropertyInput(property, index)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};