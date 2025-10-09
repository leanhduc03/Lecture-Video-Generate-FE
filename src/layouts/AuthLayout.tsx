import { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-logo">
          <Link to="/">
            <h1>LecVidGen</h1>
            <p>Ứng dụng học máy trong xây dựng bài giảng số</p>
          </Link>
        </div>
        
        <div className="auth-card">
          <Outlet />
        </div>
      </div>
      
      <footer className="auth-footer">
        <p>&copy; 2025 LecVidGen. Bản quyền thuộc về DATN</p>
      </footer>
    </div>
  );
};

export default AuthLayout;
