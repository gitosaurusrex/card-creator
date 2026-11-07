import { useCallback, useMemo, useRef, useState } from 'react';
import { useProjects } from '../hooks/useProjects.js';
import { cacheKeys, readJSON, writeJSON } from '../lib/storage.js';
import { Home } from './Home.jsx';
import { Editor } from './Editor.jsx';
import { Tour } from './Tour.jsx';
import { CardView } from './CardView.jsx';
import { LoadingScreen } from './Screens.jsx';

const NO_CARDS = [];

export function Workspace({ userId }) {
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null);
  const [tab, setTab] = useState('words');
  const [tourOpen, setTourOpen] = useState(false);
  const keys = useMemo(() => cacheKeys(userId), [userId]);
  // The tour switches tabs as it goes; put back the one you were on.
  const tabBeforeTour = useRef('words');
  const openTour = () => {
    tabBeforeTour.current = tab;
    setTourOpen(true);
  };

  const onRekey = useCallback((oldId, freshId) => {
    setCurrentProjectId(cur => (cur === oldId ? freshId : cur));
  }, []);
  const store = useProjects(userId, { onRekey });

  const project = store.projects.find(p => p.id === currentProjectId);
  const cards = project?.cards ?? NO_CARDS;
  const activeCard = cards.find(c => c.id === activeCardId) || cards[0];

  const enterProject = (id, firstCardId) => {
    setActiveCardId(firstCardId);
    setTab('words');
    store.resetHistory(id);
    setCurrentProjectId(id);
    // Offer the tour the first time someone opens the editor.
    if (!readJSON(keys.tourSeen, false)) {
      tabBeforeTour.current = 'words';
      setTourOpen(true);
    }
  };

  const openProject = (id) => {
    const projectCards = store.ensureCards(id);
    if (projectCards) enterProject(id, projectCards[0].id);
  };

  const createProject = () => {
    const created = store.createProject();
    enterProject(created.id, created.cards[0].id);
  };

  const closeTour = useCallback(() => {
    writeJSON(keys.tourSeen, true);
    setTourOpen(false);
    setTab(tabBeforeTour.current);
  }, [keys]);

  if (store.isLoading) return <LoadingScreen />;

  return (
    <>
      {project && activeCard ? (
        <Editor
          project={project}
          cards={cards}
          activeCard={activeCard}
          setActiveCardId={setActiveCardId}
          tab={tab}
          onTab={setTab}
          updateCards={store.updateCards}
          updateProject={store.updateProject}
          uploadImage={store.uploadImage}
          saveStatus={store.saveStatus}
          history={store.history}
          undo={store.undo}
          redo={store.redo}
          onBack={() => { store.flushSave(); setTourOpen(false); setCurrentProjectId(null); }}
          onHelp={openTour}
        />
      ) : (
        <Home
          projects={store.projects}
          onOpen={openProject}
          onCreate={createProject}
          onDelete={store.deleteProject}
        />
      )}

      {tourOpen && project && <Tour onTab={setTab} onClose={closeTour} />}

      {/* What actually gets printed: hidden on screen, shown by @media print. */}
      <div className="print-only">
        <div className="print-container">
          {cards.filter(c => c.selectedForPrint !== false).map(card => (
            <CardView key={card.id} card={card} className="print-card" />
          ))}
        </div>
      </div>
    </>
  );
}
