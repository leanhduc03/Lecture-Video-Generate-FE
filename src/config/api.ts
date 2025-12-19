export const API_CONFIG = {
  // Base URLs
  // BASE_URL: 'http://localhost:8000/api/v1',
  //BASE_URL: 'http://localhost:9000/api/v1',
  // BASE_URL: '/api/v1',
  BASE_URL: 'http://36.50.135.165:9000/api/v1',
  // Ngrok URLs for AI services
  TTS_NGROK_URL: 'https://byron-unswung-clarita.ngrok-free.dev',
  DEEPFAKE_NGROK_URL: 'https://plushly-renounceable-catherina.ngrok-free.dev',
  FAKELIP_NGROK_URL: 'https://promilitary-unconsiderablely-dia.ngrok-free.dev',
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: 'diqes2eof',
  CLOUDINARY_UPLOAD_PRESET: 'ml_default',
} as const;

// Helper để build URL
export const buildApiUrl = (path: string) => `${API_CONFIG.BASE_URL}${path}`;
export const buildCloudinaryUrl = (type: 'image' | 'video') => 
  `https://api.cloudinary.com/v1_1/${API_CONFIG.CLOUDINARY_CLOUD_NAME}/${type}/upload`;