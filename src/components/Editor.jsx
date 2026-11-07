import { useEffect, useRef, useState } from 'react';
import { Type, Image, Palette, LayoutPanelLeft, Sparkles } from 'lucide-react';
import { TopBar } from './TopBar.jsx';
import { Stage } from './Stage.jsx';
import { CardStrip } from './CardStrip.jsx';
import { PrintDialog } from './PrintDialog.jsx';
import { Toast } from './Toast.jsx';
import { WordsPanel } from './panels/WordsPanel.jsx';
import { PicturePanel } from './panels/PicturePanel.jsx';
import { ColorsPanel } from './panels/ColorsPanel.jsx';
import { LayoutPanel } from './panels/LayoutPanel.jsx';
import { createCard, pickStyle } from '../lib/cards.js';

const TABS = [
  { id: 'words', label: 'Words', icon: Type, intro: 'What your card says.' },
  { id: 'picture', label: 'Picture', icon: Image, intro: 'Add a photo or drawing.' },
  { id: 'colors', label: 'Colors', icon: Palette, intro: 'Pick a look, then change any color.' },
  { id: 'layout', label: 'Layout', icon: LayoutPanelLeft, intro: 'Shape, size and spacing.' },
];

function Tabs({ tab, onTab }) {
  const refs = useRef({});
  const onKeyDown = (e) => {
    const i = TABS.findIndex(t => t.id === tab);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (e.key === 'Home' || e.key === 'End' || step) {
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + step + TABS.length) % TABS.length;
      onTab(TABS[next].id);
      refs.current[TABS[next].id]?.focus();
    }
  };
  return (
    <div className="tabs" role="tablist" aria-label="Change your card" onKeyDown={onKeyDown}>
      {TABS.map(t => (
        <button
          key={t.id}
          ref={el => { refs.current[t.id] = el; }}
          id={`tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          aria-controls="tool-panel"
          tabIndex={tab === t.id ? 0 : -1}
          className={`tab tab--${t.id}`}
          data-tour={`tab-${t.id}`}
          onClick={() => onTab(t.id)}
        >
          <t.icon size={22} aria-hidden="true" />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Editor({
  project, cards, activeCard, setActiveCardId, tab, onTab,
  updateCards, updateProject, uploadImage, saveStatus, history, undo, redo,
  onBack, onHelp,
}) {
  const [printOpen, setPrintOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const projectId = project.id;

  const showToast = (next) => {
    clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const changeCard = (updates, cardId = activeCard.id, inProject = projectId) =>
    updateCards(inProject, cs => cs.map(c => (c.id === cardId ? { ...c, ...updates } : c)));

  const addCard = () => {
    // New cards start with the same look as the card you're on.
    const card = createCard({ ...pickStyle(activeCard), title: `Card ${cards.length + 1}`, orientation: activeCard.orientation });
    updateCards(projectId, cs => [...cs, card]);
    setActiveCardId(card.id);
  };

  const duplicateCard = () => {
    const copy = { ...activeCard, id: crypto.randomUUID() };
    updateCards(projectId, cs => {
      const i = cs.findIndex(c => c.id === activeCard.id);
      return [...cs.slice(0, i + 1), copy, ...cs.slice(i + 1)];
    });
    setActiveCardId(copy.id);
    showToast({ message: 'Made a copy of your card.' });
  };

  const moveCard = (delta) => {
    updateCards(projectId, cs => {
      const i = cs.findIndex(c => c.id === activeCard.id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const deleteCard = () => {
    if (cards.length <= 1) return;
    const i = cards.findIndex(c => c.id === activeCard.id);
    const remaining = cards.filter(c => c.id !== activeCard.id);
    updateCards(projectId, cs => cs.filter(c => c.id !== activeCard.id));
    setActiveCardId(remaining[Math.max(0, i - 1)].id);
    showToast({ message: 'Card deleted.', action: { label: 'Undo', run: () => doUndo() } });
  };

  const applyLookToAll = () => {
    const look = pickStyle(activeCard);
    updateCards(projectId, cs => cs.map(c => ({ ...c, ...look, orientation: activeCard.orientation })));
    showToast({ message: `All ${cards.length} cards now have this look.`, action: { label: 'Undo', run: () => doUndo() } });
  };

  const keepActiveCardValid = (restored) => {
    if (restored && !restored.some(c => c.id === activeCard.id)) setActiveCardId(restored[0]?.id);
  };
  const doUndo = () => keepActiveCardValid(undo(projectId));
  const doRedo = () => keepActiveCardValid(redo(projectId));

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl+Y to redo.
  const shortcuts = useRef({});
  shortcuts.current = { doUndo, doRedo };
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (document.querySelector('dialog[open]')) return;
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); shortcuts.current.doUndo(); }
      else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); shortcuts.current.doRedo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const uploadForActiveCard = async (file) => {
    // Capture the target now: the user may switch card or project mid-upload.
    const cardId = activeCard.id;
    const inProject = projectId;
    const url = await uploadImage(file);
    changeCard({ imageUrl: url }, cardId, inProject);
  };

  const print = () => {
    setPrintOpen(false);
    // Let the dialog close before the browser takes its print snapshot.
    setTimeout(() => window.print(), 50);
  };

  const current = TABS.find(t => t.id === tab) || TABS[0];
  const panelProps = { card: activeCard, onChange: (updates) => changeCard(updates) };

  return (
    <div className="editor no-print">
      <TopBar
        name={project.name}
        onRename={(name) => updateProject(projectId, p => ({ ...p, name }))}
        onBack={onBack}
        saveStatus={saveStatus}
        canUndo={history.projectId === projectId && history.canUndo}
        canRedo={history.projectId === projectId && history.canRedo}
        onUndo={doUndo}
        onRedo={doRedo}
        onHelp={onHelp}
        onPrint={() => setPrintOpen(true)}
      />

      <aside className={`tools tools--${current.id}`} aria-label="Change your card">
        <Tabs tab={current.id} onTab={onTab} />
        <div className="tools__panel" id="tool-panel" role="tabpanel" aria-labelledby={`tab-${current.id}`} data-tour="panel">
          <p className="tools__intro">{current.intro}</p>
          {current.id === 'words' && <WordsPanel {...panelProps} />}
          {current.id === 'picture' && <PicturePanel {...panelProps} onUpload={uploadForActiveCard} />}
          {current.id === 'colors' && <ColorsPanel {...panelProps} />}
          {current.id === 'layout' && <LayoutPanel {...panelProps} />}
        </div>
        {cards.length > 1 && (current.id === 'colors' || current.id === 'layout' || current.id === 'words') && (
          <div className="tools__foot">
            <button type="button" className="btn btn--soft btn--block" onClick={applyLookToAll}>
              <Sparkles size={18} aria-hidden="true" /> Use this look on all cards
            </button>
            <p className="field__hint">Copies colors, fonts, sizes and layout. Words and pictures stay the same.</p>
          </div>
        )}
      </aside>

      <Stage card={activeCard} />

      <CardStrip
        cards={cards}
        activeCardId={activeCard.id}
        onSelect={setActiveCardId}
        onAdd={addCard}
        onDuplicate={duplicateCard}
        onMove={moveCard}
        onDelete={deleteCard}
      />

      <PrintDialog
        open={printOpen}
        cards={cards}
        onToggle={(cardId, on) => changeCard({ selectedForPrint: on }, cardId)}
        onSetAll={(on) => updateCards(projectId, cs => cs.map(c => ({ ...c, selectedForPrint: on })))}
        onClose={() => setPrintOpen(false)}
        onPrint={print}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
