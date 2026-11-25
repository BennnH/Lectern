import { useState } from 'react'
import { COMMANDS } from '../lib/commands'
import { getSettings, updateSettings, type VoiceSettings } from '../lib/settings'

const isMac = window.api.platform === 'darwin'

// Settings → Voice: the noise filter, and the words to say
export default function VoiceOptions(): React.JSX.Element {
  // The same setting as the switch in the reader's voice panel
  const [voice, setVoice] = useState<VoiceSettings>(() => getSettings().voice)

  const change = (newVoice: VoiceSettings): void => {
    setVoice(newVoice)
    updateSettings({ voice: newVoice })
  }

  return (
    <>
      <div className="divide-y divide-white/5 rounded-2xl bg-white/[0.03] ring-1 ring-white/5">
        <label className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
          <span>
            <span className="block text-sm text-neutral-200">Noise filter</span>
            <span className="block text-xs text-neutral-500">
              Cuts background noise from the microphone. Try it on and off to see which hears you
              better.
            </span>
          </span>
          <input
            type="checkbox"
            checked={voice.noiseFilter}
            onChange={(e) => change({ ...voice, noiseFilter: e.target.checked })}
            className="h-4 w-4 shrink-0 accent-emerald-400"
          />
        </label>

        <div className="px-5 pt-3 pb-4">
          <h3 className="py-1 text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
            Words to say
          </h3>
          {COMMANDS.filter((command) => command.voice.length > 0).map((command) => (
            <div key={command.id} className="flex items-baseline justify-between gap-4 py-1.5">
              <p className="text-sm text-neutral-200">{command.label}</p>
              <div className="flex flex-wrap justify-end gap-x-2 gap-y-0.5">
                {command.voice.map((word, i) => (
                  <span
                    key={word}
                    className={`text-sm ${i === 0 ? 'text-sky-300' : 'text-neutral-500'}`}
                  >
                    “{word}”
                  </span>
                ))}
                {command.strict && <span className="text-xs text-neutral-500">say twice</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        Voice runs on this {isMac ? 'Mac' : 'computer'} with an offline speech model. Nothing you
        say is recorded, saved or sent anywhere.
      </p>
    </>
  )
}
