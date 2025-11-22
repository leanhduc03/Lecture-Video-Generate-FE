import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdHistory, MdMenuBook, MdMovieCreation } from "react-icons/md";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/create-content');
  };
  const handleViewRecentVideos = () => {
    navigate('/my-videos');
  };

  return (
    <div className="dashboard">
      <section className="board">
          <h1 className="board-title">Bảng điều khiển người dùng</h1>
          <p className="board-content">Xin chào {user?.username}! Chào mừng đến với ứng dụng học máy trong xây dựng bài giảng số.</p>
      </section>
      <section className="main-card">
          <div className="main-card-content">
              {<MdMovieCreation className="icon-movie"/>}
              <h2 className="card-heading">Tạo Video Mới</h2>
              <p className="card-description">Tạo bài giảng video từ file PowerPoint và văn bản một cách dễ dàng.</p>
              <button className="card-btn" onClick={handleGetStarted}>
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
            <button className="btn-secondary">
                Xem
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
    </div>
  );
};

export default Dashboard;
