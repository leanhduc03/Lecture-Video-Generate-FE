import React, { useState } from 'react';
import TextToSpeech from '../../components/ai-features/TextToSpeech';
import DeepfakeVideo from '../../components/ai-features/DeepfakeVideo';
import FakelipVideo from '../../components/ai-features/FakelipVideo';
import CombinedAIFeature from '../../components/ai-features/CombinedAIFeature';
import SlideToVideo from '../../components/ai-features/SlideToVideo';
// import TextToSlide from '../../components/ai-features/TextToSlide';

const CreateContent = () => {
  const [activeTab, setActiveTab] = useState('slide');

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
            className={`tab ${activeTab === 'combined' ? 'active' : ''}`}
            onClick={() => setActiveTab('combined')}
          >
            Video AI Tổng Hợp
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
          {/* <button
            className={`tab ${activeTab === 'slides' ? 'active' : ''}`}
            onClick={() => setActiveTab('slides')}
          >
            Tạo Slides
          </button> */}
        </div>

        <div className="tab-content">
          {activeTab === 'slide' && <SlideToVideo />}
          {activeTab === 'combined' && <CombinedAIFeature />}
          {activeTab === 'tts' && <TextToSpeech />}
          {activeTab === 'deepfake' && <DeepfakeVideo />}
          {activeTab === 'fakelip' && <FakelipVideo />}
          {/* {activeTab === 'slides' && <TextToSlide />} */}
        </div>
      </div>
    </div>
  );
};

export default CreateContent;