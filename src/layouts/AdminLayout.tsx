import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, logout } = useAuth();

  return (
    <div className="admin-layout">
      <header className="header">
        <div className="container">
          <div className="logo">
            <Link to="/admin/dashboard">LecVidGen Admin</Link>
          </div>
          
          <div className="user-menu">
            <div className="user-info">
              <span>Admin: {user?.username}</span>
            </div>
            <div className="dropdown">
              <ul>
                <li>
                  <Link to="/admin/profile">Hồ sơ</Link>
                </li>
                <li>
                  <button onClick={logout}>Đăng xuất</button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>
      
      <div className="admin-container">
        <aside className="sidebar">
          <nav className="admin-nav">
            <ul>
              <li>
                <Link to="/admin/dashboard">Tổng quan</Link>
              </li>
              <li>
                <Link to="/admin/users">Quản lý người dùng</Link>
              </li>
              <li>
                <Link to="/admin/videos">Quản lý video</Link>
              </li>
              {/* <li>
                <Link to="/admin/settings">Cài đặt hệ thống</Link>
              </li> */}
            </ul>
          </nav>
        </aside>
        
        <main className="admin-content">
          {children}
        </main>
      </div>
      
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 LecVidGen Admin. Bản quyền thuộc về DATN</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
