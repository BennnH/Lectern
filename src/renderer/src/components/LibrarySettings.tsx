import { useEffect, useState } from 'react'
import { Folder, FolderOpen, FolderSearch, RotateCcw } from 'lucide-react'

const isMac = window.api.platform === 'darwin'

// The same rounded outline buttons as on the Data page
const BUTTON =
  'flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent'

// Settings → Library: where Lectern finds your PDFs, and choosing another folder
export default function LibrarySettings({
  onChange
}: {
  onChange: () => void // the library needs listing again
}): React.JSX.Element {
  const [folder, setFolder] = useState<LibraryFolder | null>(null)

  useEffect(() => {
    window.api.libraryFolder().then(setFolder)
  }, [])

  const changed = (newFolder: LibraryFolder | null): void => {
    if (!newFolder) return // you cancelled the folder picker
    setFolder(newFolder)
    onChange()
  }

  return (
    <>
      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/5">
        <div className="flex items-center gap-3">
          <Folder size={16} className="shrink-0 text-neutral-500" />
          <p className="min-w-0 truncate font-mono text-xs text-neutral-300" title={folder?.path}>
            {folder?.shortPath}
          </p>
          {folder?.isDefault && <span className="text-xs text-neutral-500">Default</span>}
        </div>
        {folder && !folder.found && (
          <p className="mt-2 text-xs text-amber-300/90">
            Can&apos;t find this folder. If it&apos;s on a drive, plug it back in, or choose another
            folder.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
          <button
            type="button"
            disabled={!folder?.found}
            onClick={() => window.api.openLibraryFolder()}
            className={BUTTON}
          >
            <FolderOpen size={15} />
            Show in {isMac ? 'Finder' : 'folder'}
          </button>
          <button
            type="button"
            onClick={() => window.api.chooseLibraryFolder().then(changed)}
            className={BUTTON}
          >
            <FolderSearch size={15} />
            Change…
          </button>
          {folder && !folder.isDefault && (
            <button
              type="button"
              onClick={() => window.api.useDefaultLibraryFolder().then(changed)}
              className={BUTTON}
            >
              <RotateCcw size={15} />
              Use default
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Your place and reading stats stay with each book, even if you move it to another folder.
      </p>
    </>
  )
}
