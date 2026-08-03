import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Base path.
 *
 * GitHub Pages serves project sites from `https://<user>.github.io/<repo>/`, so the
 * bundle must be built with that prefix. The deploy workflow sets BASE_PATH for us.
 * For a user/organisation page (`<user>.github.io`) or a custom domain, set BASE_PATH=/
 */
const base = process.env.BASE_PATH ?? '/fbc-agbede/'

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'robots.txt'],
      manifest: {
        id: base,
        name: 'First Baptist Church Agbede, Ikorodu',
        short_name: 'FBC Agbede',
        description:
          'Chapel of Grace — services, sermons, events, devotionals and church records for First Baptist Church Agbede, Ikorodu.',
        theme_color: '#2B2750',
        background_color: '#F8F3E9',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        categories: ['lifestyle', 'education', 'social'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Today’s Devotional', short_name: 'Devotional', url: `${base}devotional` },
          { name: 'Upcoming Events', short_name: 'Events', url: `${base}events` },
          { name: 'Sermons', short_name: 'Sermons', url: `${base}sermons` },
          { name: 'Giving', short_name: 'Giving', url: `${base}giving` },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        /*
          Never precache uploaded media.

          Photos and PDFs the church uploads are served by the runtime
          CacheFirst rule below, which caches them as people actually view them.
          Precaching instead would force every visitor to download the entire
          gallery on first load, and — because Workbox fails the build on any
          file over the size limit — it meant an admin uploading a large photo
          could break the deploy for the whole church.
        */
        /*
          Uploaded media, and the admin half of the app.

          Precaching every built chunk meant a congregant downloaded ~353 KB of
          church-office code — chart.js alone is 179 KB — in the background on
          their first visit, for screens they will never open. On metered mobile
          data that is a third of the payload wasted.

          These chunks are still cached at runtime the first time the one admin
          actually opens them, so the office works offline for the person who
          needs it without charging the congregation for the privilege.
        */
        globIgnores: [
          'media/**',
          'assets/charts-*.js',
          'assets/Admin*-*.js',
          'assets/Members*-*.js',
          'assets/Attendance*-*.js',
          'assets/Reports*-*.js',
          'assets/Settings*-*.js',
          'assets/ContentPage-*.js',
        ],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Church content: serve instantly from cache, refresh in the background.
            urlPattern: ({ url }) => url.pathname.includes('/content/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fbc-content',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/media/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fbc-media',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'charts'
          if (id.includes('react-router')) return 'router'
          if (id.includes('react-dom') || id.includes('/react/')) return 'react'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('date-fns')) return 'dates'
        },
      },
    },
  },
})
