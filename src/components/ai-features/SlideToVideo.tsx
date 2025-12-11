import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/combined-ai-feature.css';
import { 
  generateSpeech, 
  processFakelip,
  combineSlideImageAndVideo,
  concatVideos,
  uploadVideoToCloudinary
} from '../../services/aiService';
import { saveVideo } from '../../services/videoService';
import {
  generateSlidesFromContent,
  downloadPptxFile,
  uploadPptxAndExtractSlides,
  fetchSlideMetadata,
  getPresentationsList,
  saveSlideMetadata,
  uploadAudioFile,
  uploadVideoFile,
  getBasename,
  combineMetadataWithImages,
  SlideMetadata,
  SlideData,
  PresentationMetadata
} from '../../services/slideService';
import { API_CONFIG, buildApiUrl } from '../../config/api';


const SlideToVideo = () => {
  const { user } = useAuth();
  
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

  // Video selection
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>('');

  // Voice mode selection
  const [voiceMode, setVoiceMode] = useState<'preset' | 'clone'>('preset');
  
  // Mode 1: Voice Cloning
  const [referenceAudioFile, setReferenceAudioFile] = useState<File | null>(null);
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string>('');
  const [referenceText, setReferenceText] = useState<string>('');

  // Mode 2: Preset Voice
  const [gender, setGender] = useState<string>('male');
  const [area, setArea] = useState<string>('northern');
  const [group, setGroup] = useState<string>('news');
  const [emotion, setEmotion] = useState<string>('neutral');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoOptions = [
    { id: 'video1', name: 'Video Giảng Viên 1', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1764513335/wplccpvu4xgorhjhdkng.mp4' },
    { id: 'video2', name: 'Video Giảng Viên 2', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1731596901/samples/teacher2.mp4' },
    { id: 'video3', name: 'Video Giảng Viên 3', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1731596901/samples/teacher3.mp4' }
  ];

  // Preset voice options
  const genderOptions = [
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' }
  ];

  const areaOptions = [
    { value: 'northern', label: 'Miền Bắc' },
    { value: 'central', label: 'Miền Trung' },
    { value: 'southern', label: 'Miền Nam' }
  ];

  const groupOptions = [
    { value: 'news', label: 'Tin tức' },
    { value: 'story', label: 'Kể chuyện' },
    { value: 'audiobook', label: 'Thuyết minh, đọc sách' },
    { value: 'interview', label: 'Phỏng vấn' },
    { value: 'review', label: 'Bình luận, đánh giá' }
  ];

  const emotionOptions = [
    { value: 'neutral', label: 'Trung tính' },
    { value: 'serious', label: 'Nghiêm túc' },
    { value: 'monotone', label: 'Đơn điệu' },
    { value: 'surprised', label: 'Ngạc nhiên' },
    { value: 'happy', label: 'Vui vẻ' },
    { value: 'sad', label: 'Buồn' },
    { value: 'angry', label: 'Tức giận' }
  ];

  // --- Step 1: Generate slides từ content ---
  const handleGenerateSlides = async () => {
    if (!inputContent.trim()) {
      setError('Vui lòng nhập nội dung để tạo slide');
      return;
    }
    
    setIsGeneratingSlides(true);
    setError(null);
    
    try {
      const result = await generateSlidesFromContent(inputContent, numSlides);
      
      if (result.success && result.data?.pptx_file) {
        const pptxPath = result.data.pptx_file.filepath;
        await handleUploadAndProcessPPTX(pptxPath, result.data.json_file?.filename);
      } else {
        throw new Error(result.message || 'Lỗi khi tạo slides');
      }
    } catch (err: any) {
      console.error('Generate slides error', err);
      setError(err?.message || 'Lỗi khi tạo slides');
      setIsGeneratingSlides(false);
    }
  };

  const handleUploadAndProcessPPTX = async (pptxPath: string, jsonFilename: string) => {
    try {
      const pptxFilename = getBasename(pptxPath);
      const pptxBlob = await downloadPptxFile(pptxFilename);
      
      const pptxFile = new File([pptxBlob], pptxFilename, { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const uploadResult = await uploadPptxAndExtractSlides(pptxFile);
      
      if (uploadResult.success && uploadResult.slides) {
        if (jsonFilename) {
          await handleFetchMetadata(jsonFilename, uploadResult.slides);
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

  const handleFetchMetadata = async (jsonFilename: string, slideImages: any[]) => {
    try {
      const result = await fetchSlideMetadata(jsonFilename);
      
      if (result.success && result.data) {
        const combinedMetadata = combineMetadataWithImages(result.data, slideImages);
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
      const result = await getPresentationsList();
      
      if (result.success && result.data && result.data.presentations.length > 0) {
        const latestPptx = result.data.presentations[0];
        const downloadUrl = buildApiUrl(`/slides/download/${latestPptx.filename}`);
        
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
      const result = await uploadPptxAndExtractSlides(userUploadedPptx);
      
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

  const updateOriginalContent = (slideIndex: number, value: string) => {
    setEditedSlideData(prev => {
      const updated = [...prev];
      if (updated[slideIndex]) {
        updated[slideIndex] = { ...updated[slideIndex], original_content: value };
      }
      return updated;
    });
  };

  const handleSaveMetadata = async () => {
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

      const result = await saveSlideMetadata(updatedMetadata);
      
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

  const handleReferenceAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceAudioFile(e.target.files[0]);
      setReferenceAudioUrl('');
    }
  };

  const uploadReferenceAudio = async (): Promise<string> => {
    if (referenceAudioFile) {
      const result = await uploadAudioFile(referenceAudioFile);
      if (result.success && result.audio_url) {
        return result.audio_url;
      } else {
        throw new Error('Không thể upload reference audio');
      }
    }
    return referenceAudioUrl;
  };

  const uploadSelectedVideo = async () => {
    let videoUrl = selectedVideoUrl;

    if (selectedVideoFile) {
      const result = await uploadVideoFile(selectedVideoFile);
      if (result.success && result.video_url) {
        videoUrl = result.video_url;
      } else {
        throw new Error('Không thể upload video');
      }
    }

    return videoUrl;
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

    if (voiceMode === 'clone' && !referenceAudioUrl && !referenceAudioFile) {
      setError('Vui lòng upload file audio mẫu cho chế độ voice cloning');
      return;
    }

    if (voiceMode === 'clone' && !referenceText.trim()) {
      setError('Vui lòng nhập reference text cho chế độ voice cloning');
      return;
    }
    
    setError(null);
    setIsProcessing(true);

    const composedSlideUrls: string[] = [];
    const slideDataList = metadata.slide_data.slides;

    try {
      setProcessingMessage('Đang upload files...');
      const videoUrl = await uploadSelectedVideo();

      // Upload reference audio if in clone mode
      let refAudioUrl = '';
      if (voiceMode === 'clone') {
        refAudioUrl = await uploadReferenceAudio();
      }

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

        // TTS with new VietVoice API
        let ttsPayload: any = { text: narrationText };

        if (voiceMode === 'clone') {
          ttsPayload.reference_audio_url = refAudioUrl;
          ttsPayload.reference_text = referenceText;
        } else {
          ttsPayload.gender = gender;
          ttsPayload.area = area;
          ttsPayload.group = group;
          ttsPayload.emotion = emotion;
        }

        const ttsResp = await generateSpeech(narrationText, ttsPayload);
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
        setProcessingMessage('Đang upload video lên Cloudinary...');
        const cloudinaryUrl = await uploadVideoToCloudinary(finalResp.result_url);
        setFinalVideoUrl(cloudinaryUrl);
        try {
          if (!user?.username) {
            throw new Error('Không xác định được user');
          }
          await saveVideo(cloudinaryUrl, user.username);
          setProcessingMessage('Hoàn tất. Video đã được lưu vào hệ thống.');
        } catch (saveError) {
          console.error('Lỗi khi lưu video:', saveError);
          setProcessingMessage('Video đã tạo xong nhưng không lưu được vào hệ thống.');
        }
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
    setVoiceMode('preset');
    setReferenceAudioFile(null);
    setReferenceAudioUrl('');
    setReferenceText('');
    setGender('male');
    setArea('northern');
    setGroup('news');
    setEmotion('neutral');
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
  }, []);

  // EDIT MODE
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
                  <div style={{flex: '0 0 400px'}}>
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
                      color: '#333',
                      fontSize: '14px'
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
                    rows={8}
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
              onClick={handleSaveMetadata}
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
          onClick={handleGenerateSlides} 
          disabled={!inputContent.trim() || isGeneratingSlides}
          style={{
            marginTop: 10,
            padding: '10px 20px',
            background: (!inputContent.trim() || isGeneratingSlides) ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: (!inputContent.trim() || isGeneratingSlides) ? 'not-allowed' : 'pointer'
          }}
        >
          {isGeneratingSlides ? '⏳ Đang tạo slides...' : '📝 Tạo Slides'}
        </button>
        
        {metadata && (
          <div style={{
            marginTop: 15, 
            padding: 15, 
            background: '#e8f5e9', 
            borderRadius: 5,
            border: '1px solid #a5d6a7'
          }}>
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
            <button 
              onClick={downloadPptxForEdit} 
              style={{
                marginRight: 10,
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              📥 Tải PPTX về để chỉnh sửa
            </button>
            <button 
              onClick={() => enterEditMode()} 
              style={{
                marginLeft: 10, 
                padding: '10px 20px',
                background: '#17a2b8', 
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              ✏️ Chỉnh sửa nội dung thuyết trình
            </button>
          </div>

          <div>
            <label style={{fontWeight: 'bold'}}>Hoặc upload PPTX đã chỉnh sửa: </label>
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
                style={{
                  marginLeft: 10,
                  padding: '8px 16px',
                  background: isUploadingPptx ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isUploadingPptx ? 'not-allowed' : 'pointer'
                }}
              >
                {isUploadingPptx ? '⏳ Đang upload...' : '📤 Upload PPTX'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Step 3 */}
      {metadata && !editMode && (
        <section className="step-content">
          <h3>Bước 3: Chọn video và giọng thuyết trình</h3>
          
          {/* Video Selection */}
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
                  style={{marginLeft: 10, padding: 5}}
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
                style={{width: '100%', maxWidth: 400, marginTop: 10, borderRadius: 4}}
              />
            )}
          </div>

          {/* Voice Mode Selection */}
          <div style={{marginBottom: 20, padding: 20, border: '2px solid #e0e0e0', borderRadius: 8}}>
            <h4>Chọn Phương Thức Tạo Giọng:</h4>
            <div style={{marginBottom: 15}}>
              <label style={{marginRight: 20}}>
                <input 
                  type="radio" 
                  name="voiceMode" 
                  value="preset"
                  checked={voiceMode === 'preset'}
                  onChange={(e) => setVoiceMode(e.target.value as 'preset' | 'clone')}
                />
                Sử dụng giọng có sẵn
              </label>
              <label>
                <input 
                  type="radio" 
                  name="voiceMode" 
                  value="clone"
                  checked={voiceMode === 'clone'}
                  onChange={(e) => setVoiceMode(e.target.value as 'preset' | 'clone')}
                />
                Clone giọng từ mẫu
              </label>
            </div>

            {/* Mode 2: Preset Voice */}
            {voiceMode === 'preset' && (
              <div style={{padding: 15, background: '#f9f9f9', borderRadius: 5}}>
                <h5>Cấu hình giọng nói:</h5>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
                  <div>
                    <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>
                      Giới tính:
                    </label>
                    <select 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value)}
                      style={{width: '100%', padding: 8}}
                    >
                      {genderOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>
                      Vùng miền:
                    </label>
                    <select 
                      value={area} 
                      onChange={(e) => setArea(e.target.value)}
                      style={{width: '100%', padding: 8}}
                    >
                      {areaOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>
                      Nhóm giọng:
                    </label>
                    <select 
                      value={group} 
                      onChange={(e) => setGroup(e.target.value)}
                      style={{width: '100%', padding: 8}}
                    >
                      {groupOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>
                      Cảm xúc:
                    </label>
                    <select 
                      value={emotion} 
                      onChange={(e) => setEmotion(e.target.value)}
                      style={{width: '100%', padding: 8}}
                    >
                      {emotionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 1: Voice Cloning */}
            {voiceMode === 'clone' && (
              <div style={{padding: 15, background: '#fff3cd', borderRadius: 5}}>
                <h5>Clone giọng từ file mẫu:</h5>
                <div style={{marginBottom: 15}}>
                  <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>
                    Upload file audio mẫu:
                  </label>
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleReferenceAudioFileChange}
                  />
                  {referenceAudioFile && (
                    <div style={{
                      marginTop: 10,
                      padding: 10,
                      background: '#e8f5e9',
                      borderRadius: 4,
                      color: '#2e7d32'
                    }}>
                      ✓ Đã chọn: {referenceAudioFile.name}
                    </div>
                  )}
                  {(referenceAudioUrl || referenceAudioFile) && (
                    <audio 
                      src={referenceAudioUrl || (referenceAudioFile ? URL.createObjectURL(referenceAudioFile) : '')} 
                      controls 
                      style={{width: '100%', marginTop: 10}}
                    />
                  )}
                </div>
                
                <div>
                  <label style={{display: 'block', marginBottom: 5, fontWeight: 'bold'}}>
                    Reference Text (nội dung của audio mẫu):
                  </label>
                  <textarea
                    value={referenceText}
                    onChange={(e) => setReferenceText(e.target.value)}
                    placeholder="Nhập nội dung tương ứng với file audio mẫu..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{fontSize: '13px', color: '#666', marginTop: 5}}>
                    Reference text giúp mô hình hiểu rõ hơn về giọng nói trong file mẫu
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{marginTop: 20}}>
            <button 
              onClick={processAllSlidesAndCreateVideo} 
              disabled={isProcessing || (!selectedVideoUrl && !selectedVideoFile)}
              style={{
                background: (isProcessing || (!selectedVideoUrl && !selectedVideoFile)) ? '#ccc' : '#28a745',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: 4,
                cursor: (isProcessing || (!selectedVideoUrl && !selectedVideoFile)) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              {isProcessing ? '⏳ Đang xử lý...' : '🎬 Tạo Video Thuyết Trình'}
            </button>
            <button 
              onClick={handleReset} 
              style={{
                marginLeft: 10,
                padding: '12px 24px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              🔄 Reset
            </button>
          </div>

          {processingMessage && (
            <div style={{
              marginTop: 15,
              padding: 10,
              background: '#fff3cd',
              color: '#856404',
              borderRadius: 4,
              border: '1px solid #ffeaa7'
            }}>
              {processingMessage}
            </div>
          )}
        </section>
      )}

      {/* Final result */}
      {finalVideoUrl && (
        <section className="step-content result-container">
          <h3>✓ Video thuyết trình hoàn chỉnh</h3>
          <video src={finalVideoUrl} controls style={{width:'100%', maxWidth: 800, borderRadius: 8}} />
          <div style={{marginTop: 15}}>
            <button 
              onClick={handleDownload} 
              className="download-button"
              style={{
                padding: '12px 30px',
                fontSize: '16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📥 Tải video xuống
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default SlideToVideo;