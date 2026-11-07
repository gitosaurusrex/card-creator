import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { HowItWorks } from './HowItWorks.jsx';

// Each step points at something on screen (by its data-tour name) and,
// where useful, switches the tool panel to the matching tab first. On narrow
// screens, panel steps point at the tabs, since the panel is very tall.
const TOUR_STEPS = [
  { id: 'welcome', title: 'Welcome to Card Creator!', text: 'You’ll make bright cards to stick on your project board. Here’s a quick look around. It takes about a minute.' },
  { id: 'cards', target: 'cards', title: 'Your cards', text: 'Every card in your project lives down here. Click one to work on it, or press “Add a card” for a new one.' },
  { id: 'words', target: 'panel', narrowTarget: 'tabs', tab: 'words', title: 'Words', text: 'Type a title and your words. Make the letters bigger and try a fun font.' },
  { id: 'picture', target: 'panel', narrowTarget: 'tabs', tab: 'picture', title: 'Picture', text: 'Add a photo or drawing from your computer. You can choose which side it goes on.' },
  { id: 'colors', target: 'panel', narrowTarget: 'tabs', tab: 'colors', title: 'Colors', text: 'Click a look to change everything at once. Then change any color you like.' },
  { id: 'layout', target: 'panel', narrowTarget: 'tabs', tab: 'layout', title: 'Layout', text: 'Make your card wide or tall, shorter or longer, and move your words up or down.' },
  { id: 'preview', target: 'card', title: 'Your card', text: 'This is exactly how your card will print. The label underneath tells you how big it will be on paper.' },
  { id: 'undo', target: 'undo', title: 'Oops? Undo!', text: 'Made a mistake? Press Undo to go back a step. It lights up as soon as you change something, so you can’t break anything.' },
  { id: 'print', target: 'print', title: 'Print', text: 'When you’re happy, press Print and choose which cards to print. Then cut them out and stick them on your board!' },
];

const PAD = 8;
const EDGE = 12;
const GAP = 16;
const NARROW = 700;

function targetFor(step) {
  if (!step.target) return null;
  return window.innerWidth < NARROW && step.narrowTarget ? step.narrowTarget : step.target;
}

function useTargetRect(target, step) {
  const [rect, setRect] = useState(null);
  useLayoutEffect(() => {
    let frame;
    const measure = () => {
      const el = target && document.querySelector(`[data-tour="${target}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      // Keep the highlight (and its outline) inside the screen.
      const left = Math.max(EDGE / 2, r.left - PAD);
      const top = Math.max(EDGE / 2, r.top - PAD);
      const right = Math.min(window.innerWidth - EDGE / 2, r.right + PAD);
      const bottom = Math.min(window.innerHeight - EDGE / 2, r.bottom + PAD);
      setRect({ left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) });
    };
    // After the tab switch has rendered, bring the target into view (it may
    // be below the fold on a phone), then measure.
    frame = requestAnimationFrame(() => {
      const el = target && document.querySelector(`[data-tour="${target}"]`);
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      measure();
    });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [target, step]);
  return rect;
}

const overlaps = (a, b) =>
  a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;

/** Where to put a bubble of size w×h so it stays on screen and off the target. */
function placeBubble(rect, w, h) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x) => Math.max(EDGE, Math.min(x, vw - w - EDGE));
  const clampY = (y) => Math.max(EDGE, Math.min(y, vh - h - EDGE));
  const candidates = [
    { left: rect.left + rect.width + GAP, top: clampY(rect.top) },
    { left: rect.left - GAP - w, top: clampY(rect.top) },
    { left: clampX(rect.left), top: rect.top + rect.height + GAP },
    { left: clampX(rect.left), top: rect.top - GAP - h },
  ];
  const fits = (p) => p.left >= EDGE && p.top >= EDGE && p.left + w <= vw - EDGE && p.top + h <= vh - EDGE;
  const clear = candidates.find(p => fits(p) && !overlaps({ ...p, width: w, height: h }, rect));
  if (clear) return clear;
  // No clear spot: use the screen corner farthest from the target.
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return { left: cx > vw / 2 ? EDGE : vw - w - EDGE, top: cy > vh / 2 ? EDGE : vh - h - EDGE };
}

export function Tour({ onTab, onClose }) {
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;
  const target = targetFor(step);
  const rect = useTargetRect(target, index);
  const dialogRef = useRef(null);
  const bubbleRef = useRef(null);
  const nextRef = useRef(null);
  const openerRef = useRef(null);

  // Open as a modal dialog: the editor behind becomes inert and focus stays
  // in the tour. On close, focus goes back to whatever opened it.
  useEffect(() => {
    const dialog = dialogRef.current;
    openerRef.current = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      const opener = openerRef.current;
      requestAnimationFrame(() => {
        if (opener?.isConnected && opener !== document.body) opener.focus();
        else document.querySelector('[role="tab"][aria-selected="true"]')?.focus();
      });
    };
  }, []);

  useEffect(() => {
    if (step.tab) onTab(step.tab);
  }, [step, onTab]);

  useEffect(() => { nextRef.current?.focus(); }, [index]);

  const centered = !target || !rect;
  const narrow = typeof window !== 'undefined' && window.innerWidth < NARROW;

  // Position the bubble after it has rendered, using its real size.
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;
    bubble.style.left = '';
    bubble.style.top = '';
    if (centered || narrow) return;
    const { width, height } = bubble.getBoundingClientRect();
    const { left, top } = placeBubble(rect, width, height);
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
  });

  const onKeyDown = (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight' && !last) { e.preventDefault(); setIndex(i => i + 1); }
    if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); setIndex(i => i - 1); }
  };

  // On a narrow screen the bubble becomes a sheet on the side away from the target.
  const sheet = narrow && !centered
    ? (rect.top + rect.height / 2 > window.innerHeight / 2 ? 'tour__bubble--sheet-top' : 'tour__bubble--sheet-bottom')
    : '';

  return (
    <dialog
      ref={dialogRef}
      className="tour no-print"
      aria-labelledby="tour-title"
      aria-describedby="tour-text"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={onKeyDown}
    >
      {centered
        ? <div className="tour__backdrop" />
        : <div className="tour__spotlight" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />}
      <div ref={bubbleRef} className={`tour__bubble ${centered ? 'tour__bubble--center' : ''} ${sheet}`}>
        {index === 0 && <HowItWorks compact />}
        <p className="tour__count">{index === 0 ? 'Quick tour' : `${index} of ${TOUR_STEPS.length - 1}`}</p>
        <h2 id="tour-title" className="tour__title">{step.title}</h2>
        <p id="tour-text" className="tour__text">{step.text}</p>
        <div className="tour__actions">
          {index === 0
            ? <button type="button" className="btn btn--soft" onClick={onClose}>Skip the tour</button>
            : <button type="button" className="btn btn--soft" onClick={() => setIndex(i => i - 1)}><ArrowLeft size={18} aria-hidden="true" /> Back</button>}
          <button ref={nextRef} type="button" className="btn btn--primary" onClick={() => (last ? onClose() : setIndex(i => i + 1))}>
            {index === 0 ? 'Show me!' : last ? 'Start making cards' : 'Next'}
            {!last && <ArrowRight size={18} aria-hidden="true" />}
          </button>
        </div>
        {index > 0 && !last && <button type="button" className="link-btn tour__skip" onClick={onClose}>Close the tour</button>}
      </div>
    </dialog>
  );
}
