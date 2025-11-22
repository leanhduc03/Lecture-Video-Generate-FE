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

  // User uploaded PPTX
  const [userUploadedPptx, setUserUploadedPptx] = useState<File | null>(null);
  const [isUploadingPptx, setIsUploadingPptx] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editedSlideData, setEditedSlideData] = useState<SlideData[]>([]);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

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

  const uploadAndProcessPPTX = async (pptxPath: string, jsonFilename: string) => {
    try {
      const pptxFilename = path.basename(pptxPath);
      const pptxResponse = await fetch(`${API_BASE_URL}/slides/download/${pptxFilename}`);
      
      if (!pptxResponse.ok) {
        throw new Error(`Không thể tải file PPTX: ${pptxResponse.status}`);
      }

      const pptxBlob = await pptxResponse.blob();
      const pptxFile = new File([pptxBlob], pptxFilename, { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const formData = new FormData();
      formData.append('file', pptxFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/media/upload-pptx`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Không thể tách slides thành images');
      }

      const uploadResult = await uploadResponse.json();
      
      if (uploadResult.success && uploadResult.slides) {
        if (jsonFilename) {
          await fetchSlideMetadata(jsonFilename, uploadResult.slides);
        } else {
          throw new Error('Không tìm thấy JSON metadata');
        }
      } else {
        throw new Error('Không tách được slides thành images');
      }
    } catch (err: any) {
      console.error('Upload and process PPTX error', err);
      setError(err?.message || 'Lỗi khi xử lý PPTX');
    } finally {
      setIsGeneratingSlides(false);
    }
  };

  const fetchSlideMetadata = async (jsonFilename: string, slideImages: any[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/slides/metadata/${jsonFilename}`);
      
      if (!response.ok) {
        throw new Error('Không thể lấy metadata');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
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
        const updatedSlides = result.slides.map((img: any, idx: number) => ({
          slide_number: idx,
          type: idx === 0 ? 'title' : 'content',
          title: `Slide ${idx + 1}`,
          filepath: img.image_url,
          filename: `slide_${idx}.png`
        }));

        setSlides(updatedSlides);
        setMetadata(prev => prev ? { ...prev, slides: updatedSlides } : null);
        
        enterEditMode(result.slides.length);
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

  // Enter edit mode - CHỈ HIỂN THỊ ORIGINAL_CONTENT
  const enterEditMode = (newSlideCount?: number) => {
    if (!metadata) return;
    
    const originalSlides = metadata.slide_data.slides;
    const currentSlideCount = newSlideCount || slides.length;
    
    const editData: SlideData[] = [];
    
    for (let i = 0; i < currentSlideCount; i++) {
      const originalSlide = originalSlides.find(s => s.slide_number === i);
      
      if (originalSlide) {
        editData.push({
          slide_number: i,
          title: originalSlide.title,
          content: originalSlide.content,
          original_content: originalSlide.original_content
        });
      } else {
        editData.push({
          slide_number: i,
          title: `Slide ${i + 1}`,
          content: [],
          original_content: ''
        });
      }
    }
    
    setEditedSlideData(editData);
    setEditMode(true);
  };

  // Update only original_content
  const updateOriginalContent = (slideIndex: number, value: string) => {
    setEditedSlideData(prev => {
      const updated = [...prev];
      if (updated[slideIndex]) {
        updated[slideIndex] = { ...updated[slideIndex], original_content: value };
      }
      return updated;
    });
  };

  const saveMetadata = async () => {
    if (!metadata || !editedSlideData.length) {
      setError('Không có dữ liệu để lưu');
      return;
    }

    setIsSavingMetadata(true);
    setError(null);

    try {
      const updatedMetadata = {
        ...metadata.slide_data,
        slides: editedSlideData
      };

      const response = await fetch(`${API_BASE_URL}/slides/save-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedMetadata)
      });

      if (!response.ok) {
        throw new Error('Không thể lưu metadata');
      }

      const result = await response.json();
      
      if (result.success) {
        setMetadata(prev => prev ? { ...prev, slide_data: updatedMetadata } : null);
        setEditMode(false);
        setError(null);
      } else {
        throw new Error(result.message || 'Lỗi khi lưu metadata');
      }
    } catch (err: any) {
      console.error('Save metadata error', err);
      setError(err?.message || 'Lỗi khi lưu metadata');
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedVideoFile(e.target.files[0]);
      setSelectedVideoUrl('');
    }
  };

  const handleVideoPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVideoUrl(e.target.value);
    setSelectedVideoFile(null);
  };

  const handleVoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedVoiceFile(e.target.files[0]);
      setSelectedVoiceUrl('');
    }
  };

  const handleVoicePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoiceUrl(e.target.value);
    setSelectedVoiceFile(null);
  };

  const uploadSelectedFiles = async () => {
    let videoUrl = selectedVideoUrl;
    let voiceUrl = selectedVoiceUrl;

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

      const contentSlides = slides.filter(s => s.type !== 'title');
      
      for (let i = 0; i < contentSlides.length; i++) {
        const slide = contentSlides[i];
        const slideData = slideDataList.find(sd => sd.slide_number === slide.slide_number);
        
        setProcessingMessage(`Xử lý slide ${i+1}/${contentSlides.length}: ${slideData?.title || 'Untitled'}...`);
        
        const narrationText = slideData?.original_content || '';
        
        if (!narrationText) {
          console.warn(`Slide ${slide.slide_number} không có content, bỏ qua`);
          continue;
        }

        // TTS
        const ttsResp = await generateSpeech(narrationText, voiceUrl);
        if (!ttsResp || !ttsResp.audio_file_url) {
          throw new Error(`Không tạo được audio cho slide ${slide.slide_number}`);
        }
        const audioUrl = ttsResp.audio_file_url;

        // Fakelip
        const fakelipResp = await processFakelip(audioUrl, videoUrl);
        if (!fakelipResp || !fakelipResp.result_url) {
          throw new Error(`Fakelip thất bại cho slide ${slide.slide_number}`);
        }
        const lipVideoUrl = fakelipResp.result_url;

        // Combine
        const slideImageUrl = slide.filepath.replace(/\\/g, '/');
        const combineResp = await combineSlideImageAndVideo(slideImageUrl, lipVideoUrl);
        if (!combineResp || !combineResp.result_url) {
          throw new Error(`Không ghép được slide ${slide.slide_number} và video`);
        }
        composedSlideUrls.push(combineResp.result_url);
      }

      // Concat
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
    setUserUploadedPptx(null);
    setEditMode(false);
    setEditedSlideData([]);
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

  useEffect(() => {
    setSelectedVideoUrl(videoOptions[0].url);
    setSelectedVoiceUrl(voiceOptions[0].url);
  }, []);

  // EDIT MODE - CHỈ HIỂN THỊ SLIDE IMAGE VÀ ORIGINAL_CONTENT
  if (editMode && editedSlideData.length > 0) {
    return (
      <div className="combined-ai-feature">
        <h2>Chỉnh sửa nội dung thuyết trình</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="edit-slides-container">
          {editedSlideData.map((slideData, index) => (
            <div key={index} className="slide-edit-section" style={{
              marginBottom: 30, 
              padding: 20, 
              border: '2px solid #e0e0e0', 
              borderRadius: 8,
              background: '#f9f9f9'
            }}>
              <div style={{display: 'flex', gap: 20, alignItems: 'flex-start'}}>
                {/* Slide Image */}
                {slides[index] && (
                  <div style={{flex: '0 0 300px'}}>
                    <img 
                      src={slides[index].filepath} 
                      alt={`Slide ${index + 1}`} 
                      style={{
                        width: '100%', 
                        border: '2px solid #ccc', 
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <div style={{
                      marginTop: 10, 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      Slide {index + 1}: {slideData.title}
                    </div>
                  </div>
                )}
                
                {/* Original Content Editor */}
                <div style={{flex: 1}}>
                  <label style={{
                    display: 'block', 
                    marginBottom: 8, 
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: '#333'
                  }}>
                    Nội dung thuyết trình cho slide này:
                  </label>
                  <textarea
                    value={slideData.original_content}
                    onChange={(e) => {
                      const text = e.target.value;
                      if (text.length <= 250) {
                        updateOriginalContent(index, text);
                      }
                    }}
                    placeholder="Nhập nội dung thuyết trình (tối đa 250 ký tự)..."
                    rows={6}
                    style={{
                      width: '100%', 
                      padding: '12px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{
                    marginTop: 8,
                    fontSize: '13px', 
                    color: slideData.original_content.length > 240 ? '#ff6b6b' : '#666',
                    fontWeight: slideData.original_content.length > 240 ? 'bold' : 'normal'
                  }}>
                    {slideData.original_content.length}/250 ký tự
                    {slideData.original_content.length > 240 && ' - Gần đạt giới hạn!'}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div style={{marginTop: 30, textAlign: 'center', padding: '20px 0', borderTop: '2px solid #ddd'}}>
            <button 
              onClick={() => setEditMode(false)}
              style={{
                marginRight: 15, 
                padding: '12px 30px',
                fontSize: '16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button 
              onClick={saveMetadata}
              disabled={isSavingMetadata}
              style={{
                padding: '12px 30px',
                fontSize: '16px',
                background: isSavingMetadata ? '#ccc' : '#28a745', 
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isSavingMetadata ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isSavingMetadata ? 'Đang lưu...' : '💾 Lưu và tiếp tục'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="combined-ai-feature">
      <h2>Slide to Video - Tạo video bài giảng tự động</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Step 1 */}
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
          </div>
        )}
      </section>

      {/* Step 2 */}
      {metadata && !editMode && (
        <section className="step-content">
          <h3>Bước 2: Tải xuống và chỉnh sửa slides</h3>
          
          <div style={{marginBottom: 15}}>
            <button onClick={downloadPptxForEdit} style={{marginRight: 10}}>
              📥 Tải PPTX về để chỉnh sửa
            </button>
            <button onClick={() => enterEditMode()} style={{marginLeft: 10, background: '#17a2b8', color: 'white'}}>
              ✏️ Chỉnh sửa nội dung thuyết trình
            </button>
          </div>

          <div>
            <label>Hoặc upload PPTX đã chỉnh sửa: </label>
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
                {isUploadingPptx ? 'Đang upload...' : 'Upload PPTX'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Step 3 */}
      {metadata && !editMode && (
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