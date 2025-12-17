import React, { useState, useEffect } from 'react';
import { getMediaVideos, deleteMediaVideo, uploadMediaVideoFile, createMediaVideo, MediaVideo } from '../../services/mediaVideoService';
import { MdDelete, MdFileUpload, MdVideoLibrary, MdClose, MdPlayCircle } from 'react-icons/md';

const VideoLibrary: React.FC = () => {
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MediaVideo | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getMediaVideos('uploaded');
      setVideos(response.videos);
    } catch (err) {
      setError('Không thể tải danh sách video');
      console.error('Error loading videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Vui lòng chọn file video');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      const uploadResponse = await uploadMediaVideoFile(file);
      
      const videoData = {
        name: file.name,
        video_url: uploadResponse.video_url,
        video_type: 'uploaded' as const
      };
      
      await createMediaVideo(videoData);
      await loadVideos();
    } catch (err) {
      setError('Không thể upload video. Vui lòng thử lại.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (videoId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa video này?')) return;

    try {
      setError(null);
      await deleteMediaVideo(videoId);
      await loadVideos();
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
        setShowPreview(false);
      }
    } catch (err) {
      setError('Không thể xóa video. Vui lòng thử lại.');
      console.error('Delete error:', err);
    }
  };

  const handleVideoClick = (video: MediaVideo) => {
    setSelectedVideo(video);
    setShowPreview(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="library-loading">
        <div className="spinner"></div>
        <p>Đang tải thư viện video...</p>
      </div>
    );
  }

  return (
    <div className="video-library">
      <div className="library-header">
        <div className="header-content">
          <MdVideoLibrary className="header-icon" />
          <div>
            <h2>Thư viện video</h2>
            <p>Quản lý các video đã upload ({videos.length} video)</p>
          </div>
        </div>
        
        <label className="upload-btn">
          <MdFileUpload />
          <span>{isUploading ? 'Đang tải lên...' : 'Tải video lên'}</span>
          <input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            disabled={isUploading}
            hidden
          />
        </label>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="empty-state">
          <MdVideoLibrary className="empty-icon" />
          <h3>Chưa có video nào</h3>
          <p>Upload video đầu tiên của bạn để bắt đầu</p>
          <label className="upload-btn-primary">
            <MdFileUpload />
            <span>Tải video lên</span>
            <input
              type="file"
              accept="video/*"
              onChange={handleUpload}
              disabled={isUploading}
              hidden
            />
          </label>
        </div>
      ) : (
        <div className="videos-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <div className="video-wrapper" onClick={() => handleVideoClick(video)}>
                <video src={video.video_url} />
                <div className="video-overlay">
                  <MdPlayCircle className="play-icon" />
                  <span>Xem video</span>
                </div>
              </div>
              
              <div className="video-info">
                <h4 className="video-name" title={video.name}>
                  {video.name}
                </h4>
                <p className="video-date">{formatDate(video.created_at)}</p>
              </div>

              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(video.id);
                }}
                title="Xóa video"
              >
                <MdDelete />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedVideo && (
        <div className="preview-modal" onClick={() => setShowPreview(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowPreview(false)}>
              <MdClose />
            </button>
            
            <video src={selectedVideo.video_url} controls autoPlay />
            
            <div className="preview-info">
              <h3>{selectedVideo.name}</h3>
              <p>Tải lên: {formatDate(selectedVideo.created_at)}</p>
              
              <div className="preview-actions">
                <a
                  href={selectedVideo.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-view"
                >
                  Xem kích thước đầy đủ
                </a>
                <button
                  className="btn-delete"
                  onClick={() => {
                    setShowPreview(false);
                    handleDelete(selectedVideo.id);
                  }}
                >
                  <MdDelete /> Xóa video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLibrary;