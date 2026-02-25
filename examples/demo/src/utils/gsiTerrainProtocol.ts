import type { AddProtocolAction } from 'maplibre-gl';

/**
 * Protocol handler for 'gsi-terrain://'
 * Fetches GSI DEM PNG tiles and converts them to Mapbox Terrain-RGB format.
 */
export const gsiTerrainProtocol: AddProtocolAction = async (params, abortController) => {
    const url = params.url.replace('gsi-terrain://', 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/');

    try {
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) {
            throw new Error(`Failed to load tile: ${url}`);
        }
        const blob = await response.blob();
        const imageBitmap = await createImageBitmap(blob);

        const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas context not available');
        }

        ctx.drawImage(imageBitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // ピクセルごとにループし、GSIの標高をMapbox Terrain-RGBに変換する
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // h = (x < 2^23) ? x * 0.01 : (x - 2^24) * 0.01
            let x = (r << 16) + (g << 8) + b;
            let h: number;

            // 地理院タイルは0.01mの解像度を使用。仕様: 
            // X = 2^16R + 2^8G + B
            // X < 2^23 の場合: h = Xu
            // X = 2^23 の場合: h = (NA) -> 無効値(NA)は0として扱う。Mapbox Terrain RGBは透過(NA)をうまくサポートしないため、デフォルト0。
            // X > 2^23 の場合: h = (X - 2^24)u

            if (x === 8388608) {
                h = 0; // データなし
            } else if (x < 8388608) {
                h = x * 0.01;
            } else {
                h = (x - 16777216) * 0.01;
            }

            const target = Math.round((h + 10000) * 10);

            data[i] = (target >> 16) & 0xff;
            data[i + 1] = (target >> 8) & 0xff;
            data[i + 2] = target & 0xff;
        }

        ctx.putImageData(imageData, 0, 0);

        const newBlob = await canvas.convertToBlob({ type: 'image/png' });
        const arrayBuffer = await newBlob.arrayBuffer();

        return { data: arrayBuffer };
    } catch (error) {
        throw error;
    }
};
