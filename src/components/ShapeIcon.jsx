// Tiny drawings of a card, used on the layout buttons so the choice is
// visible instead of described.
export function ShapeIcon({ shape = 'wide', picture = 'left', align = 'center' }) {
  return (
    <span className={`shape shape--${shape} shape--pic-${picture} shape--align-${align}`} aria-hidden="true">
      {picture !== 'none' && <span className="shape__pic" />}
      <span className="shape__words">
        <span className="shape__line shape__line--title" />
        <span className="shape__line" />
        <span className="shape__line shape__line--short" />
      </span>
    </span>
  );
}
