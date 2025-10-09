import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface UserLayoutProps {
  children: ReactNode;
}

const UserLayout = ({ children }: UserLayoutProps) => {
  const { user, logout } = useAuth();

  return (
    <div className="user-layout">
      <header className="header">
        <div className="container">
          <div className="logo">
            <Link to="/dashboard">LecVidGen</Link>
          </div>
          
          <nav className="main-nav">
            <ul>
              <li>
                <Link to="/dashboard">Trang chủ</Link>
              </li>
              <li>
                <Link to="/create">Tạo video</Link>
              </li>
              <li>
                <Link to="/my-videos">Video của tôi</Link>
              </li>
            </ul>
          </nav>
          
          <div className="user-menu">
            <div className="user-info">
              <span>Xin chào, {user?.username}</span>
            </div>
            <div className="dropdown">
              <ul>
                <li>
                  <Link to="/profile">Hồ sơ</Link>
                </li>
                <li>
                  <button onClick={logout}>Đăng xuất</button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>
      
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>
      
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 LecVidGen. Bản quyền thuộc về DATN</p>
        </div>
      </footer>
    </div>
  );
};

export default UserLayout;
