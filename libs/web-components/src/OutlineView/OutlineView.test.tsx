import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OutlineView } from './OutlineView';
import type { DebriefFeatureCollection } from '@debrief/shared-types/src/types/features/debrief_feature_collection';

const sampleFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'feature-1',
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      properties: {
        dataType: 'point',
        name: 'Feature One'
      }
    }
  ]
};

describe('OutlineView', () => {
  it('renders toolbar content when provided', () => {
    render(
      <OutlineView
        featureCollection={sampleFeatureCollection}
        selectedFeatureIds={[]}
        onSelectionChange={jest.fn()}
        toolbarItems={[<span key="custom">Custom Toolbar</span>]}
      />
    );

    expect(screen.getByText('Custom Toolbar')).toBeInTheDocument();
  });

  it('invokes onSelectionChange with selected ids from tree event', () => {
    const handleSelectionChange = jest.fn();

    render(
      <OutlineView
        featureCollection={sampleFeatureCollection}
        selectedFeatureIds={[]}
        onSelectionChange={handleSelectionChange}
      />
    );

    const tree = screen.getByTestId('outline-view-tree');
    const eventDetail = { selectedItems: [{ id: 'feature-1' }, { id: null }] };

    fireEvent(
      tree,
      new CustomEvent('vsc-tree-select', {
        detail: eventDetail
      })
    );

    expect(handleSelectionChange).toHaveBeenCalledWith(['feature-1']);
  });

  it('extracts ids from HTMLElement-like selected items', () => {
    const handleSelectionChange = jest.fn();

    render(
      <OutlineView
        featureCollection={sampleFeatureCollection}
        selectedFeatureIds={[]}
        onSelectionChange={handleSelectionChange}
      />
    );

    const tree = screen.getByTestId('outline-view-tree');
    const mockElement = {
      getAttribute: (name: string) => (name === 'id' ? 'feature-1' : null)
    };

    fireEvent(
      tree,
      new CustomEvent('vsc-tree-select', {
        detail: { selectedItems: [mockElement] }
      })
    );

    expect(handleSelectionChange).toHaveBeenCalledWith(['feature-1']);
  });
});
