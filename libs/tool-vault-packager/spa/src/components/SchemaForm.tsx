import { useState, useEffect, useCallback } from 'react';
import type { JSONSchema, JSONSchemaProperty } from '../types';

interface SchemaFormProps {
  schema: JSONSchema;
  initialValue?: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  className?: string;
}

interface FormFieldProps {
  name: string;
  property: JSONSchemaProperty;
  value: unknown;
  onChange: (value: unknown) => void;
  required: boolean;
  path: string[];
}

function FormField({ name, property, value, onChange, required, path }: FormFieldProps) {
  const fieldId = path.join('.');
  const label = name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');

  if (property.type === 'string') {
    if (property.enum) {
      return (
        <div className="form-field">
          <label htmlFor={fieldId} className={required ? 'required' : ''}>
            {label}
          </label>
          {property.description && (
            <div className="field-description">{property.description}</div>
          )}
          <select
            id={fieldId}
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            required={required}
          >
            {!required && <option value="">Select...</option>}
            {property.enum.map((option: unknown, index: number) => (
              <option key={index} value={String(option)}>
                {String(option)}
              </option>
            ))}
          </select>
        </div>
      );
    }

    const isMultiline = property.description?.toLowerCase().includes('text') || 
                       name.toLowerCase().includes('text') || 
                       name.toLowerCase().includes('content') ||
                       name.toLowerCase().includes('description');

    if (isMultiline) {
      return (
        <div className="form-field">
          <label htmlFor={fieldId} className={required ? 'required' : ''}>
            {label}
          </label>
          {property.description && (
            <div className="field-description">{property.description}</div>
          )}
          <textarea
            id={fieldId}
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder={property.default ? String(property.default) : undefined}
            required={required}
            rows={3}
          />
        </div>
      );
    }

    return (
      <div className="form-field">
        <label htmlFor={fieldId} className={required ? 'required' : ''}>
          {label}
        </label>
        {property.description && (
          <div className="field-description">{property.description}</div>
        )}
        <input
          id={fieldId}
          type="text"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={property.default ? String(property.default) : undefined}
          required={required}
        />
      </div>
    );
  }

  if (property.type === 'number' || property.type === 'integer') {
    return (
      <div className="form-field">
        <label htmlFor={fieldId} className={required ? 'required' : ''}>
          {label}
        </label>
        {property.description && (
          <div className="field-description">{property.description}</div>
        )}
        <input
          id={fieldId}
          type="number"
          step={property.type === 'integer' ? '1' : 'any'}
          value={value as number || ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              onChange(undefined);
            } else {
              const parsed = property.type === 'integer' ? parseInt(val, 10) : parseFloat(val);
              onChange(isNaN(parsed) ? undefined : parsed);
            }
          }}
          placeholder={property.default ? String(property.default) : undefined}
          required={required}
        />
      </div>
    );
  }

  if (property.type === 'boolean') {
    return (
      <div className="form-field">
        <label className="checkbox-label">
          <input
            id={fieldId}
            type="checkbox"
            checked={value as boolean || false}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className={required ? 'required' : ''}>{label}</span>
        </label>
        {property.description && (
          <div className="field-description">{property.description}</div>
        )}
      </div>
    );
  }

  if (property.type === 'array') {
    const arrayValue = (value as unknown[]) || [];
    
    const addItem = () => {
      const newItem = property.items?.type === 'string' ? '' :
                     property.items?.type === 'number' ? 0 :
                     property.items?.type === 'boolean' ? false :
                     property.items?.type === 'object' ? {} : null;
      onChange([...arrayValue, newItem]);
    };

    const removeItem = (index: number) => {
      const newArray = arrayValue.filter((_, i) => i !== index);
      onChange(newArray.length > 0 ? newArray : undefined);
    };

    const updateItem = (index: number, itemValue: unknown) => {
      const newArray = [...arrayValue];
      newArray[index] = itemValue;
      onChange(newArray);
    };

    return (
      <div className="form-field array-field">
        <label className={required ? 'required' : ''}>
          {label}
        </label>
        {property.description && (
          <div className="field-description">{property.description}</div>
        )}
        <div className="array-items">
          {arrayValue.map((item, index) => (
            <div key={index} className="array-item">
              {property.items && (
                <FormField
                  name={`item-${index}`}
                  property={property.items}
                  value={item}
                  onChange={(val) => updateItem(index, val)}
                  required={false}
                  path={[...path, index.toString()]}
                />
              )}
              <button
                type="button"
                className="remove-item-button"
                onClick={() => removeItem(index)}
                title="Remove item"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="add-item-button" onClick={addItem}>
          Add Item
        </button>
      </div>
    );
  }

  if (property.type === 'object' && property.properties) {
    const objectValue = (value as Record<string, unknown>) || {};
    
    const updateProperty = (propName: string, propValue: unknown) => {
      const newObject = { ...objectValue };
      if (propValue === undefined || propValue === null || propValue === '') {
        delete newObject[propName];
      } else {
        newObject[propName] = propValue;
      }
      onChange(Object.keys(newObject).length > 0 ? newObject : undefined);
    };

    return (
      <div className="form-field object-field">
        <fieldset>
          <legend className={required ? 'required' : ''}>{label}</legend>
          {property.description && (
            <div className="field-description">{property.description}</div>
          )}
          {Object.entries(property.properties).map(([propName, propSchema]) => (
            <FormField
              key={propName}
              name={propName}
              property={propSchema}
              value={objectValue[propName]}
              onChange={(val) => updateProperty(propName, val)}
              required={property.required?.includes(propName) || false}
              path={[...path, propName]}
            />
          ))}
        </fieldset>
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div className="form-field">
      <label htmlFor={fieldId} className={required ? 'required' : ''}>
        {label}
      </label>
      {property.description && (
        <div className="field-description">{property.description}</div>
      )}
      <textarea
        id={fieldId}
        value={typeof value === 'string' ? value : JSON.stringify(value || '', null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
          } catch {
            onChange(e.target.value);
          }
        }}
        placeholder="Enter JSON value"
        rows={3}
      />
    </div>
  );
}

export function SchemaForm({ schema, initialValue = {}, onChange, className }: SchemaFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialValue);

  // Update form data when initialValue changes
  useEffect(() => {
    setFormData(initialValue);
  }, [initialValue]);

  // Notify parent of changes
  const handleChange = useCallback((newData: Record<string, unknown>) => {
    setFormData(newData);
    onChange(newData);
  }, [onChange]);

  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return (
      <div className={`schema-form ${className || ''}`}>
        <div className="no-schema">
          No input parameters required for this tool.
        </div>
      </div>
    );
  }

  const updateTopLevelProperty = (propName: string, propValue: unknown) => {
    const newData = { ...formData };
    if (propValue === undefined || propValue === null || propValue === '') {
      delete newData[propName];
    } else {
      newData[propName] = propValue;
    }
    handleChange(newData);
  };

  return (
    <div className={`schema-form ${className || ''}`}>
      {Object.entries(schema.properties).map(([propName, propSchema]) => (
        <FormField
          key={propName}
          name={propName}
          property={propSchema}
          value={formData[propName]}
          onChange={(val) => updateTopLevelProperty(propName, val)}
          required={schema.required?.includes(propName) || false}
          path={[propName]}
        />
      ))}
    </div>
  );
}