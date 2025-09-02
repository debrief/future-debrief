import React from 'react';

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
  onPropertyChange: _onPropertyChange,
  readonly = false,
  className = '',
}) => {
  return (
    <div className={`properties-view ${className}`} data-testid="properties-view">
      <div>PropertiesView Placeholder</div>
      <h3>{title}</h3>
      <div className="properties-list">
        {properties.length === 0 ? (
          <div>No properties to display</div>
        ) : (
          properties.map((property, index) => (
            <div key={`${property.key}-${index}`} className="property-item">
              <span className="property-key">{property.key}:</span>
              <span className="property-value">{String(property.value)}</span>
              <span className="property-type">({typeof property.value})</span>
            </div>
          ))
        )}
      </div>
      <div>Read-only: {readonly ? 'Yes' : 'No'}</div>
    </div>
  );
};