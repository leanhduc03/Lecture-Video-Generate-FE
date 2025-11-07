import React, { useState, useEffect } from 'react';
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

// API service cho generate slides
const API_BASE_URL = 'http://localhost:8000/api/v1';

interface SlideMetadata {
  slide_number: number;
  type: string;
  title?: string;
  filepath: string;
  filename: string;
}

interface SlideData {
  slide_number: number;
  title: string;
  content: string[];
  original_content: string;
}

interface PresentationMetadata {
  title: string;
  total_slides: number;
  created_at: string;
  slides: SlideMetadata[];
  slide_data: {
    title: string;
    slides: SlideData[];
  };
}

const path = {
  basename: (filepath: string) => filepath.split(/[/\\]/).pop() || filepath
};

const SlideToVideo = () => {
  // Input content
  const [inputContent, setInputContent] = useState<string>('');
  const [numSlides, setNumSlides] = useState<number | undefined>(undefined);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);

  // Presentation metadata
  const [metadata, setMetadata] = useState<PresentationMetadata | null>(null);
  const [slides, setSlides] = useState<SlideMetadata[]>([]);

  // Deepfake global
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [deepfakeJobId, setDeepfakeJobId] = useState<string | null>(null);
  const [deepfakeVideoUrl, setDeepfakeVideoUrl] = useState<string | null>(null);

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

  // --- Step 1: Generate slides từ content ---
  const generateSlidesFromContent = async () => {
    if (!inputContent.trim()) {
      setError('Vui lòng nhập nội dung để tạo slide');
      return;
    }
    
    setIsGeneratingSlides(true);
    setError(null);
    
    try {
      // 1. Tạo PPTX và JSON
      const response = await fetch(`${API_BASE_URL}/slides/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: inputContent,
          num_slides: numSlides || null
        })
      });

      if (!response.ok) {
        throw new Error('Không thể tạo slides');
      }

      const result = await response.json();
      
      if (result.success && result.data?.pptx_file) {
        // 2. Upload PPTX để tách thành slide images
        const pptxPath = result.data.pptx_file.filepath;
        await uploadAndProcessPPTX(pptxPath, result.data.json_file?.filename);
      } else {
        throw new Error(result.message || 'Lỗi khi tạo slides');
      }
    } catch (err: any) {
      console.error('Generate slides error', err);
      setError(err?.message || 'Lỗi khi tạo slides');
      setIsGeneratingSlides(false);
    }
  };

  // Upload PPTX và tách thành images
  const uploadAndProcessPPTX = async (pptxPath: string, jsonFilename: string) => {
    try {
      console.log('Starting PPTX processing...', { pptxPath, jsonFilename });
      
      // Đọc file PPTX từ server và tạo File object để upload
      const pptxFilename = path.basename(pptxPath);
      const pptxResponse = await fetch(`${API_BASE_URL}/slides/download/${pptxFilename}`);
      
      if (!pptxResponse.ok) {
        throw new Error(`Không thể tải file PPTX: ${pptxResponse.status} ${pptxResponse.statusText}`);
      }

      console.log('Downloaded PPTX successfully');
      
      const pptxBlob = await pptxResponse.blob();
      const pptxFile = new File([pptxBlob], pptxFilename, { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      console.log('Created File object:', pptxFile.name, pptxFile.size, 'bytes');

      // Upload PPTX để tách thành slide images
      const formData = new FormData();
      formData.append('file', pptxFile);

      console.log('Uploading to /media/upload-pptx...');
      
      const uploadResponse = await fetch(`${API_BASE_URL}/media/upload-pptx`, {
        method: 'POST',
        body: formData
      });

      console.log('Upload response status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Không thể tách slides thành images: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('Upload result:', uploadResult);
      
      if (uploadResult.success && uploadResult.slides) {
        // 3. Lấy metadata JSON
        if (jsonFilename) {
          await fetchSlideMetadata(jsonFilename, uploadResult.slides);
        } else {
          throw new Error('Không tìm thấy JSON metadata');
        }
      } else {
        throw new Error(`Không tách được slides thành images: ${JSON.stringify(uploadResult)}`);
      }
    } catch (err: any) {
      console.error('Upload and process PPTX error', err);
      
      // Fallback: Sử dụng placeholder images nếu không tách được PPTX
      if (jsonFilename) {
        console.log('Attempting fallback with placeholder images...');
        await fetchSlideMetadataWithPlaceholders(jsonFilename);
      } else {
        setError(err?.message || 'Lỗi khi xử lý PPTX');
      }
    } finally {
      setIsGeneratingSlides(false);
    }
  };

  // Fallback: Tạo placeholder images cho slides
  const fetchSlideMetadataWithPlaceholders = async (jsonFilename: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/slides/metadata/${jsonFilename}`);
      
      if (!response.ok) {
        throw new Error('Không thể lấy metadata');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('Raw metadata (fallback):', result.data);
        
        // Tạo placeholder slides với text-based images
        const slideCount = result.data.slides ? result.data.slides.length : 3;
        const placeholderSlides = [];
        
        for (let i = 0; i < slideCount; i++) {
          placeholderSlides.push({
            slide_number: i,
            type: i === 0 ? 'title' : 'content',
            title: `Slide ${i + 1}`,
            filepath: `data:image/svg+xml;base64,${btoa(`
              <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
                <rect width="1920" height="1080" fill="#f8f9fa"/>
                <text x="960" y="540" text-anchor="middle" font-family="Arial" font-size="48" fill="#333">
                  Slide ${i + 1}
                </text>
                <text x="960" y="600" text-anchor="middle" font-family="Arial" font-size="24" fill="#666">
                  (Placeholder - PPTX conversion failed)
                </text>
              </svg>
            `)}`,
            filename: `placeholder_slide_${i}.svg`
          });
        }
        
        // Kết hợp metadata với placeholder images
        const combinedMetadata = {
          ...result.data,
          slides: placeholderSlides,
          slide_data: result.data // Giữ nguyên slide_data từ JSON
        };
        
        console.log('Combined metadata with placeholders:', combinedMetadata);
        
        setMetadata(combinedMetadata);
        setSlides(combinedMetadata.slides);
        setError('⚠️ Sử dụng placeholder images vì không thể tách PPTX. Video vẫn có thể được tạo với nội dung audio.');
      } else {
        throw new Error('Metadata không hợp lệ');
      }
    } catch (err: any) {
      console.error('Fetch metadata fallback error', err);
      setError(err?.message || 'Lỗi khi lấy metadata (fallback)');
    }
  };

  // Fetch slide metadata và kết hợp với slide images
  const fetchSlideMetadata = async (jsonFilename: string, slideImages: any[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/slides/metadata/${jsonFilename}`);
      
      if (!response.ok) {
        throw new Error('Không thể lấy metadata');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Kết hợp metadata với slide images từ media API
        const combinedMetadata = {
          ...result.data,
          slides: slideImages.map((img, idx) => ({
            slide_number: idx,
            type: idx === 0 ? 'title' : 'content',
            title: `Slide ${idx + 1}`,
            filepath: img.image_url,
            filename: `slide_${idx}.png`
          }))
        };
        
        console.log('Combined metadata:', combinedMetadata);
        
        setMetadata(combinedMetadata);
        setSlides(combinedMetadata.slides);
      } else {
        throw new Error('Metadata không hợp lệ');
      }
    } catch (err: any) {
      console.error('Fetch metadata error', err);
      setError(err?.message || 'Lỗi khi lấy metadata');
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

      // polling trạng thái
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
    } catch (err: any) {
      console.error('createDeepfakeGlobal error', err);
      setError('Lỗi khi tạo deepfake global: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Step 3: Xử lý tất cả slides tự động ---
  const processSlidesAndCompose = async () => {
    if (!metadata || slides.length === 0) {
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
    const slideDataList = metadata.slide_data.slides;

    try {
      // Bỏ qua slide tiêu đề (slide_number = 0)
      const contentSlides = slides.filter(s => s.type !== 'title');
      
      for (let i = 0; i < contentSlides.length; i++) {
        const slide = contentSlides[i];
        const slideData = slideDataList.find(sd => sd.slide_number === slide.slide_number);
        
        setProcessingMessage(`Xử lý slide ${i+1}/${contentSlides.length}: ${slideData?.title || 'Untitled'}...`);
        
        // Lấy content từ metadata
        const narrationText = slideData?.original_content || '';
        
        if (!narrationText) {
          console.warn(`Slide ${slide.slide_number} không có content, bỏ qua`);
          continue;
        }

        // 1) Tạo TTS
        const ttsInputUrl = selectedVoice;
        const ttsResp = await generateSpeech(narrationText, ttsInputUrl);
        if (!ttsResp || !ttsResp.audio_file_url) {
          throw new Error(`Không tạo được audio cho slide ${slide.slide_number}`);
        }
        const audioUrl = ttsResp.audio_file_url;

        // 2) Fakelip
        const fakelipResp = await processFakelip(audioUrl, deepfakeVideoUrl);
        if (!fakelipResp || !fakelipResp.result_url) {
          throw new Error(`Fakelip thất bại cho slide ${slide.slide_number}`);
        }
        const lipVideoUrl = fakelipResp.result_url;

        // 3) Combine slide image + lipVideo
        const slideImageUrl = slide.filepath.replace(/\\/g, '/'); // Normalize path
        const combineResp = await combineSlideImageAndVideo(slideImageUrl, lipVideoUrl);
        if (!combineResp || !combineResp.result_url) {
          throw new Error(`Không ghép được slide ${slide.slide_number} và video`);
        }
        composedSlideUrls.push(combineResp.result_url);
      }

      // 4) Concat tất cả video
      setProcessingMessage('Ghép các đoạn slide lại thành video hoàn chỉnh...');
      const finalResp = await concatVideos(composedSlideUrls);
      if (finalResp && finalResp.result_url) {
        setFinalVideoUrl(finalResp.result_url);
        setProcessingMessage('Hoàn tất. Video cuối đã sẵn sàng.');
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
    setInputContent('');
    setNumSlides(undefined);
    setMetadata(null);
    setSlides([]);
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
      setError(null);
      const loadingMessage = document.createElement('div');
      loadingMessage.className = 'download-loading';
      loadingMessage.textContent = 'Đang chuẩn bị tải xuống...';
      document.querySelector('.result-container')?.appendChild(loadingMessage);

      const response = await fetch(finalVideoUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      const fileName = finalVideoUrl.split('/').pop() || 'final-video.mp4';
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

  // Thêm useEffect để debug
  useEffect(() => {
    if (metadata && deepfakeVideoUrl) {
      console.log('Metadata:', metadata);
      console.log('Deepfake URL:', deepfakeVideoUrl);
      console.log('Has slide_data:', !!metadata.slide_data);
      console.log('Has slides array:', !!metadata.slide_data?.slides);
      console.log('Slides length:', metadata.slide_data?.slides?.length);
    }
  }, [metadata, deepfakeVideoUrl]);

  return (
    <div className="combined-ai-feature">
      <h2>Slide to Presentation (Tự động từ nội dung)</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Step 1: Nhập content và tạo slides */}
      <section className="step-content">
        <h3>Bước 1: Nhập nội dung và tạo slides</h3>
        <textarea
          rows={8}
          placeholder="Nhập nội dung bài giảng của bạn..."
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          style={{width: '100%', padding: '10px'}}
        />
        <div style={{marginTop: 10}}>
          <label>
            Số lượng slide (để trống = tự động):
            <input
              type="number"
              min="1"
              max="50"
              value={numSlides || ''}
              onChange={(e) => setNumSlides(e.target.value ? parseInt(e.target.value) : undefined)}
              style={{marginLeft: 10, width: 80}}
            />
          </label>
        </div>
        <button 
          onClick={generateSlidesFromContent} 
          disabled={!inputContent.trim() || isGeneratingSlides}
          style={{marginTop: 10}}
        >
          {isGeneratingSlides ? 'Đang tạo slides...' : 'Tạo Slides'}
        </button>
        
        {metadata && (
          <div style={{marginTop: 15, padding: 10, background: '#f0f0f0', borderRadius: 5}}>
            <strong>✓ Đã tạo thành công:</strong>
            <div>Tiêu đề: {metadata.title}</div>
            <div>Tổng số slides: {metadata.total_slides}</div>
            <div>Slides nội dung: {metadata.slide_data?.slides?.length || 0}</div>
            {/* Debug info */}
            <div style={{fontSize: '0.8em', color: '#666', marginTop: 5}}>
              Debug: slide_data exists? {metadata.slide_data ? 'Yes' : 'No'}
              {metadata.slide_data && `, slides array exists? ${metadata.slide_data.slides ? 'Yes' : 'No'}`}
            </div>
          </div>
        )}
      </section>

      {/* Step 2: Tạo deepfake global */}
      {metadata && (
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
          {deepfakeVideoUrl && (
            <div style={{marginTop: 10}}>
              <strong>✓ Deepfake global sẵn sàng</strong>
              <video src={deepfakeVideoUrl} controls style={{width:'100%', maxWidth: 400}} />
            </div>
          )}
        </section>
      )}

      {/* Step 3: Xử lý tự động - Sửa điều kiện */}
      {metadata && deepfakeVideoUrl && (
        <section className="step-content">
          <h3>Bước 3: Tạo video thuyết trình tự động</h3>
          
          <div>
            <label>Chọn giọng thuyết trình: 
              <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
                {voiceOptions.map(v => <option key={v.id} value={v.url}>{v.name}</option>)}
              </select>
            </label>
          </div>

          {metadata.slide_data?.slides && metadata.slide_data.slides.length > 0 ? (
            <>
              <div className="slides-preview" style={{marginTop: 15}}>
                <strong>Nội dung các slide:</strong>
                {metadata.slide_data.slides.map((slideData, idx) => (
                  <div key={idx} style={{border:'1px solid #ddd', padding:10, margin:'8px 0', borderRadius: 5}}>
                    <div><strong>Slide {slideData.slide_number}: {slideData.title}</strong></div>
                    <div style={{fontSize: '0.9em', color: '#666', marginTop: 5}}>
                      {slideData.original_content}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{marginTop: 15}}>
                <button onClick={processSlidesAndCompose} disabled={isProcessing}>
                  {isProcessing ? 'Đang xử lý...' : 'Bắt đầu tạo video thuyết trình'}
                </button>
                <button onClick={handleReset} style={{marginLeft:8}}>Reset</button>
              </div>
            </>
          ) : (
            <div style={{marginTop: 15, padding: 10, background: '#fff3cd', borderRadius: 5}}>
              <strong>⚠️ Không tìm thấy nội dung slides</strong>
              <div style={{fontSize: '0.9em', marginTop: 5}}>
                Vui lòng kiểm tra lại file metadata hoặc thử tạo slides lại.
              </div>
              <div style={{fontSize: '0.8em', color: '#666', marginTop: 5}}>
                Debug: slides array = {JSON.stringify(metadata.slide_data?.slides)}
              </div>
            </div>
          )}

          {processingMessage && <div style={{marginTop:10, color: '#0066cc'}}>{processingMessage}</div>}
        </section>
      )}

      {/* Final result */}
      {finalVideoUrl && (
        <section className="step-content result-container">
          <h3>✓ Video cuối cùng</h3>
          <video src={finalVideoUrl} controls style={{width:'100%'}} />
          <div style={{marginTop:8}}>
            <button onClick={handleDownload} className="download-button">
              Tải video xuống
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default SlideToVideo;