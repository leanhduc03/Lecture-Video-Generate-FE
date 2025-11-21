import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/combined-ai-feature.css';
import { 
  uploadPptx,
  uploadVoiceSample, 
  generateSpeech, 
  uploadImageForDeepfake, 
  uploadVideoForDeepfake, 
  deepfakeVideo, 
  checkDeepfakeStatus, 
  processFakelip,
  combineSlideImageAndVideo,
  concatVideos
} from '../../services/aiService';
import { 
  saveVideo
 } from '../../services/videoService';

const SlideToVideo = () => {
  const { user } = useAuth();
  // PPTX + slides metadata
  const [pptxFile, setPptxFile] = useState<File | null>(null);
  const [slides, setSlides] = useState<Array<{id:string, image_url:string, order:number}>>([]);
  const [pptxUploading, setPptxUploading] = useState(false);

  // Deepfake global
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [deepfakeJobId, setDeepfakeJobId] = useState<string | null>(null);
  const [deepfakeVideoUrl, setDeepfakeVideoUrl] = useState<string | null>(null);

  // Per-slide narration
  const [slideTexts, setSlideTexts] = useState<Record<string,string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const voiceOptions = [
    { id: 'voice1', name: 'Giọng Nam', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1758950538/my_uploaded_audio.wav' },
    { id: 'voice2', name: 'Giọng Nữ', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/female_voice.wav' },
    { id: 'voice3', name: 'Giọng Trẻ Em', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/child_voice.wav' }
  ];
  const [selectedVoice, setSelectedVoice] = useState(voiceOptions[0].url);

  // --- Step 1: upload PPTX and get slides metadata ---
  const handlePptxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPptxFile(e.target.files[0]);
    }
  };

  const uploadPptxAndExtract = async () => {
    if (!pptxFile) {
      setError('Vui lòng chọn file PPTX');
      return;
    }
    setPptxUploading(true);
    setError(null);
    try {
      const res = await uploadPptx(pptxFile);
      if (res && res.success && Array.isArray(res.slides)) {
        setSlides(res.slides);
        // khởi tạo text rỗng cho từng slide
        const initial: Record<string,string> = {};
        res.slides.forEach((s: any) => initial[s.id] = '');
        setSlideTexts(initial);
      } else {
        throw new Error('Không nhận được metadata slide từ server');
      }
    } catch (err: any) {
      console.error('uploadPptx error', err);
      setError(err?.message || 'Lỗi khi upload PPTX');
    } finally {
      setPptxUploading(false);
    }
  };

  // --- Step 2: tạo deepfake global (1 lần) ---
  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSourceFile(e.target.files[0]);
  };
  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setTargetFile(e.target.files[0]);
  };

  const createDeepfakeGlobal = async () => {
    if (!sourceFile || !targetFile) {
      setError('Cần ảnh nguồn và video đích cho deepfake');
      return;
    }
    setError(null);
    setIsProcessing(true);
    setProcessingMessage('Bắt đầu tạo deepfake global (1 lần cho toàn bài)...');
    try {
      const jobId = await deepfakeVideo(sourceFile, targetFile);
      setDeepfakeJobId(jobId);

      // polling trạng thái qua backend
      let attempts = 0;
      const maxAttempts = 1200;
      while (attempts < maxAttempts) {
        attempts++;
        setProcessingMessage(`Đang xử lý deepfake... (lần ${attempts})`);
        const status = await checkDeepfakeStatus(jobId);
        if (status.status === 'completed' && status.result_url) {
          setDeepfakeVideoUrl(status.result_url);
          setProcessingMessage('Deepfake global hoàn tất');
          break;
        }
        await new Promise(r => setTimeout(r, 50000)); 
      }
      if (!deepfakeVideoUrl && !deepfakeJobId) {
        // nếu không cập nhật, coi là lỗi
      }
    } catch (err: any) {
      console.error('createDeepfakeGlobal error', err);
      setError('Lỗi khi tạo deepfake global: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Step 3..5: cho từng slide tạo TTS + fakelip rồi combine với slide image ---
  const handleSlideTextChange = (slideId: string, text: string) => {
    setSlideTexts(prev => ({ ...prev, [slideId]: text }));
  };

  const processSlidesAndCompose = async () => {
    if (slides.length === 0) {
      setError('Chưa có slide để xử lý');
      return;
    }
    if (!deepfakeVideoUrl) {
      setError('Chưa có video deepfake global');
      return;
    }
    setError(null);
    setIsProcessing(true);

    const composedSlideUrls: string[] = [];

    try {
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        setProcessingMessage(`Xử lý slide ${i+1}/${slides.length}...`);
        const text = (slideTexts as any)[s.id] || '';

        // 1) tạo TTS (nếu không có text, bỏ qua TTS -> có thể vẫn tạo đoạn im lặng)
        const ttsInputUrl = selectedVoice; // dùng giọng mẫu hiện tại
        const ttsResp = await generateSpeech(text || ' ', ttsInputUrl);
        if (!ttsResp || !ttsResp.audio_file_url) {
          throw new Error('Không tạo được audio cho slide ' + (i+1));
        }
        const audioUrl = ttsResp.audio_file_url;

        // 2) fakelip: tạo video nhép môi sử dụng deepfake global và audio slide
        const fakelipResp = await processFakelip(audioUrl, deepfakeVideoUrl);
        if (!fakelipResp || !fakelipResp.result_url) {
          throw new Error('Fakelip thất bại cho slide ' + (i+1));
        }
        const lipVideoUrl = fakelipResp.result_url;

        // 3) combine slide image + lipVideo (đặt video ở góc trái dưới)
        const combineResp = await combineSlideImageAndVideo(s.image_url, lipVideoUrl);
        if (!combineResp || !combineResp.result_url) {
          throw new Error('Không ghép được slide và video cho slide ' + (i+1));
        }
        composedSlideUrls.push(combineResp.result_url);
      }

      // --- Step 6: concat tất cả video slide thành video cuối cùng ---
      setProcessingMessage('Ghép các đoạn slide lại thành video hoàn chỉnh...');
      const finalResp = await concatVideos(composedSlideUrls);
      if (finalResp && finalResp.result_url) {
        setFinalVideoUrl(finalResp.result_url);
        try {
          if (!user?.username) {
            throw new Error('Không xác định được user');
          }
          await saveVideo(finalResp.result_url, user.username);
          setProcessingMessage('Hoàn tất. Video đã được lưu vào hệ thống.');
        } catch (saveError) {
          console.error('Lỗi khi lưu video:', saveError);
          setProcessingMessage('Video đã tạo xong nhưng không lưu được vào hệ thống.');
        }
      } else {
        throw new Error('Không tạo được video cuối cùng');
      }
    } catch (err: any) {
      console.error('processSlidesAndCompose error', err);
      setError(err?.message || 'Lỗi khi xử lý các slide');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setPptxFile(null);
    setSlides([]);
    setSlideTexts({});
    setSourceFile(null);
    setTargetFile(null);
    setDeepfakeJobId(null);
    setDeepfakeVideoUrl(null);
    setFinalVideoUrl(null);
    setError(null);
    setProcessingMessage('');
  };
  const handleDownload = async () => {
    if (!finalVideoUrl) return;

    try {
      // Hiển thị thông báo đang tải
      setError(null);
      const loadingMessage = document.createElement('div');
      loadingMessage.className = 'download-loading';
      loadingMessage.textContent = 'Đang chuẩn bị tải xuống...';
      document.querySelector('.result-container')?.appendChild(loadingMessage);

      // Tải file từ URL
      const response = await fetch(finalVideoUrl);
      const blob = await response.blob();

      // Tạo URL đối tượng từ blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Tạo thẻ a ẩn để tải xuống
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;

      // Lấy tên file từ URL hoặc tạo tên mặc định
      const fileName = finalVideoUrl.split('/').pop() || 'final-video.mp4';
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
    <div className="combined-ai-feature">
      <h2>Slide to Presentation (Tối ưu dùng Deepfake global)</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Step 1: upload pptx */}
      <section className="step-content">
        <h3>Bước 1: Upload file PPTX</h3>
        <input type="file" accept=".pptx" onChange={handlePptxChange} />
        <button onClick={uploadPptxAndExtract} disabled={!pptxFile || pptxUploading}>
          {pptxUploading ? 'Đang upload...' : 'Upload & Tách slide'}
        </button>
        <div>
          Đã nhập {slides.length} slide
        </div>
      </section>

      {/* Step 2: tạo deepfake global */}
      <section className="step-content">
        <h3>Bước 2: Tạo Deepfake global (1 lần cho toàn bài)</h3>
        <div>
          <label>Ảnh nguồn: <input type="file" accept="image/*" onChange={handleSourceChange} /></label>
        </div>
        <div>
          <label>Video đích: <input type="file" accept="video/*" onChange={handleTargetChange} /></label>
        </div>
        <button onClick={createDeepfakeGlobal} disabled={!sourceFile || !targetFile || isProcessing}>
          {isProcessing ? 'Đang xử lý...' : 'Tạo Deepfake Global'}
        </button>
        {deepfakeVideoUrl && (<div>Deepfake global sẵn sàng: <video src={deepfakeVideoUrl} controls style={{width:'100%'}} /></div>)}
      </section>

      {/* Steps 3..5: nhập text cho mỗi slide */}
      {slides.length > 0 && (
        <section className="step-content">
          <h3>Bước 3-5: Nhập văn bản cho từng slide (sẽ dùng TTS + fakelip, tận dụng deepfake global)</h3>
          <div>
            <label>Giọng mẫu: 
              <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
                {voiceOptions.map(v => <option key={v.id} value={v.url}>{v.name}</option>)}
              </select>
            </label>
          </div>
          <div className="slides-list">
            {slides.map((s, idx) => (
              <div key={s.id} style={{border:'1px solid #eee', padding:10, margin:8}}>
                <div>Slide {idx+1}</div>
                <img src={s.image_url} alt={`slide-${idx+1}`} style={{maxWidth:300}} />
                <textarea
                  rows={3}
                  placeholder="Nhập nội dung thuyết minh cho slide này"
                  value={slideTexts[s.id] || ''}
                  onChange={(e) => handleSlideTextChange(s.id, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div style={{marginTop:12}}>
            <button onClick={processSlidesAndCompose} disabled={isProcessing || !deepfakeVideoUrl}>
              {isProcessing ? 'Đang xử lý toàn bộ...' : 'Bắt đầu tạo video thuyết trình'}
            </button>
            <button onClick={handleReset} style={{marginLeft:8}}>Reset</button>
          </div>

          {processingMessage && <div style={{marginTop:10}}>{processingMessage}</div>}
        </section>
      )}

      {/* Final result */}
      {finalVideoUrl && (
        <section className="step-content">
          <h3>Video cuối cùng</h3>
          <video src={finalVideoUrl} controls style={{width:'100%'}} />
          <div style={{marginTop:8}}>
            <button
              onClick={handleDownload}
              className="download-button"
            >
              Tải video xuống
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default SlideToVideo;