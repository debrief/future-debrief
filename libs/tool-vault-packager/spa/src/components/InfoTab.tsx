import { useState, useEffect, useCallback } from 'react';
import type { Tool, ToolIndexModel, GitHistory, GitHistoryEntry } from '../types';
import { mcpService } from '../services/mcpService';

interface InfoTabProps {
  tool: Tool;
  toolIndex: ToolIndexModel | null;
  loading: boolean;
}

export function InfoTab({ tool, toolIndex, loading }: InfoTabProps) {
  const [gitHistory, setGitHistory] = useState<GitHistory | null>(null);
  const [gitLoading, setGitLoading] = useState(false);

  const loadGitHistory = useCallback(async () => {
    if (!toolIndex?.files.git_history) return;
    
    setGitLoading(true);
    try {
      const history = await mcpService.loadGitHistory(toolIndex.files.git_history.path, tool.name);
      // Backend returns array directly, wrap it in GitHistory format
      setGitHistory({ commits: history as GitHistoryEntry[] });
    } catch (err) {
      console.warn('Could not load git history:', err);
      setGitHistory(null);
    } finally {
      setGitLoading(false);
    }
  }, [toolIndex, tool.name]);

  useEffect(() => {
    if (toolIndex?.files.git_history) {
      loadGitHistory();
    }
  }, [toolIndex, loadGitHistory]);

  if (loading) {
    return <div className="tab-loading">Loading tool information...</div>;
  }

  return (
    <div className="info-tab">
      <div className="tool-info">
        <h3>Tool Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Name:</strong> {tool.name}
          </div>
          <div className="info-item">
            <strong>Description:</strong> {tool.description}
          </div>
          {toolIndex && (
            <>
              <div className="info-item">
                <strong>Sample Inputs:</strong> {toolIndex.stats.sample_inputs_count}
              </div>
              <div className="info-item">
                <strong>Git Commits:</strong> {toolIndex.stats.git_commits_count}
              </div>
              <div className="info-item">
                <strong>Source Code Length:</strong> {toolIndex.stats.source_code_length} chars
              </div>
            </>
          )}
        </div>
      </div>

      {toolIndex?.files.git_history && (
        <div className="git-history-section">
          <h3>Development History</h3>
          {gitLoading ? (
            <div>Loading git history...</div>
          ) : gitHistory?.commits ? (
            <div className="git-commits">
              {gitHistory.commits.slice(0, 10).map((commit: any, index: number) => (
                <div key={index} className="commit-item">
                  <div className="commit-hash">{commit.hash.substring(0, 8)}</div>
                  <div className="commit-info">
                    <div className="commit-message">{commit.message}</div>
                    <div className="commit-meta">
                      {typeof commit.author === 'string' ? commit.author : commit.author.name} • {new Date(commit.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              {gitHistory.commits.length > 10 && (
                <div className="more-commits">
                  ... and {gitHistory.commits.length - 10} more commits
                </div>
              )}
            </div>
          ) : (
            <div>No git history available</div>
          )}
        </div>
      )}

      {tool.inputSchema && (
        <div className="schema-section">
          <h3>Input Schema</h3>
          <pre className="schema-display">
            {JSON.stringify(tool.inputSchema, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}