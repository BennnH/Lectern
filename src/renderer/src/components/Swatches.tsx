import { shades, type Palette } from '../lib/palettes'

type Props = {
  palette: Palette
  size?: number // square size in pixels
}

// A palette's shades in a row, from no reading to full strength
export default function Swatches({ palette, size = 12 }: Props): React.JSX.Element {
  return (
    <span className="flex gap-[3px]">
      {shades(palette).map((colour, level) => (
        <span
          key={level}
          className="rounded-[3px] transition-colors duration-200"
          style={{ width: size, height: size, backgroundColor: colour }}
        />
      ))}
    </span>
  )
}
