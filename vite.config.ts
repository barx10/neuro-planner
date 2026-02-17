import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icon.png', 'splash.png'],
      manifest: {
        name: 'Neurominder',
        short_name: 'Neurominder',
        description: 'Visuell planlegger for nevrodivergente',
        theme_color: '#6366f1',
        background_color: '#1e1b4b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ]
})
