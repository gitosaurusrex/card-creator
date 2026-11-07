import { useLayoutEffect, useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useElementSize } from '../hooks/useElementSize.js';
import { CardView } from './CardView.jsx';
import { cardWidth, printedSize } from '../lib/cards.js';

const PX_PER_CM = 96 / 2.54;

/**
 * The card on a cutting mat. The mat's grid squares are 1 cm at print size,
 * so the card can be judged against real paper. Also reports whether the
 * card's words overflow (and would be cut off when printed).
 */
export function Stage({ card, overflowing, onOverflowChange }) {
  const [ref, { width, height }] = useElementSize();
  const frameRef = useRef(null);
  const cardW = cardWidth(card);
  const cardH = Number(card.cardHeight) || 1;
  // Leave room for the size label; never enlarge past real size.
  const scale = width && height ? Math.min((width - 48) / cardW, (height - 88) / cardH, 1) : 0;
  const size = printedSize(card);
  const overflowRef = useRef(false);

  useLayoutEffect(() => {
    let cancelled = false;
    const check = () => {
      const content = frameRef.current?.querySelector('.card-content');
      if (cancelled || !content) return;
      const over = content.scrollHeight > content.clientHeight + 1 || content.scrollWidth > content.clientWidth + 1;
      if (over !== overflowRef.current) {
        overflowRef.current = over;
        onOverflowChange?.(over);
      }
    };
    check();
    // Web fonts can change text size once they finish loading.
    document.fonts?.ready.then(check);
    return () => { cancelled = true; };
  }, [card, scale, onOverflowChange]);

  return (
    <main className="stage" aria-label="Card preview" data-tour="preview">
      <div className="mat" ref={ref} style={{ '--cm': `${PX_PER_CM * (scale || 1)}px` }}>
        {scale > 0 && (
          <figure className="stage__card" data-tour="card">
            <div className="stage__frame" ref={frameRef} style={{ width: cardW * scale, height: cardH * scale }}>
              <div className="stage__scale" style={{ width: cardW, height: cardH, transform: `scale(${scale})` }}>
                <CardView card={card} className="shadow-ambient" />
              </div>
            </div>
            <figcaption className="size-tag">
              Prints about <strong>{size.cm}</strong> <span className="size-tag__in">({size.inches})</span>
              {overflowing && (
                <span className="size-tag__warn"><TriangleAlert size={15} aria-hidden="true" /> Some words don’t fit</span>
              )}
            </figcaption>
          </figure>
        )}
      </div>
    </main>
  );
}
