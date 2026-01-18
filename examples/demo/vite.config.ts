import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'; // Import path module

// https://vite.dev/config/
export default defineConfig({
  base: '/spatial-id-terrain-voxelizer/',
  plugins: [react()],
  resolve: {
    alias: {
      'spatial-id-terrain-voxelizer': path.resolve(__dirname, '../../src'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react-map-gl': path.resolve(__dirname, './node_modules/react-map-gl'),
      'maplibre-gl': path.resolve(__dirname, './node_modules/maplibre-gl')
    }
  }
})
