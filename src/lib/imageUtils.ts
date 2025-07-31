// src/lib/imageUtils.ts

const SUPABASE_URL = 'https://ogbxiolnyzidylzoljuh.supabase.co';
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public`;

export const getImageUrl = (imageUrl: string | null | undefined): string => {
    console.log('🖼️ Processing image URL:', imageUrl);

    if (!imageUrl) {
        console.log('🖼️ No image URL provided');
        return '';
    }

    // If it's already a full URL, return as-is
    if (imageUrl.startsWith('http')) {
        console.log('🖼️ Full URL provided:', imageUrl);
        return imageUrl;
    }

    // Clean up the path
    let cleanPath = imageUrl.replace(/^\/+/, ''); // Remove leading slashes

    // Remove 'images/' prefix if it exists to avoid duplication
    if (cleanPath.startsWith('images/')) {
        cleanPath = cleanPath.substring(7);
    }

    // Construct the final URL
    const finalUrl = `${STORAGE_URL}/images/${cleanPath}`;
    console.log('🖼️ Final URL:', finalUrl);

    return finalUrl;
};

export const getPlaceholderImage = (type: 'machine' | 'venue' | 'prize' = 'machine'): string => {
    // Return a data URL for a simple placeholder
    return `data:image/svg+xml;base64,${btoa(`
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#6b7280" text-anchor="middle" dy=".3em">
        ${type.charAt(0).toUpperCase() + type.slice(1)} Image
      </text>
    </svg>
  `)}`;
};

export const createImageWithFallback = (
    imageUrl: string | null | undefined,
    alt: string,
    type: 'machine' | 'venue' | 'prize' = 'machine'
): { src: string; onError: (e: React.SyntheticEvent<HTMLImageElement>) => void } => {
    const src = getImageUrl(imageUrl) || getPlaceholderImage(type);

    const onError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        console.error('❌ Image failed to load:', imageUrl);

        // Prevent infinite loop
        if (target.src !== getPlaceholderImage(type)) {
            target.src = getPlaceholderImage(type);
        }
    };

    return { src, onError };
};