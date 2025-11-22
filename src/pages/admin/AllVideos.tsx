import React, { useState, useEffect } from 'react';
import { getAllVideos, deleteVideo } from '../../services/videoService';

interface Video {
  id: number;
  video_url: string;
  username: string;
  created_at: string;
}

const AllVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await getAllVideos();
      setVideos(response.videos);
      setError(null);
    } catch (err: any) {
      setError('Không thể tải danh sách video');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId: number) => {
    if (window.confirm('Bạn có chắc muốn xóa video này?')) {
      try {
        await deleteVideo(videoId);
        loadVideos();
      } catch (err) {
        alert('Không thể xóa video');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="all-videos-page">
      <h1>Tất cả Video trong hệ thống</h1>
      
      <table className="videos-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Người tạo</th>
            <th>Thời gian tạo</th>
            <th>Video</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((video) => (
            <tr key={video.id}>
              <td>{video.id}</td>
              <td>{video.username}</td>
              <td>{formatDate(video.created_at)}</td>
              <td>
                <video src={video.video_url} controls style={{width: '300px'}} />
              </td>
              <td>
                <a href={video.video_url} download className="btn-download">
                  Tải
                </a>
                <button 
                  onClick={() => handleDelete(video.id)}
                  className="btn-delete"
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AllVideos;