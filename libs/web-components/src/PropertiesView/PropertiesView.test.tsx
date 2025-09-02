import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PropertiesView } from './PropertiesView';

describe('PropertiesView', () => {
  it('renders the component', () => {
    render(<PropertiesView />);
    expect(screen.getByTestId('properties-view')).toBeInTheDocument();
    expect(screen.getByText('PropertiesView Placeholder')).toBeInTheDocument();
  });

  it('displays default title', () => {
    render(<PropertiesView />);
    expect(screen.getByText('Properties')).toBeInTheDocument();
  });

  it('displays custom title', () => {
    render(<PropertiesView title="Custom Properties" />);
    expect(screen.getByText('Custom Properties')).toBeInTheDocument();
  });

  it('displays no properties message when empty', () => {
    render(<PropertiesView properties={[]} />);
    expect(screen.getByText('No properties to display')).toBeInTheDocument();
  });

  it('displays properties when provided', () => {
    const properties = [
      { key: 'name', value: 'Test Name' },
      { key: 'age', value: 25 },
      { key: 'active', value: true }
    ];
    
    render(<PropertiesView properties={properties} />);
    
    expect(screen.getByText('name:')).toBeInTheDocument();
    expect(screen.getByText('Test Name')).toBeInTheDocument();
    expect(screen.getByText('age:')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('active:')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('displays property types correctly', () => {
    const properties = [
      { key: 'name', value: 'Test' },
      { key: 'count', value: 42 },
      { key: 'enabled', value: true }
    ];
    
    render(<PropertiesView properties={properties} />);
    
    expect(screen.getByText('(string)')).toBeInTheDocument();
    expect(screen.getByText('(number)')).toBeInTheDocument();
    expect(screen.getByText('(boolean)')).toBeInTheDocument();
  });

  it('displays readonly state', () => {
    render(<PropertiesView readonly={true} />);
    expect(screen.getByText('Read-only: Yes')).toBeInTheDocument();
    
    render(<PropertiesView readonly={false} />);
    expect(screen.getByText('Read-only: No')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PropertiesView className="custom-class" />);
    const component = screen.getByTestId('properties-view');
    expect(component).toHaveClass('properties-view', 'custom-class');
  });

  it('handles multiple properties with same key', () => {
    const properties = [
      { key: 'item', value: 'first' },
      { key: 'item', value: 'second' }
    ];
    
    render(<PropertiesView properties={properties} />);
    
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });
});