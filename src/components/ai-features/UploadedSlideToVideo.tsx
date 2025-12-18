import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  extractPptxText,
  saveSlideMetadata,
  uploadAudioFile,
  uploadVideoFile,
  SlideMetadata,
  SlideData,
  PresentationMetadata
} from '../../services/slideService';
import { getSampleVideos, SampleVideo } from '../../services/sampleVideoService';
import { getMyAudios, uploadReferenceAudio, deleteUploadedAudio, UploadedAudio } from '../../services/uploadedAudioService';
import { getMediaVideos, MediaVideo } from '../../services/mediaVideoService';

const UploadedSlideToVideo = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // ⭐ Thêm hook navigate

  // Presentation metadata
  const [metadata, setMetadata] = useState<PresentationMetadata | null>(null);
  const [slides, setSlides] = useState<SlideMetadata[]>([]);
  const [savedSlideData, setSavedSlideData] = useState<SlideData[]>([]);

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
  const [audioMode, setAudioMode] = useState<'upload' | 'existing'>('upload');
  const [referenceAudioFile, setReferenceAudioFile] = useState<File | null>(null);
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string>('');
  const [referenceText, setReferenceText] = useState<string>('');
  const [myAudios, setMyAudios] = useState<UploadedAudio[]>([]);
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);
  const [tempReferenceText, setTempReferenceText] = useState<string>('');
  const [showAudioWarning, setShowAudioWarning] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Mode 2: Preset Voice
  const [gender, setGender] = useState<string>('male');
  const [area, setArea] = useState<string>('northern');
  const [group, setGroup] = useState<string>('news');
  const [emotion, setEmotion] = useState<string>('neutral');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [videoOptions, setVideoOptions] = useState<MediaVideo[]>([]);
  const [deepfakeVideos, setDeepfakeVideos] = useState<MediaVideo[]>([]);
  const [loadingDeepfakeVideos, setLoadingDeepfakeVideos] = useState(false);
  const [videoSourceType, setVideoSourceType] = useState<'sample' | 'deepfake' | 'custom'>('sample');

  // Load sample videos from API
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoadingVideos(true);
        setLoadingDeepfakeVideos(true);
        
        // Load sample videos
        const sampleResponse = await getMediaVideos('sample');
        setVideoOptions(sampleResponse.videos);
        
        // Load deepfake videos
        const deepfakeResponse = await getMediaVideos('deepfake');
        setDeepfakeVideos(deepfakeResponse.videos);
        
        // Set default
        if (sampleResponse.videos.length > 0) {
          setSelectedVideoUrl(sampleResponse.videos[0].video_url);
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        setError('Không thể tải danh sách video');
      } finally {
        setLoadingVideos(false);
        setLoadingDeepfakeVideos(false);
      }
    };

    loadVideos();
    loadMyAudios();
  }, []);

  const loadMyAudios = async () => {
    try {
      const audios = await getMyAudios();
      setMyAudios(audios);
    } catch (err) {
      console.error('Error loading audios:', err);
    }
  };

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
      // 1. Extract images
      console.log('📸 Extracting images...');
      const imageResult = await uploadPptxAndExtractSlidesImage(userUploadedPptx);
      console.log('✅ Image result:', imageResult);

      // 2. Extract text content
      console.log('📝 Extracting text...');
      const textResult = await extractPptxText(userUploadedPptx);
      console.log('✅ Text result:', textResult);

      if (imageResult.success && imageResult.slides) {
        const uploadedSlides: SlideMetadata[] = imageResult.slides.map((img: any, idx: number) => {
          const slideText = textResult.slides_text?.find(s => s.slide_number === idx);

          return {
            slide_number: idx,
            type: idx === 0 ? 'title' : 'content',
            title: slideText?.title || `Slide ${idx + 1}`,
            filepath: img.image_url,
            filename: `slide_${idx}.png`
          };
        });

        console.log('📋 Uploaded slides:', uploadedSlides);

        setSlides(uploadedSlides);

        const defaultMetadata: PresentationMetadata = {
          title: userUploadedPptx.name.replace('.pptx', ''),
          total_slides: uploadedSlides.length,
          created_at: new Date().toISOString(),
          slides: uploadedSlides,
          slide_data: {
            title: userUploadedPptx.name.replace('.pptx', ''),
            slides: uploadedSlides.map((slide: SlideMetadata, idx: number) => {
              const slideText = textResult.slides_text?.find(s => s.slide_number === idx);

              return {
                slide_number: idx,
                title: slide.title || `Slide ${idx + 1}`,
                content: [],
                original_content: slideText?.content || ''
              };
            })
          }
        };

        console.log('💾 Metadata with content:', defaultMetadata);

        setMetadata(defaultMetadata);

        // ⭐ Truyền metadata vào function thay vì đọc từ state
        enterEditModeWithMetadata(uploadedSlides, defaultMetadata);

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

  // ⭐ Function mới nhận metadata làm parameter
  const enterEditModeWithMetadata = (uploadedSlides: SlideMetadata[], metadataToUse: PresentationMetadata) => {
    const editData: SlideData[] = uploadedSlides.map((slide, idx) => {
      const slideData = metadataToUse.slide_data.slides[idx];

      console.log(`Slide ${idx} content:`, slideData?.original_content); // Debug

      return {
        slide_number: idx,
        title: slide.title || `Slide ${idx + 1}`,
        content: slideData?.content || [],
        original_content: slideData?.original_content || ''
      };
    });

    console.log('✅ Final edit data:', editData);

    setEditedSlideData(editData);
    setSavedSlideData([...editData]);
    setEditMode(true);
  };

  // Giữ lại function cũ cho nút "Nhập script thuyết trình"
  const enterEditMode = (uploadedSlides: SlideMetadata[]) => {
    if (metadata) {
      enterEditModeWithMetadata(uploadedSlides, metadata);
    }
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
        setSavedSlideData([...editedSlideData]);
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

  const handleCancelEdit = () => {
    setEditedSlideData([...savedSlideData]); //  Khôi phục content đã lưu
    setEditMode(false);
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

  const handleReferenceAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError('Vui lòng chọn file audio');
      e.target.value = ''; // Reset input
      return;
    }

    // Kiểm tra phải có reference text
    if (!tempReferenceText.trim()) {
      setError('Vui lòng nhập Reference Text trước khi upload audio');
      e.target.value = ''; // Reset input
      return;
    }

    // Kiểm tra độ dài audio
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(objectUrl);
          if (audio.duration > 15) {
            setAudioDuration(Math.round(audio.duration));
            setShowAudioWarning(true);
            e.target.value = '';
            reject(new Error('Audio too long'));
          } else {
            resolve();
          }
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          setError('Không thể đọc file audio');
          e.target.value = '';
          reject(new Error('Cannot read audio'));
        };
      });
    } catch (err) {
      // Dừng lại nếu audio không hợp lệ
      return;
    }

    setReferenceAudioFile(file);

    // Upload ngay lập tức
    setIsUploadingAudio(true);
    setError(null);
    try {
      const uploadedAudio = await uploadReferenceAudio(file, tempReferenceText);
      setReferenceAudioUrl(uploadedAudio.audio_url);
      setReferenceText(uploadedAudio.reference_text);
      await loadMyAudios();
      setTempReferenceText(''); // Reset temp text
      e.target.value = ''; // Reset input để có thể chọn file khác
    } catch (err) {
      setError('Không thể upload audio. Vui lòng thử lại.');
      console.error('Upload error:', err);
      e.target.value = ''; // Reset input
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleSelectExistingAudio = (audio: UploadedAudio) => {
    setReferenceAudioUrl(audio.audio_url);
    setReferenceText(audio.reference_text);
  };

  const handleDeleteAudio = async (audioId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa audio này?')) return;
    
    try {
      await deleteUploadedAudio(audioId);
      await loadMyAudios();
      if (myAudios.find(aud => aud.id === audioId)?.audio_url === referenceAudioUrl) {
        setReferenceAudioUrl('');
        setReferenceText('');
      }
    } catch (err) {
      setError('Không thể xóa audio. Vui lòng thử lại.');
      console.error('Delete error:', err);
    }
  };

  const uploadReferenceAudioIfNeeded = async (): Promise<string> => {
    // Nếu đã có URL (từ upload trước hoặc chọn từ thư viện) thì return luôn
    if (referenceAudioUrl) {
      return referenceAudioUrl;
    }
    
    // Nếu có file mới chưa upload thì upload
    if (referenceAudioFile) {
      const result = await uploadAudioFile(referenceAudioFile);
      if (result.success && result.audio_url) {
        return result.audio_url;
      } else {
        throw new Error('Không thể upload reference audio');
      }
    }
    
    throw new Error('Không có audio để sử dụng');
  };

  useEffect(() => {
    const loadSampleVideos = async () => {
      try {
        setLoadingVideos(true);
        const response = await getMediaVideos('sample'); // Chỉ lấy video sample
        setVideoOptions(response.videos);
        if (response.videos.length > 0) {
          setSelectedVideoUrl(response.videos[0].video_url);
        }
      } catch (error) {
        console.error('Error loading sample videos:', error);
        setError('Không thể tải danh sách video mẫu');
      } finally {
        setLoadingVideos(false);
      }
    };

    loadSampleVideos();
  }, []);

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

    if (voiceMode === 'clone' && !referenceAudioUrl) {
      setError('Vui lòng chọn hoặc upload file audio mẫu cho chế độ voice cloning');
      return;
    }

    if (voiceMode === 'clone' && !referenceText.trim()) {
      setError('Vui lòng nhập reference text cho audio đã chọn');
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
        refAudioUrl = await uploadReferenceAudioIfNeeded();
      }

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slideData = slideDataList.find(sd => sd.slide_number === slide.slide_number);

        setProcessingMessage(`Xử lý slide ${i + 1}/${slides.length}: ${slideData?.title || 'Untitled'}...`);

        const narrationText = slideData?.original_content || '';

        if (!narrationText) {
          console.warn(`Slide ${slide.slide_number} không có script, bỏ qua`);
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
    setMetadata(null);
    setSlides([]);
    setUserUploadedPptx(null);
    setEditMode(false);
    setEditedSlideData([]);
    setSelectedVideoFile(null);
    setSelectedVideoUrl(videoOptions[0].video_url);
    setVoiceMode('preset');
    setAudioMode('upload');
    setReferenceAudioFile(null);
    setReferenceAudioUrl('');
    setReferenceText('');
    setTempReferenceText('');
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
    if (videoOptions.length > 0) {
      setSelectedVideoUrl(videoOptions[0].video_url);
    }
  }, [videoOptions]);

  // Thêm handler cho video source type
const handleVideoSourceTypeChange = (type: 'sample' | 'deepfake' | 'custom') => {
  setVideoSourceType(type);
  setSelectedVideoFile(null);
  
  if (type === 'sample' && videoOptions.length > 0) {
    setSelectedVideoUrl(videoOptions[0].video_url);
  } else if (type === 'deepfake' && deepfakeVideos.length > 0) {
    setSelectedVideoUrl(deepfakeVideos[0].video_url);
  } else if (type === 'custom') {
    setSelectedVideoUrl('');
  }
};

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
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {/* Slide Image Gốc */}
                {slides[index] && (
                  <div style={{ flex: '0 0 400px' }}>
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
                <div style={{ flex: 1 }}>
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
                      updateOriginalContent(index, text);
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
                    color: '#666',
                    fontWeight: 'normal'
                  }}>
                    {slideData.original_content.length}/1000 ký tự
                    {/* {slideData.original_content.length > 240 && ' - Gần đạt giới hạn!'} */}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 30, textAlign: 'center', padding: '20px 0', borderTop: '2px solid #ddd' }}>
            <button
              onClick={handleCancelEdit}
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

      {/* Audio Warning Modal */}
      {showAudioWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: '30px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#fff3cd',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px'
            }}>
              ⚠️
            </div>
            <h3 style={{ marginBottom: '15px', color: '#333', fontSize: '20px' }}>
              File audio quá dài
            </h3>
            <p style={{ marginBottom: '10px', color: '#666', fontSize: '16px', lineHeight: '1.5' }}>
              File audio phải có độ dài dưới <strong>15 giây</strong>
            </p>
            <p style={{ marginBottom: '25px', color: '#856404', fontSize: '15px' }}>
              File của bạn có độ dài: <strong>{audioDuration} giây</strong>
            </p>
            <button
              onClick={() => {
                setShowAudioWarning(false);
                setError(null);
              }}
              style={{
                padding: '12px 30px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

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
            <div style={{ marginBottom: 15 }}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ color: '#666' }}
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
              style={{ marginBottom: 15 }}
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

          {/* Video Selection */}
          <div style={{ marginBottom: 20 }}>
            <h4>Chọn Video Giảng Viên:</h4>
            
            {/* Option 1: Sample Video */}
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input
                  type="radio"
                  name="videoChoice"
                  checked={videoSourceType === 'sample'}
                  onChange={() => handleVideoSourceTypeChange('sample')}
                />
                <div style={{ flex: 1 }}>
                  <strong>Sử dụng video giảng viên mẫu:</strong>
                  <select
                    value={selectedVideoUrl}
                    onChange={handleVideoPresetChange}
                    disabled={videoSourceType !== 'sample' || loadingVideos}
                    style={{ 
                      marginTop: 8,
                      width: '100%',
                      padding: 8,
                      opacity: videoSourceType === 'sample' ? 1 : 0.5
                    }}
                  >
                    {loadingVideos ? (
                      <option value="">Đang tải...</option>
                    ) : videoOptions.length === 0 ? (
                      <option value="">Không có video mẫu</option>
                    ) : (
                      videoOptions.map(option => (
                        <option key={option.id} value={option.video_url}>{option.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </label>
            </div>

            {/* Option 2: Deepfake Video */}
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input
                  type="radio"
                  name="videoChoice"
                  checked={videoSourceType === 'deepfake'}
                  onChange={() => handleVideoSourceTypeChange('deepfake')}
                />
                <div style={{ flex: 1 }}>
                  <strong>Sử dụng video deepfake đã tạo:</strong>
                  <select
                    value={selectedVideoUrl}
                    onChange={(e) => setSelectedVideoUrl(e.target.value)}
                    disabled={videoSourceType !== 'deepfake' || loadingDeepfakeVideos}
                    style={{ 
                      marginTop: 8,
                      width: '100%',
                      padding: 8,
                      opacity: videoSourceType === 'deepfake' ? 1 : 0.5
                    }}
                  >
                    {loadingDeepfakeVideos ? (
                      <option value="">Đang tải...</option>
                    ) : deepfakeVideos.length === 0 ? (
                      <option value="">Chưa có video deepfake</option>
                    ) : (
                      deepfakeVideos.map(option => (
                        <option key={option.id} value={option.video_url}>
                          {option.name || `Video ${option.id}`}
                        </option>
                      ))
                    )}
                  </select>
                  
                  {/* Thông báo và nút dẫn đến trang tạo deepfake */}
                  {videoSourceType === 'deepfake' && deepfakeVideos.length === 0 && (
                    <div style={{
                      marginTop: 10,
                      padding: 12,
                      background: '#fff3cd',
                      borderRadius: 6,
                      border: '1px solid #ffc107'
                    }}>
                      <p style={{
                        margin: 0,
                        marginBottom: 10,
                        fontSize: '14px',
                        color: '#856404',
                        fontStyle: 'italic'
                      }}>
                        💡 Bạn chưa có video deepfake nào. Tạo video ghép mặt mới ngay!
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/create-content', { state: { activeTab: 'deepfake' } })}
                        style={{
                          padding: '8px 20px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.6)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.4)';
                        }}
                      >
                        <span>🎭</span>
                        <span>Tạo video deepfake ngay</span>
                      </button>
                    </div>
                  )}
                  
                  {/* Hiện button khi đã có video nhưng vẫn muốn tạo thêm */}
                  {videoSourceType === 'deepfake' && deepfakeVideos.length > 0 && (
                    <div style={{marginTop: 10}}>
                      <button
                        type="button"
                        onClick={() => navigate('/create-content', { state: { activeTab: 'deepfake' } })}
                        style={{
                          padding: '6px 16px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: '13px',
                          transition: 'background 0.3s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#5a6268'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#6c757d'}
                      >
                        ➕ Tạo video deepfake mới
                      </button>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Option 3: Custom Upload */}
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input
                  type="radio"
                  name="videoChoice"
                  checked={videoSourceType === 'custom'}
                  onChange={() => handleVideoSourceTypeChange('custom')}
                />
                <div style={{ flex: 1 }}>
                  <strong>Upload video tùy chỉnh:</strong>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    disabled={videoSourceType !== 'custom'}
                    style={{ 
                      marginTop: 8,
                      opacity: videoSourceType === 'custom' ? 1 : 0.5
                    }}
                  />
                </div>
              </label>
            </div>

            {/* Video Preview */}
            {(selectedVideoUrl || selectedVideoFile) && (
              <div style={{
                marginTop: 15,
                padding: 15,
                background: '#f5f5f5',
                borderRadius: 8,
                border: '2px solid #e0e0e0'
              }}>
                <h5 style={{ marginBottom: 10 }}>Preview:</h5>
                <video
                  src={selectedVideoUrl || (selectedVideoFile ? URL.createObjectURL(selectedVideoFile) : '')}
                  controls
                  style={{ width: '100%', maxWidth: 400, borderRadius: 4 }}
                />
              </div>
            )}
          </div>

          {/* Voice Mode Selection */}
          <div style={{ marginBottom: 20, padding: 20, border: '2px solid #e0e0e0', borderRadius: 8 }}>
            <h4>Chọn Phương Thức Tạo Giọng:</h4>
            <div style={{ marginBottom: 15 }}>
              <label style={{ marginRight: 20 }}>
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
              <div style={{ padding: 15, background: '#f9f9f9', borderRadius: 5 }}>
                <h5>Cấu hình giọng nói:</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                      Giới tính:
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ width: '100%', padding: 8 }}
                    >
                      {genderOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                      Vùng miền:
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      style={{ width: '100%', padding: 8 }}
                    >
                      {areaOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                      Nhóm giọng:
                    </label>
                    <select
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                      style={{ width: '100%', padding: 8 }}
                    >
                      {groupOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                      Cảm xúc:
                    </label>
                    <select
                      value={emotion}
                      onChange={(e) => setEmotion(e.target.value)}
                      style={{ width: '100%', padding: 8 }}
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
              <div style={{ padding: 15, background: '#fff3cd', borderRadius: 5 }}>
                <h5>Clone giọng từ file mẫu:</h5>
                
                <div className="audio-mode-selector" style={{ marginBottom: 15 }}>
                  <button
                    type="button"
                    style={{
                      marginRight: 10,
                      padding: '8px 16px',
                      background: audioMode === 'upload' ? '#007bff' : '#f0f0f0',
                      color: audioMode === 'upload' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                    onClick={() => setAudioMode('upload')}
                  >
                    Upload audio mới
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      background: audioMode === 'existing' ? '#007bff' : '#f0f0f0',
                      color: audioMode === 'existing' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                    onClick={() => setAudioMode('existing')}
                  >
                    Chọn audio đã có
                  </button>
                </div>

                {audioMode === 'upload' ? (
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                      Upload file audio mẫu:
                    </label>
                    
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', marginBottom: 5 }}>
                        Reference Text <span style={{ color: 'red' }}>*</span> (bắt buộc):
                      </label>
                      <textarea
                        value={tempReferenceText}
                        onChange={(e) => setTempReferenceText(e.target.value)}
                        placeholder="Nhập nội dung tương ứng với audio (bắt buộc trước khi upload)..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: 10,
                          border: tempReferenceText.trim() ? '1px solid #ddd' : '2px solid #ff9800',
                          borderRadius: 4,
                          fontFamily: 'inherit',
                          marginBottom: 10,
                          backgroundColor: tempReferenceText.trim() ? 'white' : '#fff3cd'
                        }}
                      />
                      <small style={{ 
                        display: 'block', 
                        color: tempReferenceText.trim() ? '#666' : '#ff9800',
                        fontWeight: tempReferenceText.trim() ? 'normal' : 'bold'
                      }}>
                        {tempReferenceText.trim() 
                          ? `✓ ${tempReferenceText.length} ký tự` 
                          : '⚠️ Vui lòng nhập reference text trước khi chọn file audio'}
                      </small>
                      <div style={{ color: '#666', fontSize: '13px', marginTop: 5, fontStyle: 'italic' }}>
                        💡 Lưu ý: File audio phải có độ dài dưới 15 giây
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label 
                        htmlFor="audio-upload-input"
                        style={{
                          display: 'inline-block',
                          padding: '10px 20px',
                          background: tempReferenceText.trim() ? '#007bff' : '#ccc',
                          color: 'white',
                          borderRadius: 4,
                          cursor: tempReferenceText.trim() ? 'pointer' : 'not-allowed',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}
                      >
                        {isUploadingAudio ? '⏳ Đang upload...' : '📁 Chọn file audio'}
                      </label>
                      <input
                        id="audio-upload-input"
                        type="file"
                        accept="audio/*"
                        onChange={handleReferenceAudioFileChange}
                        disabled={isUploadingAudio || !tempReferenceText.trim()}
                        style={{ display: 'none' }}
                      />
                      {!tempReferenceText.trim() && (
                        <p style={{ 
                          marginTop: 5, 
                          fontSize: '13px', 
                          color: '#ff9800',
                          fontStyle: 'italic'
                        }}>
                          ⓘ Nhập reference text ở trên để kích hoạt nút chọn file
                        </p>
                      )}
                    </div>
                    
                    {isUploadingAudio && (
                      <div style={{ 
                        marginTop: 10,
                        padding: 10,
                        background: '#e3f2fd',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}>
                        <div className="spinner" style={{
                          width: 20,
                          height: 20,
                          border: '3px solid #f3f3f3',
                          borderTop: '3px solid #007bff',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        <p style={{ color: '#007bff', fontStyle: 'italic', margin: 0 }}>
                          Đang upload audio...
                        </p>
                      </div>
                    )}

                    {/* {referenceAudioUrl && audioMode === 'upload' && (
                      <div style={{
                        marginTop: 10,
                        padding: 15,
                        background: '#e8f5e9',
                        borderRadius: 4,
                        border: '2px solid #4caf50'
                      }}>
                        <p style={{ color: '#2e7d32', marginBottom: 10, fontWeight: 'bold' }}>
                          ✓ Đã upload thành công!
                        </p>
                        <audio
                          src={referenceAudioUrl}
                          controls
                          style={{ width: '100%', marginBottom: 10 }}
                        />
                        {referenceText && (
                          <div style={{
                            padding: 10,
                            background: 'white',
                            borderRadius: 4,
                            border: '1px solid #c8e6c9'
                          }}>
                            <strong style={{ color: '#2e7d32' }}>Reference Text:</strong>
                            <p style={{ marginTop: 5, fontSize: '13px', color: '#333' }}>
                              {referenceText}
                            </p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setReferenceAudioUrl('');
                            setReferenceText('');
                          }}
                          style={{
                            marginTop: 10,
                            padding: '6px 12px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                           Upload lại Audio
                        </button>
                      </div>
                    )} */}
                  </div>
                ) : (
                  <div className="existing-audios-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: 15,
                    maxHeight: 400,
                    overflowY: 'auto',
                    padding: 10,
                    border: '1px solid #ddd',
                    borderRadius: 5,
                    background: 'white'
                  }}>
                    {myAudios.length === 0 ? (
                      <p>Bạn chưa có audio nào. Hãy upload audio mới!</p>
                    ) : (
                      myAudios.map((audio) => (
                        <div
                          key={audio.id}
                          style={{
                            position: 'relative',
                            padding: 15,
                            border: referenceAudioUrl === audio.audio_url ? '3px solid #007bff' : '2px solid #ddd',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: referenceAudioUrl === audio.audio_url ? '#e3f2fd' : 'white',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => handleSelectExistingAudio(audio)}
                        >
                          <audio
                            src={audio.audio_url}
                            controls
                            style={{ width: '100%', marginBottom: 10 }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <p style={{
                            fontWeight: 'bold',
                            marginBottom: 5,
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {audio.name}
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: 5
                          }}>
                            {new Date(audio.uploaded_at).toLocaleDateString('vi-VN')}
                          </p>
                          {audio.reference_text && (
                            <p style={{
                              fontSize: '12px',
                              color: '#333',
                              fontStyle: 'italic',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              Text: {audio.reference_text}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAudio(audio.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: 5,
                              right: 5,
                              background: 'rgba(244, 67, 54, 0.9)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: 28,
                              height: 28,
                              cursor: 'pointer',
                              fontSize: 18
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {referenceAudioUrl && referenceText && (
                  <div style={{
                    marginTop: 15,
                    padding: 15,
                    background: '#e8f5e9',
                    borderRadius: 4,
                    border: '1px solid #4caf50'
                  }}>
                    <p style={{ fontWeight: 'bold', color: '#2e7d32', marginBottom: 10 }}>
                      ✓ Audio đã chọn:
                    </p>
                    <audio src={referenceAudioUrl} controls style={{ width: '100%', marginBottom: 10 }} />
                    <div>
                      <strong>Reference Text:</strong>
                      <p style={{ marginTop: 5, fontSize: '14px' }}>{referenceText}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              onClick={processAllSlidesAndCreateVideo}
              disabled={isProcessing || (!selectedVideoUrl && !selectedVideoFile)}
              style={{
                background: (isProcessing || (!selectedVideoUrl && !selectedVideoFile)) ? '#ccc' : '#28a745',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: 4,
                cursor: (isProcessing || (!selectedVideoUrl && !selectedVideoFile)) ? 'not-allowed' : 'pointer',
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
          <video src={finalVideoUrl} controls style={{ width: '100%', maxWidth: 800 }} />
          <div style={{ marginTop: 15 }}>
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