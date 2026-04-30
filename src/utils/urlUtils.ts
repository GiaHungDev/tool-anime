import { API_URL } from '../services/authService';

/**
 * Resolves an image URL or S3 key, handling both plain strings and JSON objects/strings
 * containing both 'url' and 'localPath'.
 */
export const resolveImageUrl = (urlOrKey: any) => {
  if (!urlOrKey) return '';
  
  let actualUrl = urlOrKey;

  // Handle JSON string or object
  if (typeof urlOrKey === 'string' && urlOrKey.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(urlOrKey);
      actualUrl = parsed.url || parsed.localPath || actualUrl;
    } catch (e) {
      console.warn('Failed to parse image JSON:', urlOrKey);
    }
  } else if (typeof urlOrKey === 'object') {
    actualUrl = urlOrKey.url || urlOrKey.localPath || urlOrKey.s3Key || actualUrl;
  }

  if (typeof actualUrl !== 'string') return '';

  // Return directly if it's already a full URL or base64
  if (actualUrl.startsWith('http') || actualUrl.startsWith('data:')) {
    return actualUrl;
  }

  // Handle local file paths (absolute paths starting with letter drive or /)
  if (/^[A-Za-z]:[\\/]/.test(actualUrl) || actualUrl.startsWith('/')) {
    return `${API_URL}/veo3/local-file?path=${encodeURIComponent(actualUrl)}`;
  }

  // Handle S3 keys
  const cleanKey = actualUrl.startsWith('/') ? actualUrl.substring(1) : actualUrl;
  const baseUrl = import.meta.env.VITE_S3_BASE_URL || '';
  return `${baseUrl}${cleanKey}`;
};
