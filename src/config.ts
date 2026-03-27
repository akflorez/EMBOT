// Dynamic backend URL detection for production and development
// In production, all traffic goes through Nginx proxy at /wa/
// In development, connect directly to localhost:3001

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Base URL for HTTP API calls (fetch)
export const WA_API_URL = isDev ? 'http://localhost:3001' : '/wa';

// Socket.io connection config
export const WA_SOCKET_URL = isDev ? 'http://localhost:3001' : window.location.origin;
export const WA_SOCKET_PATH = isDev ? '/socket.io' : '/wa/socket.io';
