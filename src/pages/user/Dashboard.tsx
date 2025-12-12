import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdHistory, MdMenuBook, MdMovieCreation, MdClose, MdFolder } from "react-icons/md";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleGetStarted = () => {
    setShowModal(true);
  };

  const handleViewRecentVideos = () => {
    navigate('/my-videos');
  };

  const handleViewLibrary = () => {
    navigate('/my-library');
  };

  const handleChooseSlideToVideo = () => {
    setShowModal(false);
    navigate('/create-content', { state: { activeTab: 'slide' } });
  };

  const handleChooseUploadedSlide = () => {
    setShowModal(false);
    navigate('/create-content', { state: { activeTab: 'uploadedslide' } });
  };

  return (
    <div className="dashboard">
      <section className="board">
          <h1 className="board-title">Bảng điều khiển người dùng</h1>
          <p className="board-content">Xin chào {user?.username}! Chào mừng đến với ứng dụng học máy trong xây dựng bài giảng số.</p>
      </section>
      <section className="main-card">
          <div className="main-card-content">
              <MdMovieCreation className="icon-movie"/>
              <h2 className="card-heading">Tạo Video Mới</h2>
              <p className="card-description">Tạo bài giảng video từ file PowerPoint và văn bản một cách dễ dàng.</p>
              <button 
                ref={buttonRef}
                className="card-btn" 
                onClick={handleGetStarted}
              >
                  Bắt đầu
              </button>
          </div>
      </section>

      <div className="second-card">
        <div className="card">
            <div className="card-header">
                <div className="icon-wrapper">
                    <MdHistory className="icon-card"/>
                </div>
                <h3 className="card-header-text">Video Gần Đây</h3>
            </div>
            <p className="card-description">Xem các video đã tạo gần đây để tiếp tục công việc của bạn hoặc chia sẻ chúng.</p>
            <button className="btn-secondary" onClick={handleViewRecentVideos}>
                Xem
            </button>
        </div>
        
        <div className="card">
            <div className="card-header">
                <div className="icon-wrapper">
                    <MdFolder className="icon-card"/>
                </div>
                <h3 className="card-header-text">Thư viện của tôi</h3>
            </div>
            <p className="card-description">Quản lý các ảnh, giọng nói và video đã tải lên của bạn.</p>
            <button className="btn-secondary" onClick={handleViewLibrary}>
                Xem thư viện
            </button>
        </div>
        
        <div className="card">
            <div className="card-header">
                <div className="icon-wrapper">
                    <MdMenuBook className="icon-card"/>
                </div>
                <h3 className="card-header-text">Hướng Dẫn Sử Dụng</h3>
            </div>
            <p className="card-description">Tìm hiểu cách sử dụng hệ thống hiệu quả nhất với các tài liệu hướng dẫn chi tiết của chúng tôi.</p>
            <button className="btn-secondary">
                Xem hướng dẫn
            </button>
        </div>
      </div>

      {/* Compact Modal Popup */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <MdClose />
            </button>
            
            <h3 className="modal-title">Chọn phương thức</h3>
            
            <div className="modal-options">
              <button className="modal-option" onClick={handleChooseSlideToVideo}>
                <span className="option-icon">📝</span>
                <span className="option-text">Tạo PowerPoint từ văn bản</span>
              </button>
              
              <button className="modal-option" onClick={handleChooseUploadedSlide}>
                <span className="option-icon">📤</span>
                <span className="option-text">Upload PowerPoint</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
