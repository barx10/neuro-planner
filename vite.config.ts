import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png', 'splash.png'],
      manifest: {
        name: 'Neuro Planner',
        short_name: 'Planner',
        description: 'Visuell planlegger for nevrodivergente',
        theme_color: '#6366f1',
        background_color: '#1e1b4b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i, handler: 'NetworkOnly' },
          { urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i, handler: 'NetworkOnly' },
          { urlPattern: /^https:\/\/api\.openai\.com\/.*/i, handler: 'NetworkOnly' },
        ]
      }
    })
  ]
})
