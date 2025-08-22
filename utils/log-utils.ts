/**
 * Helper function to get color based on log level
 */
export function getLogLevelColor(level: string): string {
  switch (level) {
    case 'error':
      return '#dc3545';
    case 'warn':
      return '#ffc107';
    case 'info':
      return '#17a2b8';
    case 'debug':
      return '#6c757d';
    default:
      return '#333';
  }
}
