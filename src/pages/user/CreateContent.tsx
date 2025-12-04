import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TextToSpeech from '../../components/ai-features/TextToSpeech';
import DeepfakeVideo from '../../components/ai-features/DeepfakeVideo';
import FakelipVideo from '../../components/ai-features/FakelipVideo';
import CombinedAIFeature from '../../components/ai-features/CombinedAIFeature';
import SlideToVideo from '../../components/ai-features/SlideToVideo';
import UploadedSlideToVideo from '../../components/ai-features/UploadedSlideToVideo';

const CreateContent = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('slide');

  useEffect(() => {
    // Nhận activeTab từ navigation state
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location]);

  return (
    <div className="create-content-page">
      <h1>Tạo nội dung với AI</h1>
      <p>Sử dụng các công nghệ AI để tạo bài giảng và nội dung số</p>

      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'slide' ? 'active' : ''}`}
            onClick={() => setActiveTab('slide')}
          >
            Slide to Video
          </button>
          <button
            className={`tab ${activeTab === 'uploadedslide' ? 'active' : ''}`}
            onClick={() => setActiveTab('uploadedslide')}
          >
            Uploaded Slide to Video
          </button>
          <button
            className={`tab ${activeTab === 'tts' ? 'active' : ''}`}
            onClick={() => setActiveTab('tts')}
          >
            Text-to-Speech
          </button>
          <button
            className={`tab ${activeTab === 'deepfake' ? 'active' : ''}`}
            onClick={() => setActiveTab('deepfake')}
          >
            Deepfake Video
          </button>
          <button
            className={`tab ${activeTab === 'fakelip' ? 'active' : ''}`}
            onClick={() => setActiveTab('fakelip')}
          >
            Fakelip Video
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'slide' && <SlideToVideo />}
          {activeTab === 'uploadedslide' && <UploadedSlideToVideo />}
          {activeTab === 'combined' && <CombinedAIFeature />}
          {activeTab === 'tts' && <TextToSpeech />}
          {activeTab === 'deepfake' && <DeepfakeVideo />}
          {activeTab === 'fakelip' && <FakelipVideo />}
        </div>
      </div>
    </div>
  );
};

export default CreateContent;