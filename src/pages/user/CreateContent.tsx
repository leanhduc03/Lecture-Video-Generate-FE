import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TextToSpeech from '../../components/ai-features/TextToSpeech';
import DeepfakeVideo from '../../components/ai-features/DeepfakeVideo';
import FakelipVideo from '../../components/ai-features/FakelipVideo';
import SlideToVideo from '../../components/ai-features/SlideToVideo';
import UploadedSlideToVideo from '../../components/ai-features/UploadedSlideToVideo';
import '../../styles/create-content.scss';

const CreateContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('slide');

  useEffect(() => {
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location]);

  return (
    <div className="create-content-page">
      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <h1>Tạo nội dung với AI</h1>
            <p>Biến tài liệu PowerPoint thành video thuyết minh chuyên nghiệp với AI</p>
          </div>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'slide' ? 'active' : ''}`}
            onClick={() => setActiveTab('slide')}
          >
            <span className="material-symbols-outlined icon">slideshow</span>
            Slide to Video
          </button>

          <button
            className={`tab ${activeTab === 'uploadedslide' ? 'active' : ''}`}
            onClick={() => setActiveTab('uploadedslide')}
          >
            <span className="material-symbols-outlined icon">upload_file</span>
            Uploaded Slide to Video
          </button>

          <button
            className={`tab ${activeTab === 'deepfake' ? 'active' : ''}`}
            onClick={() => setActiveTab('deepfake')}
          >
            <span className="material-symbols-outlined icon">video_camera_front</span>
            Deepfake Video
            <span className="badge">BETA</span>
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'slide' && <SlideToVideo />}
          {activeTab === 'uploadedslide' && <UploadedSlideToVideo />}
          {activeTab === 'tts' && <TextToSpeech />}
          {activeTab === 'deepfake' && <DeepfakeVideo />}
          {activeTab === 'fakelip' && <FakelipVideo />}
        </div>
      </div>
    </div>
  );
};

export default CreateContent;