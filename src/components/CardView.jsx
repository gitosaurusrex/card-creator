import { cardStyle, contentStyle, fontStyle, cardWidth } from '../lib/cards.js';

/**
 * Renders one card. The markup and classes match what earlier versions
 * printed, so saved cards look the same on screen and on paper.
 */
export function CardView({ card, className = '' }) {
  return (
    <div className={`card-preview ${card.orientation} ${card.template} ${className}`} style={cardStyle(card)}>
      {card.imageUrl && (
        <div className="card-image">
          <img
            src={card.imageUrl}
            alt=""
            loading="eager"
            className="card-image-content"
            style={{ objectPosition: card.imagePosition, borderRadius: `${card.imageRadius}px` }}
          />
          {card.caption && <div className="card-caption-overlay">{card.caption}</div>}
        </div>
      )}
      <div className="card-content" style={contentStyle(card)}>
        <h1 className="card-title" style={{ fontSize: `${card.titleSize}px`, fontFamily: fontStyle(card.titleFont) }}>{card.title}</h1>
        <div className="card-text" style={{ fontSize: `${card.textSize}px`, fontFamily: fontStyle(card.textFont) }}>{card.text}</div>
      </div>
    </div>
  );
}

/** A card scaled down (never up) to fit inside maxWidth × maxHeight. */
export function FittedCard({ card, maxWidth, maxHeight, className = '', cardClassName = '' }) {
  const width = cardWidth(card);
  const height = Number(card.cardHeight) || 1;
  const scale = Math.max(0.01, Math.min(maxWidth / width, maxHeight / height, 1));
  return (
    <div className={`fitted-card ${className}`} style={{ width: width * scale, height: height * scale }}>
      <div className="fitted-card__inner" style={{ width, height, transform: `scale(${scale})` }}>
        <CardView card={card} className={cardClassName} />
      </div>
    </div>
  );
}
