export function Logo() {
  return (
    <span className="logo">
      <span className="logo__mark" aria-hidden="true">
        <span className="logo__card logo__card--back" />
        <span className="logo__card logo__card--front" />
      </span>
      <span className="logo__name">Card Creator</span>
    </span>
  );
}
