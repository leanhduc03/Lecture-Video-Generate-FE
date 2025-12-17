import { API_CONFIG } from '../config/api';

const API_URL = API_CONFIG.BASE_URL;

export interface UploadedVideo {
  id: number;
  user_id: number;
  name: string;
  video_url: string;
  uploaded_at: string;
}

export const uploadTargetVideo = async (file: File): Promise<UploadedVideo> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/uploaded-videos/upload-target-video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload video');
  }

  return response.json();
};

export const getMyVideos = async (): Promise<UploadedVideo[]> => {
  const response = await fetch(`${API_URL}/uploaded-videos/my-videos`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch videos');
  }

  return response.json();
};

export const deleteUploadedVideo = async (videoId: number): Promise<void> => {
  const response = await fetch(`${API_URL}/uploaded-videos/videos/${videoId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete video');
  }
};