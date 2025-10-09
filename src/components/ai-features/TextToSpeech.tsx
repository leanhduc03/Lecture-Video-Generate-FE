import React, { useState } from 'react';
import { uploadVoiceSample, generateSpeech } from '../../services/aiService';

const TextToSpeech = () => {
  const [text, setText] = useState('');
  const [voiceType, setVoiceType] = useState('sample'); // sample hoặc custom
  const [selectedVoice, setSelectedVoice] = useState('voice1');
  const [customVoiceFile, setCustomVoiceFile] = useState<File | null>(null);
  const [customVoiceUrl, setCustomVoiceUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voiceOptions = [
    { id: 'voice1', name: 'Giọng Nam', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/male_voice.wav' },
    { id: 'voice2', name: 'Giọng Nữ', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/female_voice.wav' },
    { id: 'voice3', name: 'Giọng Trẻ Em', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/child_voice.wav' }
  ];

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleVoiceTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVoiceType(e.target.value);
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCustomVoiceFile(e.target.files[0]);
      setCustomVoiceUrl(null); // Reset URL khi chọn file mới
    }
  };

  const handleUploadVoiceFile = async () => {
    if (!customVoiceFile) {
      setError('Vui lòng chọn file âm thanh');
      return false;
    }

    setUploadLoading(true);
    setError(null);

    try {
      const response = await uploadVoiceSample(customVoiceFile);

      if (response && response.success && response.audio_url) {
        setCustomVoiceUrl(response.audio_url);
        return true;
      } else {
        throw new Error('Không nhận được URL từ server');
      }
    } catch (err: any) {
      console.error('Lỗi khi upload file:', err);
      
      if (err.response) {
        setError(`Upload thất bại: ${err.response.data?.detail || err.response.statusText}`);
      } else {
        setError(`Upload thất bại: ${err.message}`);
      }
      return false;
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let audioUrlToSend;
      
      if (voiceType === 'sample') {
        // Sử dụng giọng mẫu có sẵn
        audioUrlToSend = voiceOptions.find(voice => voice.id === selectedVoice)?.url;
      } else {
        // Sử dụng giọng tùy chỉnh
        if (!customVoiceUrl) {
          // Upload file nếu chưa có URL
          const uploadSuccess = await handleUploadVoiceFile();
          if (!uploadSuccess) {
            setLoading(false);
            return;
          }
          
          // Lấy URL trực tiếp từ response thay vì sử dụng state
          const response = await uploadVoiceSample(customVoiceFile as File);
          if (response && response.success && response.audio_url) {
            audioUrlToSend = response.audio_url;
            // Vẫn cập nhật state để sử dụng sau này
            setCustomVoiceUrl(response.audio_url);
          }
        } else {
          audioUrlToSend = customVoiceUrl;
        }
      }
      
      // Kiểm tra lại URL âm thanh
      if (!audioUrlToSend) {
        setError('Không có URL âm thanh hợp lệ');
        setLoading(false);
        return;
      }
      
      // Hiển thị URL để debug
      console.log("URL âm thanh gửi đi:", audioUrlToSend);
      
      // Gọi API text-to-speech
      const response = await generateSpeech(text, audioUrlToSend);

      if (response && response.audio_file_url) {
        setAudioUrl(response.audio_file_url);
      } else {
        throw new Error('Không nhận được URL âm thanh từ API');
      }
    } catch (err: any) {
      console.error('Lỗi khi gọi API Text-to-Speech:', err);
      
      if (err.response) {
        setError(`Lỗi ${err.response.status}: ${err.response.data?.error || 'Không xác định'}`);
      } else {
        setError('Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) return;
    
    try {
      // Hiển thị thông báo đang tải
      setError(null);
      const loadingMessage = document.createElement('div');
      loadingMessage.className = 'download-loading';
      loadingMessage.textContent = 'Đang chuẩn bị tải xuống...';
      document.querySelector('.result-section')?.appendChild(loadingMessage);
      
      // Tải file từ URL
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      // Tạo URL đối tượng từ blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Tạo thẻ a ẩn để tải xuống
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = 'generated-speech.wav'; // Đặt tên file
      
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
      setError('Không thể tải xuống file. Vui lòng thử lại sau.');
      document.querySelector('.download-loading')?.remove();
    }
  };

  const isButtonDisabled = loading || uploadLoading || !text || 
    (voiceType === 'custom' && !customVoiceFile && !customVoiceUrl);

  return (
    <div className="feature-section">
      <h2>Chuyển văn bản thành giọng nói</h2>
      <p>Chuyển đổi văn bản thành giọng nói với giọng đọc tùy chỉnh</p>
      
      <form onSubmit={handleSubmit} className="ai-form">
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
            <h3>Chọn loại giọng nói</h3>
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
                required
              >
                {voiceOptions.map(voice => (
                  <option key={voice.id} value={voice.id}>{voice.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="voice-upload">Tải lên mẫu giọng nói</label>
              <input 
                type="file" 
                id="voice-upload"
                onChange={handleFileChange}
                accept="audio/*"
                required={!customVoiceUrl}
              />
              <small>Tải lên tệp âm thanh mẫu giọng nói để mô hình học cách bắt chước.</small>
              
              {customVoiceFile && !customVoiceUrl && (
                <div className="file-selected">
                  <span>Đã chọn: {customVoiceFile.name}</span>
                  <p><small>File sẽ được tự động tải lên khi bạn nhấn "Tạo giọng nói"</small></p>
                </div>
              )}
              
              {customVoiceUrl && (
                <div className="file-uploaded">
                  <span>Đã tải lên thành công!</span>
                  <audio controls src={customVoiceUrl} className="audio-sample-player" />
                </div>
              )}
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          className="btn-primary"
          disabled={isButtonDisabled}
        >
          {loading ? 'Đang xử lý...' : uploadLoading ? 'Đang tải lên...' : 'Tạo giọng nói'}
        </button>
      </form>
      
      {error && <div className="error-message">{error}</div>}
      
      {audioUrl && (
        <div className="result-section">
          <h3>Kết quả</h3>
          <audio controls src={audioUrl} className="audio-player" />
          <button onClick={handleDownload} className="btn-download">
            Tải xuống
          </button>
        </div>
      )}
    </div>
  );
};

export default TextToSpeech;