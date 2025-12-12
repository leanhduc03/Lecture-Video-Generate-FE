import React, { useState } from 'react';
import ImageLibrary from '../../components/library/ImageLibrary';
import { MdImage, MdRecordVoiceOver, MdVideoLibrary } from 'react-icons/md';
import '../../styles/my-library.scss';

type TabType = 'images' | 'voices' | 'videos';

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
            className={`tab-btn ${activeTab === 'voices' ? 'active' : ''} disabled`}
            disabled
            title="Sắp ra mắt"
          >
            <MdRecordVoiceOver />
            <span>Giọng nói</span>
            {/* <span className="coming-soon">Sắp có</span> */}
          </button>
          
          <button
            className={`tab-btn ${activeTab === 'videos' ? 'active' : ''} disabled`}
            disabled
            title="Sắp ra mắt"
          >
            <MdVideoLibrary />
            <span>Video</span>
            {/* <span className="coming-soon">Sắp có</span> */}
          </button>
        </nav>

        <div className="tab-content">
          {activeTab === 'images' && <ImageLibrary />}
          {activeTab === 'voices' && (
            <div className="placeholder-content">
              <MdRecordVoiceOver className="placeholder-icon" />
              <h3>Thư viện giọng nói</h3>
              <p>Tính năng này sẽ sớm được ra mắt</p>
            </div>
          )}
          {activeTab === 'videos' && (
            <div className="placeholder-content">
              <MdVideoLibrary className="placeholder-icon" />
              <h3>Thư viện video</h3>
              <p>Tính năng này sẽ sớm được ra mắt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyLibrary;