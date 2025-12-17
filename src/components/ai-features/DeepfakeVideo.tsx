import React, { useState, useEffect } from 'react';
import { deepfakeVideoWithUrls, checkDeepfakeStatus } from '../../services/aiService';
import { getMyImages, uploadSourceImage, deleteUploadedImage, UploadedImage } from '../../services/uploadedImageService';
import { getMediaVideos, uploadMediaVideoFile, createMediaVideo, deleteMediaVideo, saveDeepfakeVideo, MediaVideo } from '../../services/mediaVideoService';
import '../../styles/deepfake.scss';

const DeepfakeVideo = () => {
  // Source (Image) states
  const [sourceMode, setSourceMode] = useState<'upload' | 'existing'>('upload');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [myImages, setMyImages] = useState<UploadedImage[]>([]);
  const [isUploadingSource, setIsUploadingSource] = useState<boolean>(false);
  
  // Target (Video) states
  const [targetMode, setTargetMode] = useState<'upload' | 'existing'>('upload');
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [targetPreview, setTargetPreview] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [myVideos, setMyVideos] = useState<MediaVideo[]>([]);
  const [isUploadingTarget, setIsUploadingTarget] = useState<boolean>(false);
  
  // Processing states
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>('Đang chuẩn bị...');
  const [isSavingVideo, setIsSavingVideo] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    loadMyImages();
    loadMyVideos();
  }, []);

  const loadMyImages = async () => {
    try {
      const images = await getMyImages();
      setMyImages(images);
    } catch (err) {
      console.error('Error loading images:', err);
    }
  };

  const loadMyVideos = async () => {
    try {
      const response = await getMediaVideos('uploaded');
      setMyVideos(response.videos);
    } catch (err) {
      console.error('Error loading videos:', err);
    }
  };

  // Xử lý khi người dùng chọn ảnh nguồn từ máy
  const handleSourceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourcePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setIsUploadingSource(true);
      setError(null);
      try {
        const uploadedImage = await uploadSourceImage(file);
        setSelectedImageUrl(uploadedImage.image_url);
        await loadMyImages();
      } catch (err) {
        setError('Không thể upload ảnh. Vui lòng thử lại.');
        console.error('Upload error:', err);
      } finally {
        setIsUploadingSource(false);
      }
    }
  };

  // Xử lý khi người dùng chọn video đích từ máy
  const handleTargetChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTargetPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setIsUploadingTarget(true);
      setError(null);
      try {
        const uploadResponse = await uploadMediaVideoFile(file);
        
        const videoData = {
          name: file.name,
          video_url: uploadResponse.video_url,
          video_type: 'uploaded' as const
        };
        
        const savedVideo = await createMediaVideo(videoData);
        setSelectedVideoUrl(savedVideo.video_url);
        await loadMyVideos();
      } catch (err) {
        setError('Không thể upload video. Vui lòng thử lại.');
        console.error('Upload error:', err);
      } finally {
        setIsUploadingTarget(false);
      }
    }
  };

  // Xử lý khi người dùng chọn ảnh từ danh sách đã upload
  const handleSelectExistingImage = (imageUrl: string, preview: string) => {
    setSelectedImageUrl(imageUrl);
    setSourcePreview(preview);
  };

  // Xử lý khi người dùng chọn video từ danh sách đã upload
  const handleSelectExistingVideo = (videoUrl: string, preview: string) => {
    setSelectedVideoUrl(videoUrl);
    setTargetPreview(preview);
  };

  // Xử lý xóa ảnh
  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh này?')) return;
    
    try {
      await deleteUploadedImage(imageId);
      await loadMyImages();
      if (myImages.find(img => img.id === imageId)?.image_url === selectedImageUrl) {
        setSelectedImageUrl(null);
        setSourcePreview(null);
      }
    } catch (err) {
      setError('Không thể xóa ảnh. Vui lòng thử lại.');
      console.error('Delete error:', err);
    }
  };

  // Xử lý xóa video
  const handleDeleteVideo = async (videoId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa video này?')) return;
    
    try {
      await deleteMediaVideo(videoId);
      await loadMyVideos();
      if (myVideos.find(vid => vid.id === videoId)?.video_url === selectedVideoUrl) {
        setSelectedVideoUrl(null);
        setTargetPreview(null);
      }
    } catch (err) {
      setError('Không thể xóa video. Vui lòng thử lại.');
      console.error('Delete error:', err);
    }
  };

  // Gửi yêu cầu deepfake
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImageUrl || !selectedVideoUrl) {
      setError('Vui lòng chọn ảnh nguồn và video đích');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultVideo(null);
    setSavedSuccess(false);
    setProcessingProgress('Đang xử lý...');

    try {
      const jobId = await deepfakeVideoWithUrls(selectedImageUrl, selectedVideoUrl);
      setJobId(jobId);
      setProcessingProgress('Đã bắt đầu xử lý video...');
    } catch (err) {
      setError('Có lỗi xảy ra khi xử lý video. Vui lòng thử lại sau.');
      console.error('Deepfake error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ⭐ Tự động lưu video khi tạo xong
  useEffect(() => {
    const autoSaveVideo = async () => {
      if (resultVideo && !savedSuccess && !isSavingVideo) {
        setIsSavingVideo(true);
        try {
          await saveDeepfakeVideo(resultVideo);
          setSavedSuccess(true);
        } catch (err) {
          console.error('Error auto-saving video:', err);
          setError('Không thể lưu video tự động. Bạn có thể tải xuống thủ công.');
        } finally {
          setIsSavingVideo(false);
        }
      }
    };

    autoSaveVideo();
  }, [resultVideo, savedSuccess, isSavingVideo]);

  // Kiểm tra trạng thái xử lý định kỳ
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (jobId && !resultVideo) {
      let progressCounter = 0;
      const progressMessages = [
        'Đang phân tích khuôn mặt trong ảnh nguồn...',
        'Đang nhận diện khuôn mặt trong video...',
        'Đang thực hiện deepfake...',
        'Đang hoàn thiện video...',
        'Đang chuẩn bị kết quả...'
      ];

      intervalId = setInterval(async () => {
        try {
          const result = await checkDeepfakeStatus(jobId);

          if (result.status === 'processing') {
            if (progressCounter < progressMessages.length) {
              setProcessingProgress(progressMessages[progressCounter]);
              progressCounter++;
            }
          } else if (result.status === 'completed' && result.result_url) {
            setResultVideo(result.result_url);
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error('Error checking status:', err);
        }
      }, 30000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, resultVideo]);

  const handleDownload = async () => {
    if (!resultVideo) return;

    try {
      setError(null);
      const loadingMessage = document.createElement('div');
      loadingMessage.className = 'download-loading';
      loadingMessage.textContent = 'Đang chuẩn bị tải xuống...';
      document.querySelector('.result-container')?.appendChild(loadingMessage);

      const response = await fetch(resultVideo);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      const fileName = resultVideo.split('/').pop() || 'deepfake-video.mp4';
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.querySelector('.download-loading')?.remove();
      }, 100);
    } catch (err) {
      console.error('Lỗi khi tải file:', err);
      setError('Không thể tải xuống video. Vui lòng thử lại sau.');
      document.querySelector('.download-loading')?.remove();
    }
  };

  return (
    <div className="deepfake-container">
      <h2>Tạo Video Deepfake</h2>
      <p>Chọn ảnh của bạn và video đích để tạo deepfake</p>

      <form onSubmit={handleSubmit} className="deepfake-form">
        <div className="upload-section">
          {/* Source Image Section */}
          <div className="upload-box">
            <label>Ảnh nguồn (khuôn mặt của bạn)</label>
            
            <div className="source-mode-selector">
              <button
                type="button"
                className={sourceMode === 'upload' ? 'active' : ''}
                onClick={() => setSourceMode('upload')}
              >
                Upload ảnh mới
              </button>
              <button
                type="button"
                className={sourceMode === 'existing' ? 'active' : ''}
                onClick={() => setSourceMode('existing')}
              >
                Chọn ảnh đã có
              </button>
            </div>

            {sourceMode === 'upload' ? (
              <>
                <input
                  type="file"
                  id="source-image"
                  accept="image/*"
                  onChange={handleSourceChange}
                  disabled={isUploadingSource}
                />
                {isUploadingSource && <p className="upload-status">Đang upload ảnh...</p>}
                {sourcePreview && (
                  <div className="preview">
                    <img src={sourcePreview} alt="Source Preview" />
                  </div>
                )}
              </>
            ) : (
              <div className="existing-images-grid">
                {myImages.length === 0 ? (
                  <p>Bạn chưa có ảnh nào. Hãy upload ảnh mới!</p>
                ) : (
                  myImages.map((image) => (
                    <div
                      key={image.id}
                      className={`image-item ${selectedImageUrl === image.image_url ? 'selected' : ''}`}
                    >
                      <img
                        src={image.image_url}
                        alt={image.name}
                        onClick={() => handleSelectExistingImage(image.image_url, image.image_url)}
                      />
                      <button
                        type="button"
                        className="delete-image-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                      >
                        ×
                      </button>
                      <span className="image-name">{image.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Target Video Section */}
          <div className="upload-box">
            <label>Video đích (video cần thay khuôn mặt)</label>
            
            <div className="source-mode-selector">
              <button
                type="button"
                className={targetMode === 'upload' ? 'active' : ''}
                onClick={() => setTargetMode('upload')}
              >
                Upload video mới
              </button>
              <button
                type="button"
                className={targetMode === 'existing' ? 'active' : ''}
                onClick={() => setTargetMode('existing')}
              >
                Chọn video đã có
              </button>
            </div>

            {targetMode === 'upload' ? (
              <>
                <input
                  type="file"
                  id="target-video"
                  accept="video/*"
                  onChange={handleTargetChange}
                  disabled={isUploadingTarget}
                />
                {isUploadingTarget && <p className="upload-status">Đang upload video...</p>}
                {targetPreview && (
                  <div className="preview">
                    <video src={targetPreview} controls width="250"></video>
                  </div>
                )}
              </>
            ) : (
              <div className="existing-videos-grid">
                {myVideos.length === 0 ? (
                  <p>Bạn chưa có video nào. Hãy upload video mới!</p>
                ) : (
                  myVideos.map((video) => (
                    <div
                      key={video.id}
                      className={`video-item ${selectedVideoUrl === video.video_url ? 'selected' : ''}`}
                    >
                      <video
                        src={video.video_url}
                        onClick={() => handleSelectExistingVideo(video.video_url, video.video_url)}
                      />
                      <button
                        type="button"
                        className="delete-video-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVideo(video.id);
                        }}
                      >
                        ×
                      </button>
                      <span className="video-name">{video.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="button-container">
          <button
            type="submit"
            className="deepfake-button"
            disabled={isLoading || !selectedImageUrl || !selectedVideoUrl}
          >
            {isLoading ? 'Đang xử lý...' : 'Tạo Video Deepfake'}
          </button>
        </div>
      </form>

      {jobId && !resultVideo && (
        <div className="processing-message">
          <p>{processingProgress}</p>
          <div className="loading-spinner"></div>
          <p className="processing-note">Quá trình này có thể mất vài phút tùy thuộc vào độ dài của video</p>
        </div>
      )}

      {resultVideo && (
        <div className="result-container">
          <h3>Video Deepfake của bạn</h3>
          <video src={resultVideo} controls width="100%"></video>
          
          {isSavingVideo && (
            <div className="saving-message">
              🔄 Đang lưu video vào thư viện...
            </div>
          )}
          
          {savedSuccess && !isSavingVideo && (
            <div className="success-message">
              ✓ Đã lưu video vào thư viện của bạn!
            </div>
          )}
          
          <div className="result-actions">
            <button onClick={handleDownload} className="download-button">
              📥 Tải video xuống
            </button>
            <button
              className="new-deepfake-button"
              onClick={() => {
                setJobId(null);
                setResultVideo(null);
                setSavedSuccess(false);
              }}
            >
              🎬 Tạo Deepfake mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepfakeVideo;