import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export const saveVideo = async (videoUrl: string, username: string) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Chưa đăng nhập');
  }
  
  if (!username) {
    throw new Error('Không xác định được username');
  }
   
  const response = await axios.post(
    `${API_URL}/videos/`,
    {
      video_url: videoUrl,
      username: username
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.data;
};

export const getMyVideos = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/videos/my-videos`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

export const getAllVideos = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/videos/all`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

export const deleteVideo = async (videoId: number) => {
  const token = localStorage.getItem('token');
  await axios.delete(`${API_URL}/videos/${videoId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};
