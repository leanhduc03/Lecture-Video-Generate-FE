import axios from 'axios';
import { API_CONFIG } from '../config/api';

const API_URL = `${API_CONFIG.BASE_URL}/sample-videos`;

export interface SampleVideo {
  id: number;
  name: string;
  video_url: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SampleVideoListResponse {
  videos: SampleVideo[];
  total: number;
}

export interface SampleVideoCreate {
  name: string;
  video_url: string;
  is_active?: boolean;
}

export interface SampleVideoUpdate {
  name?: string;
  video_url?: string;
  is_active?: boolean;
}

export interface UploadVideoResponse {
  success: boolean;
  video_url: string;
  public_id?: string;
  duration?: number;
  format?: string;
}

/**
 * Upload video file lên Cloudinary
 */
export const uploadSampleVideoFile = async (file: File): Promise<UploadVideoResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_URL}/upload-video`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * Lấy danh sách sample videos
 */
export const getSampleVideos = async (activeOnly: boolean = true): Promise<SampleVideoListResponse> => {
  const response = await axios.get(API_URL, {
    params: { active_only: activeOnly }
  });
  return response.data;
};

/**
 * Lấy thông tin chi tiết sample video
 */
export const getSampleVideoById = async (videoId: number): Promise<SampleVideo> => {
  const response = await axios.get(`${API_URL}/${videoId}`);
  return response.data;
};

/**
 * Tạo sample video mới (admin only)
 */
export const createSampleVideo = async (data: SampleVideoCreate): Promise<SampleVideo> => {
  const response = await axios.post(API_URL, data);
  return response.data;
};

/**
 * Cập nhật sample video (admin only)
 */
export const updateSampleVideo = async (videoId: number, data: SampleVideoUpdate): Promise<SampleVideo> => {
  const response = await axios.put(`${API_URL}/${videoId}`, data);
  return response.data;
};

/**
 * Xóa sample video (admin only)
 */
export const deleteSampleVideo = async (videoId: number): Promise<void> => {
  await axios.delete(`${API_URL}/${videoId}`);
};