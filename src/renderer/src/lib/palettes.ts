// Colour schemes for the reading calendar. Each is one colour shown at four strengths,
// like GitHub: faint for lighter reading days, full colour for your biggest days.

export type Palette = {
  id: string
  name: string
  colour: string // full strength, as #rrggbb
}

export const PALETTES: Palette[] = [
  { id: 'green', name: 'Green', colour: '#39d353' },
  { id: 'teal', name: 'Teal', colour: '#2dd4bf' },
  { id: 'blue', name: 'Blue', colour: '#60a5fa' },
  { id: 'indigo', name: 'Indigo', colour: '#818cf8' },
  { id: 'purple', name: 'Purple', colour: '#c084fc' },
  { id: 'pink', name: 'Pink', colour: '#f472b6' },
  { id: 'red', name: 'Red', colour: '#f87171' },
  { id: 'orange', name: 'Orange', colour: '#fb923c' },
  { id: 'gold', name: 'Gold', colour: '#facc15' },
  { id: 'mono', name: 'Mono', colour: '#f5f5f5' }
]

// How strong the colour is at each level (level 0 is a day with no reading)
const STRENGTH = [0, 0.25, 0.45, 0.7, 1]
const EMPTY = 'rgba(255, 255, 255, 0.06)'

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

// The colour of a calendar square at a level (0–4)
export function shade(palette: Palette, level: number): string {
  if (level <= 0) return EMPTY
  const red = parseInt(palette.colour.slice(1, 3), 16)
  const green = parseInt(palette.colour.slice(3, 5), 16)
  const blue = parseInt(palette.colour.slice(5, 7), 16)
  return `rgba(${red}, ${green}, ${blue}, ${STRENGTH[Math.min(level, STRENGTH.length - 1)]})`
}

// Every shade of a palette, from no reading to full strength
export function shades(palette: Palette): string[] {
  return STRENGTH.map((_, level) => shade(palette, level))
}
