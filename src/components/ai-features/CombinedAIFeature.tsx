import React, { useState, useEffect } from 'react';
import '../../styles/combined-ai-feature.css';
import { 
  uploadVoiceSample, 
  generateSpeech, 
  uploadImageForDeepfake, 
  uploadVideoForDeepfake, 
  deepfakeVideo, 
  checkDeepfakeStatus, 
  processFakelip 
} from '../../services/aiService';

const CombinedAIFeature = () => {
  // State cho Text-to-Speech
  const [text, setText] = useState('');
  const [voiceType, setVoiceType] = useState('sample');
  const [selectedVoice, setSelectedVoice] = useState('voice1');
  const [customVoiceFile, setCustomVoiceFile] = useState<File | null>(null);
  const [customVoiceUrl, setCustomVoiceUrl] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  // State cho Deepfake
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [targetPreview, setTargetPreview] = useState<string | null>(null);
  const [deepfakeJobId, setDeepfakeJobId] = useState<string | null>(null);
  const [deepfakeResultUrl, setDeepfakeResultUrl] = useState<string | null>(null);

  // State cho FakeLip
  const [finalResultUrl, setFinalResultUrl] = useState<string | null>(null);

  // State chung
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string>('');

  // Các options cho giọng nói mẫu
  const voiceOptions = [
    { id: 'voice1', name: 'Giọng Nam', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/male_voice.wav' },
    { id: 'voice2', name: 'Giọng Nữ', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/female_voice.wav' },
    { id: 'voice3', name: 'Giọng Trẻ Em', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/child_voice.wav' }
  ];

  // Xử lý thay đổi text
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // Xử lý thay đổi loại giọng
  const handleVoiceTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVoiceType(e.target.value);
  };

  // Xử lý thay đổi giọng mẫu
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(e.target.value);
  };

  // Xử lý chọn file giọng tùy chỉnh
  const handleCustomVoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCustomVoiceFile(e.target.files[0]);
      setCustomVoiceUrl(null); // Reset URL khi chọn file mới
    }
  };

  // Xử lý upload file giọng tùy chỉnh
  const handleUploadVoiceFile = async () => {
    if (!customVoiceFile) {
      setError('Vui lòng chọn file âm thanh');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await uploadVoiceSample(customVoiceFile);
      if (response && response.success && response.audio_url) {
        setCustomVoiceUrl(response.audio_url);
        return response.audio_url;
      } else {
        throw new Error('Không nhận được URL từ server');
      }
    } catch (err: any) {
      console.error('Lỗi khi upload file giọng:', err);
      setError(`Upload thất bại: ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý khi chọn ảnh nguồn cho deepfake
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

  // Xử lý khi chọn video đích cho deepfake
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

  // Xử lý chuyển đổi text thành giọng nói
  const handleTextToSpeech = async () => {
    setIsLoading(true);
    setError(null);
    setProcessingMessage('Đang chuyển văn bản thành giọng nói...');

    try {
      let audioUrlToSend;
      
      if (voiceType === 'sample') {
        audioUrlToSend = voiceOptions.find(voice => voice.id === selectedVoice)?.url;
      } else {
        if (!customVoiceUrl) {
          const uploadedUrl = await handleUploadVoiceFile();
          if (!uploadedUrl) {
            throw new Error('Không thể upload file giọng tùy chỉnh');
          }
          audioUrlToSend = uploadedUrl;
        } else {
          audioUrlToSend = customVoiceUrl;
        }
      }
      
      if (!audioUrlToSend) {
        throw new Error('Không có URL âm thanh hợp lệ');
      }
      
      const response = await generateSpeech(text, audioUrlToSend);
      
      if (response && response.audio_file_url) {
        setGeneratedAudioUrl(response.audio_file_url);
        return response.audio_file_url;
      } else {
        throw new Error('Không nhận được URL âm thanh từ API');
      }
    } catch (error: any) {
      console.error('Lỗi khi chuyển văn bản thành giọng nói:', error);
      setError(`Lỗi khi tạo giọng nói: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý tạo deepfake video
  const handleDeepfake = async () => {
    if (!sourceFile || !targetFile) {
      setError('Vui lòng chọn ảnh nguồn và video đích');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setProcessingMessage('Đang tạo video deepfake...');

    try {
      const jobId = await deepfakeVideo(sourceFile, targetFile);
      setDeepfakeJobId(jobId);

      // Kiểm tra trạng thái deepfake
      let deepfakeResult = null;
      let attempts = 0;
      const maxAttempts = 30; // Giới hạn số lần kiểm tra

      while (attempts < maxAttempts) {
        attempts++;
        setProcessingMessage(`Đang xử lý deepfake... (Lần thử ${attempts}/${maxAttempts})`);
        
        const result = await checkDeepfakeStatus(jobId);
        
        if (result.status === 'completed' && result.result_url) {
          deepfakeResult = result.result_url;
          setDeepfakeResultUrl(result.result_url);
          break;
        }
        
        // Chờ 30 giây trước khi kiểm tra lại
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
      if (!deepfakeResult) {
        throw new Error('Quá thời gian xử lý deepfake, vui lòng thử lại sau');
      }
      
      return deepfakeResult;
    } catch (error: any) {
      console.error('Lỗi khi tạo deepfake:', error);
      setError(`Lỗi khi tạo deepfake: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý tạo fakelip video
  const handleFakelip = async (audioUrl: string, videoUrl: string) => {
    setIsLoading(true);
    setError(null);
    setProcessingMessage('Đang tạo video nhép môi...');

    try {
      const result = await processFakelip(audioUrl, videoUrl);
      
      if (result && result.result_url) {
        setFinalResultUrl(result.result_url);
        return result.result_url;
      } else {
        throw new Error('Không nhận được URL kết quả từ API');
      }
    } catch (error: any) {
      console.error('Lỗi khi tạo fakelip:', error);
      setError(`Lỗi khi tạo video nhép môi: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý toàn bộ quá trình
  const handleProcessAll = async () => {
    // Bước 1: Tạo giọng nói từ văn bản
    setProcessingMessage('Bước 1/3: Đang chuyển văn bản thành giọng nói...');
    const audioUrl = await handleTextToSpeech();
    if (!audioUrl) return;
    
    // Bước 2: Tạo video deepfake
    setProcessingMessage('Bước 2/3: Đang tạo video deepfake...');
    const deepfakeUrl = await handleDeepfake();
    if (!deepfakeUrl) return;
    
    // Bước 3: Kết hợp âm thanh và video để tạo fakelip
    setProcessingMessage('Bước 3/3: Đang tạo video nhép môi theo giọng nói...');
    await handleFakelip(audioUrl, deepfakeUrl);
    
    setCurrentStep(4); // Chuyển đến bước hiển thị kết quả
  };

  // Hàm chuyển đến bước tiếp theo
  const nextStep = () => {
    // Validate dữ liệu trước khi chuyển bước
    if (currentStep === 1 && !text) {
      setError('Vui lòng nhập văn bản để chuyển thành giọng nói');
      return;
    }
    
    if (currentStep === 2 && (!sourceFile || !targetFile)) {
      setError('Vui lòng chọn ảnh nguồn và video đích');
      return;
    }
    
    setError(null);
    setCurrentStep(currentStep + 1);
  };

  // Hàm quay lại bước trước
  const prevStep = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
  };

  // Hàm tải xuống video kết quả
  const handleDownload = async () => {
    if (!finalResultUrl) return;

    try {
      setError(null);
      const loadingMessage = document.createElement('div');
      loadingMessage.className = 'download-loading';
      loadingMessage.textContent = 'Đang chuẩn bị tải xuống...';
      document.querySelector('.result-container')?.appendChild(loadingMessage);

      // Tải file từ URL
      const response = await fetch(finalResultUrl);
      const blob = await response.blob();

      // Tạo URL đối tượng từ blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Tạo thẻ a ẩn để tải xuống
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = 'ai-generated-video.mp4';

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

  // Bắt đầu lại từ đầu
  const handleReset = () => {
    setText('');
    setVoiceType('sample');
    setSelectedVoice('voice1');
    setCustomVoiceFile(null);
    setCustomVoiceUrl(null);
    setGeneratedAudioUrl(null);
    setSourceFile(null);
    setTargetFile(null);
    setSourcePreview(null);
    setTargetPreview(null);
    setDeepfakeJobId(null);
    setDeepfakeResultUrl(null);
    setFinalResultUrl(null);
    setCurrentStep(1);
    setError(null);
    
    // Reset input file elements
    const customVoiceInput = document.getElementById('custom-voice-file') as HTMLInputElement;
    const sourceInput = document.getElementById('source-image') as HTMLInputElement;
    const targetInput = document.getElementById('target-video') as HTMLInputElement;
    if (customVoiceInput) customVoiceInput.value = '';
    if (sourceInput) sourceInput.value = '';
    if (targetInput) targetInput.value = '';
  };

  // Kiểm tra deepfake status nếu có jobId nhưng chưa có kết quả
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (deepfakeJobId && !deepfakeResultUrl) {
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
          const result = await checkDeepfakeStatus(deepfakeJobId);

          // Cập nhật thông báo tiến trình
          if (result.status === 'processing') {
            if (progressCounter < progressMessages.length) {
              setProcessingMessage(progressMessages[progressCounter]);
              progressCounter++;
            }
          } else if (result.status === 'completed' && result.result_url) {
            setDeepfakeResultUrl(result.result_url);
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
  }, [deepfakeJobId, deepfakeResultUrl]);

  return (
    <div className="combined-ai-feature">
      <h2>Tạo Video AI Tổng Hợp</h2>
      <p>Tạo video deepfake và nhép môi theo giọng nói được sinh từ văn bản</p>

      {/* Hiển thị các bước */}
      <div className="steps-indicator">
        <div className={`step ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          1. Nhập văn bản
        </div>
        <div className={`step ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          2. Chọn ảnh và video
        </div>
        <div className={`step ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
          3. Xử lý
        </div>
        <div className={`step ${currentStep === 4 ? 'active' : ''}`}>
          4. Kết quả
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Bước 1: Text to Speech */}
      {currentStep === 1 && (
        <div className="step-content">
          <h3>Bước 1: Nhập văn bản để chuyển thành giọng nói</h3>
          
          <div className="form-group">
            <label htmlFor="text-input">Nhập văn bản</label>
            <textarea 
              id="text-input"
              value={text}
              onChange={handleTextChange}
              rows={5}
              placeholder="Nhập văn bản bạn muốn chuyển thành giọng nói..."
              required
            />
          </div>
          
          <div className="voice-options">
            <div className="voice-type-selection">
              <h4>Chọn loại giọng nói</h4>
              <div className="radio-group">
                <label>
                  <input 
                    type="radio" 
                    name="voice-type" 
                    value="sample" 
                    checked={voiceType === 'sample'}
                    onChange={handleVoiceTypeChange}
                  />
                  Giọng mẫu có sẵn
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="voice-type" 
                    value="custom" 
                    checked={voiceType === 'custom'}
                    onChange={handleVoiceTypeChange}
                  />
                  Tải lên giọng của bạn
                </label>
              </div>
            </div>

            {voiceType === 'sample' ? (
              <div className="form-group">
                <label htmlFor="voice-select">Chọn giọng mẫu</label>
                <select
                  id="voice-select"
                  value={selectedVoice}
                  onChange={handleVoiceChange}
                >
                  {voiceOptions.map(voice => (
                    <option key={voice.id} value={voice.id}>{voice.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="custom-voice-file">Tải lên file giọng của bạn (file WAV)</label>
                <input 
                  type="file" 
                  id="custom-voice-file"
                  onChange={handleCustomVoiceChange}
                  accept="audio/*"
                />
                
                {customVoiceUrl && (
                  <div className="voice-preview">
                    <p>Đã tải lên thành công</p>
                    <audio controls src={customVoiceUrl} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="buttons-container">
            <button 
              className="btn-next"
              onClick={nextStep}
              disabled={!text}
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Bước 2: Chọn ảnh và video cho Deepfake */}
      {currentStep === 2 && (
        <div className="step-content">
          <h3>Bước 2: Chọn ảnh và video cho Deepfake</h3>
          
          <div className="upload-section">
            <div className="upload-box">
              <label htmlFor="source-image">Ảnh nguồn (khuôn mặt của bạn)</label>
              <input
                type="file"
                id="source-image"
                accept="image/*"
                onChange={handleSourceChange}
                required
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
                required
              />
              {targetPreview && (
                <div className="preview">
                  <video src={targetPreview} controls width="100%" />
                </div>
              )}
            </div>
          </div>

          <div className="buttons-container">
            <button 
              className="btn-back"
              onClick={prevStep}
            >
              Quay lại
            </button>
            <button 
              className="btn-next"
              onClick={nextStep}
              disabled={!sourceFile || !targetFile}
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Bước 3: Xử lý */}
      {currentStep === 3 && (
        <div className="step-content">
          <h3>Bước 3: Xử lý</h3>
          
          <div className="processing-info">
            <p>Nhấn nút "Bắt đầu xử lý" để tiến hành tạo video AI. Quá trình này sẽ thực hiện các bước sau:</p>
            <ol>
              <li>Chuyển văn bản thành giọng nói</li>
              <li>Tạo video deepfake từ ảnh và video đã chọn</li>
              <li>Kết hợp giọng nói và video để tạo video nhép môi</li>
            </ol>
            <p className="note">Lưu ý: Quá trình này có thể mất vài phút tùy thuộc vào độ dài của văn bản và video.</p>
          </div>
          
          {isLoading ? (
            <div className="processing-status">
              <div className="loading-spinner"></div>
              <p>{processingMessage}</p>
            </div>
          ) : (
            <div className="buttons-container">
              <button 
                className="btn-back"
                onClick={prevStep}
                disabled={isLoading}
              >
                Quay lại
              </button>
              <button 
                className="btn-process"
                onClick={handleProcessAll}
                disabled={isLoading}
              >
                Bắt đầu xử lý
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bước 4: Kết quả */}
      {currentStep === 4 && (
        <div className="step-content">
          <h3>Bước 4: Kết quả</h3>
          
          {finalResultUrl ? (
            <div className="result-container">
              <div className="video-result">
                <h4>Video kết quả:</h4>
                <video src={finalResultUrl} controls width="100%" />
              </div>
              
              <div className="result-actions">
                <button
                  onClick={handleDownload}
                  className="btn-download"
                >
                  Tải xuống video
                </button>
                <button
                  onClick={handleReset}
                  className="btn-new"
                >
                  Tạo video mới
                </button>
              </div>
            </div>
          ) : (
            <div className="no-result">
              <p>Không có kết quả. Vui lòng quay lại các bước trước và thử lại.</p>
              <button
                onClick={prevStep}
                className="btn-back"
              >
                Quay lại
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CombinedAIFeature;