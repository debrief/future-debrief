import { useCallback, useEffect, useState } from 'react';
import type { Tool, ToolFileReference, ToolIndexModel } from '../types';
import { mcpService } from '../services/mcpService';
import { LoadingError, NoDataWarning } from './Warning';

interface SchemaTabProps {
  tool: Tool;
  toolIndex: ToolIndexModel | null;
  loading: boolean;
}

interface SchemaDocumentState {
  reference: ToolFileReference;
  data: unknown | null;
  error: string | null;
  loading: boolean;
}

interface SchemaExplorerProps {
  data: unknown;
  label?: string;
  depth?: number;
}

function SchemaExplorer({ data, label, depth = 0 }: SchemaExplorerProps) {
  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const openByDefault = depth < 2;

  if (isObject) {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <details className="schema-node" open={openByDefault}>
        <summary>
          {label && <span className="schema-key">{label}</span>}
          <span className="schema-type">Object{entries.length ? ` (${entries.length})` : ''}</span>
        </summary>
        <div className="schema-children">
          {entries.map(([key, value]) => (
            <SchemaExplorer key={key} data={value} label={key} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }

  if (isArray) {
    return (
      <details className="schema-node" open={openByDefault}>
        <summary>
          {label && <span className="schema-key">{label}</span>}
          <span className="schema-type">Array ({data.length})</span>
        </summary>
        <div className="schema-children">
          {(data as unknown[]).map((item, index) => (
            <SchemaExplorer key={index} data={item} label={`[${index}]`} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }

  const primitiveType = data === null ? 'null' : typeof data;
  const displayValue = (() => {
    if (data === null) return 'null';
    if (primitiveType === 'string') return `"${data}"`;
    if (primitiveType === 'boolean') return data ? 'true' : 'false';
    if (data === undefined) return 'undefined';
    return String(data);
  })();

  return (
    <div className="schema-node">
      {label && <span className="schema-key">{label}</span>}
      <span className={`schema-type schema-type-${primitiveType}`}>{primitiveType}</span>
      <span className="schema-value">{displayValue}</span>
    </div>
  );
}

export function SchemaTab({ tool, toolIndex, loading }: SchemaTabProps) {
  const [documents, setDocuments] = useState<SchemaDocumentState[]>([]);

  const schemaReferences = toolIndex?.files.schemas || [];

  const loadDocument = useCallback(
    async (reference: ToolFileReference) => {
      setDocuments(prev => prev.map(doc => (
        doc.reference.path === reference.path
          ? { ...doc, loading: true, error: null }
          : doc
      )));

      try {
        const data = await mcpService.loadSchemaDocument(reference.path, tool.name);
        setDocuments(prev => prev.map(doc => (
          doc.reference.path === reference.path
            ? { ...doc, data, loading: false }
            : doc
        )));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setDocuments(prev => prev.map(doc => (
          doc.reference.path === reference.path
            ? { ...doc, error: message, loading: false }
            : doc
        )));
      }
    },
    [tool.name]
  );

  useEffect(() => {
    if (!schemaReferences.length) {
      setDocuments([]);
      return;
    }

    const initialDocs = schemaReferences.map((reference: ToolFileReference) => ({
      reference,
      data: null,
      error: null,
      loading: true,
    }));
    setDocuments(initialDocs);

    schemaReferences.forEach((reference: ToolFileReference) => {
      void loadDocument(reference);
    });
  }, [schemaReferences, loadDocument]);

  const handleCopy = async (data: unknown) => {
    if (data == null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert('Schema JSON copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy schema to clipboard:', err);
    }
  };

  const buildDownloadUrl = (path: string) => `/api/tools/${tool.name}/${path}`;

  if (loading) {
    return <div className="tab-loading">Loading schema documentation...</div>;
  }

  if (!schemaReferences.length) {
    return (
      <NoDataWarning
        title="No schema documentation"
        message="This tool does not have generated schema documentation yet."
        suggestion="Run the packaging process to generate JSON schema files for the tool's parameters and outputs."
      />
    );
  }

  return (
    <div className="schema-tab">
      {documents.map(doc => {
        const isRenderableObject = typeof doc.data === 'object' && doc.data !== null;
        return (
          <div className="schema-card" key={doc.reference.path}>
            <div className="schema-card-header">
              <div className="schema-card-meta">
                <h4>{doc.reference.description || 'Schema'}</h4>
                <code className="schema-path">{doc.reference.path}</code>
              </div>
              <div className="schema-card-actions">
                <button
                  className="schema-action-button"
                  onClick={() => handleCopy(doc.data)}
                  disabled={doc.loading || doc.data == null}
                >
                  Copy JSON
                </button>
                <a
                  className="schema-action-link"
                  href={buildDownloadUrl(doc.reference.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Raw
                </a>
              </div>
            </div>

            {doc.loading && (
              <div className="schema-loading">Fetching schema...</div>
            )}

            {doc.error && !doc.loading && (
              <LoadingError
                resource="schema document"
                error={doc.error}
                onRetry={() => loadDocument(doc.reference)}
              />
            )}

            {!doc.loading && !doc.error && doc.data != null && (
              <div className="schema-content">
                {isRenderableObject && (
                  <details className="schema-details" open>
                    <summary>Interactive schema explorer</summary>
                    <div className="schema-json-viewer" role="region" aria-label="Schema explorer">
                      <SchemaExplorer data={doc.data} depth={0} />
                    </div>
                  </details>
                )}
                <details className="schema-details">
                  <summary>View raw JSON</summary>
                  <pre className="schema-json">{JSON.stringify(doc.data, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
