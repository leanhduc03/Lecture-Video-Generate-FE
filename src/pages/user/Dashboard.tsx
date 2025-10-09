import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/create-content');
  };

  return (
    <div className="dashboard">
      <h1>Bảng điều khiển người dùng</h1>
      <div className="welcome-card">
        <h2>Xin chào, {user?.username}!</h2>
        <p>Chào mừng đến với ứng dụng học máy trong xây dựng bài giảng số.</p>
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Tạo Video Mới</h3>
          <p>Tạo bài giảng video từ file PowerPoint và văn bản.</p>
          <button className="btn-primary" onClick={handleGetStarted}>Bắt đầu</button>
        </div>

        <div className="card">
          <h3>Video Gần Đây</h3>
          <p>Xem các video đã tạo gần đây.</p>
          <button className="btn-secondary">Xem</button>
        </div>

        <div className="card">
          <h3>Hướng Dẫn Sử Dụng</h3>
          <p>Tìm hiểu cách sử dụng hệ thống hiệu quả nhất.</p>
          <button className="btn-secondary">Xem hướng dẫn</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
