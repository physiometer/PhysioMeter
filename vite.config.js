import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import yaml from '@modyfi/vite-plugin-yaml'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/PhysioMeter/',
  plugins: [
    react(),
    yaml(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/icon.svg', 'icons/*.png'],
      manifest: {
        name: 'PhysioMeter',
        short_name: 'PhysioMeter',
        description: 'Clinical tool for physical therapy measurements, calculations, and interpretations.',
        start_url: '/PhysioMeter/',
        scope: '/PhysioMeter/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0d6efd',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
