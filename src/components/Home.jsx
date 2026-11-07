import { useState } from 'react';
import { Plus, Trash2, LoaderCircle } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import { HowItWorks } from './HowItWorks.jsx';
import { FittedCard } from './CardView.jsx';
import { ConfirmDialog } from './Dialog.jsx';
import { Logo } from './Logo.jsx';

const changed = (time) => {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days < 1 && new Date().toDateString() === date.toDateString()) return 'Changed today';
  if (days < 2) return 'Changed yesterday';
  return `Changed ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })}`;
};

export function Hero({ children }) {
  return (
    <section className="hero">
      <div className="hero__text">
        <h1 className="hero__title">Make bright, colorful cards for your project board.</h1>
        <p className="hero__lead">Type your words, add a picture, pick your colors, then print. Cut the cards out and stick them on your board!</p>
        {children}
      </div>
      <HowItWorks />
    </section>
  );
}

export function Home({ projects, onOpen, onCreate, onDelete }) {
  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  const confirmDelete = async () => {
    const project = confirming;
    setConfirming(null);
    setDeleting(project.id);
    setError(null);
    const ok = await onDelete(project.id);
    setDeleting(null);
    if (!ok) setError(`Couldn’t delete “${project.name}”. Check the internet connection and try again.`);
  };

  return (
    <div className="home no-print">
      <header className="home__bar">
        <Logo />
        <UserButton />
      </header>
      <main className="home__main">
        <Hero>
          <button type="button" className="btn btn--primary btn--big" onClick={onCreate}>
            <Plus size={22} aria-hidden="true" /> Start a new project
          </button>
        </Hero>

        <section className="projects" aria-labelledby="projects-title">
          <h2 id="projects-title" className="section-title">Your projects</h2>
          {error && <p className="notice notice--error" role="alert">{error}</p>}
          {projects.length === 0 ? (
            <p className="projects__empty">Nothing here yet. Press <strong>Start a new project</strong> to make your first cards.</p>
          ) : (
            <ul className="projects__grid">
              {projects.map(project => {
                const cards = Array.isArray(project.cards) ? project.cards : [];
                return (
                  <li key={project.id} className="project">
                    <button type="button" className="project__open" onClick={() => onOpen(project.id)}>
                      <span className="project__preview" aria-hidden="true">
                        {cards[0] && <FittedCard card={cards[0]} maxWidth={260} maxHeight={150} />}
                      </span>
                      <span className="project__name">{project.name || 'Untitled project'}</span>
                      <span className="project__meta">
                        {cards.length === 1 ? '1 card' : `${cards.length} cards`} · {changed(project.lastModified)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn project__delete"
                      onClick={() => setConfirming(project)}
                      disabled={deleting === project.id}
                      aria-label={`Delete ${project.name || 'Untitled project'}`}
                      title="Delete project"
                    >
                      {deleting === project.id ? <LoaderCircle size={18} className="spin" aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <ConfirmDialog
        open={!!confirming}
        title="Delete this project?"
        message={confirming ? `“${confirming.name || 'Untitled project'}” and all its cards will be gone for good. This can’t be undone.` : ''}
        confirmLabel="Delete project"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
