import { useState, useEffect } from 'react';

interface PrettySchemaDisplayProps {
  schema: Record<string, unknown>;
  toolName: string;
  fallbackToRaw?: boolean;
}

interface SchemaState {
  prettyHtml: string | null;
  loading: boolean;
  error: string | null;
  showRaw: boolean;
}

export function PrettySchemaDisplay({ schema, toolName, fallbackToRaw = true }: PrettySchemaDisplayProps) {
  const [state, setState] = useState<SchemaState>({
    prettyHtml: null,
    loading: true,
    error: null,
    showRaw: false
  });

  useEffect(() => {
    const loadSchemaDocumentation = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Fetch pretty-printed schema documentation from the API
        const response = await fetch(`/api/tools/${toolName}/schema-docs`);

        if (response.ok) {
          const htmlContent = await response.text();
          // Extract just the content div to embed in our component
          const contentMatch = htmlContent.match(/<div class="schema-content">(.*?)<\/div>/s);
          const prettyContent = contentMatch ? contentMatch[1] : htmlContent;

          setState(prev => ({
            ...prev,
            prettyHtml: prettyContent,
            loading: false
          }));
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.warn('Failed to load pretty-printed schema:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false
        }));
      }
    };

    if (toolName) {
      loadSchemaDocumentation();
    }
  }, [toolName]);

  const toggleView = () => {
    setState(prev => ({ ...prev, showRaw: !prev.showRaw }));
  };

  if (state.loading) {
    return (
      <div className="schema-section">
        <h3>Input Schema</h3>
        <div className="schema-loading">Loading schema documentation...</div>
      </div>
    );
  }

  if (state.error && !fallbackToRaw) {
    return (
      <div className="schema-section">
        <h3>Input Schema</h3>
        <div className="schema-error">
          Failed to load schema documentation: {state.error}
        </div>
      </div>
    );
  }

  const hasValidSchema = schema && Object.keys(schema).length > 0;
  const hasPrettyDocs = state.prettyHtml && !state.error;

  return (
    <div className="schema-section">
      <div className="schema-header">
        <h3>Input Schema</h3>
        {hasPrettyDocs && fallbackToRaw && (
          <button
            className="schema-toggle-btn"
            onClick={toggleView}
            type="button"
          >
            {state.showRaw ? 'Show Documentation' : 'Show Raw JSON'}
          </button>
        )}
      </div>

      {state.showRaw || (!hasPrettyDocs && hasValidSchema) ? (
        <div className="schema-display-container">
          {state.error && fallbackToRaw && (
            <div className="schema-warning">
              Pretty-printed documentation unavailable. Showing raw schema.
            </div>
          )}
          <pre className="schema-display">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </div>
      ) : hasPrettyDocs ? (
        <div
          className="schema-docs-display"
          dangerouslySetInnerHTML={{ __html: state.prettyHtml || '' }}
        />
      ) : (
        <div className="schema-empty">
          No schema information available for this tool.
        </div>
      )}
    </div>
  );
}