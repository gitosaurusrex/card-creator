import { useState } from 'react';
import { Pause, Play } from 'lucide-react';

// A looping animation of a card being made: words appear, a picture pops
// in, the colors change, and the finished card gets taped to a project
// board. Pure CSS (see .demo in app.css) with a pause button; people who
// prefer reduced motion see the finished card and all four steps at once.
const STEPS = ['Write your words', 'Add a picture', 'Pick your colors', 'Print it and stick it on your board'];

export function HowItWorks({ compact = false }) {
  const [paused, setPaused] = useState(false);
  return (
    <figure className={`demo ${compact ? 'demo--compact' : ''} ${paused ? 'is-paused' : ''}`} aria-label="How Card Creator works">
      <div className="demo__stage">
        <div className="demo__scene" aria-hidden="true">
          <div className="demo__board">
            <span className="demo__note demo__note--a"><span className="demo__pin demo__pin--a" /></span>
            <span className="demo__note demo__note--b"><span className="demo__pin demo__pin--b" /></span>
          </div>
          <div className="demo__card">
            <span className="demo__tape demo__tape--l" />
            <span className="demo__tape demo__tape--r" />
            <span className="demo__pic">
              <span className="demo__sun" />
              <span className="demo__hill demo__hill--back" />
              <span className="demo__hill" />
            </span>
            <span className="demo__words">
              <span className="demo__title">Volcanoes!</span>
              <span className="demo__line" />
              <span className="demo__line" />
              <span className="demo__line demo__line--short" />
            </span>
          </div>
          <span className="demo__cursor" />
        </div>
        <button
          type="button"
          className="demo__pause"
          onClick={() => setPaused(p => !p)}
          aria-pressed={paused}
          aria-label={paused ? 'Play the animation' : 'Pause the animation'}
          title={paused ? 'Play' : 'Pause'}
        >
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
      </div>
      <figcaption>
        <ol className="demo__steps">
          {STEPS.map((step, i) => (
            <li key={step} className={`demo__step demo__step--${i + 1}`}>
              <span className="demo__num">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
