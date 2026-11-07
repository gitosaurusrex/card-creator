// Card data: defaults, the style keys shared by "use this look on every
// card", and the inline styles a card renders with. The field names and
// meanings match cards saved by earlier versions, so old projects render
// exactly as before.

export const newId = () => crypto.randomUUID();

export const CARD_DEFAULTS = {
  title: 'My Card',
  text: 'Write something interesting here. You can add a picture too!',
  imageUrl: '',
  caption: '',
  orientation: 'horizontal-left',
  imagePosition: 'center center',
  template: 'template-pastel',
  contentPadding: 40,
  verticalAlign: 'center',
  borderWidth: 2,
  borderRadius: 16,
  borderStyle: 'solid',
  borderColor: '#fec89a',
  cardBg: '#fffcf2',
  textColor: '#403d39',
  accentColor: '#eb5e28',
  imageRadius: 8,
  cardPadding: 0,
  titleSize: 40,
  titleFont: 'inherit',
  textSize: 19,
  textFont: 'inherit',
  cardHeight: 530,
  selectedForPrint: true,
};

export const createCard = (overrides = {}) => ({ ...CARD_DEFAULTS, id: newId(), ...overrides });

// Everything about how a card looks (but not what it says or shows).
export const STYLE_KEYS = [
  'titleFont', 'titleSize', 'textFont', 'textSize',
  'template', 'cardBg', 'textColor',
  'verticalAlign', 'cardPadding', 'contentPadding',
  'borderWidth', 'borderRadius', 'imageRadius', 'borderStyle', 'borderColor',
  'cardHeight',
];

export const pickStyle = (card) =>
  Object.fromEntries(STYLE_KEYS.filter(key => key in card).map(key => [key, card[key]]));

export const isTall = (card) => card.orientation === 'vertical';

// Card sizes in CSS pixels. A wide card is exactly as wide as the printable
// area of an A4 page (210 mm minus two 10 mm margins), so the screen preview
// and the printout lay text out identically.
export const WIDE_CARD_WIDTH = 718;
export const TALL_CARD_WIDTH = 460;

export const cardWidth = (card) => (isTall(card) ? TALL_CARD_WIDTH : WIDE_CARD_WIDTH);

const PX_TO_CM = 2.54 / 96;
const roundHalf = (n) => Math.round(n * 2) / 2;

/** Printed size of a card, for labels like "19 × 14 cm (7½ × 5½ in)". */
export function printedSize(card) {
  const widthCm = cardWidth(card) * PX_TO_CM;
  const heightCm = (Number(card.cardHeight) || 0) * PX_TO_CM;
  const inches = (cm) => {
    const value = roundHalf(cm / 2.54);
    const whole = Math.floor(value);
    return value % 1 ? `${whole || ''}½` : `${whole}`;
  };
  return {
    cm: `${Math.round(widthCm)} × ${Math.round(heightCm)} cm`,
    inches: `${inches(widthCm)} × ${inches(heightCm)} in`,
  };
}

export const cardStyle = (card) => ({
  backgroundColor: card.cardBg,
  color: card.textColor,
  padding: `${card.cardPadding}px`,
  borderRadius: `${card.borderRadius}px`,
  borderWidth: `${card.borderWidth}px`,
  borderStyle: card.borderStyle,
  borderColor: card.borderColor,
  height: `${card.cardHeight}px`,
  gap: `${card.contentPadding}px`,
});

export const contentStyle = (card) => ({
  justifyContent: card.verticalAlign === 'top' ? 'flex-start' : (card.verticalAlign === 'bottom' ? 'flex-end' : 'center'),
  padding: `${card.contentPadding}px`,
});

export const fontStyle = (font) => (font && font !== 'inherit' ? font : undefined);
