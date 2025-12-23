import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/uploaded-slide-to-video.scss';
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
  uploadPptxAndExtractSlidesImage,
  extractPptxText,
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
import { getMediaVideos } from '../../services/mediaVideoService';
import { getMyAudios, uploadReferenceAudio, deleteUploadedAudio, UploadedAudio } from '../../services/uploadedAudioService';
import { buildApiUrl } from '../../config/api';
import { useSlideToVideoStore } from '../../store/slideToVideo.store';


const SlideToVideo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    inputContent, numSlides, isGeneratingSlides,
    metadata, slides, savedSlideData,
    userUploadedPptx, isUploadingPptx,
    editMode, editedSlideData, isSavingMetadata, editModeSlides,
    selectedVideoFile, selectedVideoUrl, loadingVideos, videoOptions,
    deepfakeVideos, loadingDeepfakeVideos, videoSourceType,
    voiceMode, audioMode,
    referenceAudioFile, referenceAudioUrl, referenceText, myAudios,
    isUploadingAudio, tempReferenceText, showAudioWarning, audioDuration,
    gender, area, group, emotion,
    isProcessing, processingMessage, finalVideoUrl, error,
    isPlaying, currentTime, duration,
    setField, patch, resetAll, updateOriginalContent
  } = useSlideToVideoStore();
  
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Load sample videos from API
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setField('loadingVideos', true);
        setField('loadingDeepfakeVideos', true);

        // Load sample videos
        const sampleResponse = await getMediaVideos('sample');
        setField('videoOptions', sampleResponse.videos);

        // Load deepfake videos
        const deepfakeResponse = await getMediaVideos('deepfake');
        setField('deepfakeVideos', deepfakeResponse.videos);

        // Set default
        if (sampleResponse.videos.length > 0) {
          setField('selectedVideoUrl', sampleResponse.videos[0].video_url);
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        setField('error', 'Không thể tải danh sách video');
      } finally {
        setField('loadingVideos', false);
        setField('loadingDeepfakeVideos', false);
      }
    };

    loadVideos();
    loadMyAudios();
  }, []);

  const loadMyAudios = async () => {
    try {
      const audios = await getMyAudios();
      setField('myAudios', audios);
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
    { value: 'southern', label: 'Miền Nam' }
  ];

  const groupOptions = [
    { value: 'audiobook', label: 'Thuyết minh, đọc sách' },
    { value: 'interview', label: 'Phỏng vấn' }
  ];

  const emotionOptions = [
    { value: 'neutral', label: 'Trung tính' },
    { value: 'serious', label: 'Nghiêm túc' }
  ];

  // --- Step 1: Generate slides từ content ---
  const handleGenerateSlides = async () => {
    if (!inputContent.trim()) {
      setField('error', 'Vui lòng nhập nội dung để tạo slide');
      return;
    }

    setField('isGeneratingSlides', true);
    setField('error', null);

    try {
      const result = await generateSlidesFromContent(inputContent, numSlides);

      if (result.success && result.data?.pptx_file) {
        const pptxPath = result.data.pptx_file.filepath;
        await handleUploadAndProcessPPTX(pptxPath, result.data.json_file?.filename);
      } else {
        throw new Error(result.message || 'Lỗi khi tạo slides');
      }
    } catch (err: any) {
      setField('error', err?.message || 'Lỗi khi tạo slides');
      setField('isGeneratingSlides', false);
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
      setField('error', err?.message || 'Lỗi khi xử lý slide');
    } finally {
      setField('isGeneratingSlides', false);
    }
  };

  const handleFetchMetadata = async (jsonFilename: string, slideImages: any[]) => {
    try {
      const result = await fetchSlideMetadata(jsonFilename);

      if (result.success && result.data) {
        const combinedMetadata = combineMetadataWithImages(result.data, slideImages);
        setField('metadata', combinedMetadata);
        setField('slides', combinedMetadata.slides);
      } else {
        throw new Error('Metadata không hợp lệ');
      }
    } catch (err: any) {
      console.error('Fetch metadata error', err);
      setField('error', err?.message || 'Lỗi khi lấy metadata');
    }
  };

  const downloadPptxForEdit = async () => {
    if (!metadata) return;

    try {
      setField('error', null);
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
        setField('error', 'Không tìm thấy file PPTX để tải xuống');
      }
    } catch (err) {
      setField('error', 'Không thể tải xuống file PPTX');
    }
  };

  const handleUserUploadPptx = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setField('userUploadedPptx', e.target.files[0]);
    }
  };

  const uploadEditedPptx = async () => {
    if (!userUploadedPptx) {
      setField('error', 'Vui lòng chọn file PPTX đã chỉnh sửa');
      return;
    }

    setField('isUploadingPptx', true);
    setField('error', null);

    try {
      const imageResult = await uploadPptxAndExtractSlidesImage(userUploadedPptx);

      const textResult = await extractPptxText(userUploadedPptx);

      if (imageResult.success && imageResult.slides) {
        const uploadedSlides: SlideMetadata[] = imageResult.slides.map((img: any, idx: number) => {
          const slideText = textResult.slides_text?.find((s: any) => s.slide_number === idx);

          return {
            slide_number: idx,
            type: idx === 0 ? 'title' : 'content',
            title: slideText?.title || `Slide ${idx + 1}`,
            filepath: img.image_url,
            filename: `slide_${idx}.png`
          };
        });

        setField('slides', uploadedSlides);

        const updatedMetadata: PresentationMetadata = {
          title: userUploadedPptx.name.replace('.pptx', ''),
          total_slides: uploadedSlides.length,
          created_at: new Date().toISOString(),
          slides: uploadedSlides,
          slide_data: {
            title: userUploadedPptx.name.replace('.pptx', ''),
            slides: uploadedSlides.map((slide: SlideMetadata, idx: number) => {
              const slideText = textResult.slides_text?.find((s: any) => s.slide_number === idx);

              return {
                slide_number: idx,
                title: slide.title || `Slide ${idx + 1}`,
                content: [],
                original_content: slideText?.content || ''
              };
            })
          }
        };


        setField('metadata', updatedMetadata);
        setField('userUploadedPptx', null);

        enterEditModeWithMetadata(uploadedSlides, updatedMetadata);

        setField('error', null);
      } else {
        throw new Error('Không thể tách slides thành images');
      }
    } catch (err: any) {
      setField('error', err?.message || 'Lỗi khi tải lên slide đã chỉnh sửa');
    } finally {
      setField('isUploadingPptx', false);
    }
  };

  const enterEditModeWithMetadata = (uploadedSlides: SlideMetadata[], metadataToUse: PresentationMetadata) => {
    const editData: SlideData[] = uploadedSlides.map((slide, idx) => {
      const slideData = metadataToUse.slide_data.slides[idx];

      return {
        slide_number: idx,
        title: slide.title || `Slide ${idx + 1}`,
        content: slideData?.content || [],
        original_content: slideData?.original_content || ''
      };
    });

    patch({ editedSlideData: editData, savedSlideData: [...editData], editModeSlides: uploadedSlides, editMode: true});
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

    patch({ editedSlideData: editData, savedSlideData: [...editData], editModeSlides: slides, editMode: true});
  };
  const handleCancelEdit = () => {
    patch({ editedSlideData: [...savedSlideData], editModeSlides: [], editMode: false });
  };

  const handleSaveMetadata = async () => {
    if (!metadata || !editedSlideData.length) {
      setField('error', 'Không có dữ liệu để lưu');
      return;
    }

    setField('isSavingMetadata', true);
    setField('error', null);

    try {
      const updatedMetadata = {
        ...metadata.slide_data,
        slides: editedSlideData
      };

      const result = await saveSlideMetadata(updatedMetadata);

      if (result.success) {
        patch({ 
          metadata: metadata ? { ...metadata, slide_data: updatedMetadata } : null,
          savedSlideData: [...editedSlideData], 
          editMode: false, 
          error: null,
        });
      } else {
        throw new Error(result.message || 'Lỗi khi lưu metadata');
      }
    } catch (err: any) {
      setField('error', err?.message || 'Lỗi khi lưu metadata');
    } finally {
      setField('isSavingMetadata', false);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setField('selectedVideoFile', e.target.files[0]);
      setField('selectedVideoUrl', '');
    }
  };

  const handleVideoPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setField('selectedVideoUrl', e.target.value);
    setField('selectedVideoFile', null);
  };

  const handleReferenceAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setField('error', 'Vui lòng chọn tệp tin âm thanh');
      e.target.value = '';
      return;
    }

    if (!tempReferenceText.trim()) {
      setField('error', 'Vui lòng nhập nội dung trước khi tải lên tải lên âm thanh');
      e.target.value = '';
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
            setField('audioDuration', Math.round(audio.duration));
            setField('showAudioWarning', true);
            e.target.value = '';
            reject(new Error('Audio too long'));
          } else {
            resolve();
          }
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          setField('error', 'Không thể đọc tệp tin âm thanh');
          e.target.value = '';
          reject(new Error('Cannot read audio'));
        };
      });
    } catch (err) {
      return;
    }

    setField('referenceAudioFile', file);

    setField('isUploadingAudio', true);
    setField('error', null);
    try {
      const uploadedAudio = await uploadReferenceAudio(file, tempReferenceText);
      setField('referenceAudioUrl', uploadedAudio.audio_url);
      setField('referenceText', uploadedAudio.reference_text);
      await loadMyAudios();
      setField('tempReferenceText', '');
      e.target.value = '';
    } catch (err) {
      setField('error', 'Không thể tải lên âm thanh. Vui lòng thử lại.');
      e.target.value = '';
    } finally {
      setField('isUploadingAudio', false);
    }
  };

  const handleSelectExistingAudio = (audio: UploadedAudio) => {
    setField('referenceAudioUrl', audio.audio_url);
    setField('referenceText', audio.reference_text);
  };

  const handleDeleteAudio = async (audioId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa âm thanh này?')) return;

    try {
      await deleteUploadedAudio(audioId);
      await loadMyAudios();
      if (myAudios.find(aud => aud.id === audioId)?.audio_url === referenceAudioUrl) {
        setField('referenceAudioUrl', '');
        setField('referenceText', '');
      }
    } catch (err) {
      setField('error', 'Không thể xóa âm thanh. Vui lòng thử lại.');
    }
  };

  const uploadReferenceAudioIfNeeded = async (): Promise<string> => {
    if (referenceAudioUrl) {
      return referenceAudioUrl;
    }

    if (referenceAudioFile) {
      const result = await uploadAudioFile(referenceAudioFile);
      if (result.success && result.audio_url) {
        return result.audio_url;
      } else {
        throw new Error('Không thể tải lên âm thanh');
      }
    }

    throw new Error('Không có âm thanh để sử dụng');
  };

  const uploadSelectedVideo = async () => {
    let videoUrl = selectedVideoUrl;

    if (selectedVideoFile) {
      const result = await uploadVideoFile(selectedVideoFile);
      if (result.success && result.video_url) {
        videoUrl = result.video_url;
      } else {
        throw new Error('Không thể tải lên video');
      }
    }

    return videoUrl;
  };

  const processAllSlidesAndCreateVideo = async () => {
    if (!metadata || slides.length === 0) {
      setField('error', 'Chưa có slide để xử lý');
      return;
    }

    if (!selectedVideoUrl && !selectedVideoFile) {
      setField('error', 'Vui lòng chọn video mẫu hoặc tải lên video');
      return;
    }

    if (voiceMode === 'clone' && !referenceAudioUrl) {
      setField('error', 'Vui lòng chọn hoặc tải lên tệp tin âm thanh');
      return;
    }

    if (voiceMode === 'clone' && !referenceText.trim()) {
      setField('error', 'Vui lòng nhập nội dung cho âm thanh đã chọn');
      return;
    }

    patch({ error: null, isProcessing: true });

    const composedSlideUrls: string[] = [];
    const slideDataList = metadata.slide_data.slides;

    try {
      setField('processingMessage', 'Đang tải lên tệp tin...');
      const videoUrl = await uploadSelectedVideo();

      // Upload reference audio if in clone mode
      let refAudioUrl = '';
      if (voiceMode === 'clone') {
        refAudioUrl = await uploadReferenceAudioIfNeeded();
      }

      const contentSlides = slides.filter(s => s.type !== 'title');

      for (let i = 0; i < contentSlides.length; i++) {
        const slide = contentSlides[i];
        const slideData = slideDataList.find(sd => sd.slide_number === slide.slide_number);

        setField('processingMessage', `Đang xử lý slide ${i + 1}/${contentSlides.length}...`);

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
      setField('processingMessage', 'Đang ghép các đoạn slide với nhau thành video hoàn chỉnh...');
      const finalResp = await concatVideos(composedSlideUrls);
      if (finalResp && finalResp.result_url) {
        setField('processingMessage', 'Đang tải lên video lên hệ thống...');
        const cloudinaryUrl = await uploadVideoToCloudinary(finalResp.result_url);
        setField('finalVideoUrl', cloudinaryUrl);
        try {
          if (!user?.username) {
            throw new Error('Không xác định được user');
          }
          await saveVideo(cloudinaryUrl, user.username);
          setField('processingMessage', 'Hoàn tất. Video đã được lưu vào hệ thống.');
        } catch (saveError) {
          console.error('Lỗi khi lưu video:', saveError);
          setField('error', 'Không lưu được video vào hệ thống.');
        }
      } else {
        throw new Error('Không tạo được video cuối cùng');
      }
    } catch (err: any) {
      console.error('processAllSlidesAndCreateVideo error', err);
      setField('error', err?.message || 'Lỗi khi xử lý các slide');
    } finally {
      setField('isProcessing', false);
    }
  };

  const handleReset = () => resetAll();

  const handleDownload = async () => {
    if (!finalVideoUrl) return;

    try {
      setField('error', null);
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
      setField('error', 'Không thể tải xuống video. Vui lòng thử lại!');
      document.querySelector('.download-loading')?.remove();
    }
  };

  // Thêm handler cho video source type (đặt sau các handler khác)
  const handleVideoSourceTypeChange = (type: 'sample' | 'deepfake' | 'custom') => {
    patch({ videoSourceType: type, selectedVideoFile: null });

    if (type === 'sample' && videoOptions.length > 0) {
      setField('selectedVideoUrl', videoOptions[0].video_url);
    } else if (type === 'deepfake' && deepfakeVideos.length > 0) {
      setField('selectedVideoUrl', deepfakeVideos[0].video_url);
    } else if (type === 'custom') {
      setField('selectedVideoUrl', '');
    }
  };

  // Video player handlers
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setField('isPlaying', !isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setField('currentTime', videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setField('duration', videoRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  React.useEffect(() => {
    patch({ isPlaying: false, currentTime: 0, duration: 0 });
  }, [selectedVideoUrl, selectedVideoFile]);

  // EDIT MODE
  if (editMode && editedSlideData.length > 0) {
    return (
      <div className="uploaded-slide-to-video">
        <div className="page-header">
          <h1 style={{ fontSize: '1.5rem' }}>Nhập nội dung thuyết trình cho từng slide</h1>
        </div>

        {error && (
          <div className="error-message">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <div className="edit-slides-container">
          {editedSlideData.map((slideData, index) => (
            <div key={index} className="slide-edit-card">
              <div className="slide-content">
                {editModeSlides[index] && (
                  <div className="slide-image-wrapper">
                    <img
                      src={editModeSlides[index].filepath}
                      alt={`Slide ${index + 1}`}
                    />
                    <div className="slide-number">Slide {index + 1}</div>
                  </div>
                )}

                <div className="script-editor">
                  <label>Script thuyết trình cho slide này:</label>
                  <textarea
                    value={slideData.original_content}
                    onChange={(e) => updateOriginalContent(index, e.target.value)}
                    placeholder="Nhập nội dung bạn muốn thuyết trình cho slide này ..."
                    rows={8}
                  />
                  <div className="char-count">
                    {slideData.original_content.length}/1000 ký tự
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="edit-actions">
            <button onClick={handleCancelEdit} className="cancel-btn">
              Hủy
            </button>
            <button
              onClick={handleSaveMetadata}
              disabled={isSavingMetadata}
              className="save-btn"
            >
              {isSavingMetadata ? 'Đang lưu...' : 'Lưu và tiếp tục'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="uploaded-slide-to-video">
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
              onClick={() => patch({ showAudioWarning: false, error: null })}
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

      {/* Step 1: Generate slides from content */}
      {!metadata && <div className="section-card">
        <div className="section-header">
          <span className="icon-wrapper">
        <span className="material-symbols-outlined">auto_awesome</span>
          </span>
          <h2>Nhập nội dung và tạo slides</h2>
        </div>
        <div className="section-content">
          <div className="relative">
            <textarea
              className="block w-full rounded-md border-2 border-gray-400 shadow-sm focus:outline-none bg-white text-gray-900 sm:text-sm p-4 h-48 resize-y"
              placeholder="Nhập nội dung bài giảng của bạn vào đây..."
              value={inputContent}
              onChange={(e) => setField('inputContent', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4" style={{ marginTop: '1rem' }}>
            <div className="w-full sm:w-48">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Số lượng slide (để trống = tự động):
              </label>
              <input
                className="block w-full rounded-md border-2 border-gray-400 shadow-sm focus:outline-none bg-white text-gray-900 sm:text-sm px-3 py-2"
                type="number"
                min="1"
                max="50"
                value={numSlides || ''}
                onChange={(e) => setField('numSlides', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <button
              onClick={handleGenerateSlides}
              disabled={!inputContent.trim() || isGeneratingSlides}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-md shadow-sm text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{
                opacity: (!inputContent.trim() || isGeneratingSlides) ? 0.5 : 1,
                cursor: (!inputContent.trim() || isGeneratingSlides) ? 'not-allowed' : 'pointer'
              }}
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              {isGeneratingSlides ? 'Đang tạo slides...' : 'Tạo slides'}
            </button>
          </div>
        </div>
      </div>}

      {/* Step 2: Download and edit slides */}
      {metadata && !editMode && (
        <div className="section-card">
          <div className="section-header">
            <span className="icon-wrapper">
              <span className="material-symbols-outlined">edit_document</span>
            </span>
            <h2>Tải xuống và chỉnh sửa slides</h2>
          </div>
          <div className="section-content">
            <div className="space-y-5">
              {metadata && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-600 mt-0.5">check_circle</span>
                  <div className="text-sm">
                    <p className="font-bold text-green-800">Slide hiện tại:</p>
                    <p className="text-green-700 mt-1">
                      <span className="font-medium">Tiêu đề:</span> {metadata.title}
                    </p>
                    <p className="text-green-700">
                      <span className="font-medium">Tổng số slides:</span> {metadata.total_slides}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={downloadPptxForEdit}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-md shadow-sm text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined">download</span>
                  Tải PPTX về để chỉnh sửa
                </button>
                <button
                  onClick={() => enterEditMode()}
                  className="flex items-center gap-2 bg-[#17a2b8] hover:bg-[#138496] text-white px-4 py-2.5 rounded-md shadow-sm text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined">edit_note</span>
                  Nhập script thuyết trình
                </button>
              </div>
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-900">
                  Hoặc upload PPTX đã chỉnh sửa:
                </div>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="pptx-upload-input"
                    className="bg-white border-2 border-gray-400 text-gray-900 px-4 py-2 rounded-md text-sm font-medium shadow-sm cursor-pointer"
                  >
                    Chọn file
                  </label>
                  <input
                    id="pptx-upload-input"
                    type="file"
                    accept=".pptx"
                    onChange={handleUserUploadPptx}
                    style={{ display: 'none' }}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                    {userUploadedPptx ? userUploadedPptx.name : 'Không có tệp nào được chọn'}
                  </span>
                  {userUploadedPptx && (
                    <button
                      onClick={uploadEditedPptx}
                      disabled={isUploadingPptx}
                      className="bg-[#28a745] hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      style={{
                        opacity: isUploadingPptx ? 0.5 : 1,
                        cursor: isUploadingPptx ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isUploadingPptx ? 'Đang upload...' : 'Upload PPTX'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Video and Voice Configuration */}
      {metadata && !editMode && (
        <div className="config-sections active">
          {/* Video Selection */}
          <div className="section-card">
            <div className="section-header">
              <span className="icon-wrapper">
                <span className="material-symbols-outlined">person_play</span>
              </span>
              <h2>Chọn Video Giảng Viên</h2>
            </div>

            <div className="section-content">
              <div className="video-options">
                <div className="options-list">
                  {/* Sample Video Option */}
                  <div className="video-option">
                    <div className="option-header">
                      <input
                        type="radio"
                        name="videoChoice"
                        id="video-sample"
                        checked={videoSourceType === 'sample'}
                        onChange={() => handleVideoSourceTypeChange('sample')}
                      />
                      <div className="option-content">
                        <label htmlFor="video-sample">Sử dụng video giảng viên mẫu</label>
                        <p>Chọn từ thư viện giảng viên có sẵn của chúng tôi</p>
                        <select
                          value={selectedVideoUrl}
                          onChange={handleVideoPresetChange}
                          disabled={videoSourceType !== 'sample' || loadingVideos}
                        >
                          {loadingVideos ? (
                            <option>Đang tải...</option>
                          ) : videoOptions.length === 0 ? (
                            <option>Không có video mẫu</option>
                          ) : (
                            videoOptions.map(option => (
                              <option key={option.id} value={option.video_url}>
                                {option.name}
                              </option>
                            )))
                          }
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Deepfake Video Option */}
                  <div className="video-option">
                    <div className="option-header">
                      <input
                        type="radio"
                        name="videoChoice"
                        id="video-deepfake"
                        checked={videoSourceType === 'deepfake'}
                        onChange={() => handleVideoSourceTypeChange('deepfake')}
                      />
                      <div className="option-content">
                        <label htmlFor="video-deepfake">Sử dụng video deepfake đã tạo</label>
                        <select
                          value={selectedVideoUrl}
                          onChange={(e) => setField('selectedVideoUrl', e.target.value)}
                          disabled={videoSourceType !== 'deepfake' || loadingDeepfakeVideos}
                        >
                          {loadingDeepfakeVideos ? (
                            <option>Đang tải...</option>
                          ) : deepfakeVideos.length === 0 ? (
                            <option>Chưa có video deepfake</option>
                          ) : (
                            deepfakeVideos.map(option => (
                              <option key={option.id} value={option.video_url}>
                                {option.name || `Video ${option.id}`}
                              </option>
                            ))
                          )}
                        </select>

                        {/* Chỉ hiện nút "Tạo video deepfake mới" khi đã có video */}
                        {videoSourceType === 'deepfake' && deepfakeVideos.length > 0 && (
                          <button
                            onClick={() => navigate('/create-content', { state: { activeTab: 'deepfake' } })}
                            className="create-deepfake-btn"
                          >
                            <span>Tạo video deepfake mới</span>
                          </button>
                        )}

                        {/* Hiện notice khi chưa có video */}
                        {videoSourceType === 'deepfake' && deepfakeVideos.length === 0 && (
                          <div className="no-video-notice">
                            <p>💡 Bạn chưa có video deepfake nào. Tạo video ghép mặt mới ngay!</p>
                            <button
                              onClick={() => navigate('/create-content', { state: { activeTab: 'deepfake' } })}
                              className="create-deepfake-btn"
                            >
                              <span className="material-symbols-outlined">face_retouching_natural</span>
                              <span>Tạo video deepfake ngay</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Custom Upload Option */}
                  <div className="video-option">
                    <div className="option-header">
                      <input
                        type="radio"
                        name="videoChoice"
                        id="video-custom"
                        checked={videoSourceType === 'custom'}
                        onChange={() => handleVideoSourceTypeChange('custom')}
                      />
                      <div className="option-content">
                        <label htmlFor="video-custom">Upload video tùy chỉnh</label>
                        <div className="file-input-wrapper">
                          <label className="file-button" htmlFor="custom-video-input">
                            Chọn tệp
                          </label>
                          <input
                            type="text"
                            className="file-name"
                            value={selectedVideoFile?.name || 'Không có tệp nào được chọn'}
                            readOnly
                            disabled
                          />
                          <input
                            id="custom-video-input"
                            type="file"
                            accept="video/*"
                            onChange={handleVideoFileChange}
                            disabled={videoSourceType !== 'custom'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Preview */}
                {(selectedVideoUrl || selectedVideoFile) && (
                  <div className="video-preview-panel">
                    <label>Preview:</label>
                    <div className="preview-wrapper">
                      <video
                        ref={videoRef}
                        src={selectedVideoUrl || (selectedVideoFile ? URL.createObjectURL(selectedVideoFile) : '')}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setField('isPlaying', false)}
                      />

                      {!isPlaying && (
                        <div className="play-overlay" onClick={handlePlayPause}>
                          <button>
                            <span className="material-symbols-outlined">play_circle</span>
                          </button>
                        </div>
                      )}

                      <div className="video-controls">
                        <button className="control-button" onClick={handlePlayPause}>
                          <span className="material-symbols-outlined">
                            {isPlaying ? 'pause' : 'play_arrow'}
                          </span>
                        </button>

                        <div className="progress-bar" onClick={handleProgressClick}>
                          <div
                            className="progress"
                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                          ></div>
                        </div>

                        <span className="time-display">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Voice Configuration */}
          <div className="section-card">
            <div className="section-header">
              <span className="icon-wrapper">
                <span className="material-symbols-outlined">record_voice_over</span>
              </span>
              <h2>Cấu hình Giọng Nói</h2>
            </div>

            <div className="section-content">
              <div className="voice-mode-selector">
                <div className="mode-option">
                  <input
                    type="radio"
                    name="voiceMode"
                    id="voice-preset"
                    value="preset"
                    checked={voiceMode === 'preset'}
                    onChange={(e) => setField('voiceMode', e.target.value as 'preset' | 'clone')}
                  />
                  <label htmlFor="voice-preset">Sử dụng giọng có sẵn</label>
                </div>
                <div className="mode-option">
                  <input
                    type="radio"
                    name="voiceMode"
                    id="voice-clone"
                    value="clone"
                    checked={voiceMode === 'clone'}
                    onChange={(e) => setField('voiceMode', e.target.value as 'preset' | 'clone')}
                  />
                  <label htmlFor="voice-clone">Giọng nói tải lên</label>
                </div>
              </div>

              {voiceMode === 'preset' && (
                <div className="voice-config-panel">
                  <h3>Cấu hình giọng nói:</h3>
                  <div className="voice-grid">
                    <div className="voice-field">
                      <label>Giới tính:</label>
                      <select value={gender} onChange={(e) => setField('gender', e.target.value)}>
                        {genderOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="voice-field">
                      <label>Vùng miền:</label>
                      <select value={area} onChange={(e) => setField('area', e.target.value)}>
                        {areaOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="voice-field">
                      <label>Nhóm giọng:</label>
                      <select value={group} onChange={(e) => setField('group', e.target.value)}>
                        {groupOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="voice-field">
                      <label>Cảm xúc:</label>
                      <select value={emotion} onChange={(e) => setField('emotion', e.target.value)}>
                        {emotionOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {voiceMode === 'clone' && (
                <div className="voice-config-panel voice-clone-panel">
                  <h3>Giả lập giọng từ file mẫu:</h3>

                  {/* Audio Mode Tabs */}
                  <div className="audio-mode-tabs">
                    <button
                      className={audioMode === 'upload' ? 'active' : ''}
                      onClick={() => setField('audioMode', 'upload')}
                    >
                      <span className="material-symbols-outlined">upload_file</span>
                      Upload Audio Mới
                    </button>
                    <button
                      className={audioMode === 'existing' ? 'active' : ''}
                      onClick={() => setField('audioMode', 'existing')}
                    >
                      <span className="material-symbols-outlined">library_music</span>
                      Chọn từ Thư viện ({myAudios.length})
                    </button>
                  </div>

                  {/* Upload New Audio */}
                  {audioMode === 'upload' && (
                    <div className="audio-upload-section">
                      <div className="reference-text-input">
                        <label htmlFor="reference-text">
                          <span className="material-symbols-outlined">text_fields</span>
                          Reference Text (nội dung của audio mẫu):
                          <span className="required">*</span>
                        </label>
                        <textarea
                          id="reference-text"
                          value={tempReferenceText}
                          onChange={(e) => setField('tempReferenceText', e.target.value)}
                          placeholder="Nhập chính xác nội dung mà người nói đọc trong file audio ..."
                          rows={8}
                        />
                        <div className="char-count">
                          {tempReferenceText.length}/1000 ký tự
                        </div>
                        <div className="info-text">
                          <span className="material-symbols-outlined">info</span>
                          Lưu ý: Reference text phải khớp với nội dung trong audio để có kết quả tốt nhất
                        </div>
                      </div>

                      <div className="audio-file-input">
                        <label htmlFor="audio-upload">
                          <span className="material-symbols-outlined">audiotrack</span>
                          Chọn file audio mẫu:
                          <span className="required">*</span>
                        </label>
                        <div className="file-input-wrapper">
                          <input
                            id="audio-upload"
                            type="file"
                            accept="audio/*"
                            onChange={handleReferenceAudioFileChange}
                            disabled={isUploadingAudio || !tempReferenceText.trim()}
                          />
                        </div>
                        {isUploadingAudio && (
                          <div className="upload-progress">
                            <span className="material-symbols-outlined spinning">progress_activity</span>
                            Đang upload và xử lý audio...
                          </div>
                        )}
                      </div>

                      {referenceAudioUrl && referenceText && (
                        <div className="audio-success-info">
                          <span className="material-symbols-outlined">check_circle</span>
                          <div className="success-details">
                            <strong>Audio đã sẵn sàng!</strong>
                            <p>Reference Text: "{referenceText}"</p>
                            <audio src={referenceAudioUrl} controls />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Select Existing Audio */}
                  {audioMode === 'existing' && (
                    <div className="audio-library-section">
                      {myAudios.length === 0 ? (
                        <div className="empty-library">
                          <span className="material-symbols-outlined">music_off</span>
                          <p>Bạn chưa có audio nào trong thư viện</p>
                          <button
                            onClick={() => setField('audioMode', 'upload')}
                            className="switch-mode-btn"
                          >
                            <span className="material-symbols-outlined">upload</span>
                            Upload audio đầu tiên
                          </button>
                        </div>
                      ) : (
                        <div className="audio-grid">
                          {myAudios.map((audio) => (
                            <div
                              key={audio.id}
                              className={`audio-card ${referenceAudioUrl === audio.audio_url ? 'selected' : ''}`}
                            >
                              <div className="audio-card-header">
                                <span className="material-symbols-outlined">audiotrack</span>
                                <span className="audio-id">Audio #{audio.id}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAudio(audio.id);
                                  }}
                                  className="delete-audio-btn"
                                  title="Xóa audio"
                                >
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              </div>

                              <div className="audio-card-content">
                                <div className="reference-text-display">
                                  <label>Reference Text:</label>
                                  <p>"{audio.reference_text}"</p>
                                </div>

                                <audio src={audio.audio_url} controls />

                                <button
                                  onClick={() => handleSelectExistingAudio(audio)}
                                  className={`select-audio-btn ${referenceAudioUrl === audio.audio_url ? 'selected' : ''
                                    }`}
                                >
                                  {referenceAudioUrl === audio.audio_url ? (
                                    <>
                                      <span className="material-symbols-outlined">check_circle</span>
                                      Đã chọn
                                    </>
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined">radio_button_unchecked</span>
                                      Chọn audio này
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Audio Info */}
                  {referenceAudioUrl && referenceText && (
                    <div className="selected-audio-summary">
                      <div className="summary-header">
                        <span className="material-symbols-outlined">speaker</span>
                        <strong>Giọng đã chọn sẽ được sử dụng</strong>
                      </div>
                      <div className="summary-content">
                        <p className="reference-text-summary">
                          <span className="label">Reference Text:</span>
                          "{referenceText}"
                        </p>
                        <button
                          onClick={() => patch({ referenceAudioUrl: '', referenceText: '' })}
                          className="clear-selection-btn"
                        >
                          <span className="material-symbols-outlined">close</span>
                          Hủy chọn
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              onClick={processAllSlidesAndCreateVideo}
              disabled={isProcessing || (!selectedVideoUrl && !selectedVideoFile)}
              className="create-video-btn"
            >
              <span className="material-symbols-outlined">movie</span>
              {isProcessing ? 'Đang xử lý...' : 'Tạo Video Thuyết Trình'}
            </button>
            <button onClick={handleReset} className="reset-btn">
              <span className="material-symbols-outlined">refresh</span>
              Reset
            </button>
          </div>

          {processingMessage && (
            <div className="processing-message">
              <span className="material-symbols-outlined">hourglass_empty</span>
              {processingMessage}
            </div>
          )}
        </div>
      )}

      {/* Final result */}
      {finalVideoUrl && (
        <div className="result-section">
          <h3>
            <span className="material-symbols-outlined">check_circle</span>
            Video thuyết trình hoàn chỉnh
          </h3>
          <video src={finalVideoUrl} controls />
          <button onClick={handleDownload} className="download-btn">
            <span className="material-symbols-outlined">download</span>
            Tải video xuống
          </button>
        </div>
      )}
    </div>
  );
};

export default SlideToVideo;
