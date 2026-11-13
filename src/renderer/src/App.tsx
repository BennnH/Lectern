import { motion } from 'motion/react'

function App(): React.JSX.Element {
  return (
    <main className="flex h-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <h1 className="text-5xl font-semibold tracking-tight">Lectern</h1>
        <p className="mt-3 text-sm text-neutral-400">The empty box works.</p>
      </motion.div>
    </main>
  )
}

export default App
