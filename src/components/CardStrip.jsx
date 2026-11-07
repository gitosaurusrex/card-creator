import { Plus, Copy, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { FittedCard } from './CardView.jsx';

export function CardStrip({ cards, activeCardId, onSelect, onAdd, onDuplicate, onMove, onDelete }) {
  const index = cards.findIndex(c => c.id === activeCardId);
  return (
    <section className="strip" aria-label="Your cards" data-tour="cards">
      <div className="strip__bar">
        <h2 className="strip__title">Your cards <span className="strip__count">{cards.length}</span></h2>
        <div className="strip__actions" role="group" aria-label="Selected card">
          <button type="button" className="btn btn--ghost" onClick={onDuplicate} title="Make a copy of this card">
            <Copy size={18} aria-hidden="true" /> Copy
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => onMove(-1)} disabled={index <= 0} title="Move this card earlier" aria-label="Move earlier">
            <ChevronLeft size={18} aria-hidden="true" /> Move
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => onMove(1)} disabled={index === cards.length - 1} title="Move this card later" aria-label="Move later">
            Move <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn--ghost btn--danger-text" onClick={onDelete} disabled={cards.length <= 1} title={cards.length <= 1 ? 'A project needs at least one card' : 'Delete this card'}>
            <Trash2 size={18} aria-hidden="true" /> Delete
          </button>
        </div>
      </div>
      <ol className="strip__list">
        {cards.map((card, i) => {
          const active = card.id === activeCardId;
          return (
            <li key={card.id}>
              <button
                type="button"
                className={`thumb ${active ? 'is-active' : ''}`}
                onClick={() => onSelect(card.id)}
                aria-current={active ? 'true' : undefined}
                aria-label={`Card ${i + 1}: ${card.title || 'Untitled'}`}
              >
                <span className="thumb__num" aria-hidden="true">{i + 1}</span>
                <span className="thumb__card" aria-hidden="true"><FittedCard card={card} maxWidth={150} maxHeight={84} /></span>
                {card.selectedForPrint === false && <span className="thumb__badge">Not printing</span>}
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" className="thumb thumb--add" onClick={onAdd}>
            <Plus size={26} aria-hidden="true" />
            <span>Add a card</span>
          </button>
        </li>
      </ol>
    </section>
  );
}
