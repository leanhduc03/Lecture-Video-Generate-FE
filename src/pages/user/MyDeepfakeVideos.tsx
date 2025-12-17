import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMediaVideos, deleteMediaVideo, MediaVideo } from '../../services/mediaVideoService';
import '../../styles/my-deepfake-videos.scss';

const MyDeepfakeVideos = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await getMediaVideos('deepfake');
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
        await deleteMediaVideo(videoId);
        loadVideos();
      } catch (err) {
        alert('Không thể xóa video');
      }
    }
  };

  const handleDownload = async (videoUrl: string, videoName: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = `${videoName}.mp4`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Lỗi khi tải file:', err);
      alert('Không thể tải xuống video. Vui lòng thử lại sau.');
    }
  };

  const handleCreateDeepfake = () => {
    navigate('/create-content', { state: { activeTab: 'deepfake' } });
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
    <div className="my-deepfake-videos-page">
      <div className="page-header">
        <h1>🎭 Video Deepfake của tôi</h1>
        <p className="video-count">Tổng số: {videos.length} video</p>
      </div>
      
      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <p>Bạn chưa có video deepfake nào.</p>
          <p className="hint">Hãy tạo video deepfake đầu tiên của bạn!</p>
          <button onClick={handleCreateDeepfake} className="btn-create">
            Tạo Video Deepfake
          </button>
        </div>
      ) : (
        <div className="videos-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <div className="video-preview">
                <video 
                  src={video.video_url} 
                  controls 
                  preload="metadata"
                />
              </div>
              <div className="video-info">
                <h3 className="video-title">{video.name}</h3>
                <p className="video-date">{formatDate(video.created_at)}</p>
              </div>
              <div className="video-actions">
                <button 
                  onClick={() => handleDownload(video.video_url, video.name)}
                  className="btn btn-download"
                  title="Tải xuống"
                >
                  📥 Tải xuống
                </button>
                <button 
                  onClick={() => handleDelete(video.id)}
                  className="btn btn-delete"
                  title="Xóa video"
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDeepfakeVideos;