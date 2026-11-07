import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { HowItWorks } from './HowItWorks.jsx';

// Each step points at something on screen (by its data-tour name) and,
// where useful, switches the tool panel to the matching tab first.
const TOUR_STEPS = [
  { id: 'welcome', title: 'Welcome to Card Creator!', text: 'You’ll make bright cards to stick on your project board. Here’s a quick look around. It takes about a minute.' },
  { id: 'cards', target: 'cards', title: 'Your cards', text: 'Every card in your project lives down here. Click one to work on it, or press “Add a card” for a new one.' },
  { id: 'words', target: 'panel', tab: 'words', title: 'Words', text: 'Type a title and your words. Make the letters bigger and try a fun font.' },
  { id: 'picture', target: 'panel', tab: 'picture', title: 'Picture', text: 'Add a photo or drawing from your computer. You can choose which side it goes on.' },
  { id: 'colors', target: 'panel', tab: 'colors', title: 'Colors', text: 'Click a look to change everything at once. Then change any color you like.' },
  { id: 'layout', target: 'panel', tab: 'layout', title: 'Layout', text: 'Make your card wide or tall, shorter or longer, and move your words up or down.' },
  { id: 'preview', target: 'preview', title: 'Your card', text: 'This is exactly how your card will print. The label underneath tells you how big it will be on paper.' },
  { id: 'undo', target: 'undo', title: 'Oops? Undo!', text: 'Made a mistake? Press Undo to go back a step. You can’t break anything.' },
  { id: 'print', target: 'print', title: 'Print', text: 'When you’re happy, press Print and choose which cards to print. Then cut them out and stick them on your board!' },
];

const PAD = 8;

function useTargetRect(target, step) {
  const [rect, setRect] = useState(null);
  useLayoutEffect(() => {
    let frame;
    const measure = () => {
      const el = target && document.querySelector(`[data-tour="${target}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
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

function bubblePosition(rect) {
  if (!rect) return null;
  const width = Math.min(360, window.innerWidth - 32);
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x) => Math.max(16, Math.min(x, vw - width - 16));
  // Prefer the right side, then left, then below, then above.
  if (rect.left + rect.width + gap + width < vw - 16 && rect.height < vh - 32) {
    return { left: rect.left + rect.width + gap, top: Math.max(16, Math.min(rect.top, vh - 280)), width };
  }
  if (rect.left - gap - width > 16 && rect.height < vh - 32) {
    return { left: rect.left - gap - width, top: Math.max(16, Math.min(rect.top, vh - 280)), width };
  }
  if (rect.top + rect.height + gap + 220 < vh) {
    return { left: clampX(rect.left), top: rect.top + rect.height + gap, width };
  }
  return { left: clampX(rect.left), top: Math.max(16, rect.top - gap - 240), width };
}

export function Tour({ onTab, onClose }) {
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;
  const rect = useTargetRect(step.target, index);
  const nextRef = useRef(null);

  useEffect(() => {
    if (step.tab) onTab(step.tab);
  }, [step, onTab]);

  useEffect(() => { nextRef.current?.focus(); }, [index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && !last) setIndex(i => i + 1);
      if (e.key === 'ArrowLeft' && index > 0) setIndex(i => i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, last, onClose]);

  const centered = !step.target || !rect;
  const position = centered ? null : bubblePosition(rect);

  return (
    <div className="tour no-print" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
      {centered
        ? <div className="tour__backdrop" />
        : <div className="tour__spotlight" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />}
      <div className={`tour__bubble ${centered ? 'tour__bubble--center' : ''}`} style={position || undefined}>
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
    </div>
  );
}
