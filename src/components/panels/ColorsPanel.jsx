import { Field, ColorPicker, Choice, Slider } from '../controls.jsx';
import { CardView } from '../CardView.jsx';
import { THEMES, SWATCHES, matchingTheme } from '../../lib/themes.js';

const BORDER_STYLES = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Line' },
  { value: 'dashed', label: 'Dashes' },
  { value: 'dotted', label: 'Dots' },
  { value: 'double', label: 'Double' },
];

function ThemeTile({ theme, card, selected, onPick }) {
  // A real (tiny) card in the theme, with this card's own title.
  // Shown at about 15% size, so text and borders are enlarged to stay visible.
  const sample = {
    ...card, ...theme.style,
    orientation: 'horizontal-left', cardHeight: 300, imageUrl: '', cardPadding: 0, contentPadding: 40,
    titleSize: 150, verticalAlign: 'center',
    borderWidth: theme.style.borderWidth * 3, borderRadius: theme.style.borderRadius * 3,
  };
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`theme-tile ${selected ? 'is-selected' : ''}`}
      onClick={() => onPick(theme)}
    >
      <span className="theme-tile__card" aria-hidden="true">
        <span className="theme-tile__scale">
          <CardView card={{ ...sample, title: 'Aa', text: '' }} />
        </span>
      </span>
      <span className="theme-tile__name">{theme.name}</span>
    </button>
  );
}

export function ColorsPanel({ card, onChange }) {
  const current = matchingTheme(card);
  return (
    <>
      <Field label={<span id="themes-label">Pick a look</span>} hint="One click changes the colors, border and fonts together. You can still change anything after.">
        <div className="themes" role="radiogroup" aria-labelledby="themes-label">
          {THEMES.map(theme => (
            <ThemeTile
              key={theme.id}
              theme={theme}
              card={card}
              selected={current?.id === theme.id}
              onPick={(t) => onChange(t.style)}
            />
          ))}
        </div>
      </Field>

      <ColorPicker id="color-bg" label="Background color" value={card.cardBg} swatches={SWATCHES.background} onChange={(cardBg) => onChange({ cardBg })} />
      <ColorPicker id="color-text" label="Words color" value={card.textColor} swatches={SWATCHES.text} onChange={(textColor) => onChange({ textColor })} />

      <Choice
        label="Border"
        hint="The line around the edge of your card."
        value={card.borderStyle}
        options={BORDER_STYLES.map(s => ({
          ...s,
          preview: <span className="border-sample" style={{ borderStyle: s.value === 'none' ? 'dashed' : s.value, opacity: s.value === 'none' ? 0.25 : 1 }} aria-hidden="true" />,
        }))}
        onChange={(borderStyle) => onChange(borderStyle !== 'none' && !Number(card.borderWidth) ? { borderStyle, borderWidth: 4 } : { borderStyle })}
        columns={5}
        size="sm"
      />
      {card.borderStyle !== 'none' && (
        <>
          <ColorPicker id="color-border" label="Border color" value={card.borderColor} swatches={SWATCHES.border} onChange={(borderColor) => onChange({ borderColor })} />
          <Slider id="border-width" label="Border thickness" value={card.borderWidth} min={0} max={24} minLabel="Thin" maxLabel="Thick" onChange={(borderWidth) => onChange({ borderWidth })} />
        </>
      )}
      <Slider id="border-radius" label="Corners" value={card.borderRadius} min={0} max={60} minLabel="Square" maxLabel="Round" onChange={(borderRadius) => onChange({ borderRadius })} />
    </>
  );
}
