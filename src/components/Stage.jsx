import { useElementSize } from '../hooks/useElementSize.js';
import { CardView } from './CardView.jsx';
import { cardWidth, printedSize } from '../lib/cards.js';

const PX_PER_CM = 96 / 2.54;

/**
 * The card on a cutting mat. The mat's grid squares are 1 cm at print size,
 * so the card can be judged against real paper.
 */
export function Stage({ card }) {
  const [ref, { width, height }] = useElementSize();
  const cardW = cardWidth(card);
  const cardH = Number(card.cardHeight) || 1;
  // Leave room for the size label; never enlarge past real size.
  const scale = width && height ? Math.min((width - 48) / cardW, (height - 88) / cardH, 1) : 0;
  const size = printedSize(card);

  return (
    <section className="stage" aria-label="Card preview" data-tour="preview">
      <div className="mat" ref={ref} style={{ '--cm': `${PX_PER_CM * (scale || 1)}px` }}>
        {scale > 0 && (
          <figure className="stage__card">
            <div className="stage__frame" style={{ width: cardW * scale, height: cardH * scale }}>
              <div className="stage__scale" style={{ width: cardW, height: cardH, transform: `scale(${scale})` }}>
                <CardView card={card} className="shadow-ambient" />
              </div>
            </div>
            <figcaption className="size-tag">
              Prints about <strong>{size.cm}</strong> <span className="size-tag__in">({size.inches})</span>
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
