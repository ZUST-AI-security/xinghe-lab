// Centralized API configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
export const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';
export const API_ROOT = `${API_BASE_URL}/api/${API_VERSION}`;
