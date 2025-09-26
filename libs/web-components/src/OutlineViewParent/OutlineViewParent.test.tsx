import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OutlineViewParent } from './OutlineViewParent';
import type { DebriefFeatureCollection } from '@debrief/shared-types/src/types/features/debrief_feature_collection';
import type { ToolListResponse } from '@debrief/shared-types/src/types/tools/tool_list_response';

const featureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'feature-1',
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1]
        ]
      },
      properties: {
        dataType: 'track',
        name: 'Test Track',
        timestamps: ['2024-01-01T00:00:00Z', '2024-01-01T00:05:00Z']
      }
    },
    {
      type: 'Feature',
      id: 'feature-2',
      geometry: {
        type: 'Point',
        coordinates: [0.5, 0.5]
      },
      properties: {
        dataType: 'point',
        name: 'Observation A'
      }
    }
  ]
};

const toolList: ToolListResponse = {
  tools: [
    {
      name: 'test-tool',
      description: 'Demo tool for testing',
      inputSchema: {
        type: 'object',
        properties: {
          track_feature: {
            description: 'Track feature input'
          }
        },
        required: ['track_feature'],
        additionalProperties: false
      },
      tool_url: '/tools/test-tool/tool.json'
    }
  ],
  version: '1.0.0',
  description: 'Test tool list'
};

describe('OutlineViewParent', () => {
  it('bridges selection changes to the execute button state and callback', async () => {
    const handleSelectionChange = jest.fn();

    render(
      <OutlineViewParent
        featureCollection={featureCollection}
        toolList={toolList}
        onSelectionChange={handleSelectionChange}
      />
    );

    const executeButton = screen.getByRole('button', { name: /Execute Tools/i });
    expect(executeButton).toBeDisabled();

  const tree = screen.getByTestId('outline-view-tree');
  fireEvent(
    tree,
    new CustomEvent('vsc-tree-select', {
      detail: { selectedItems: [{ id: 'feature-1' }] }
    })
  );

    await waitFor(() => expect(handleSelectionChange).toHaveBeenCalledWith(['feature-1']));
    await waitFor(() => expect(executeButton).not.toBeDisabled());
  });

  it('logs command execution and forwards payload when a tool is chosen', async () => {
    const handleCommandExecute = jest.fn();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      render(
        <OutlineViewParent
          featureCollection={featureCollection}
          toolList={toolList}
          defaultSelectedFeatureIds={['feature-1']}
          onCommandExecute={handleCommandExecute}
        />
      );

      const executeButton = screen.getByRole('button', { name: /Execute Tools/i });
      fireEvent.click(executeButton);

      const toolButton = await screen.findByText('test-tool');
      fireEvent.click(toolButton.closest('button') ?? toolButton);

      await waitFor(() => expect(handleCommandExecute).toHaveBeenCalledTimes(1));

      const [commandArg, featuresArg] = handleCommandExecute.mock.calls[0];
      expect(commandArg.tool.name).toBe('test-tool');
      expect(Array.isArray(featuresArg)).toBe(true);
      expect(featuresArg).toHaveLength(1);
      expect(featuresArg[0]?.id).toBe('feature-1');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OutlineViewParent] Executing tool command:',
        expect.objectContaining({
          tool: expect.objectContaining({ name: 'test-tool' })
        }),
        'Selected features:',
        expect.arrayContaining([
          expect.objectContaining({ id: 'feature-1' })
        ])
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
