import React, { useState, useEffect } from 'react';
import { getMyVideos, deleteVideo } from '../../services/videoService';
import '../../styles/my-videos.css';

interface Video {
  id: number;
  video_url: string;
  username: string;
  created_at: string;
}

const MyVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await getMyVideos();
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
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <div className="loading-container">Đang tải...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="my-videos-page">
      <div className="page-header">
        <h1>Video của tôi</h1>
        <p className="video-count">Tổng số: {videos.length} video</p>
      </div>
      
      {videos.length === 0 ? (
        <div className="empty-state">
          <p>Bạn chưa tạo video nào.</p>
          <p className="hint">Hãy bắt đầu tạo video đầu tiên của bạn!</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="videos-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Video Preview</th>
                <th>Người tạo</th>
                <th>Thời gian tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video, index) => (
                <tr key={video.id}>
                  <td className="text-center">{index + 1}</td>
                  <td className="video-preview-cell">
                    <video 
                      src={video.video_url} 
                      controls 
                      className="video-thumbnail"
                    />
                  </td>
                  <td>{video.username}</td>
                  <td>{formatDate(video.created_at)}</td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <a 
                        href={video.video_url} 
                        download 
                        className="btn btn-download"
                        title="Tải xuống"
                      >
                         Tải
                      </a>
                      <button 
                        onClick={() => handleDelete(video.id)}
                        className="btn btn-delete"
                        title="Xóa video"
                      >
                         Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyVideos;