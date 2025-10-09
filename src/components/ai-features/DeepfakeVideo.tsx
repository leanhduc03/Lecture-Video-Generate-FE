import React, { useState, useEffect } from 'react';
import { deepfakeVideo, checkDeepfakeStatus } from '../../services/aiService';
import '../../styles/create-content.css';

const DeepfakeVideo = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [targetPreview, setTargetPreview] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [isCheckingResult, setIsCheckingResult] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>('Đang chuẩn bị...');

  // Xử lý khi người dùng chọn ảnh nguồn
  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceFile(file);
      // Tạo preview cho ảnh nguồn
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourcePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Xử lý khi người dùng chọn video đích
  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetFile(file);
      // Tạo preview cho video đích
      const reader = new FileReader();
      reader.onloadend = () => {
        setTargetPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Gửi yêu cầu deepfake
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceFile || !targetFile) {
      setError('Vui lòng chọn ảnh nguồn và video đích');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultVideo(null); // Reset kết quả cũ (nếu có)
    setProcessingProgress('Đang tải lên và xử lý...');

    try {
      // Upload và thực hiện deepfake
      const jobId = await deepfakeVideo(sourceFile, targetFile);
      setJobId(jobId);
      setProcessingProgress('Đã bắt đầu xử lý video...');
    } catch (err) {
      setError('Có lỗi xảy ra khi xử lý video. Vui lòng thử lại sau.');
      console.error('Deepfake error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý khi người dùng nhấn nút "Xem video kết quả"
  // const handleCheckResult = async () => {
  //   if (!jobId) return;

  //   setIsCheckingResult(true);
  //   setError(null);

  //   try {
  //     const result = await checkDeepfakeStatus(jobId);

  //     if (result.status === 'processing') {
  //       // Nếu video vẫn đang xử lý, thông báo cho người dùng
  //       setProcessingProgress('Video vẫn đang được xử lý. Vui lòng đợi thêm...');
  //     } else if (result.result_url) {
  //       // Nếu video đã sẵn sàng, hiển thị kết quả
  //       setResultVideo(result.result_url);
  //     }
  //   } catch (err) {
  //     setError('Có lỗi xảy ra khi kiểm tra kết quả. Vui lòng thử lại sau.');
  //     console.error('Error checking result:', err);
  //   } finally {
  //     setIsCheckingResult(false);
  //   }
  // };

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

          // Cập nhật thông báo tiến trình để người dùng không cảm thấy chờ đợi
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
      }, 30000); // Kiểm tra mỗi 30 giây
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, resultVideo]);

  const handleDownload = async () => {
    if (!resultVideo) return;

    try {
      // Hiển thị thông báo đang tải
      setError(null);
      const loadingMessage = document.createElement('div');
      loadingMessage.className = 'download-loading';
      loadingMessage.textContent = 'Đang chuẩn bị tải xuống...';
      document.querySelector('.result-container')?.appendChild(loadingMessage);

      // Tải file từ URL
      const response = await fetch(resultVideo);
      const blob = await response.blob();

      // Tạo URL đối tượng từ blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Tạo thẻ a ẩn để tải xuống
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;

      // Lấy tên file từ URL hoặc tạo tên mặc định
      const fileName = resultVideo.split('/').pop() || 'deepfake-video.mp4';
      downloadLink.download = fileName;

      // Thêm vào DOM, kích hoạt sự kiện click và xóa
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Giải phóng URL đối tượng
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
      <p>Tải lên ảnh của bạn và chọn video đích để tạo deepfake</p>

      {/* Phần Debug - Xóa sau khi test */}
      {jobId && <div style={{ background: "#e8f5e9", padding: "10px", margin: "10px 0", borderRadius: "4px" }}>
        Job ID đã được nhận: {jobId}
      </div>}

      <form onSubmit={handleSubmit} className="deepfake-form">
        <div className="upload-section">
          <div className="upload-box">
            <label htmlFor="source-image">Ảnh nguồn (khuôn mặt của bạn)</label>
            <input
              type="file"
              id="source-image"
              accept="image/*"
              onChange={handleSourceChange}
            />
            {sourcePreview && (
              <div className="preview">
                <img src={sourcePreview} alt="Source Preview" />
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
            disabled={isLoading || !sourceFile || !targetFile}
          >
            {isLoading ? 'Đang xử lý...' : 'Tạo Video Deepfake'}
          </button>

          {/* {jobId && !resultVideo && (
            <button
              type="button"
              className="check-result-button"
              onClick={handleCheckResult}
              disabled={isCheckingResult}
            >
              {isCheckingResult ? 'Đang kiểm tra...' : 'Xem video kết quả'}
            </button>
          )} */}
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
            <button
              onClick={handleDownload}
              className="download-button"
            >
              Tải video xuống
            </button>
            {jobId && (
              <button
                className="new-deepfake-button"
                onClick={() => {
                  setJobId(null);
                  setResultVideo(null);
                }}
              >
                Tạo Deepfake mới
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepfakeVideo;