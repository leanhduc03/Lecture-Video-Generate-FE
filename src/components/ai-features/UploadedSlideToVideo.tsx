import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/combined-ai-feature.css';
import {
  uploadVideoForDeepfake,
  uploadImageForDeepfake,
  generateSpeech, 
  processFakelip,
  combineSlideImageAndVideo,
  concatVideos,
  uploadVideoToCloudinary
} from '../../services/aiService';
import { saveVideo } from '../../services/videoService';
import {
  uploadPptxAndExtractSlidesImage,
  saveSlideMetadata,
  uploadAudioFile,
  uploadVideoFile,
  SlideMetadata,
  SlideData,
  PresentationMetadata
} from '../../services/slideService';

const UploadedSlideToVideo = () => {
  const { user } = useAuth();
  
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
    { id: 'video1', name: 'Video Giảng Viên 1', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1764513335/wplccpvu4xgorhjhdkng.mp4' },
    { id: 'video2', name: 'Video Giảng Viên 2', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1731596901/samples/teacher2.mp4' },
    { id: 'video3', name: 'Video Giảng Viên 3', url: 'https://res.cloudinary.com/diqes2eof/video/upload/v1731596901/samples/teacher3.mp4' }
  ];

  const handleUserUploadPptx = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUserUploadedPptx(e.target.files[0]);
    }
  };

const uploadPptx = async () => {
  if (!userUploadedPptx) {
    setError('Vui lòng chọn file PPTX');
    return;
  }

  setIsUploadingPptx(true);
  setError(null);

  try {
    const result = await uploadPptxAndExtractSlidesImage(userUploadedPptx);
    
    console.log('Upload result:', result);
    console.log('Slides data:', result.slides);
    
    if (result.success && result.slides) {
      const uploadedSlides: SlideMetadata[] = result.slides.map((img: any, idx: number) => ({
        slide_number: idx,
        type: idx === 0 ? 'title' : 'content',
        title: `Slide ${idx + 1}`,
        filepath: img.image_url,
        filename: `slide_${idx}.png`
      }));

      console.log('Updated slides with image URLs:', uploadedSlides);
      
      setSlides(uploadedSlides);
      
      const defaultMetadata: PresentationMetadata = {
        title: userUploadedPptx.name.replace('.pptx', ''),
        total_slides: uploadedSlides.length,
        created_at: new Date().toISOString(),
        slides: uploadedSlides,
        slide_data: {
          title: userUploadedPptx.name.replace('.pptx', ''),
          slides: uploadedSlides.map((slide: SlideMetadata, idx: number) => ({
            slide_number: idx,
            title: `Slide ${idx + 1}`,
            content: [],
            original_content: ''
          }))
        }
      };
      
      setMetadata(defaultMetadata);
      enterEditMode(uploadedSlides);
      setError(null);
    } else {
      throw new Error('Không thể tách slides thành images');
    }
  } catch (err: any) {
    console.error('Upload PPTX error', err);
    setError(err?.message || 'Lỗi khi upload PPTX');
  } finally {
    setIsUploadingPptx(false);
  }
};

  const enterEditMode = (uploadedSlides: SlideMetadata[]) => {
    const editData: SlideData[] = [];
    
    for (let i = 0; i < uploadedSlides.length; i++) {
      editData.push({
        slide_number: i,
        title: `Slide ${i + 1}`,
        content: [],
        original_content: ''
      });
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
      const result = await uploadVideoFile(selectedVideoFile);
      if (result.success && result.video_url) {
        videoUrl = result.video_url;
      } else {
        throw new Error('Không thể upload video');
      }
    }

    if (selectedVoiceFile) {
      const result = await uploadAudioFile(selectedVoiceFile);
      if (result.success && result.audio_url) {
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

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slideData = slideDataList.find(sd => sd.slide_number === slide.slide_number);
        
        setProcessingMessage(`Xử lý slide ${i+1}/${slides.length}: ${slideData?.title || 'Untitled'}...`);
        
        const narrationText = slideData?.original_content || '';
        
        if (!narrationText) {
          console.warn(`Slide ${slide.slide_number} không có script, bỏ qua`);
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

  // EDIT MODE
  if (editMode && editedSlideData.length > 0) {
    return (
      <div className="combined-ai-feature">
        <h2>Nhập nội dung thuyết trình cho từng slide</h2>
        
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
                {/* Slide Image Gốc */}
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
                      Slide {index + 1}
                    </div>
                  </div>
                )}
                
                {/* Script Editor */}
                <div style={{flex: 1}}>
                  <label style={{
                    display: 'block', 
                    marginBottom: 8, 
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: '#333'
                  }}>
                    Script thuyết trình cho slide này:
                  </label>
                  <textarea
                    value={slideData.original_content}
                    onChange={(e) => {
                      const text = e.target.value;
                      if (text.length <= 250) {
                        updateOriginalContent(index, text);
                      }
                    }}
                    placeholder="Nhập nội dung bạn muốn thuyết trình cho slide này (tối đa 250 ký tự)..."
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
      <h2>Upload Slide to Video - Tạo video bài giảng từ PowerPoint có sẵn</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Step 1: Upload PPTX */}
      {!metadata && (
        <section className="step-content">
          <h3>Bước 1: Upload file PowerPoint (.pptx)</h3>
          <div style={{
            padding: '30px',
            border: '2px dashed #ccc',
            borderRadius: 8,
            textAlign: 'center',
            background: '#f9f9f9'
          }}>
            <div style={{marginBottom: 15}}>
              <svg 
                width="64" 
                height="64" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{color: '#666'}}
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            
            <input 
              type="file" 
              accept=".pptx" 
              onChange={handleUserUploadPptx}
              style={{marginBottom: 15}}
              id="pptx-upload"
            />
            
            {userUploadedPptx && (
              <div style={{
                marginTop: 15,
                padding: 10,
                background: '#e8f5e9',
                borderRadius: 4,
                color: '#2e7d32'
              }}>
                ✓ Đã chọn: {userUploadedPptx.name}
              </div>
            )}
            
            <button 
              onClick={uploadPptx} 
              disabled={!userUploadedPptx || isUploadingPptx}
              style={{
                marginTop: 15,
                padding: '12px 30px',
                fontSize: '16px',
                background: (!userUploadedPptx || isUploadingPptx) ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: (!userUploadedPptx || isUploadingPptx) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isUploadingPptx ? '⏳ Đang xử lý...' : '📤 Upload và Tiếp tục'}
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Video & Voice Selection */}
      {metadata && !editMode && (
        <section className="step-content">
          <h3>Bước 2: Chọn video và giọng thuyết trình</h3>
          
          <div style={{
            padding: 15,
            background: '#e3f2fd',
            borderRadius: 5,
            marginBottom: 20
          }}>
            <strong>✓ Đã upload thành công:</strong>
            <div>Tên file: {metadata.title}</div>
            <div>Tổng số slides: {metadata.total_slides}</div>
            <button 
              onClick={() => enterEditMode(slides)}
              style={{
                marginTop: 10,
                padding: '8px 20px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              ✏️ Nhập script thuyết trình
            </button>
          </div>
          
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
              style={{
                background: (isProcessing || (!selectedVideoUrl && !selectedVideoFile) || (!selectedVoiceUrl && !selectedVoiceFile)) ? '#ccc' : '#28a745',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: 4,
                cursor: (isProcessing || (!selectedVideoUrl && !selectedVideoFile) || (!selectedVoiceUrl && !selectedVoiceFile)) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isProcessing ? '⏳ Đang xử lý...' : '🎬 Tạo Video Thuyết Trình'}
            </button>
            <button 
              onClick={handleReset} 
              style={{
                marginLeft: 10,
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
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
          <video src={finalVideoUrl} controls style={{width:'100%', maxWidth: 800}} />
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

export default UploadedSlideToVideo;