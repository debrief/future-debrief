import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OutlineViewParent } from './OutlineViewParent';
import type { DebriefFeature, DebriefFeatureCollection } from '@debrief/shared-types';
import type { ToolListResponse } from '@debrief/shared-types/src/types/tools/tool_list_response';
import type { SelectedCommand } from '../ToolExecuteButton/ToolExecuteButton';

const meta: Meta<typeof OutlineViewParent> = {
  title: 'Components/OutlineViewParent',
  component: OutlineViewParent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The **OutlineViewParent** component combines the maritime OutlineView tree with the ToolExecuteButton action menu.

Use this composite when you need to:
- React to selection changes in OutlineView and feed them directly into tool execution
- Surface tool availability derived from maritime feature selection
- Prepare for VS Code integration by logging tool execution payloads to the console

For basic outline-only scenarios continue using **OutlineView**. For scenarios that need tool orchestration in the webview, switch to **OutlineViewParent** so tool coordination lives in a dedicated integration layer.
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof OutlineViewParent>;

interface OutlineViewParentDemoProps {
  initialSelection?: string[];
  initialSmartFiltering?: boolean;
  initialShowAllTools?: boolean;
  initialShowDescriptions?: boolean;
}

interface SampleDataState {
  featureCollection: DebriefFeatureCollection | null;
  toolList: ToolListResponse | null;
  loading: boolean;
  error: string | null;
}

const SAMPLE_FEATURES_URL = '/large-sample.plot.json';
const SAMPLE_TOOLS_URL = '/tool-index.json';

const useSampleData = (): SampleDataState => {
  const [state, setState] = React.useState<SampleDataState>({
    featureCollection: null,
    toolList: null,
    loading: true,
    error: null
  });

  React.useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [featureResponse, toolResponse] = await Promise.all([
          fetch(SAMPLE_FEATURES_URL),
          fetch(SAMPLE_TOOLS_URL)
        ]);

        if (!featureResponse.ok) {
          throw new Error(`Failed to load feature data (${featureResponse.status})`);
        }
        if (!toolResponse.ok) {
          throw new Error(`Failed to load tool data (${toolResponse.status})`);
        }

        const featureJson = await featureResponse.json();
        const toolJson = await toolResponse.json();

        if (!cancelled) {
          setState({
            featureCollection: featureJson as DebriefFeatureCollection,
            toolList: toolJson as ToolListResponse,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            featureCollection: null,
            toolList: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error when loading sample data'
          });
          console.error('[OutlineViewParent stories] Failed to load sample data', error);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};

const OutlineViewParentDemo: React.FC<OutlineViewParentDemoProps> = ({
  initialSelection = [],
  initialSmartFiltering = true,
  initialShowAllTools = false,
  initialShowDescriptions = true
}) => {
  const { featureCollection, toolList, loading, error } = useSampleData();
  const [selection, setSelection] = React.useState<string[]>(initialSelection);
  const [enableSmartFiltering, setEnableSmartFiltering] = React.useState(initialSmartFiltering);
  const [showAllTools, setShowAllTools] = React.useState(initialShowAllTools);
  const [showDescriptions, setShowDescriptions] = React.useState(initialShowDescriptions);
  const [lastCommandSummary, setLastCommandSummary] = React.useState<string | null>(null);

  const selectedFeatureDetails = React.useMemo(() => {
    if (!featureCollection) {
      return [];
    }

    const featureMap = new Map<string, DebriefFeature>(
      featureCollection.features.map((feature) => [String(feature.id), feature as DebriefFeature])
    );

    return selection
      .map((id) => featureMap.get(id))
      .filter((feature): feature is DebriefFeature => Boolean(feature));
  }, [featureCollection, selection]);

  const handleCommandExecute = React.useCallback(
    (command: SelectedCommand, features: DebriefFeature[]) => {
      setLastCommandSummary(`${command.tool.name} executed on ${features.length} feature(s)`);
    },
    []
  );

  if (loading) {
    return (
      <div
        style={{
          padding: '24px',
          border: '1px solid #d0d0d5',
          borderRadius: '8px',
          background: '#f6f6f9'
        }}
      >
        <h3>Loading sample data…</h3>
        <p>Fetching `large-sample.plot.json` and `tool-index.json` from the Storybook public directory.</p>
      </div>
    );
  }

  if (error || !featureCollection || !toolList) {
    return (
      <div
        style={{
          padding: '24px',
          border: '1px solid #f0b4b4',
          borderRadius: '8px',
          background: '#fff5f5',
          color: '#8b2c2c'
        }}
      >
        <h3>Unable to load sample data</h3>
        <p>{error ?? 'Unknown error encountered while loading Storybook assets.'}</p>
        <p>Ensure `large-sample.plot.json` and `tool-index.json` are present in `.storybook/public/`.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '24px', height: '600px', alignItems: 'stretch' }}>
      <div
        style={{
          flex: '0 0 360px',
          minHeight: 0,
          backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
          color: 'var(--vscode-editor-foreground, #cccccc)',
          borderRadius: '8px',
          border: '1px solid var(--vscode-editorWidget-border, #3c3c3c)',
          overflow: 'hidden'
        }}
      >
        <OutlineViewParent
          featureCollection={featureCollection}
          toolList={toolList}
          selectedFeatureIds={selection}
          onSelectionChange={setSelection}
          onCommandExecute={handleCommandExecute}
          enableSmartFiltering={enableSmartFiltering}
          showAllTools={showAllTools}
          showToolDescriptions={showDescriptions}
          additionalToolbarContent={
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              {selection.length} selected
            </span>
          }
        />
      </div>

      <div
        style={{
          flex: 1,
          backgroundColor: '#f5f5f7',
          borderRadius: '8px',
          border: '1px solid #d0d0d5',
          padding: '16px',
          overflow: 'auto'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Mock State Controller</h3>
        <p style={{ marginBottom: '16px', color: '#505050' }}>
          This panel simulates the external state manager that would normally live in the VS Code
          extension. Adjust the toggles to see how OutlineViewParent reacts. After executing a
          tool, inspect the **browser console** for the detailed payload logged by the component.
        </p>

        <section style={{ marginBottom: '20px' }}>
          <h4>Selection State</h4>
          <p>Active selection: {selection.length} feature(s)</p>
          {selection.length > 0 ? (
            <ul>
              {selectedFeatureDetails.map((feature) => (
                <li key={String(feature.id)}>
                  {feature.properties?.name || feature.id} ({feature.properties?.dataType ?? 'unknown'})
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#777' }}>No features selected</p>
          )}
          <button
            type="button"
            style={{
              border: '1px solid #b0b0b5',
              background: '#ffffff',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={() => setSelection([])}
          >
            Clear selection
          </button>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h4>Tool Configuration</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
            <label>
              <input
                type="checkbox"
                checked={enableSmartFiltering}
                onChange={(event) => setEnableSmartFiltering(event.target.checked)}
              />{' '}
              Enable smart filtering
            </label>
            <label>
              <input
                type="checkbox"
                checked={showAllTools}
                onChange={(event) => setShowAllTools(event.target.checked)}
              />{' '}
              Show all tools
            </label>
            <label>
              <input
                type="checkbox"
                checked={showDescriptions}
                onChange={(event) => setShowDescriptions(event.target.checked)}
              />{' '}
              Show tool descriptions
            </label>
          </div>
        </section>

        <section>
          <h4>Last Command</h4>
          {lastCommandSummary ? (
            <>
              <code style={{ display: 'inline-block', padding: '4px 8px', background: '#fff', borderRadius: '4px' }}>
                {lastCommandSummary}
              </code>
              {selectedFeatureDetails.length > 0 && (
                <ul style={{ marginTop: '8px' }}>
                  {selectedFeatureDetails.map((feature) => (
                    <li key={`executed-${String(feature.id)}`}>
                      {feature.properties?.name || feature.id}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p style={{ color: '#777' }}>Execute a tool to populate this summary.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export const DefaultIntegration: Story = {
  render: () => <OutlineViewParentDemo />
};

export const SingleToolScenario: Story = {
  render: () => (
    <OutlineViewParentDemo
      initialSmartFiltering={false}
      initialShowDescriptions={false}
    />
  )
};

export const ConditionalAvailability: Story = {
  render: () => (
    <OutlineViewParentDemo
      initialSelection={[]}
      initialShowAllTools={false}
    />
  )
};
