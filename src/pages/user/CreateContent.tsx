import React, { useState } from 'react';
import TextToSpeech from '../../components/ai-features/TextToSpeech';
import DeepfakeVideo from '../../components/ai-features/DeepfakeVideo';
import FakelipVideo from '../../components/ai-features/FakelipVideo';
// import TextToSlide from '../../components/ai-features/TextToSlide';

const CreateContent = () => {
  const [activeTab, setActiveTab] = useState('tts');

  return (
    <div className="create-content-page">
      <h1>Tạo nội dung với AI</h1>
      <p>Sử dụng các công nghệ AI để tạo bài giảng và nội dung số</p>

      <div className="tabs-container">
        <div className="tabs">
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
          <button
            className={`tab ${activeTab === 'slides' ? 'active' : ''}`}
            onClick={() => setActiveTab('slides')}
          >
            Tạo Slides
          </button>
        </div>

        <div className="tab-content">
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