import { useId } from 'react';
import { Check } from 'lucide-react';
import { FONTS } from '../lib/fonts.js';

/** A labelled section of the panel with an optional one-line hint. */
export function Field({ label, hint, htmlFor, children, extra }) {
  const Label = htmlFor ? 'label' : 'div';
  return (
    <div className="field">
      <div className="field__head">
        <Label className="field__label" htmlFor={htmlFor}>{label}</Label>
        {extra}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
      {children}
    </div>
  );
}

export function TextField({ id, label, hint, value, onChange, placeholder, multiline = false, rows = 5 }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Tag
        id={id}
        className="text-input"
        value={value ?? ''}
        placeholder={placeholder}
        rows={multiline ? rows : undefined}
        type={multiline ? undefined : 'text'}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** A slider with words at each end ("Small" … "Huge") and the value shown. */
export function Slider({ id, label, hint, value, min, max, step = 1, onChange, minLabel, maxLabel, unit = '' }) {
  const number = Number(value) || 0;
  const percent = ((number - min) / (max - min)) * 100;
  return (
    <Field label={label} hint={hint} htmlFor={id} extra={<output className="slider__value" htmlFor={id}>{number}{unit}</output>}>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={number}
        style={{ '--fill': `${Math.min(100, Math.max(0, percent))}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {(minLabel || maxLabel) && (
        <div className="slider__ends" aria-hidden="true"><span>{minLabel}</span><span>{maxLabel}</span></div>
      )}
    </Field>
  );
}

/**
 * Pick one of a few options, shown as big buttons (a radio group).
 * options: [{ value, label, icon?, preview? }]
 */
export function Choice({ label, hint, value, options, onChange, columns = options.length, size = 'md' }) {
  const groupId = useId();
  return (
    <Field label={<span id={groupId}>{label}</span>} hint={hint}>
      <div className={`choice choice--${size}`} role="radiogroup" aria-labelledby={groupId} style={{ '--cols': columns }}>
        {options.map(option => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`choice__option ${selected ? 'is-selected' : ''}`}
              onClick={() => onChange(option.value)}
            >
              {option.preview ?? (option.icon && <option.icon size={22} aria-hidden="true" />)}
              <span className="choice__label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

const sameColor = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/** Color swatches, plus a "More colors" button that opens the full picker. */
export function ColorPicker({ id, label, hint, value, swatches, onChange }) {
  const groupId = useId();
  const custom = !swatches.some(s => sameColor(s, value));
  return (
    <Field label={<span id={groupId}>{label}</span>} hint={hint}>
      <div className="swatches" role="radiogroup" aria-labelledby={groupId}>
        {swatches.map(color => {
          const selected = sameColor(color, value);
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={color}
              title={color}
              className={`swatch ${selected ? 'is-selected' : ''}`}
              style={{ '--swatch': color }}
              onClick={() => onChange(color)}
            >
              {selected && <Check size={16} strokeWidth={3} aria-hidden="true" />}
            </button>
          );
        })}
        <label className={`swatch swatch--custom ${custom ? 'is-selected' : ''}`} title="Pick any color" style={{ '--swatch': value }}>
          <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: pick any color`} />
          <span aria-hidden="true">More</span>
        </label>
      </div>
    </Field>
  );
}

/** Fonts shown as chips written in their own typeface. */
export function FontPicker({ label, hint, value, onChange, sample = 'Aa' }) {
  const groupId = useId();
  const known = FONTS.some(f => f.value === value);
  const fonts = known ? FONTS : [...FONTS, { value, label: 'Custom' }];
  return (
    <Field label={<span id={groupId}>{label}</span>} hint={hint}>
      <div className="fonts" role="radiogroup" aria-labelledby={groupId}>
        {fonts.map(font => {
          const selected = font.value === value;
          return (
            <button
              key={font.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`font-chip ${selected ? 'is-selected' : ''}`}
              onClick={() => onChange(font.value)}
            >
              <span className="font-chip__sample" style={{ fontFamily: font.value === 'inherit' ? undefined : font.value }} aria-hidden="true">{sample}</span>
              <span className="font-chip__name">{font.label}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}
