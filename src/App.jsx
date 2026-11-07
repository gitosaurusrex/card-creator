import { useAuth } from '@clerk/clerk-react';
import { Workspace } from './components/Workspace.jsx';
import { LoadingScreen, WelcomeScreen } from './components/Screens.jsx';

export default function App() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <WelcomeScreen />;

  // Keyed by user so that switching accounts discards all in-memory state
  // from the previous user instead of leaking it into the new session.
  return <Workspace key={userId} userId={userId} />;
}
