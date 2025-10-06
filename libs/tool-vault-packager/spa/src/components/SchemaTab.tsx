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
        const data = await mcpService.loadSchemaDocument(reference.path, tool.tool_url);
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
      {documents.map(doc => (
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
            <details className="schema-details" open>
              <summary>View schema JSON</summary>
              <pre className="schema-json">{JSON.stringify(doc.data, null, 2)}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
