import toast from 'react-hot-toast';
import { useAuthStore, useSecurityStore } from '../store';

let handledSessionToken: string | null = null;

export function handleUnauthorizedSession(requestToken: string | null, message: string): boolean {
  const { user, token } = useAuthStore.getState();
  const pathname = `${window.location.pathname || '/'}${window.location.hash || ''}`;

  if (!requestToken || !user || token !== requestToken || pathname.includes('/login')) {
    return false;
  }
  if (handledSessionToken === requestToken) return true;

  handledSessionToken = requestToken;
  useSecurityStore.getState().setLocked(true);
  useAuthStore.setState({ token: null });
  toast.error(message, { id: 'app-auth-expired' });
  return true;
}

export function clearExpiredSessionToken(token: string): void {
  if (handledSessionToken === token) handledSessionToken = null;
}
