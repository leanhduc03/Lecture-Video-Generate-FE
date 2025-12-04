import axios from 'axios';
import { API_CONFIG, buildCloudinaryUrl } from '../config/api';

const API_URL = API_CONFIG.BASE_URL;
const TTS_NGROK_URL = API_CONFIG.TTS_NGROK_URL;
const DEEPFAKE_NGROK_URL = API_CONFIG.DEEPFAKE_NGROK_URL;
const FAKELIP_NGROK_URL = API_CONFIG.FAKELIP_NGROK_URL;

export const uploadVoiceSample = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_URL}/media/upload-audio`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const generateSpeech = async (text: string, audioUrl: string) => {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('audio_url', audioUrl);
  
  const response = await axios.post(`${TTS_NGROK_URL}/generate`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Hàm upload ảnh thông qua backend
export const uploadImageForDeepfake = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_URL}/media/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  if (response.data.success) {
    return response.data.image_url;
  } else {
    throw new Error('Lỗi khi upload ảnh');
  }
};

// Hàm upload video thông qua backend
export const uploadVideoForDeepfake = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_URL}/media/upload-video`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  if (response.data.success) {
    return response.data.video_url;
  } else {
    throw new Error('Lỗi khi upload video');
  }
};

// Hàm gửi yêu cầu deepfake
export const deepfakeVideo = async (sourceFile: File, targetFile: File): Promise<string> => {
  try {
    // Upload qua backend thay vì trực tiếp lên Cloudinary
    const sourceUrl = await uploadImageForDeepfake(sourceFile);
    const targetUrl = await uploadVideoForDeepfake(targetFile);
    
    console.log('Upload thành công source:', sourceUrl);
    console.log('Upload thành công target:', targetUrl);
    
    // Gửi yêu cầu đến API Deepfake Ngrok
    const response = await axios.post(`${DEEPFAKE_NGROK_URL}/deepfake`, {
      source: sourceUrl,
      target: targetUrl
    });
    
    console.log("Deepfake API response:", response.data);
    
    if (response.data && response.data.job_id) {
      return response.data.job_id;
    } else {
      throw new Error('Không nhận được job_id từ API');
    }
  } catch (error) {
    console.error('Error in deepfakeVideo:', error);
    throw error;
  }
};

// Hàm kiểm tra trạng thái xử lý deepfake qua backend
export const checkDeepfakeStatus = async (jobId: string): Promise<{status: string, result_url?: string}> => {
  try {
    const response = await axios.get(`${API_URL}/media/deepfake-status/${jobId}`);
    const data = response.data;
    
    if (data.status === 'processing') {
      return { status: 'processing' };
    } else {
      return { 
        status: 'completed',
        result_url: data.result_url 
      };
    }
  } catch (error) {
    console.error('Error checking deepfake status:', error);
    throw error;
  }
};

// Hàm xử lý fakelip
export const processFakelip = async (audioUrl: string, videoUrl: string): Promise<{result_url: string}> => {
  try {
    console.log('Gửi yêu cầu fakelip với:', {audio_url: audioUrl, video_url: videoUrl});
    
    const response = await axios.post(`${FAKELIP_NGROK_URL}/fakelip`, {
      audio_url: audioUrl,
      video_url: videoUrl
    });
    
    console.log("Fakelip API response:", response.data);
    
    if (response.data && response.data.result_url) {
      return { result_url: response.data.result_url };
    } else {
      throw new Error('Không nhận được URL kết quả từ API');
    }
  } catch (error) {
    console.error('Error in processFakelip:', error);
    throw error;
  }
};

// Giữ lại hàm upload trực tiếp lên Cloudinary cho trường hợp cần thiết
export const uploadToCloudinary = async (file: File, fileType: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', API_CONFIG.CLOUDINARY_UPLOAD_PRESET);
  
  const uploadUrl = buildCloudinaryUrl(fileType as 'image' | 'video');
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Lỗi khi upload file lên Cloudinary');
  }
  
  const data = await response.json();
  return data.secure_url;
};

// ---- Thêm hàm mới cho SlideToVideo workflow ----
export const uploadPptx = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${API_URL}/media/upload-pptx`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data; // mong backend trả về slides metadata
};

export const combineSlideImageAndVideo = async (imageUrl: string, videoUrl: string) => {
  const response = await axios.post(`${API_URL}/media/combine-slide`, {
    image_url: imageUrl,
    video_url: videoUrl
  });
  return response.data; // { result_url }
};

export const concatVideos = async (videoUrls: string[]) => {
  const response = await axios.post(`${API_URL}/media/concat-videos`, {
    videos: videoUrls
  });
  return response.data; // { result_url }
};

export const uploadVideoToCloudinary = async (videoUrl: string): Promise<string> => {
  try {
    console.log('Uploading video to Cloudinary:', videoUrl);
    
    // Download video từ URL
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    
    // Tạo FormData
    const formData = new FormData();
    formData.append('file', blob, 'final-video.mp4');
    formData.append('upload_preset', API_CONFIG.CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', 'video');
    
    // Upload lên Cloudinary
    const uploadUrl = buildCloudinaryUrl('video');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload video to Cloudinary');
    }
    
    const data = await uploadResponse.json();
    console.log('Video uploaded to Cloudinary:', data.secure_url);
    
    return data.secure_url;
  } catch (error: any) {
    console.error('Error uploading video to Cloudinary:', error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};