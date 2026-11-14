import { motion } from 'motion/react'
import {
  AArrowDown,
  AArrowUp,
  Crop,
  Maximize,
  Minimize,
  Minus,
  Moon,
  MoveHorizontal,
  Plus,
  Sun,
  Sunset,
  WrapText
} from 'lucide-react'
import type { ReaderSettings, ReadingMode } from '../lib/settings'
import { EASE_OUT } from '../lib/motion'

type Props = {
  visible: boolean
  mode: ReadingMode
  settings: ReaderSettings
  status: string
  isFullscreen: boolean
  onToggleMode: () => void
  onCycleTheme: () => void
  onToggleCrop: () => void
  onToggleFit: () => void
  onBigger: () => void
  onSmaller: () => void
  onResetSize: () => void
  onToggleFullscreen: () => void
}

const THEME_ICON = { light: Sun, sepia: Sunset, dark: Moon }

type ToolButtonProps = {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}

function ToolButton({
  label,
  active = false,
  onClick,
  children
}: ToolButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      // Stops the button keeping keyboard focus, so Space still turns the page
      onMouseDown={(e) => e.preventDefault()}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        active ? 'bg-white/15 text-white' : 'text-neutral-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Divider(): React.JSX.Element {
  return <div className="mx-1 h-5 w-px bg-white/10" />
}

export default function ReaderToolbar(props: Props): React.JSX.Element {
  const { visible, mode, settings, status, isFullscreen } = props
  const ThemeIcon = THEME_ICON[settings.theme]
  const reflow = mode === 'reflow'

  return (
    <motion.div
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className={`absolute inset-x-0 bottom-4 z-[60] flex justify-center ${visible ? '' : 'pointer-events-none'}`}
    >
      <div className="flex items-center gap-1 rounded-full bg-neutral-900/85 px-2 py-1.5 shadow-xl ring-1 shadow-black/30 ring-white/10 backdrop-blur-md">
        <ToolButton
          label={reflow ? 'Show original pages (R)' : 'Reflow text (R)'}
          active={reflow}
          onClick={props.onToggleMode}
        >
          <WrapText size={16} />
        </ToolButton>
        <ToolButton label="Theme (T)" onClick={props.onCycleTheme}>
          <ThemeIcon size={16} />
        </ToolButton>
        {!reflow && (
          <>
            <ToolButton
              label="Crop margins (C)"
              active={settings.crop}
              onClick={props.onToggleCrop}
            >
              <Crop size={16} />
            </ToolButton>
            <ToolButton
              label="Fit to width (W)"
              active={settings.fit === 'width'}
              onClick={props.onToggleFit}
            >
              <MoveHorizontal size={16} />
            </ToolButton>
          </>
        )}

        <Divider />

        <ToolButton label={reflow ? 'Smaller text (−)' : 'Zoom out (−)'} onClick={props.onSmaller}>
          {reflow ? <AArrowDown size={16} /> : <Minus size={16} />}
        </ToolButton>
        <button
          type="button"
          title={reflow ? 'Default text size (0)' : 'Reset zoom (0)'}
          onClick={props.onResetSize}
          onMouseDown={(e) => e.preventDefault()}
          className="w-11 text-center text-xs text-neutral-300 tabular-nums transition-colors hover:text-white"
        >
          {reflow ? settings.fontSize : `${Math.round(settings.zoom * 100)}%`}
        </button>
        <ToolButton label={reflow ? 'Bigger text (+)' : 'Zoom in (+)'} onClick={props.onBigger}>
          {reflow ? <AArrowUp size={16} /> : <Plus size={16} />}
        </ToolButton>

        <Divider />

        <span className="px-2 text-xs whitespace-nowrap text-neutral-400 tabular-nums">
          {status}
        </span>

        <Divider />

        <ToolButton
          label={isFullscreen ? 'Exit full screen (F)' : 'Full screen (F)'}
          onClick={props.onToggleFullscreen}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </ToolButton>
      </div>
    </motion.div>
  )
}
