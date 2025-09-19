import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PropertiesView } from './PropertiesView';

describe('PropertiesView', () => {
  it('renders the component', () => {
    render(<PropertiesView />);
    expect(screen.getByTestId('properties-view')).toBeInTheDocument();
    expect(screen.getByText('No properties to display')).toBeInTheDocument();
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

    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByTestId('property-name-input')).toBeInTheDocument();
    expect(screen.getByText('age')).toBeInTheDocument();
    expect(screen.getByTestId('property-age-input')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    const activeCheckbox = screen.getByTestId('property-active-input') as HTMLInputElement;
    expect(activeCheckbox.checked).toBe(true);
  });

  it('displays property types correctly', () => {
    const properties = [
      { key: 'name', value: 'Test' },
      { key: 'count', value: 42 },
      { key: 'enabled', value: true }
    ];

    render(<PropertiesView properties={properties} />);

    expect(screen.getByTestId('property-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('property-count-input')).toBeInTheDocument();
    const enabledCheckbox = screen.getByTestId('property-enabled-input') as HTMLInputElement;
    expect(enabledCheckbox.type).toBe('checkbox');
  });

  it('displays readonly state', () => {
    const { rerender } = render(<PropertiesView readonly={true} />);
    expect(screen.getByText('Read-only')).toBeInTheDocument();

    rerender(<PropertiesView readonly={false} />);
    expect(screen.queryByText('Read-only')).not.toBeInTheDocument();
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

    const inputs = screen.getAllByTestId('property-item-input');
    expect(inputs).toHaveLength(2);
    expect(screen.getAllByText('item')).toHaveLength(2);
  });
});