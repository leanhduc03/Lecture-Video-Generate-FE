import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  // Thống kê mẫu
  const stats = {
    totalUsers: 124,
    activeUsers: 98,
    pendingVerification: 26,
    videosCreated: 512,
    storageUsed: '125.4 GB',
    systemUptime: '99.8%'
  };

  return (
    <div className="admin-dashboard">
      <h1>Bảng điều khiển Admin</h1>
      <div className="welcome-card">
        <h2>Xin chào, {user?.username}!</h2>
        <p>Đây là trang quản trị hệ thống.</p>
      </div>

      <div className="stats-overview">
        <h2>Tổng quan hệ thống</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Tổng người dùng</h3>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
          <div className="stat-card">
            <h3>Người dùng hoạt động</h3>
            <p className="stat-value">{stats.activeUsers}</p>
          </div>
          <div className="stat-card">
            <h3>Đang chờ xác thực</h3>
            <p className="stat-value">{stats.pendingVerification}</p>
          </div>
          <div className="stat-card">
            <h3>Video đã tạo</h3>
            <p className="stat-value">{stats.videosCreated}</p>
          </div>
          <div className="stat-card">
            <h3>Dung lượng đã dùng</h3>
            <p className="stat-value">{stats.storageUsed}</p>
          </div>
          <div className="stat-card">
            <h3>Uptime hệ thống</h3>
            <p className="stat-value">{stats.systemUptime}</p>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h2>Hoạt động gần đây</h2>
        <table className="activity-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Người dùng</th>
              <th>Hoạt động</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>01/08/2025 14:22</td>
              <td>user123</td>
              <td>Đăng ký tài khoản mới</td>
            </tr>
            <tr>
              <td>01/08/2025 13:15</td>
              <td>teacher_vn</td>
              <td>Tạo video mới</td>
            </tr>
            <tr>
              <td>01/08/2025 12:05</td>
              <td>student2025</td>
              <td>Xác thực email</td>
            </tr>
            <tr>
              <td>01/08/2025 10:30</td>
              <td>lecture_creator</td>
              <td>Đặt lại mật khẩu</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
