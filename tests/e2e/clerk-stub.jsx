// Test-only stand-in for @clerk/clerk-react, aliased in by `vite --mode e2e`.
// The signed-in user is read from localStorage so tests can switch accounts
// with window.__setUser('alice') / window.__setUser(null).
import { useSyncExternalStore } from 'react';

const listeners = new Set();
const getUser = () => localStorage.getItem('__test_user') || null;
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

window.__setUser = (user) => {
  if (user) localStorage.setItem('__test_user', user);
  else localStorage.removeItem('__test_user');
  listeners.forEach(listener => listener());
};

const getToken = async () => {
  const user = getUser();
  return user ? `token-${user}` : null;
};

export const useAuth = () => {
  const userId = useSyncExternalStore(subscribe, getUser);
  return { isLoaded: true, isSignedIn: !!userId, userId, getToken };
};

export const ClerkProvider = ({ children }) => children;
export const SignInButton = ({ children }) => children;
export const UserButton = () => null;
