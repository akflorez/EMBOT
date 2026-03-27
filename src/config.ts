// Dynamic backend URL detection for production and development
// In production, all traffic goes through Nginx proxy at /wa/
// In development, connect directly to localhost:3001

// Detection for development mode (Vite default port 5173 or localhost)
const isDev = window.location.port === '5173' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Base URL for HTTP API calls (fetch)
export const WA_API_URL = isDev ? 'http://localhost:3001' : '/wa';

// Socket.io connection config
// Use full origin to avoid relative path issues with custom ports
export const WA_SOCKET_URL = isDev ? 'http://localhost:3001' : window.location.origin;

// Path must MATCH what Nginx expect (/wa/socket.io becomes /socket.io in backend)
export const WA_SOCKET_PATH = isDev ? '/socket.io' : '/wa/socket.io';
