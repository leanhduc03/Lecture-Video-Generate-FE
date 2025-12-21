import React, { useState, useEffect } from 'react';
import { deepfakeVideoWithUrls, checkDeepfakeStatus } from '../../services/aiService';
import { getMyImages, uploadSourceImage, UploadedImage } from '../../services/uploadedImageService';
import { getMediaVideos, uploadMediaVideoFile, createMediaVideo, saveDeepfakeVideo, MediaVideo } from '../../services/mediaVideoService';
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

  // Video player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);

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

  const handleSelectExistingImage = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setSourcePreview(imageUrl);
  };

  const handleSelectExistingVideo = (videoUrl: string) => {
    setSelectedVideoUrl(videoUrl);
    setTargetPreview(videoUrl);
  };

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
      document.querySelector('.result-section')?.appendChild(loadingMessage);

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

  // Video player handlers
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const progressBar = e.currentTarget;
      const clickPosition = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
      videoRef.current.currentTime = clickPosition * duration;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Reset video khi đổi source
  React.useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [selectedVideoUrl, targetFile]);

  return (
    <div className="deepfake-video">
      {error && (
        <div className="error-message">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="deepfake-content">
          <div className="selection-grid">
            {/* Source Image Section */}
            <div className="selection-column">
              <div className="column-header">
                <div className="header-title">
                  <span className="step-number">1</span>
                  <h3>Ảnh nguồn (khuôn mặt)</h3>
                </div>
                <span className="file-types">JPG, PNG</span>
              </div>

              <div className="selection-modes">
                <button
                  type="button"
                  className={`mode-btn ${sourceMode === 'upload' ? 'active' : ''}`}
                  onClick={() => setSourceMode('upload')}
                >
                  <span className="material-symbols-outlined">upload</span>
                  Tải ảnh lên
                </button>
                <button
                  type="button"
                  className={`mode-btn ${sourceMode === 'existing' ? 'active' : ''}`}
                  onClick={() => setSourceMode('existing')}
                >
                  <span className="material-symbols-outlined">collections</span>
                  Chọn từ thư viện
                </button>
              </div>

              {sourceMode === 'upload' ? (
                <div className="upload-zone">
                  <input
                    type="file"
                    id="source-image"
                    accept="image/*"
                    onChange={handleSourceChange}
                    disabled={isUploadingSource}
                  />
                  <label htmlFor="source-image" className="upload-label">
                    {isUploadingSource ? (
                      <>
                        <span className="material-symbols-outlined spinning">progress_activity</span>
                        <span>Đang upload...</span>
                      </>
                    ) : sourcePreview ? (
                      <div className="preview-container">
                        <img src={sourcePreview} alt="Source Preview" />
                        <div className="preview-overlay">
                          <span className="material-symbols-outlined">check_circle</span>
                          <p>Đã chọn ảnh</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">add_photo_alternate</span>
                        <p>Click để chọn ảnh</p>
                      </>
                    )}
                  </label>
                </div>
              ) : (
                <div className="media-grid">
                  {myImages.length === 0 ? (
                    <div className="empty-state">
                      <span className="material-symbols-outlined">image</span>
                      <p>Chưa có ảnh nào</p>
                      <button
                        type="button"
                        onClick={() => setSourceMode('upload')}
                        className="switch-mode-btn"
                      >
                        Upload ảnh đầu tiên
                      </button>
                    </div>
                  ) : (
                    myImages.map((image) => (
                      <div
                        key={image.id}
                        className={`media-item ${selectedImageUrl === image.image_url ? 'selected' : ''}`}
                        onClick={() => handleSelectExistingImage(image.image_url)}
                      >
                        <img src={image.image_url} alt={image.name} />
                        {selectedImageUrl === image.image_url && (
                          <div className="selected-badge">
                            <span className="material-symbols-outlined">check_circle</span>
                            Đã chọn
                          </div>
                        )}
                        <div className="media-name">{image.name}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Target Video Section */}
            <div className="selection-column">
              <div className="column-header">
                <div className="header-title">
                  <span className="step-number">2</span>
                  <h3>Video đích (cần thay mặt)</h3>
                </div>
                <span className="file-types">MP4, MOV</span>
              </div>

              <div className="selection-modes">
                <button
                  type="button"
                  className={`mode-btn ${targetMode === 'upload' ? 'active' : ''}`}
                  onClick={() => setTargetMode('upload')}
                >
                  <span className="material-symbols-outlined">movie</span>
                  Tải video lên
                </button>
                <button
                  type="button"
                  className={`mode-btn ${targetMode === 'existing' ? 'active' : ''}`}
                  onClick={() => setTargetMode('existing')}
                >
                  <span className="material-symbols-outlined">video_library</span>
                  Video có sẵn
                </button>
              </div>

              {targetMode === 'upload' ? (
                <div className="upload-zone">
                  <input
                    type="file"
                    id="target-video"
                    accept="video/*"
                    onChange={handleTargetChange}
                    disabled={isUploadingTarget}
                  />
                  <label htmlFor="target-video" className="upload-label">
                    {isUploadingTarget ? (
                      <>
                        <span className="material-symbols-outlined spinning">progress_activity</span>
                        <span>Đang upload...</span>
                      </>
                    ) : targetPreview ? (
                      <div className="preview-container video-preview">
                        <video
                          ref={videoRef}
                          src={targetPreview}
                          onTimeUpdate={handleTimeUpdate}
                          onLoadedMetadata={handleLoadedMetadata}
                          onEnded={() => setIsPlaying(false)}
                        />
                        {!isPlaying && (
                          <div className="play-overlay" onClick={handlePlayPause}>
                            <button type="button">
                              <span className="material-symbols-outlined">play_circle</span>
                            </button>
                          </div>
                        )}
                        <div className="video-controls">
                          <button type="button" className="control-button" onClick={handlePlayPause}>
                            <span className="material-symbols-outlined">
                              {isPlaying ? 'pause' : 'play_arrow'}
                            </span>
                          </button>
                          <div className="progress-bar" onClick={handleProgressClick}>
                            <div
                              className="progress"
                              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="time-display">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">videocam</span>
                        <p>Click để chọn video</p>
                      </>
                    )}
                  </label>
                </div>
              ) : (
                <div className="media-grid">
                  {myVideos.length === 0 ? (
                    <div className="empty-state">
                      <span className="material-symbols-outlined">video_library</span>
                      <p>Chưa có video nào</p>
                      <button
                        type="button"
                        onClick={() => setTargetMode('upload')}
                        className="switch-mode-btn"
                      >
                        Upload video đầu tiên
                      </button>
                    </div>
                  ) : (
                    myVideos.map((video) => (
                      <div
                        key={video.id}
                        className={`media-item video-item ${selectedVideoUrl === video.video_url ? 'selected' : ''}`}
                        onClick={() => handleSelectExistingVideo(video.video_url)}
                      >
                        <video src={video.video_url} />
                        <div className="video-play-icon">
                          <span className="material-symbols-outlined">play_circle</span>
                        </div>
                        {selectedVideoUrl === video.video_url && (
                          <div className="selected-badge">
                            <span className="material-symbols-outlined">check_circle</span>
                            Đã chọn
                          </div>
                        )}
                        <div className="media-name">{video.name}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="action-section">
            <button
              type="submit"
              className="create-deepfake-btn"
              disabled={isLoading || !selectedImageUrl || !selectedVideoUrl}
            >
              <span className="material-symbols-outlined">auto_fix_high</span>
              {isLoading ? 'Đang xử lý...' : 'Tạo Video Deepfake'}
            </button>
            <p className="processing-note">Dự kiến mất khoảng 2-5 phút cho mỗi phút video</p>
          </div>
        </div>
      </form>

      {jobId && !resultVideo && (
        <div className="processing-status">
          <div className="status-icon">
            <span className="material-symbols-outlined spinning">progress_activity</span>
          </div>
          <h3>{processingProgress}</h3>
          <p className="status-note">
            Quá trình này có thể mất vài phút tùy thuộc vào độ dài của video
          </p>
        </div>
      )}

      {resultVideo && (
        <div className="result-section">
          <div className="result-header">
            <span className="material-symbols-outlined">check_circle</span>
            <h3>Video Deepfake hoàn chỉnh</h3>
          </div>

          {isSavingVideo && (
            <div className="saving-message">
              <span className="material-symbols-outlined spinning">progress_activity</span>
              Đang lưu video vào thư viện...
            </div>
          )}

          {savedSuccess && !isSavingVideo && (
            <div className="success-message">
              <span className="material-symbols-outlined">check_circle</span>
              Đã lưu video vào thư viện của bạn!
            </div>
          )}

          <div className="result-video">
            <video src={resultVideo} controls />
          </div>

          <div className="result-actions">
            <button onClick={handleDownload} className="download-btn">
              <span className="material-symbols-outlined">download</span>
              Tải video xuống
            </button>
            <button
              onClick={() => {
                setJobId(null);
                setResultVideo(null);
                setSavedSuccess(false);
                setSourceFile(null);
                setSourcePreview(null);
                setSelectedImageUrl(null);
                setTargetFile(null);
                setTargetPreview(null);
                setSelectedVideoUrl(null);
              }}
              className="new-deepfake-btn"
            >
              <span className="material-symbols-outlined">add</span>
              Tạo Deepfake mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepfakeVideo;