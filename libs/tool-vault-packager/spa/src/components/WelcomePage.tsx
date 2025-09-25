import type { GlobalToolIndexModel, Tool } from '../types';

interface WelcomePageProps {
  globalIndex: GlobalToolIndexModel | null;
  tools: Tool[];
  loading: boolean;
}

export function WelcomePage({ globalIndex, tools, loading }: WelcomePageProps) {
  if (loading) {
    return (
      <div className="welcome-container">
        <h1>Loading ToolVault...</h1>
      </div>
    );
  }

  if (!globalIndex && tools.length === 0) {
    return (
      <div className="welcome-container">
        <h1>ToolVault</h1>
        <p>No tools available. Check your MCP connection.</p>
      </div>
    );
  }

  const toolCount = tools.length;
  const vaultName = globalIndex?.description || 'ToolVault';
  const version = globalIndex?.version || 'Unknown';

  return (
    <div className="welcome-container">
      <h1>{vaultName}</h1>
      <div className="welcome-stats">
        <div className="stat-card">
          <h3>Version</h3>
          <p>{version}</p>
        </div>
        <div className="stat-card">
          <h3>Total Tools</h3>
          <p>{toolCount}</p>
        </div>
        {globalIndex?.packageInfo && (
          <>
            <div className="stat-card">
              <h3>Build Date</h3>
              <p>{new Date(globalIndex.packageInfo.buildDate).toLocaleDateString()}</p>
            </div>
            <div className="stat-card">
              <h3>Author</h3>
              <p>{globalIndex.packageInfo.author}</p>
            </div>
          </>
        )}
      </div>
      <div className="welcome-description">
        <h2>Getting Started</h2>
        <p>Select a tool from the sidebar to view details, execute with sample data, or explore the source code.</p>
        <p>Tools are loaded dynamically from MCP endpoints and include rich metadata for analysis.</p>
      </div>
      <div className="welcome-description">
        <h2>Schema Reference</h2>
        <p>
          Each tool now publishes JSON schema documentation in its Schemas tab. You can also download the
          aggregated tool catalog from{' '}
          <a href="/tools/list" target="_blank" rel="noopener noreferrer">/tools/list</a> when you need the raw index 3.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <a
            href="/ui/schemas/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ marginRight: '0.5rem' }}
          >
            📋 View Schemas
          </a>
          <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
            Interactive documentation for all JSON schemas
          </span>
        </div>
      </div>
    </div>
  );
}
