import React, { useState, useEffect } from 'react';
import '../../styles/combined-ai-feature.css';
import { 
  uploadPptx,
  uploadVoiceSample, 
  generateSpeech, 
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
  const [originalSlideCount, setOriginalSlideCount] = useState<number>(0);

  // User uploaded PPTX
  const [userUploadedPptx, setUserUploadedPptx] = useState<File | null>(null);
  const [isUploadingPptx, setIsUploadingPptx] = useState(false);

  // Preview mode
  const [previewMode, setPreviewMode] = useState(false);
  const [currentPreviewSlide, setCurrentPreviewSlide] = useState(0);

  // Video and voice selection
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>('');
  const [selectedVoiceFile, setSelectedVoiceFile] = useState<File | null>(null);
  const [selectedVoiceUrl, setSelectedVoiceUrl] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const voiceOptions = [
    { id: 'voice1', name: 'Giọng Nam', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1758950538/my_uploaded_audio.wav' },
    { id: 'voice2', name: 'Giọng Nữ', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/female_voice.wav' },
    { id: 'voice3', name: 'Giọng Trẻ Em', url: 'https://res.cloudinary.com/dyaybnveq/video/upload/v1694318532/samples/child_voice.wav' }
  ];

  const videoOptions = [
    { id: 'video1', name: 'Video Giảng Viên 1', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1731596901/samples/teacher1.mp4' },
    { id: 'video2', name: 'Video Giảng Viên 2', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1731596901/samples/teacher2.mp4' },
    { id: 'video3', name: 'Video Giảng Viên 3', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1731596901/samples/teacher3.mp4' }
  ];

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
        setOriginalSlideCount(result.data.num_slides);
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
      setError(err?.message || 'Lỗi khi xử lý PPTX');
    } finally {
      setIsGeneratingSlides(false);
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

  // Download PPTX để user có thể sửa
  const downloadPptxForEdit = async () => {
    if (!metadata) return;
    
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/slides/list`);
      const result = await response.json();
      
      if (result.success && result.data.presentations.length > 0) {
        const latestPptx = result.data.presentations[0];
        const downloadUrl = `${API_BASE_URL}/slides/download/${latestPptx.filename}`;
        
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = latestPptx.filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        setError('Không tìm thấy file PPTX để tải xuống');
      }
    } catch (err) {
      console.error('Download error:', err);
      setError('Không thể tải xuống file PPTX');
    }
  };

  // Handle user upload edited PPTX
  const handleUserUploadPptx = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUserUploadedPptx(e.target.files[0]);
    }
  };

  const uploadEditedPptx = async () => {
    if (!userUploadedPptx) {
      setError('Vui lòng chọn file PPTX đã chỉnh sửa');
      return;
    }

    setIsUploadingPptx(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', userUploadedPptx);

      const response = await fetch(`${API_BASE_URL}/media/upload-pptx`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Không thể upload PPTX đã chỉnh sửa');
      }

      const result = await response.json();
      
      if (result.success && result.slides) {
        // Kiểm tra số lượng slide
        if (result.slides.length !== originalSlideCount) {
          setError(`Số slide không khớp! Mong đợi ${originalSlideCount} slides, nhưng nhận được ${result.slides.length} slides.`);
          return;
        }

        // Cập nhật slides với images mới
        const updatedSlides = result.slides.map((img: any, idx: number) => ({
          slide_number: idx,
          type: idx === 0 ? 'title' : 'content',
          title: `Slide ${idx + 1}`,
          filepath: img.image_url,
          filename: `slide_${idx}.png`
        }));

        setSlides(updatedSlides);
        setMetadata(prev => prev ? { ...prev, slides: updatedSlides } : null);
        setError(null);
      } else {
        throw new Error('Không thể tách slides thành images');
      }
    } catch (err: any) {
      console.error('Upload edited PPTX error', err);
      setError(err?.message || 'Lỗi khi upload PPTX đã chỉnh sửa');
    } finally {
      setIsUploadingPptx(false);
    }
  };

  // Preview slides
  const enterPreviewMode = () => {
    setPreviewMode(true);
    setCurrentPreviewSlide(0);
  };

  const exitPreviewMode = () => {
    setPreviewMode(false);
  };

  const nextSlide = () => {
    if (currentPreviewSlide < slides.length - 1) {
      setCurrentPreviewSlide(currentPreviewSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentPreviewSlide > 0) {
      setCurrentPreviewSlide(currentPreviewSlide - 1);
    }
  };

  // Video selection
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedVideoFile(e.target.files[0]);
      setSelectedVideoUrl(''); // Clear preset selection
    }
  };

  const handleVideoPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVideoUrl(e.target.value);
    setSelectedVideoFile(null); // Clear file selection
  };

  // Voice selection
  const handleVoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedVoiceFile(e.target.files[0]);
      setSelectedVoiceUrl(''); // Clear preset selection
    }
  };

  const handleVoicePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoiceUrl(e.target.value);
    setSelectedVoiceFile(null); // Clear file selection
  };

  // Upload files and get URLs
  const uploadSelectedFiles = async () => {
    let videoUrl = selectedVideoUrl;
    let voiceUrl = selectedVoiceUrl;

    // Upload video if file selected
    if (selectedVideoFile) {
      const formData = new FormData();
      formData.append('file', selectedVideoFile);
      
      const response = await fetch(`${API_BASE_URL}/upload/upload-video`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (result.success) {
        videoUrl = result.video_url;
      } else {
        throw new Error('Không thể upload video');
      }
    }

    // Upload voice if file selected
    if (selectedVoiceFile) {
      const formData = new FormData();
      formData.append('file', selectedVoiceFile);
      
      const response = await fetch(`${API_BASE_URL}/upload/upload-audio`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (result.success) {
        voiceUrl = result.audio_url;
      } else {
        throw new Error('Không thể upload audio');
      }
    }

    return { videoUrl, voiceUrl };
  };

  // Process all slides and create final video
  const processAllSlidesAndCreateVideo = async () => {
    if (!metadata || slides.length === 0) {
      setError('Chưa có slide để xử lý');
      return;
    }

    if (!selectedVideoUrl && !selectedVideoFile) {
      setError('Vui lòng chọn video mẫu hoặc upload video');
      return;
    }

    if (!selectedVoiceUrl && !selectedVoiceFile) {
      setError('Vui lòng chọn giọng mẫu hoặc upload giọng');
      return;
    }
    
    setError(null);
    setIsProcessing(true);

    const composedSlideUrls: string[] = [];
    const slideDataList = metadata.slide_data.slides;

    try {
      setProcessingMessage('Đang upload files...');
      const { videoUrl, voiceUrl } = await uploadSelectedFiles();

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
        const ttsResp = await generateSpeech(narrationText, voiceUrl);
        if (!ttsResp || !ttsResp.audio_file_url) {
          throw new Error(`Không tạo được audio cho slide ${slide.slide_number}`);
        }
        const audioUrl = ttsResp.audio_file_url;

        // 2) Fakelip
        const fakelipResp = await processFakelip(audioUrl, videoUrl);
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
      console.error('processAllSlidesAndCreateVideo error', err);
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
    setOriginalSlideCount(0);
    setUserUploadedPptx(null);
    setPreviewMode(false);
    setCurrentPreviewSlide(0);
    setSelectedVideoFile(null);
    setSelectedVideoUrl(videoOptions[0].url);
    setSelectedVoiceFile(null);
    setSelectedVoiceUrl(voiceOptions[0].url);
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

  // Initialize default selections
  useEffect(() => {
    setSelectedVideoUrl(videoOptions[0].url);
    setSelectedVoiceUrl(voiceOptions[0].url);
  }, []);

  // Preview mode render
  if (previewMode && metadata && slides.length > 0) {
    const currentSlide = slides[currentPreviewSlide];
    const currentSlideData = metadata.slide_data.slides.find(sd => sd.slide_number === currentSlide?.slide_number);
    
    return (
      <div className="combined-ai-feature">
        <h2>Preview Slides</h2>
        
        <div className="preview-container" style={{textAlign: 'center'}}>
          <div className="slide-navigation" style={{marginBottom: 20}}>
            <button onClick={prevSlide} disabled={currentPreviewSlide === 0}>
              ← Previous
            </button>
            <span style={{margin: '0 20px'}}>
              Slide {currentPreviewSlide + 1} / {slides.length}
            </span>
            <button onClick={nextSlide} disabled={currentPreviewSlide === slides.length - 1}>
              Next →
            </button>
          </div>

          <div className="slide-preview" style={{border: '2px solid #ddd', padding: 20, marginBottom: 20}}>
            <img 
              src={currentSlide?.filepath} 
              alt={`Slide ${currentPreviewSlide + 1}`} 
              style={{maxWidth: '100%', maxHeight: '60vh'}}
            />
          </div>

          {currentSlideData && (
            <div className="slide-content" style={{textAlign: 'left', background: '#f9f9f9', padding: 15, borderRadius: 5}}>
              <h4>{currentSlideData.title}</h4>
              <p><strong>Nội dung thuyết trình:</strong></p>
              <p>{currentSlideData.original_content}</p>
            </div>
          )}

          <div style={{marginTop: 20}}>
            <button onClick={exitPreviewMode} style={{marginRight: 10}}>
              Quay lại chỉnh sửa
            </button>
            <button 
              onClick={() => {
                setPreviewMode(false);
                // Proceed to video selection step
              }}
              style={{background: '#28a745', color: 'white'}}
            >
              OK - Tiếp tục tạo video
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="combined-ai-feature">
      <h2>Slide to Video - Workflow mới</h2>

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
          </div>
        )}
      </section>

      {/* Step 2: Download and upload edited slides */}
      {metadata && (
        <section className="step-content">
          <h3>Bước 2: Tải xuống và chỉnh sửa slides (tùy chọn)</h3>
          <p>Bạn có thể tải file PowerPoint về để chỉnh sửa, sau đó upload lại:</p>
          
          <div style={{marginBottom: 15}}>
            <button onClick={downloadPptxForEdit} style={{marginRight: 10}}>
              📥 Tải PPTX về để chỉnh sửa
            </button>
            <span style={{fontSize: '0.9em', color: '#666'}}>
              (Không bắt buộc - có thể bỏ qua bước này)
            </span>
          </div>

          <div>
            <label>Upload PPTX đã chỉnh sửa (nếu có): </label>
            <input 
              type="file" 
              accept=".pptx" 
              onChange={handleUserUploadPptx}
              style={{marginLeft: 10}}
            />
            {userUploadedPptx && (
              <button 
                onClick={uploadEditedPptx} 
                disabled={isUploadingPptx}
                style={{marginLeft: 10}}
              >
                {isUploadingPptx ? 'Đang upload...' : 'Upload PPTX đã chỉnh sửa'}
              </button>
            )}
          </div>

          <div style={{marginTop: 15}}>
            <button onClick={enterPreviewMode} style={{background: '#007bff', color: 'white'}}>
              👁️ Preview Slides
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Video and Voice Selection (shown after preview or skip) */}
      {metadata && !previewMode && (
        <section className="step-content">
          <h3>Bước 3: Chọn video và giọng thuyết trình</h3>
          
          <div style={{marginBottom: 20}}>
            <h4>Chọn Video Giảng Viên:</h4>
            <div>
              <label>
                <input 
                  type="radio" 
                  name="videoChoice" 
                  checked={!selectedVideoFile}
                  onChange={() => setSelectedVideoFile(null)}
                />
                Sử dụng video mẫu:
                <select 
                  value={selectedVideoUrl} 
                  onChange={handleVideoPresetChange}
                  disabled={!!selectedVideoFile}
                  style={{marginLeft: 10}}
                >
                  {videoOptions.map(option => (
                    <option key={option.id} value={option.url}>{option.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{marginTop: 10}}>
              <label>
                <input 
                  type="radio" 
                  name="videoChoice" 
                  checked={!!selectedVideoFile}
                  onChange={() => {}}
                />
                Upload video tùy chỉnh:
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleVideoFileChange}
                  style={{marginLeft: 10}}
                />
              </label>
            </div>
            {(selectedVideoUrl || selectedVideoFile) && (
              <video 
                src={selectedVideoUrl || (selectedVideoFile ? URL.createObjectURL(selectedVideoFile) : '')} 
                controls 
                style={{width: '100%', maxWidth: 400, marginTop: 10}}
              />
            )}
          </div>

          <div style={{marginBottom: 20}}>
            <h4>Chọn Giọng Thuyết Trình:</h4>
            <div>
              <label>
                <input 
                  type="radio" 
                  name="voiceChoice" 
                  checked={!selectedVoiceFile}
                  onChange={() => setSelectedVoiceFile(null)}
                />
                Sử dụng giọng mẫu:
                <select 
                  value={selectedVoiceUrl} 
                  onChange={handleVoicePresetChange}
                  disabled={!!selectedVoiceFile}
                  style={{marginLeft: 10}}
                >
                  {voiceOptions.map(option => (
                    <option key={option.id} value={option.url}>{option.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{marginTop: 10}}>
              <label>
                <input 
                  type="radio" 
                  name="voiceChoice" 
                  checked={!!selectedVoiceFile}
                  onChange={() => {}}
                />
                Upload giọng tùy chỉnh:
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleVoiceFileChange}
                  style={{marginLeft: 10}}
                />
              </label>
            </div>
            {(selectedVoiceUrl || selectedVoiceFile) && (
              <audio 
                src={selectedVoiceUrl || (selectedVoiceFile ? URL.createObjectURL(selectedVoiceFile) : '')} 
                controls 
                style={{width: '100%', maxWidth: 400, marginTop: 10}}
              />
            )}
          </div>

          <div style={{marginTop: 20}}>
            <button 
              onClick={processAllSlidesAndCreateVideo} 
              disabled={isProcessing || (!selectedVideoUrl && !selectedVideoFile) || (!selectedVoiceUrl && !selectedVoiceFile)}
              style={{background: '#28a745', color: 'white', padding: '10px 20px'}}
            >
              {isProcessing ? 'Đang xử lý...' : '🎬 Tạo Video Thuyết Trình'}
            </button>
            <button onClick={handleReset} style={{marginLeft: 10}}>Reset</button>
          </div>

          {processingMessage && <div style={{marginTop: 10, color: '#0066cc'}}>{processingMessage}</div>}
        </section>
      )}

      {/* Final result */}
      {finalVideoUrl && (
        <section className="step-content result-container">
          <h3>✓ Video thuyết trình hoàn chỉnh</h3>
          <video src={finalVideoUrl} controls style={{width:'100%'}} />
          <div style={{marginTop: 8}}>
            <button onClick={handleDownload} className="download-button">
              📥 Tải video xuống
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default SlideToVideo;