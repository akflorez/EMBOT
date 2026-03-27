// Dynamic backend URL detection for production and development
const getWaServiceUrl = (): string => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  // In production, use the same hostname but port 3001
  return `http://${window.location.hostname}:3001`;
};

export const WA_SERVICE_URL = getWaServiceUrl();
