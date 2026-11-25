import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { closePdf, openPdf, type PdfDoc } from '../lib/pdf'
import { blockForPage, getReflowBook, type ReflowBook } from '../lib/reflow'
import { getProgress, saveProgress, saveSession } from '../lib/store'
import { MAX_TURN_MS, SessionTracker, fractionAt, isWorthKeeping } from '../lib/stats'
import { useCommandKeys, type CommandActions, type CommandId } from '../lib/commands'
import { useVoiceCommands } from '../lib/voice/useVoiceCommands'
import { loadVoiceSettings, saveVoiceSettings, type VoiceSettings } from '../lib/voice/settings'
import {
  DEFAULT_SETTINGS,
  FONT_SIZES,
  REFLOW_COLOURS,
  THEMES,
  ZOOM_STEPS,
  loadSettings,
  saveSettings,
  stepThrough,
  type PageTheme,
  type ReaderSettings
} from '../lib/settings'
import { EASE_OUT } from '../lib/motion'
import PageView, { type ViewHandle } from './PageView'
import ReflowView, { type ReflowLocation } from './ReflowView'
import ReaderToolbar from './ReaderToolbar'
import SessionPanel from './SessionPanel'
import ControlsHelp from './ControlsHelp'
import GoToPage from './GoToPage'
import VoiceIndicator from './VoiceIndicator'
import VoicePanel from './VoicePanel'

type Props = {
  book: Book
  // Called when you leave the book, with the session you just read (if it's worth showing)
  onClose: (session: ReadingSession | null) => void
}

// Hide the controls and cursor after this long without mouse movement (ms)
const IDLE_MS = 2500

const THEME_LABEL: Record<PageTheme, string> = { light: 'Light', sepia: 'Sepia', dark: 'Dark' }

export default function Reader({ book, onClose }: Props): React.JSX.Element {
  const viewRef = useRef<ViewHandle>(null)
  const flashTimer = useRef<number | undefined>(undefined)
  const bookKey = `${book.id}:${book.modified}`

  const [doc, setDoc] = useState<PdfDoc | null>(null)
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings)
  const [page, setPage] = useState(() => getProgress(book.fingerprint)?.page ?? 1)
  // Position in reflow mode (null = go by the page number instead)
  const [block, setBlock] = useState<number | null>(
    () => getProgress(book.fingerprint)?.block ?? null
  )
  // Records this reading session (created once the PDF has opened)
  const [tracker, setTracker] = useState<SessionTracker | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const [goToOpen, setGoToOpen] = useState(false)
  // Goes up by one on every Go to page, so the reflow view lays out again from the new page
  const [jumps, setJumps] = useState(0)

  // Voice commands always start off, and stop when you leave the book
  const [voiceOn, setVoiceOn] = useState(false)
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(loadVoiceSettings)
  const [reflowBook, setReflowBook] = useState<ReflowBook | null>(null)
  const [preparing, setPreparing] = useState(0)
  const [location, setLocation] = useState<ReflowLocation | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const total = doc?.numPages ?? 1
  // Scanned PDFs have no text to reflow, so they always show original pages
  const canReflow = reflowBook ? reflowBook.hasText : true
  const mode = settings.mode === 'reflow' && canReflow ? 'reflow' : 'original'

  // A short message in the middle of the screen, e.g. "Sepia" or "125%"
  const showFlash = useCallback((message: string) => {
    setFlash(message)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1100)
  }, [])

  // Open the PDF (and close it again when leaving the reader)
  useEffect(() => {
    let cancelled = false
    let opened: PdfDoc | null = null
    openPdf(book.id)
      .then((loaded) => {
        if (cancelled) {
          closePdf(loaded)
          return
        }
        opened = loaded
        const startPage = Math.min(
          Math.max(1, getProgress(book.fingerprint)?.page ?? 1),
          loaded.numPages
        )
        setDoc(loaded)
        setPage(startPage)
        setTracker(new SessionTracker(book, startPage, loaded.numPages))
      })
      .catch(() => {
        if (!cancelled) setError('This PDF could not be opened.')
      })
    return () => {
      cancelled = true
      if (opened) closePdf(opened)
    }
  }, [book])

  // Turn the PDF into flowing text the first time reflow mode needs it
  useEffect(() => {
    if (!doc || settings.mode !== 'reflow' || reflowBook) return
    let cancelled = false
    getReflowBook(bookKey, doc, (fraction) => {
      if (!cancelled) setPreparing(fraction)
    })
      .then((prepared) => {
        if (cancelled) return
        setReflowBook(prepared)
        if (!prepared.hasText) showFlash('This PDF has no text to reflow, so showing pages')
      })
      .catch(() => {
        if (!cancelled) setReflowBook({ blocks: [], sections: [], totalChars: 1, hasText: false })
      })
    return () => {
      cancelled = true
    }
  }, [doc, settings.mode, reflowBook, bookKey, showFlash])

  // Track full screen (it can also be changed with the green button)
  useEffect(() => {
    window.api.isFullscreen().then(setIsFullscreen)
    return window.api.onFullscreenChange(setIsFullscreen)
  }, [])

  // Where you are, as a fraction of the book (by real PDF pages, in both modes)
  const fraction = fractionAt(page, total)

  // Remember settings and progress
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveVoiceSettings(voiceSettings), [voiceSettings])
  useEffect(() => {
    if (!doc) return
    saveProgress(book.fingerprint, {
      page,
      total: doc.numPages,
      block: block ?? undefined,
      percent: fraction,
      lastOpened: Date.now()
    })
  }, [doc, page, block, fraction, book.fingerprint])

  // The PDF pages on screen, for counting pages read: in reflow mode one screen can show
  // text from more than one page
  const screenFirstPage = mode === 'reflow' && location ? location.firstPage : page
  const screenLastPage = mode === 'reflow' && location ? location.lastPage : page

  // Every time the screen changes, count it towards this session (saved as you go)
  useEffect(() => {
    if (!tracker) return
    tracker.turn(screenFirstPage, screenLastPage)
    if (isWorthKeeping(tracker.session)) saveSession(tracker.session)
  }, [tracker, screenFirstPage, screenLastPage, location])

  // Wrap up the session: count the screen you were on, save it, and return it
  const finishSession = useCallback((): ReadingSession | null => {
    if (!tracker) return null
    tracker.finish()
    if (!isWorthKeeping(tracker.session)) return null
    saveSession(tracker.session)
    return { ...tracker.session }
  }, [tracker])

  const close = useCallback(() => onClose(finishSession()), [onClose, finishSession])

  // Also save the session if the app is closed or reloaded while reading
  useEffect(() => {
    window.addEventListener('beforeunload', finishSession)
    return () => window.removeEventListener('beforeunload', finishSession)
  }, [finishSession])

  const onPageChange = useCallback((newPage: number) => {
    setPage(newPage)
    setBlock(null)
  }, [])

  const onReflowLocation = useCallback(
    (newLocation: ReflowLocation) => {
      setLocation(newLocation)
      setBlock(newLocation.block)
      const startPage = reflowBook?.blocks[newLocation.block]?.page
      if (startPage) setPage(startPage)
    },
    [reflowBook]
  )

  const toggleMode = useCallback(() => {
    if (settings.mode === 'original' && reflowBook && !reflowBook.hasText) {
      showFlash('This PDF has no text to reflow')
      return
    }
    const newMode = settings.mode === 'reflow' ? 'original' : 'reflow'
    setSettings({ ...settings, mode: newMode })
    showFlash(newMode === 'reflow' ? 'Reflow text' : 'Original pages')
  }, [settings, reflowBook, showFlash])

  const cycleTheme = useCallback(() => {
    const theme = THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length]
    setSettings({ ...settings, theme })
    showFlash(THEME_LABEL[theme])
  }, [settings, showFlash])

  const toggleCrop = useCallback(() => {
    if (mode === 'reflow') return
    setSettings({ ...settings, crop: !settings.crop })
    showFlash(settings.crop ? 'Full page' : 'Margins trimmed')
  }, [mode, settings, showFlash])

  const toggleFit = useCallback(() => {
    if (mode === 'reflow') return
    const fit = settings.fit === 'page' ? 'width' : 'page'
    setSettings({ ...settings, fit, zoom: 1 })
    showFlash(fit === 'width' ? 'Fit to width' : 'Fit to page')
  }, [mode, settings, showFlash])

  // + and − change the text size in reflow mode, and the zoom on original pages
  const resize = useCallback(
    (direction: 1 | -1 | 0) => {
      if (mode === 'reflow') {
        const fontSize =
          direction === 0
            ? DEFAULT_SETTINGS.fontSize
            : stepThrough(FONT_SIZES, settings.fontSize, direction)
        setSettings({ ...settings, fontSize })
        showFlash(`Text size ${fontSize}`)
      } else {
        const zoom = direction === 0 ? 1 : stepThrough(ZOOM_STEPS, settings.zoom, direction)
        setSettings({ ...settings, zoom })
        showFlash(`${Math.round(zoom * 100)}%`)
      }
    },
    [mode, settings, showFlash]
  )

  const toggleFullscreen = useCallback(() => {
    window.api.toggleFullscreen()
  }, [])

  const toggleVoice = useCallback(() => {
    const on = !voiceOn
    setVoiceOn(on)
    if (!on) setVoicePanelOpen(false)
    showFlash(on ? 'Voice commands on' : 'Voice commands off')
  }, [voiceOn, showFlash])

  // Jump straight to a page. The pages in between were never on screen, so they don't
  // count as read.
  const goToPage = useCallback(
    (target: number) => {
      setGoToOpen(false)
      setPage(target)
      setBlock(null) // in reflow mode, start from the text on that page
      setJumps((count) => count + 1)
      showFlash(`Page ${target}`)
    },
    [showFlash]
  )
  const closeGoTo = useCallback(() => setGoToOpen(false), [])

  // What each command does in the reader (the keys and voice words live in lib/commands.ts)
  const actions = useMemo<CommandActions>(
    () => ({
      'page.next': () => viewRef.current?.next(),
      'page.prev': () => viewRef.current?.prev(),
      'page.goto': () => setGoToOpen(true),
      'size.bigger': () => resize(1),
      'size.smaller': () => resize(-1),
      'size.reset': () => resize(0),
      'view.mode': toggleMode,
      'view.theme': cycleTheme,
      'view.crop': toggleCrop,
      'view.fit': toggleFit,
      'stats.toggle': () => setStatsOpen((open) => !open),
      'book.close': close,
      'voice.toggle': toggleVoice,
      'window.fullscreen': toggleFullscreen,
      'help.toggle': () => setHelpOpen((open) => !open)
    }),
    [resize, toggleMode, cycleTheme, toggleCrop, toggleFit, close, toggleVoice, toggleFullscreen]
  )

  // While the controls list is open, ? and Esc just close it (nothing changes behind it)
  const helpActions = useMemo<CommandActions>(
    () => ({
      'help.toggle': () => setHelpOpen(false),
      'book.close': () => setHelpOpen(false)
    }),
    []
  )

  // While Go to page is open, Esc (or saying "library") just closes it
  const goToActions = useMemo<CommandActions>(() => ({ 'book.close': closeGoTo }), [closeGoTo])

  const activeActions = goToOpen ? goToActions : helpOpen ? helpActions : actions
  useCommandKeys(activeActions)

  // Voice runs the same actions as the keys (see lib/voice for how it listens)
  const voice = useVoiceCommands({
    enabled: voiceOn,
    noiseFilter: voiceSettings.noiseFilter,
    actions: activeActions
  })

  // Toolbar buttons run the same commands as the keys
  const runCommand = useCallback((id: CommandId) => actions[id]?.(), [actions])

  // Keep the screen on while you're reading, as turning pages by voice doesn't count
  // as activity to the Mac. If no page has turned for a while (you've wandered off),
  // let it sleep as normal again.
  useEffect(() => {
    window.api.keepScreenOn(true)
    const timer = window.setTimeout(() => window.api.keepScreenOn(false), MAX_TURN_MS)
    return () => window.clearTimeout(timer)
  }, [page, location])
  useEffect(() => {
    return () => {
      window.api.keepScreenOn(false)
    }
  }, [])

  // Show the controls when the mouse moves, hide them when it stops
  useEffect(() => {
    let timer = window.setTimeout(() => setControlsVisible(false), IDLE_MS)
    const onMove = (): void => {
      setControlsVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setControlsVisible(false), IDLE_MS)
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  const status =
    mode === 'reflow' && location
      ? `${location.pageInSection} / ${location.pagesInSection} · ${Math.round(fraction * 100)}%`
      : `${page} / ${total}`

  const startBlock =
    reflowBook && reflowBook.blocks.length > 0
      ? Math.min(block ?? blockForPage(reflowBook, page), reflowBook.blocks.length - 1)
      : 0

  return (
    <motion.div
      className={`absolute inset-0 transition-colors duration-300 ${controlsVisible ? '' : 'cursor-none'}`}
      style={{
        backgroundColor: mode === 'reflow' ? REFLOW_COLOURS[settings.theme].background : '#0a0a0a'
      }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      {doc && mode === 'original' && (
        <PageView
          ref={viewRef}
          doc={doc}
          page={page}
          onPageChange={onPageChange}
          settings={settings}
          bookKey={bookKey}
        />
      )}

      {doc && mode === 'reflow' && reflowBook && (
        <ReflowView
          key={`${bookKey}:${jumps}`}
          ref={viewRef}
          book={reflowBook}
          doc={doc}
          startBlock={startBlock}
          startPage={block === null ? page : undefined}
          fontSize={settings.fontSize}
          theme={settings.theme}
          onLocationChange={onReflowLocation}
        />
      )}

      {doc && mode === 'reflow' && !reflowBook && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-500">
          <p className="text-sm">Preparing book…</p>
          <div className="h-0.5 w-40 overflow-hidden rounded-full bg-neutral-500/20">
            <div
              className="h-full bg-neutral-500 transition-[width] duration-200"
              style={{ width: `${Math.round(preparing * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          {error}
        </p>
      )}

      <AnimatePresence>
        {flash && (
          <div className="pointer-events-none absolute inset-x-0 top-12 z-[60] flex justify-center">
            <motion.div
              key={flash}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="rounded-full bg-neutral-900/85 px-4 py-1.5 text-sm text-neutral-200 ring-1 ring-white/10 backdrop-blur-md"
            >
              {flash}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {statsOpen && tracker && <SessionPanel tracker={tracker} page={page} total={total} />}
      </AnimatePresence>

      <AnimatePresence>
        {helpOpen && <ControlsHelp mode={mode} onClose={() => setHelpOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {goToOpen && (
          <GoToPage
            firstPage={screenFirstPage}
            lastPage={screenLastPage}
            total={total}
            onGo={goToPage}
            onClose={closeGoTo}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {voiceOn && (
          <VoiceIndicator
            voice={voice}
            controlsVisible={controlsVisible}
            onClick={() => setVoicePanelOpen((open) => !open)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {voiceOn && voicePanelOpen && (
          <VoicePanel
            voice={voice}
            settings={voiceSettings}
            onChangeSettings={setVoiceSettings}
            onClose={() => setVoicePanelOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={close}
        onMouseDown={(e) => e.preventDefault()}
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className={`app-no-drag absolute top-2 left-20 z-[60] flex items-center gap-1.5 rounded-full bg-neutral-900/85 px-3 py-1 text-sm text-neutral-300 ring-1 ring-white/10 backdrop-blur-md transition-colors hover:text-white ${controlsVisible ? '' : 'pointer-events-none'}`}
      >
        <ArrowLeft size={14} />
        Library
      </motion.button>

      <ReaderToolbar
        visible={controlsVisible || goToOpen}
        mode={mode}
        settings={settings}
        status={status}
        isFullscreen={isFullscreen}
        statsOpen={statsOpen}
        helpOpen={helpOpen}
        voiceOn={voiceOn}
        onCommand={runCommand}
      />
    </motion.div>
  )
}
