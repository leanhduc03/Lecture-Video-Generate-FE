import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  return (
    <div className="unauthorized">
      <h1>403</h1>
      <h2>Không có quyền truy cập</h2>
      <p>Bạn không có quyền truy cập vào trang này.</p>
      
      {isAuthenticated && (
        <p>
          <Link to={isAdmin ? "/admin/dashboard" : "/dashboard"} className="back-link">
            Quay lại trang điều khiển
          </Link>
        </p>
      )}
      
      {!isAuthenticated && (
        <p>
          <Link to="/login" className="back-link">
            Đăng nhập
          </Link>
        </p>
      )}
    </div>
  );
};

export default Unauthorized;
