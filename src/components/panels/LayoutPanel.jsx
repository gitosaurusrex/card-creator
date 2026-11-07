import { Choice, Slider } from '../controls.jsx';
import { ShapeIcon } from '../ShapeIcon.jsx';
import { isTall, printedSize } from '../../lib/cards.js';

export function LayoutPanel({ card, onChange }) {
  const tall = isTall(card);
  const side = card.orientation === 'horizontal-right' ? 'right' : 'left';
  const size = printedSize(card);
  return (
    <>
      <Choice
        label="Card shape"
        hint={tall ? 'Tall cards have the picture on top.' : 'Wide cards have the picture at the side.'}
        value={tall ? 'tall' : 'wide'}
        options={[
          { value: 'wide', label: 'Wide', preview: <ShapeIcon shape="wide" picture={side} /> },
          { value: 'tall', label: 'Tall', preview: <ShapeIcon shape="tall" picture="top" /> },
        ]}
        onChange={(shape) => {
          if (shape === 'tall' && !tall) onChange({ orientation: 'vertical', cardHeight: Math.max(card.cardHeight, 640) });
          if (shape === 'wide' && tall) onChange({ orientation: 'horizontal-left', cardHeight: Math.min(card.cardHeight, 530) });
        }}
      />
      <Slider
        id="card-height"
        label="Card height"
        hint={`Prints about ${size.cm} (${size.inches}).`}
        value={card.cardHeight}
        min={200}
        max={800}
        step={10}
        minLabel="Short"
        maxLabel="Tall"
        format={(px) => `${Math.round(px * 2.54 / 96)} cm`}
        onChange={(cardHeight) => onChange({ cardHeight })}
      />
      <Choice
        label="Where do the words go?"
        value={card.verticalAlign}
        options={[
          { value: 'top', label: 'Top', preview: <ShapeIcon picture="none" align="top" /> },
          { value: 'center', label: 'Middle', preview: <ShapeIcon picture="none" align="center" /> },
          { value: 'bottom', label: 'Bottom', preview: <ShapeIcon picture="none" align="bottom" /> },
        ]}
        onChange={(verticalAlign) => onChange({ verticalAlign })}
      />
      <Slider
        id="content-padding"
        label="Space around the words"
        hint="Room between your words, the picture and the edge."
        value={card.contentPadding}
        min={0}
        max={80}
        minLabel="Snug"
        maxLabel="Roomy"
        onChange={(contentPadding) => onChange({ contentPadding })}
      />
      <Slider
        id="card-padding"
        label="Inside edge"
        hint="Adds a strip of background color all the way around, just inside the border."
        value={card.cardPadding}
        min={0}
        max={60}
        minLabel="None"
        maxLabel="Wide"
        onChange={(cardPadding) => onChange({ cardPadding })}
      />
    </>
  );
}
