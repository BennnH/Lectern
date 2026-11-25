import { motion } from 'motion/react'
import {
  AArrowDown,
  AArrowUp,
  Activity,
  CircleQuestionMark,
  Crop,
  Maximize,
  Mic,
  MicOff,
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
import { shortcut, type CommandId } from '../lib/commands'
import { EASE_OUT } from '../lib/motion'

type Props = {
  visible: boolean
  mode: ReadingMode
  settings: ReaderSettings
  status: string
  isFullscreen: boolean
  statsOpen: boolean
  helpOpen: boolean
  voiceOn: boolean
  onCommand: (id: CommandId) => void
}

const THEME_ICON = { light: Sun, sepia: Sunset, dark: Moon }

// Button tooltip with the command's key, e.g. "Theme (T)"
function hint(label: string, id: CommandId): string {
  const key = shortcut(id)
  return key ? `${label} (${key})` : label
}

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
  const { visible, mode, settings, status, isFullscreen, onCommand } = props
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
          label={hint(reflow ? 'Show original pages' : 'Reflow text', 'view.mode')}
          active={reflow}
          onClick={() => onCommand('view.mode')}
        >
          <WrapText size={16} />
        </ToolButton>
        <ToolButton label={hint('Theme', 'view.theme')} onClick={() => onCommand('view.theme')}>
          <ThemeIcon size={16} />
        </ToolButton>
        {!reflow && (
          <>
            <ToolButton
              label={hint('Crop margins', 'view.crop')}
              active={settings.crop}
              onClick={() => onCommand('view.crop')}
            >
              <Crop size={16} />
            </ToolButton>
            <ToolButton
              label={hint('Fit to width', 'view.fit')}
              active={settings.fit === 'width'}
              onClick={() => onCommand('view.fit')}
            >
              <MoveHorizontal size={16} />
            </ToolButton>
          </>
        )}

        <Divider />

        <ToolButton
          label={hint(reflow ? 'Smaller text' : 'Zoom out', 'size.smaller')}
          onClick={() => onCommand('size.smaller')}
        >
          {reflow ? <AArrowDown size={16} /> : <Minus size={16} />}
        </ToolButton>
        <button
          type="button"
          title={hint(reflow ? 'Default text size' : 'Reset zoom', 'size.reset')}
          onClick={() => onCommand('size.reset')}
          onMouseDown={(e) => e.preventDefault()}
          className="w-11 text-center text-xs text-neutral-300 tabular-nums transition-colors hover:text-white"
        >
          {reflow ? settings.fontSize : `${Math.round(settings.zoom * 100)}%`}
        </button>
        <ToolButton
          label={hint(reflow ? 'Bigger text' : 'Zoom in', 'size.bigger')}
          onClick={() => onCommand('size.bigger')}
        >
          {reflow ? <AArrowUp size={16} /> : <Plus size={16} />}
        </ToolButton>

        <Divider />

        <button
          type="button"
          title={hint('Go to page', 'page.goto')}
          onClick={() => onCommand('page.goto')}
          onMouseDown={(e) => e.preventDefault()}
          className="rounded-full px-2 py-1 text-xs whitespace-nowrap text-neutral-400 tabular-nums transition-colors hover:bg-white/10 hover:text-white"
        >
          {status}
        </button>

        <Divider />

        <ToolButton
          label={hint('Session stats', 'stats.toggle')}
          active={props.statsOpen}
          onClick={() => onCommand('stats.toggle')}
        >
          <Activity size={16} />
        </ToolButton>

        <ToolButton
          label={hint(props.voiceOn ? 'Turn voice commands off' : 'Voice commands', 'voice.toggle')}
          active={props.voiceOn}
          onClick={() => onCommand('voice.toggle')}
        >
          {props.voiceOn ? <Mic size={16} /> : <MicOff size={16} />}
        </ToolButton>

        <ToolButton
          label={hint('Controls', 'help.toggle')}
          active={props.helpOpen}
          onClick={() => onCommand('help.toggle')}
        >
          <CircleQuestionMark size={16} />
        </ToolButton>
        <ToolButton
          label={hint(isFullscreen ? 'Exit full screen' : 'Full screen', 'window.fullscreen')}
          onClick={() => onCommand('window.fullscreen')}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </ToolButton>
      </div>
    </motion.div>
  )
}
