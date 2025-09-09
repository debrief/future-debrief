import type { GlobalIndex, MCPTool } from '../types';

interface WelcomePageProps {
  globalIndex: GlobalIndex | null;
  tools: MCPTool[];
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
    </div>
  );
}