// One-click looks. Each sets colors, border, corners and fonts together.
// `template` names a card class in card.css; the existing ones keep their
// original decorations (dot grid, side stripe and so on).
export const THEMES = [
  {
    id: 'sunshine', name: 'Sunshine',
    style: { template: 'template-plain', cardBg: '#fff3c4', textColor: '#4a3200', borderColor: '#f4a300', borderStyle: 'solid', borderWidth: 6, borderRadius: 28, titleFont: "'Fredoka', sans-serif", textFont: "'Fredoka', sans-serif" },
  },
  {
    id: 'ocean', name: 'Ocean',
    style: { template: 'template-plain', cardBg: '#dff3ff', textColor: '#0b3954', borderColor: '#3aa0e0', borderStyle: 'solid', borderWidth: 6, borderRadius: 20, titleFont: "'Baloo 2', sans-serif", textFont: "'Baloo 2', sans-serif" },
  },
  {
    id: 'bubblegum', name: 'Bubblegum',
    style: { template: 'template-plain', cardBg: '#ffe3ee', textColor: '#6a1b4d', borderColor: '#ff7aa8', borderStyle: 'dashed', borderWidth: 5, borderRadius: 32, titleFont: "'Pacifico', cursive", textFont: "'Fredoka', sans-serif" },
  },
  {
    id: 'leafy', name: 'Leafy',
    style: { template: 'template-plain', cardBg: '#e4f5e1', textColor: '#1e4d2b', borderColor: '#5fb760', borderStyle: 'solid', borderWidth: 6, borderRadius: 16, titleFont: "'Baloo 2', sans-serif", textFont: "'Outfit', sans-serif" },
  },
  {
    id: 'chalkboard', name: 'Chalkboard',
    style: { template: 'template-plain', cardBg: '#2f4f3a', textColor: '#f4f1e6', borderColor: '#9a6b3f', borderStyle: 'solid', borderWidth: 14, borderRadius: 6, titleFont: "'Patrick Hand', cursive", textFont: "'Patrick Hand', cursive" },
  },
  {
    id: 'night-sky', name: 'Night sky',
    style: { template: 'template-plain', cardBg: '#1b1f4b', textColor: '#ffe66d', borderColor: '#8c84ff', borderStyle: 'dotted', borderWidth: 6, borderRadius: 24, titleFont: "'Fredoka', sans-serif", textFont: "'Outfit', sans-serif" },
  },
  {
    id: 'comic', name: 'Comic',
    style: { template: 'template-plain', cardBg: '#ffffff', textColor: '#111111', borderColor: '#111111', borderStyle: 'solid', borderWidth: 6, borderRadius: 4, titleFont: "'Bangers', cursive", textFont: "'Patrick Hand', cursive" },
  },
  {
    id: 'notebook', name: 'Notebook',
    style: { template: 'template-school', cardBg: '#ffffff', textColor: '#22325c', borderColor: '#9db4e0', borderStyle: 'solid', borderWidth: 2, borderRadius: 12, titleFont: "'Patrick Hand', cursive", textFont: "'Patrick Hand', cursive" },
  },
  {
    id: 'peach', name: 'Peach',
    style: { template: 'template-pastel', cardBg: '#fffcf2', textColor: '#403d39', borderColor: '#fec89a', borderStyle: 'solid', borderWidth: 2, borderRadius: 32, titleFont: 'inherit', textFont: 'inherit' },
  },
  {
    id: 'storybook', name: 'Storybook',
    style: { template: 'template-sophisticated', cardBg: '#f4f1ea', textColor: '#2c1810', borderColor: '#d4af37', borderStyle: 'double', borderWidth: 6, borderRadius: 4, titleFont: "'Playfair Display', serif", textFont: "'Libre Baskerville', serif" },
  },
  {
    id: 'bold', name: 'Big & bold',
    style: { template: 'template-high-contrast', cardBg: '#000000', textColor: '#ffff00', borderColor: '#ffff00', borderStyle: 'solid', borderWidth: 4, borderRadius: 0, titleFont: 'inherit', textFont: 'inherit' },
  },
  {
    id: 'classic', name: 'Classic',
    style: { template: 'template-corporate', cardBg: '#ffffff', textColor: '#1a1a1a', borderColor: '#003087', borderStyle: 'solid', borderWidth: 2, borderRadius: 0, titleFont: 'inherit', textFont: 'inherit' },
  },
];

/** The theme a card currently matches, if any (colors and template). */
export const matchingTheme = (card) =>
  THEMES.find(t => ['template', 'cardBg', 'textColor', 'borderColor'].every(k => t.style[k]?.toLowerCase?.() === String(card[k]).toLowerCase()));

// Quick-pick colors for backgrounds, text and borders, with names people
// (and screen readers) can use.
const c = (value, name) => ({ value, name });
export const SWATCHES = {
  background: [c('#ffffff', 'White'), c('#fff3c4', 'Lemon'), c('#ffe3ee', 'Pink'), c('#dff3ff', 'Sky blue'), c('#e4f5e1', 'Mint'), c('#efe5ff', 'Lavender'), c('#ffe8d6', 'Peach'), c('#2f4f3a', 'Chalkboard green'), c('#1b1f4b', 'Night blue'), c('#000000', 'Black')],
  text: [c('#111111', 'Black'), c('#403d39', 'Charcoal'), c('#22325c', 'Navy'), c('#0b3954', 'Deep sea'), c('#1e4d2b', 'Forest'), c('#6a1b4d', 'Plum'), c('#4a3200', 'Chocolate'), c('#ffffff', 'White'), c('#ffe66d', 'Star yellow'), c('#ffff00', 'Bright yellow')],
  border: [c('#f4a300', 'Orange'), c('#ff7aa8', 'Pink'), c('#3aa0e0', 'Blue'), c('#5fb760', 'Green'), c('#8c84ff', 'Purple'), c('#e63946', 'Red'), c('#9a6b3f', 'Wood'), c('#111111', 'Black'), c('#fec89a', 'Apricot'), c('#ffffff', 'White')],
};
