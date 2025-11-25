import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Patient Engagement Award - Piattaforma di Votazione',
    short_name: 'PEA Voting',
    description: 'Vota per le iniziative di engagement del paziente',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: '/pea-logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pea-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
