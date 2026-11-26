# Lectern

A PDF reader for the Mac that you can control with your voice. Say "next" to turn the page, and Lectern keeps track of how much you read: pages, time, streaks and a daily goal.

Everything happens on your Mac. Lectern works offline, has no account, and never sends your books, your reading data or your voice anywhere.

## Features

### Reading

- Reflow mode lays a PDF's text out like an e-book, with adjustable text size and light, sepia and dark themes. You can switch back to the original pages at any time, with zoom, fit to width and margin trimming.
- Lectern remembers your place in every book.
- Add books by dragging PDFs onto the library, or by putting them in your library folder (Documents › Lectern, unless you choose another in Settings).
- Press G to go to any page. The screen stays awake while you're reading.

### Hands-free reading

Turn on voice commands with V or the microphone button, then say any of these on their own:

| Say                        | To                              |
| -------------------------- | ------------------------------- |
| "next" or "turn"           | Turn the page                   |
| "go back" or "previous"    | Go back a page                  |
| "bigger" or "smaller"      | Change the text size or zoom    |
| "my stats" or "statistics" | Show the stats for this session |
| "library", twice           | Close the book                  |

"Library" has to be said twice, so a stray word can't close your book.

Page-turner remotes and foot pedals work too. Most send the arrow keys, Page Up/Down or Space, which already turn the page, and you can change any keyboard shortcut in Settings. Press ? while reading to see every key and voice command.

### Reading stats

- Pages read and time spent reading, for every session. A page counts once it has been on screen for 7 seconds, so flicking through doesn't count.
- A reading calendar for the past year, shaded by how much you read each day.
- Your current and longest streaks, and a recap after each session with your pace and roughly how long the book has left.
- A daily goal in pages, with a small celebration when you reach it.

### Your data

- Export everything as JSON to back it up, or your sessions as CSV for a spreadsheet.
- Import a backup to restore it or move to another Mac. Nothing you already have is overwritten.

## Download

Lectern runs on Macs with Apple Silicon (M1 or later) and macOS 13 Ventura or later.

1. Download the `.dmg` from the [latest release](https://github.com/BennnH/Lectern/releases/latest).
2. Open it and drag Lectern into Applications.
3. The first time you open Lectern, macOS says it can't verify it. Click **Done**, go to **System Settings → Privacy & Security**, scroll down and click **Open Anyway**, then confirm. You only need to do this once.

macOS shows that warning because Lectern isn't notarised, which needs a paid Apple developer account. Every release is built from this repository by GitHub Actions, so you can see exactly what goes into it.

## Privacy

- **Offline.** Lectern doesn't connect to the internet. Its window is blocked from making network requests, and there are no analytics, accounts or update checks. The only link out is the GitHub button in Settings, which opens your browser.
- **Your voice.** Speech recognition runs on your Mac with an offline model (Vosk). The microphone is only on while voice commands are on, and what it hears is used to match a command, then discarded. Nothing is recorded or saved.
- **Your data.** Reading data and settings are kept in two files in `~/Library/Application Support/Lectern`. They stay there unless you export them.
- **Permissions.** Lectern asks for the microphone, for voice commands, and for access to your library folder. Nothing else.

## Building from source

You'll need Node.js 22 or later.

```sh
npm install
npm run voice-model   # downloads and checks the speech model (about 40 MB)
npm run dev           # runs it in development
npm run build:mac     # builds the .dmg into dist/
```

## Licence

MIT. See [LICENSE](LICENSE).

Lectern is built on [Electron](https://www.electronjs.org), [pdf.js](https://mozilla.github.io/pdf.js/) and [Vosk](https://alphacephei.com/vosk/), among others. Their licences are listed in Settings → About.
