import { TextField, Slider, FontPicker } from '../controls.jsx';
import { FONTS } from '../../lib/fonts.js';

const fontName = (value) => FONTS.find(f => f.value === value)?.label || 'Custom';

export function WordsPanel({ card, onChange }) {
  return (
    <>
      <TextField
        id="card-title"
        label="Title"
        hint="The big heading on your card."
        value={card.title}
        placeholder="Type a title…"
        onChange={(title) => onChange({ title })}
      />
      <TextField
        id="card-text"
        label="Your words"
        hint="Facts, a story or a list. Press Enter to start a new line."
        value={card.text}
        placeholder="Type your words…"
        multiline
        onChange={(text) => onChange({ text })}
      />
      <Slider
        id="title-size"
        label="Title size"
        value={card.titleSize}
        min={16}
        max={96}
        minLabel="Small"
        maxLabel="Huge"
        onChange={(titleSize) => onChange({ titleSize })}
      />
      <Slider
        id="text-size"
        label="Words size"
        value={card.textSize}
        min={10}
        max={48}
        minLabel="Small"
        maxLabel="Big"
        onChange={(textSize) => onChange({ textSize })}
      />
      <details className="more more--fonts">
        <summary>
          Change the fonts
          <span className="more__current">Title: {fontName(card.titleFont)} · Words: {fontName(card.textFont)}</span>
        </summary>
        <div className="more__body">
          <FontPicker
            label="Title font"
            hint="The style of letters for your title."
            value={card.titleFont}
            onChange={(titleFont) => onChange({ titleFont })}
          />
          <FontPicker
            label="Words font"
            value={card.textFont}
            onChange={(textFont) => onChange({ textFont })}
          />
        </div>
      </details>
    </>
  );
}
