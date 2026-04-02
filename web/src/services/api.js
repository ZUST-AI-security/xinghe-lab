/**
 * @deprecated Use specific service modules from './api/' instead
 * Example: import { algorithmService } from './api/algorithm';
 */

// Re-export all services for backward compatibility
export { default } from './api/index';
export * from './api/algorithm';
export * from './api/upload';
export * from './api/task';
export * from './api/attack';
