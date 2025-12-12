import React, { useState, useEffect } from 'react';
import { deepfakeVideoWithUrl, checkDeepfakeStatus } from '../../services/aiService';
import { getMyImages, uploadSourceImage, deleteUploadedImage, UploadedImage } from '../../services/uploadedImageService';
import '../../styles/deepfake.scss';

const DeepfakeVideo = () => {
  const [sourceMode, setSourceMode] = useState<'upload' | 'existing'>('upload');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [myImages, setMyImages] = useState<UploadedImage[]>([]);
  const [isUploadingSource, setIsUploadingSource] = useState<boolean>(false);
  
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [targetPreview, setTargetPreview] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>('Đang chuẩn bị...');

  // Load danh sách ảnh đã upload khi component mount
  useEffect(() => {
    loadMyImages();
  }, []);

  const loadMyImages = async () => {
    try {
      const images = await getMyImages();
      setMyImages(images);
    } catch (err) {
      console.error('Error loading images:', err);
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

      // Upload ngay lập tức
      setIsUploadingSource(true);
      setError(null);
      try {
        const uploadedImage = await uploadSourceImage(file);
        setSelectedImageUrl(uploadedImage.image_url);
        await loadMyImages(); // Reload danh sách
      } catch (err) {
        setError('Không thể upload ảnh. Vui lòng thử lại.');
        console.error('Upload error:', err);
      } finally {
        setIsUploadingSource(false);
      }
    }
  };

  // Xử lý khi người dùng chọn video đích
  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTargetPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Xử lý khi người dùng chọn ảnh từ danh sách đã upload
  const handleSelectExistingImage = (imageUrl: string, preview: string) => {
    setSelectedImageUrl(imageUrl);
    setSourcePreview(preview);
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

  // Gửi yêu cầu deepfake
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImageUrl || !targetFile) {
      setError('Vui lòng chọn ảnh nguồn và video đích');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultVideo(null);
    setProcessingProgress('Đang tải lên và xử lý...');

    try {
      const jobId = await deepfakeVideoWithUrl(selectedImageUrl, targetFile);
      setJobId(jobId);
      setProcessingProgress('Đã bắt đầu xử lý video...');
    } catch (err) {
      setError('Có lỗi xảy ra khi xử lý video. Vui lòng thử lại sau.');
      console.error('Deepfake error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
                {isUploadingSource && <p className="upload-status">Đang upload...</p>}
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

          <div className="upload-box">
            <label htmlFor="target-video">Video đích (video cần thay khuôn mặt)</label>
            <input
              type="file"
              id="target-video"
              accept="video/*"
              onChange={handleTargetChange}
            />
            {targetPreview && (
              <div className="preview">
                <video src={targetPreview} controls width="250"></video>
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="button-container">
          <button
            type="submit"
            className="deepfake-button"
            disabled={isLoading || !selectedImageUrl || !targetFile}
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
          <div className="result-actions">
            <button onClick={handleDownload} className="download-button">
              Tải video xuống
            </button>
            <button
              className="new-deepfake-button"
              onClick={() => {
                setJobId(null);
                setResultVideo(null);
              }}
            >
              Tạo Deepfake mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepfakeVideo;