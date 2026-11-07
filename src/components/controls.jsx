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
export function Slider({ id, label, hint, value, min, max, step = 1, onChange, minLabel, maxLabel, format }) {
  const number = Number(value) || 0;
  const percent = ((number - min) / (max - min)) * 100;
  const shown = format ? format(number) : String(number);
  return (
    <Field label={label} hint={hint} htmlFor={id} extra={<output className="slider__value" htmlFor={id}>{shown}</output>}>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={number}
        aria-valuetext={format ? shown : undefined}
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
 * A radio group made of buttons: one Tab stop, arrow keys move and select
 * (like native radio buttons). Children are rendered by `renderOption`.
 */
export function RadioGroup({ labelledBy, className, style, options, isSelected, onSelect, renderOption }) {
  const anySelected = options.some(isSelected);
  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step && e.key !== 'Home' && e.key !== 'End') return;
    const radios = [...e.currentTarget.querySelectorAll('[role="radio"]')];
    const i = radios.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? radios.length - 1 : (i + step + radios.length) % radios.length;
    radios[next].focus();
    onSelect(options[next]);
  };
  return (
    <div className={className} style={style} role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {options.map((option, i) => {
        const selected = isSelected(option);
        return renderOption(option, {
          role: 'radio',
          'aria-checked': selected,
          tabIndex: selected || (!anySelected && i === 0) ? 0 : -1,
          onClick: () => onSelect(option),
        }, selected);
      })}
    </div>
  );
}

/**
 * Pick one of a few options, shown as big buttons.
 * options: [{ value, label, icon?, preview? }]
 */
export function Choice({ label, hint, value, options, onChange, columns = options.length, size = 'md' }) {
  const groupId = useId();
  return (
    <Field label={<span id={groupId}>{label}</span>} hint={hint}>
      <RadioGroup
        labelledBy={groupId}
        className={`choice choice--${size}`}
        style={{ '--cols': columns }}
        options={options}
        isSelected={(o) => o.value === value}
        onSelect={(o) => onChange(o.value)}
        renderOption={(option, props, selected) => (
          <button key={option.value} type="button" className={`choice__option ${selected ? 'is-selected' : ''}`} {...props}>
            {option.preview ?? (option.icon && <option.icon size={22} aria-hidden="true" />)}
            <span className="choice__label">{option.label}</span>
          </button>
        )}
      />
    </Field>
  );
}

const sameColor = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/** Named color swatches, plus "Other" for any color at all. */
export function ColorPicker({ id, label, hint, value, swatches, onChange }) {
  const groupId = useId();
  const custom = !swatches.some(s => sameColor(s.value, value));
  return (
    <Field label={<span id={groupId}>{label}</span>} hint={hint}>
      <div className="swatches">
        <RadioGroup
          labelledBy={groupId}
          className="swatches__list"
          options={swatches}
          isSelected={(s) => sameColor(s.value, value)}
          onSelect={(s) => onChange(s.value)}
          renderOption={(swatch, props, selected) => (
            <button
              key={swatch.value}
              type="button"
              aria-label={swatch.name}
              title={swatch.name}
              className={`swatch ${selected ? 'is-selected' : ''}`}
              style={{ '--swatch': swatch.value }}
              {...props}
            >
              {selected && <Check size={16} strokeWidth={3} aria-hidden="true" />}
            </button>
          )}
        />
        <label className={`swatch swatch--custom ${custom ? 'is-selected' : ''}`} title="Pick any color" style={{ '--swatch': value }}>
          <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: pick any color`} />
          <span aria-hidden="true">{custom ? 'Your color' : 'Other'}</span>
        </label>
      </div>
    </Field>
  );
}

/** Fonts shown as chips written in their own typeface. */
export function FontPicker({ label, hint, value: rawValue, onChange, sample = 'Aa' }) {
  const groupId = useId();
  // Cards saved without a font use the theme's font.
  const value = rawValue || 'inherit';
  const known = FONTS.some(f => f.value === value);
  const fonts = known ? FONTS : [...FONTS, { value, label: 'Custom' }];
  return (
    <Field label={<span id={groupId}>{label}</span>} hint={hint}>
      <RadioGroup
        labelledBy={groupId}
        className="fonts"
        options={fonts}
        isSelected={(f) => f.value === value}
        onSelect={(f) => onChange(f.value)}
        renderOption={(font, props, selected) => (
          <button key={font.value} type="button" className={`font-chip ${selected ? 'is-selected' : ''}`} {...props}>
            <span className="font-chip__sample" style={{ fontFamily: font.value === 'inherit' ? undefined : font.value }} aria-hidden="true">{sample}</span>
            <span className="font-chip__name">{font.label}</span>
          </button>
        )}
      />
    </Field>
  );
}
