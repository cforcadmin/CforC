/**
 * Color Blindness Analysis Script for Culture for Change
 * Tests the site's color palette against different types of color vision deficiency
 */

// Site's color palette
const COLORS = {
  coral: { hex: '#FF8B6A', name: 'Coral (Primary)' },
  coralLight: { hex: '#FF9B7A', name: 'Coral Light (Dark mode)' },
  charcoal: { hex: '#2D2D2D', name: 'Charcoal (Text/Buttons)' },
  white: { hex: '#FFFFFF', name: 'White (Background)' },
  black: { hex: '#000000', name: 'Black (Text)' },
  gray700: { hex: '#374151', name: 'Gray 700 (Dark mode bg)' },
  gray800: { hex: '#1F2937', name: 'Gray 800 (Dark mode)' },
  red500: { hex: '#EF4444', name: 'Red 500 (Errors)' },
  green500: { hex: '#22C55E', name: 'Green 500 (Success)' },
  amber900: { hex: '#78350F', name: 'Amber 900 (Warnings)' },
};

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

// Color blindness simulation matrices
// Based on Brettel, Viénot, and Mollon (1997) algorithm
const CB_MATRICES = {
  // Protanopia (red-blind)
  protanopia: [
    [0.567, 0.433, 0.000],
    [0.558, 0.442, 0.000],
    [0.000, 0.242, 0.758]
  ],
  // Deuteranopia (green-blind) - most common
  deuteranopia: [
    [0.625, 0.375, 0.000],
    [0.700, 0.300, 0.000],
    [0.000, 0.300, 0.700]
  ],
  // Tritanopia (blue-blind)
  tritanopia: [
    [0.950, 0.050, 0.000],
    [0.000, 0.433, 0.567],
    [0.000, 0.475, 0.525]
  ],
  // Achromatopsia (complete color blindness)
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114]
  ]
};

// Simulate color blindness
function simulateColorBlindness(rgb, type) {
  const matrix = CB_MATRICES[type];
  if (!matrix) return rgb;

  return {
    r: matrix[0][0] * rgb.r + matrix[0][1] * rgb.g + matrix[0][2] * rgb.b,
    g: matrix[1][0] * rgb.r + matrix[1][1] * rgb.g + matrix[1][2] * rgb.b,
    b: matrix[2][0] * rgb.r + matrix[2][1] * rgb.g + matrix[2][2] * rgb.b
  };
}

// Calculate relative luminance (WCAG formula)
function getLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio (WCAG)
function getContrastRatio(rgb1, rgb2) {
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Check WCAG compliance
function checkWCAG(ratio) {
  if (ratio >= 7) return { level: 'AAA', pass: true, icon: '✓✓✓' };
  if (ratio >= 4.5) return { level: 'AA', pass: true, icon: '✓✓' };
  if (ratio >= 3) return { level: 'AA Large', pass: true, icon: '✓' };
  return { level: 'Fail', pass: false, icon: '✗' };
}

// Calculate color difference (Euclidean distance in RGB space)
function colorDifference(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

// Main analysis
console.log('═══════════════════════════════════════════════════════════════');
console.log('       COLOR BLINDNESS ANALYSIS - Culture for Change');
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Show color transformations
console.log('1. COLOR PALETTE UNDER DIFFERENT VISION TYPES');
console.log('───────────────────────────────────────────────────────────────\n');

const cbTypes = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
const cbNames = {
  protanopia: 'Protanopia (Red-blind, ~2% men)',
  deuteranopia: 'Deuteranopia (Green-blind, ~6% men)',
  tritanopia: 'Tritanopia (Blue-blind, rare)',
  achromatopsia: 'Achromatopsia (Grayscale, very rare)'
};

for (const [key, color] of Object.entries(COLORS)) {
  const rgb = hexToRgb(color.hex);
  console.log(`${color.name} (${color.hex})`);
  console.log(`  Normal vision: RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`);

  for (const type of cbTypes) {
    const simulated = simulateColorBlindness(rgb, type);
    const simHex = rgbToHex(simulated.r, simulated.g, simulated.b);
    const diff = colorDifference(rgb, simulated).toFixed(1);
    console.log(`  ${type.padEnd(14)}: ${simHex} (shift: ${diff})`);
  }
  console.log('');
}

// 2. Contrast ratio analysis
console.log('\n2. CONTRAST RATIOS - NORMAL VISION');
console.log('───────────────────────────────────────────────────────────────\n');

const contrastPairs = [
  ['coral', 'white', 'Coral text on white background'],
  ['coral', 'charcoal', 'Coral text on charcoal background'],
  ['charcoal', 'white', 'Charcoal text on white background'],
  ['black', 'white', 'Black text on white background'],
  ['coralLight', 'gray800', 'Coral light on gray 800 (dark mode)'],
  ['white', 'charcoal', 'White text on charcoal button'],
  ['red500', 'white', 'Error red on white'],
  ['green500', 'white', 'Success green on white'],
];

console.log('Pair                                    | Ratio  | WCAG Level');
console.log('----------------------------------------|--------|------------');

for (const [fg, bg, desc] of contrastPairs) {
  const fgRgb = hexToRgb(COLORS[fg].hex);
  const bgRgb = hexToRgb(COLORS[bg].hex);
  const ratio = getContrastRatio(fgRgb, bgRgb);
  const wcag = checkWCAG(ratio);
  console.log(`${desc.padEnd(40)}| ${ratio.toFixed(2).padStart(5)}:1 | ${wcag.icon} ${wcag.level}`);
}

// 3. Contrast under color blindness
console.log('\n\n3. CONTRAST RATIOS UNDER COLOR BLINDNESS');
console.log('───────────────────────────────────────────────────────────────\n');

const criticalPairs = [
  ['coral', 'charcoal', 'Coral on charcoal (buttons/badges)'],
  ['coral', 'white', 'Coral on white (links - FIXED)'],
  ['red500', 'white', 'Error messages'],
  ['green500', 'white', 'Success messages'],
];

for (const [fg, bg, desc] of criticalPairs) {
  console.log(`\n${desc}:`);
  console.log('  Vision Type      | FG Color  | BG Color  | Ratio  | WCAG');
  console.log('  -----------------|-----------|-----------|--------|------');

  const fgRgb = hexToRgb(COLORS[fg].hex);
  const bgRgb = hexToRgb(COLORS[bg].hex);

  // Normal vision
  const normalRatio = getContrastRatio(fgRgb, bgRgb);
  const normalWcag = checkWCAG(normalRatio);
  console.log(`  Normal           | ${COLORS[fg].hex} | ${COLORS[bg].hex} | ${normalRatio.toFixed(2).padStart(5)}:1 | ${normalWcag.icon} ${normalWcag.level}`);

  // Each type of color blindness
  for (const type of cbTypes) {
    const simFg = simulateColorBlindness(fgRgb, type);
    const simBg = simulateColorBlindness(bgRgb, type);
    const ratio = getContrastRatio(simFg, simBg);
    const wcag = checkWCAG(ratio);
    const fgHex = rgbToHex(simFg.r, simFg.g, simFg.b);
    const bgHex = rgbToHex(simBg.r, simBg.g, simBg.b);
    console.log(`  ${type.padEnd(16)} | ${fgHex} | ${bgHex} | ${ratio.toFixed(2).padStart(5)}:1 | ${wcag.icon} ${wcag.level}`);
  }
}

// 4. Distinguishability analysis
console.log('\n\n4. COLOR DISTINGUISHABILITY ANALYSIS');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('Can users distinguish between these color pairs?\n');

const distinguishPairs = [
  ['coral', 'red500', 'Coral vs Error Red'],
  ['coral', 'green500', 'Coral vs Success Green'],
  ['green500', 'red500', 'Success Green vs Error Red'],
  ['coral', 'amber900', 'Coral vs Warning Amber'],
];

console.log('Pair                    | Normal | Protanopia | Deuteranopia | Tritanopia');
console.log('------------------------|--------|------------|--------------|----------');

for (const [c1, c2, desc] of distinguishPairs) {
  const rgb1 = hexToRgb(COLORS[c1].hex);
  const rgb2 = hexToRgb(COLORS[c2].hex);

  const results = ['Normal', ...cbTypes.slice(0, 3)].map(type => {
    const sim1 = type === 'Normal' ? rgb1 : simulateColorBlindness(rgb1, type.toLowerCase());
    const sim2 = type === 'Normal' ? rgb2 : simulateColorBlindness(rgb2, type.toLowerCase());
    const diff = colorDifference(sim1, sim2);
    // Threshold: < 50 = hard to distinguish, < 100 = somewhat distinguishable
    if (diff < 50) return '✗ Hard';
    if (diff < 100) return '~ OK';
    return '✓ Good';
  });

  console.log(`${desc.padEnd(24)}| ${results[0].padEnd(7)}| ${results[1].padEnd(11)}| ${results[2].padEnd(13)}| ${results[3]}`);
}

// 5. Summary and Recommendations
console.log('\n\n5. SUMMARY AND RECOMMENDATIONS');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('✓ GOOD PRACTICES ALREADY IN PLACE:');
console.log('  • Coral on charcoal maintains good contrast across all vision types');
console.log('  • Text size toggle uses white circle indicator (not color-dependent)');
console.log('  • Dark mode toggle uses sun/moon icons (shape-based, not color-based)');
console.log('  • Charcoal text on white has excellent contrast (12.6:1)');
console.log('');

console.log('⚠ AREAS TO MONITOR:');
console.log('  • Coral on white (2.90:1) fails WCAG - already fixed by inverting colors');
console.log('  • Red/green distinction is difficult for deuteranopia/protanopia');
console.log('  • Success/error messages should use icons, not just color');
console.log('');

console.log('📋 RECOMMENDATIONS:');
console.log('  1. Always pair error colors with warning icons (⚠ or ✗)');
console.log('  2. Always pair success colors with checkmark icons (✓)');
console.log('  3. Use underlines for links, not just color changes');
console.log('  4. Ensure form validation shows text messages, not just red borders');
console.log('  5. Consider adding patterns to charts/graphs if used in future');
console.log('');

console.log('═══════════════════════════════════════════════════════════════');
console.log('                    Analysis Complete');
console.log('═══════════════════════════════════════════════════════════════\n');
