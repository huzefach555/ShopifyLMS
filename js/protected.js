import { requireAuth } from './auth.js';

export function protect(role) {
  return requireAuth(role);
}
