
// Simple on-screen logger for debugging startup issues
const logContainer = document.createElement('div');
logContainer.id = 'bmov-debug-log';
Object.assign(logContainer.style, {
  display: 'none', // Hidden by default
  position: 'fixed',
  top: '0',
  right: '0',
  width: '400px',
  height: '50vh',
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  color: '#0f0',
  fontFamily: 'monospace',
  fontSize: '11px',
  padding: '10px',
  zIndex: '100000',
  overflowY: 'auto',
  pointerEvents: 'none', // Let clicks pass through
  whiteSpace: 'pre-wrap'
});

// Only append if not already there
if (!document.getElementById('bmov-debug-log')) {
  document.body.appendChild(logContainer);
}

// Stop logging immediately on unload
window.addEventListener('beforeunload', () => {
  window._logServerDead = true;
});

let lastLogTime = 0;
const MIN_LOG_INTERVAL = 20; // Limit to 50 logs/sec to prevent freezing

export const screenLog = (message, type = 'info') => {
  // Rate limiting to prevent browser freeze
  const now = Date.now();
  if (now - lastLogTime < MIN_LOG_INTERVAL) return;
  lastLogTime = now;

  const line = document.createElement('div');
  const timestamp = new Date().toISOString();
  const timeStr = timestamp.split('T')[1].slice(0, -1);
  line.textContent = `[${timeStr}] ${message}`;
  
  if (type === 'error') line.style.color = '#ff5555';
  if (type === 'success') line.style.color = '#55ff55';
  if (type === 'warning') line.style.color = '#ffff55';
  
  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
  
  // Also log to console
  console.log(`[ScreenLog] ${message}`);

  // Send to server for file logging
  // Circuit breaker: if 3 consecutive failures, stop trying
  if (!window._logServerDead) {
    window._logFailures = window._logFailures || 0;
    try {
      fetch('http://localhost:4000/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          type,
          timestamp
        })
      }).catch(() => {
        window._logFailures++;
        if (window._logFailures > 3) {
          window._logServerDead = true;
          console.log('[ScreenLog] Server appears dead, disabling remote logging');
        }
      }); 
    } catch (e) {
      // ignore
    }
  }
};

export const screenError = (msg) => screenLog(msg, 'error');
export const screenSuccess = (msg) => screenLog(msg, 'success');
