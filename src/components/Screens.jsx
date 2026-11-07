import { SignInButton } from '@clerk/clerk-react';
import { LogIn } from 'lucide-react';
import { Logo } from './Logo.jsx';
import { Hero } from './Home.jsx';

export function LoadingScreen() {
  return (
    <div className="loading no-print" role="status">
      <Logo />
      <span className="loading__dots" aria-hidden="true"><span /><span /><span /></span>
      <span className="visually-hidden">Loading your projects…</span>
    </div>
  );
}

export function WelcomeScreen() {
  return (
    <div className="home no-print">
      <header className="home__bar">
        <Logo />
      </header>
      <main className="home__main">
        <Hero>
          <SignInButton mode="modal">
            <button type="button" className="btn btn--primary btn--big">
              <LogIn size={22} aria-hidden="true" /> Sign in to start
            </button>
          </SignInButton>
          <p className="hero__note">Signing in keeps your projects safe, so you can come back to them on any computer.</p>
        </Hero>
      </main>
    </div>
  );
}
