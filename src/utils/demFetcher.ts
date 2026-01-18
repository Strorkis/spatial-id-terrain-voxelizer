/**
 * GSI (Geospatial Information Authority of Japan) DEM Tile Fetcher
 * and Parser utilities.
 */

// GSI DEM Tile URL Template (using GSI standard tiles)
// Source: https://maps.gsi.go.jp/development/ichiran.html
export const GSI_DEM_URL_TEMPLATE = 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png';

// AIST Seamless Elevation Tile (Mixed) URL Template
// Source: https://tiles.gsj.jp/tiles/elev/tiles.html
// Note: y and x are swapped in the URL structure: .../{z}/{y}/{x}.png
export const AIST_DEM_URL_TEMPLATE = 'https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png';

/**
 * Calculates the elevation from GSI DEM PNG RGB values.
 * Formula: h = (R * 2^16 + G * 2^8 + B) * u, where u is resolution.
 * Reference: https://maps.gsi.go.jp/development/ichiran.html#dem
 * For GSI PNG tiles:
 * If x < 2^23: h = x * 0.01 (meters)
 * If x = 2^23: h = (NA)
 * If x > 2^23: h = (x - 2^24) * 0.01 (meters)
 * 
 * However, the standard formula often used for these tiles is:
 * X = R * 65536 + G * 256 + B
 * If X < 8388608 (2^23): h = X * 0.01
 * If X = 8388608: h = N/A
 * If X > 8388608: h = (X - 16777216) * 0.01
 */
export function getElevationFromRgb(r: number, g: number, b: number): number | null {
  const x = r * 65536 + g * 256 + b;
  const resolution = 0.01;

  // Missing data definition
  if (x === 8388608) {
    return null;
  }

  if (x < 8388608) {
    return x * resolution;
  }

  return (x - 16777216) * resolution;
}

/**
 * Load an image and return ImageData.
 */
export async function loadTileImage(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}
