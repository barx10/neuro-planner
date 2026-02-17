import { Globe, Mail } from 'lucide-react'

export function AboutView() {
  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <div className="py-5 flex flex-col items-center text-center">
        <img
          src="/splash.png"
          alt="Neurominder"
          className="w-40 rounded-2xl mb-5"
        />
        <h2 className="text-2xl font-extrabold mb-1">Neurominder</h2>
        <p className="text-sm text-gray-400 mb-6">Din visuelle planlegger</p>

        <div className="glass rounded-2xl p-5 w-full text-left space-y-4 mb-6">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Neurominder er laget for deg som tenker litt annerledes. Appen hjelper med visuell struktur,
            tidsplanlegging og AI-støttet oppgavenedbrytning — tilpasset ADHD og autisme.
          </p>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Utviklet av Kenneth Bareksten.
          </p>
        </div>

        <div className="w-full space-y-3">
          <a
            href="https://barx10.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl glass border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Globe size={18} className="text-indigo-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Nettside</p>
              <p className="text-[11px] text-gray-400">barx10.github.io</p>
            </div>
          </a>

          <a
            href="mailto:kenneth@barx10.com"
            className="flex items-center gap-3 p-4 rounded-2xl glass border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <Mail size={18} className="text-pink-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Kontakt</p>
              <p className="text-[11px] text-gray-400">kenneth@barx10.com</p>
            </div>
          </a>
        </div>

        <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-8">
          Versjon 1.0 &middot; Laget med hjertet i Norge
        </p>
      </div>
    </div>
  )
}
