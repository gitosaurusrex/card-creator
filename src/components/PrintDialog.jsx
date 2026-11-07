import { Printer, Check } from 'lucide-react';
import { Dialog } from './Dialog.jsx';
import { FittedCard } from './CardView.jsx';
import { printedSize } from '../lib/cards.js';

export function PrintDialog({ open, cards, onToggle, onSetAll, onClose, onPrint }) {
  const chosen = cards.filter(c => c.selectedForPrint !== false).length;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Print your cards"
      className="dialog--wide"
      footer={(
        <>
          <button type="button" className="btn btn--soft" onClick={onClose}>Not yet</button>
          <button type="button" className="btn btn--primary btn--big" disabled={chosen === 0} onClick={onPrint}>
            <Printer size={20} aria-hidden="true" />
            {chosen === 1 ? 'Print 1 card' : `Print ${chosen} cards`}
          </button>
        </>
      )}
    >
      <div className="print-pick__bar">
        <p className="dialog__text">Tick the cards you want. Each card prints at the size shown under it.</p>
        <div className="print-pick__all">
          <button type="button" className="link-btn" onClick={() => onSetAll(true)}>Choose all</button>
          <button type="button" className="link-btn" onClick={() => onSetAll(false)}>Choose none</button>
        </div>
      </div>
      <ul className="print-pick">
        {cards.map((card, i) => {
          const on = card.selectedForPrint !== false;
          const size = printedSize(card);
          return (
            <li key={card.id}>
              <label className={`print-pick__item ${on ? 'is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={(e) => onToggle(card.id, e.target.checked)} className="visually-hidden" />
                <span className="print-pick__check" aria-hidden="true">{on && <Check size={16} strokeWidth={3} />}</span>
                <span className="print-pick__thumb" aria-hidden="true"><FittedCard card={card} maxWidth={180} maxHeight={120} /></span>
                <span className="print-pick__name">{i + 1}. {card.title || 'Untitled card'}</span>
                <span className="print-pick__size">{size.cm} · {size.inches}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="tip"><strong>Tip:</strong> if the colors come out pale, look for “Background graphics” in the print window and turn it on.</p>
    </Dialog>
  );
}
