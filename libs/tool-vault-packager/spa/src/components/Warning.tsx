export type WarningType = 'warning' | 'error' | 'info';

interface WarningProps {
  type?: WarningType;
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

export function Warning({ 
  type = 'warning', 
  title, 
  message, 
  details, 
  onRetry, 
  className 
}: WarningProps) {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'error':
        return 'warning-error';
      case 'info':
        return 'warning-info';
      default:
        return 'warning-warning';
    }
  };

  return (
    <div className={`warning-block ${getTypeClass()} ${className || ''}`}>
      <div className="warning-header">
        <span className="warning-icon">{getIcon()}</span>
        <span className="warning-title">
          {title || (type === 'error' ? 'Error' : type === 'info' ? 'Info' : 'Warning')}
        </span>
      </div>
      
      <div className="warning-content">
        <p className="warning-message">{message}</p>
        {details && (
          <details className="warning-details">
            <summary>Technical Details</summary>
            <pre>{details}</pre>
          </details>
        )}
      </div>

      {onRetry && (
        <div className="warning-actions">
          <button className="warning-retry-button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

interface NoDataWarningProps {
  title: string;
  message: string;
  suggestion?: string;
}

export function NoDataWarning({ title, message, suggestion }: NoDataWarningProps) {
  return (
    <Warning
      type="info"
      title={title}
      message={message}
      details={suggestion}
    />
  );
}

interface LoadingErrorProps {
  resource: string;
  error: string;
  onRetry?: () => void;
}

export function LoadingError({ resource, error, onRetry }: LoadingErrorProps) {
  return (
    <Warning
      type="error"
      title={`Failed to load ${resource}`}
      message="The backend service may be unavailable or the resource may not exist."
      details={error}
      onRetry={onRetry}
    />
  );
}