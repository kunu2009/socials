import type { Platform } from '../types';

const UNSPLASH_API_URL = 'https://api.unsplash.com';

// Fallback Unsplash key - it's recommended to use your own from your environment
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || 'YOUR_FALLBACK_UNSPLASH_ACCESS_KEY';

type Orientation = 'landscape' | 'portrait' | 'squarish';

const mapAspectRatioToOrientation = (
  aspectRatio: Platform['aspectRatio']
): Orientation => {
  switch (aspectRatio) {
    case '1:1':
      return 'squarish';
    case '9:16':
    case '2:3':
    case '3:4':
      return 'portrait';
    case '16:9':
    case '4:3':
      return 'landscape';
    default:
      return 'landscape';
  }
};

export const fetchStockImage = async (
  query: string,
  aspectRatio: Platform['aspectRatio']
): Promise<string> => {
  try {
    const orientation = mapAspectRatioToOrientation(aspectRatio);
    const response = await fetch(
      `${UNSPLASH_API_URL}/photos/random?query=${encodeURIComponent(
        query
      )}&orientation=${orientation}&client_id=${UNSPLASH_ACCESS_KEY}`
    );

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Unsplash API error:', errorData);
        throw new Error(`Failed to fetch stock image. Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.urls || !data.urls.regular) {
        throw new Error('Invalid response structure from Unsplash API.');
    }

    return data.urls.regular;
  } catch (error) {
    console.error('Error fetching stock image:', error);
    // Return a placeholder image in case of an error
    const [width, height] = aspectRatio === '1:1' ? [1080,1080] : aspectRatio === '9:16' ? [1080, 1920] : [1920, 1080];
    return `https://placehold.co/${width}x${height}/0f172a/94a3b8?text=Image+Not+Found`;
  }
};