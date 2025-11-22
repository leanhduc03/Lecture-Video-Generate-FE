import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSystemStats, SystemStats } from '../../services/adminService';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminUsers: 0,
    regularUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getSystemStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Đang tải dữ liệu...</div>;
  }

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
            <h3>Chưa kích hoạt</h3>
            <p className="stat-value">{stats.inactiveUsers}</p>
          </div>
          <div className="stat-card">
            <h3>Quản trị viên</h3>
            <p className="stat-value">{stats.adminUsers}</p>
          </div>
          <div className="stat-card">
            <h3>Người dùng thường</h3>
            <p className="stat-value">{stats.regularUsers}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
