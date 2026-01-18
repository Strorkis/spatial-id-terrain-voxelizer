import type { AddProtocolAction } from 'maplibre-gl';

/**
 * Protocol handler for 'gsi-terrain://'
 * Fetches GSI DEM PNG tiles and converts them to Mapbox Terrain-RGB format.
 */
export const gsiTerrainProtocol: AddProtocolAction = async (params, abortController) => {
    // Expected format: gsi-terrain://{z}/{x}/{y}.png
    const url = params.url.replace('gsi-terrain://', 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/');

    try {
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) {
            throw new Error(`Failed to load tile: ${url}`);
        }
        const blob = await response.blob();
        const imageBitmap = await createImageBitmap(blob);

        // precise conversion logic
        const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas context not available');
        }

        ctx.drawImage(imageBitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Loop through pixels and convert GSI elevation to Mapbox Terrain-RGB
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate Elevation from GSI format
            // h = (x < 2^23) ? x * 0.01 : (x - 2^24) * 0.01
            let x = (r << 16) + (g << 8) + b;
            let h: number;

            // GSI uses 0.01m resolution. GSI tile spec: 
            // X = 2^16R + 2^8G + B
            // if X < 2^23: h = Xu
            // if X = 2^23: h = (NA) -> we treat as 0 or skip? Mapbox Terrain RGB doesn't support transparency well for terrain gaps usually, default to 0.
            // if X > 2^23: h = (X - 2^24)u

            if (x === 8388608) {
                h = 0; // No data
            } else if (x < 8388608) {
                h = x * 0.01;
            } else {
                h = (x - 16777216) * 0.01;
            }

            // Convert to Mapbox format
            // h = -10000 + ((R' * 256 * 256 + G' * 256 + B') * 0.1)
            // => (R'G'B')_val = (h + 10000) * 10

            const target = Math.round((h + 10000) * 10);

            data[i] = (target >> 16) & 0xff;
            data[i + 1] = (target >> 8) & 0xff;
            data[i + 2] = target & 0xff;
            // Alpha remains 255
        }

        ctx.putImageData(imageData, 0, 0);

        const newBlob = await canvas.convertToBlob({ type: 'image/png' });
        const arrayBuffer = await newBlob.arrayBuffer();

        return { data: arrayBuffer };
    } catch (error) {
        throw error;
    }
};
