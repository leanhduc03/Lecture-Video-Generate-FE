import React, { useState } from 'react';
import ImageLibrary from '../../components/library/ImageLibrary';
import VideoLibrary from '../../components/library/VideoLibrary';
import AudioLibrary from '../../components/library/AudioLibrary';
import { MdImage, MdRecordVoiceOver, MdVideoLibrary } from 'react-icons/md';
import '../../styles/my-library.scss';

type TabType = 'images' | 'audios' | 'videos';

const MyLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('images');

  return (
    <div className="my-library-page">
      <div className="library-container">
        <header className="page-header">
          <h1>Thư viện của tôi</h1>
          <p>Quản lý tất cả tài nguyên đã tải lên của bạn</p>
        </header>

        <nav className="library-tabs">
          <button
            className={`tab-btn ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            <MdImage />
            <span>Ảnh</span>
          </button>
          
          <button
            className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            <MdVideoLibrary />
            <span>Video</span>
          </button>
          
          <button
            className={`tab-btn ${activeTab === 'audios' ? 'active' : ''}`}
            onClick={() => setActiveTab('audios')}
          >
            <MdRecordVoiceOver />
            <span>Giọng nói</span>
          </button>
        </nav>

        <div className="tab-content">
          {activeTab === 'images' && <ImageLibrary />}
          {activeTab === 'videos' && <VideoLibrary />}
          {activeTab === 'audios' && <AudioLibrary />}
        </div>
      </div>
    </div>
  );
};

export default MyLibrary;