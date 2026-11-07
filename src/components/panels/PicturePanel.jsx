import { useId, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Trash2, RefreshCw, Link } from 'lucide-react';
import { Field, TextField, Choice, Slider } from '../controls.jsx';
import { ShapeIcon } from '../ShapeIcon.jsx';
import { ALLOWED_IMAGE_TYPES } from '../../hooks/useProjects.js';
import { isTall } from '../../lib/cards.js';

const POSITIONS = [
  'top left', 'top center', 'top right',
  'center left', 'center center', 'center right',
  'bottom left', 'bottom center', 'bottom right',
];

export function PicturePanel({ card, onChange, onUpload }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const errorId = useId();

  const upload = async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onFile = (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow choosing the same file again
    upload(file);
  };

  const fileInput = (
    <input
      ref={fileRef}
      id="picture-file"
      type="file"
      accept={ALLOWED_IMAGE_TYPES.join(',')}
      onChange={onFile}
      className="visually-hidden"
      aria-describedby={error ? errorId : undefined}
    />
  );

  return (
    <>
      {card.imageUrl ? (
        <Field label="Your picture">
          <div className="picture-current">
            <img src={card.imageUrl} alt="The picture on this card" style={{ objectPosition: card.imagePosition }} />
            <div className="picture-current__actions">
              <button type="button" className="btn btn--soft" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <LoaderCircle size={18} className="spin" aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
                {uploading ? 'Uploading…' : 'Change picture'}
              </button>
              <button type="button" className="btn btn--soft btn--danger-text" onClick={() => onChange({ imageUrl: '', caption: '' })}>
                <Trash2 size={18} aria-hidden="true" /> Remove picture
              </button>
            </div>
            {fileInput}
          </div>
        </Field>
      ) : (
        <Field label="Add a picture" hint="A photo or drawing from your computer. It goes right onto your card.">
          <label
            htmlFor="picture-file"
            className={`dropzone ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files[0]); }}
          >
            {uploading
              ? <LoaderCircle size={36} className="spin" aria-hidden="true" />
              : <ImagePlus size={36} aria-hidden="true" />}
            <span className="dropzone__title">{uploading ? 'Uploading your picture…' : 'Choose a picture'}</span>
            <span className="dropzone__hint">or drag one here</span>
          </label>
          {fileInput}
        </Field>
      )}

      {error && <p className="notice notice--error" id={errorId} role="alert">{error}</p>}

      {!card.imageUrl && (
        <details className="more">
          <summary><Link size={16} aria-hidden="true" /> Use a picture from a website</summary>
          <TextField
            id="picture-url"
            label="Picture address"
            hint="Right-click a picture on a website, choose “Copy image address”, then paste it here."
            value={card.imageUrl}
            placeholder="https://…"
            onChange={(imageUrl) => onChange({ imageUrl: imageUrl.trim() })}
          />
        </details>
      )}

      {card.imageUrl && (
        <>
          {!isTall(card) && (
            <Choice
              label="Which side?"
              value={card.orientation === 'horizontal-right' ? 'horizontal-right' : 'horizontal-left'}
              onChange={(orientation) => onChange({ orientation })}
              options={[
                { value: 'horizontal-left', label: 'Left', preview: <ShapeIcon picture="left" /> },
                { value: 'horizontal-right', label: 'Right', preview: <ShapeIcon picture="right" /> },
              ]}
            />
          )}
          {isTall(card) && (
            <p className="field__hint">On a tall card the picture goes on top. To put it at the side, make the card wide in <strong>Layout</strong>.</p>
          )}
          <TextField
            id="picture-caption"
            label="Label on the picture"
            hint="A few words shown in a strip along the bottom of the picture. Leave it empty for none."
            value={card.caption}
            placeholder="For example: A honeybee on lavender"
            onChange={(caption) => onChange({ caption })}
          />
          <Field label={<span id="focus-label">Which part shows?</span>} hint="If the picture gets cut off, pick the part that matters most.">
            <div className="focus-grid" role="radiogroup" aria-labelledby="focus-label">
              {POSITIONS.map(position => (
                <button
                  key={position}
                  type="button"
                  role="radio"
                  aria-checked={card.imagePosition === position}
                  aria-label={position.replace('center center', 'middle').replace('center', 'middle')}
                  title={position.replace('center center', 'middle').replace('center', 'middle')}
                  className={`focus-grid__cell ${card.imagePosition === position ? 'is-selected' : ''}`}
                  onClick={() => onChange({ imagePosition: position })}
                />
              ))}
            </div>
          </Field>
          <Slider
            id="image-radius"
            label="Picture corners"
            value={card.imageRadius}
            min={0}
            max={60}
            minLabel="Square"
            maxLabel="Round"
            onChange={(imageRadius) => onChange({ imageRadius })}
          />
        </>
      )}
    </>
  );
}
