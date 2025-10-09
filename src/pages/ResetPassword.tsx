import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { resetPassword } from '../services/authService';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await resetPassword(email, code, password);
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Đã xảy ra lỗi. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-success">
        <h2>Đặt lại mật khẩu thành công!</h2>
        <p>Mật khẩu của bạn đã được đặt lại. Bạn có thể đăng nhập bằng mật khẩu mới.</p>
        <button onClick={() => navigate('/login')}>Đi đến trang đăng nhập</button>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <h2>Đặt lại mật khẩu</h2>
      {!email && <p className="error-message">Không có email được cung cấp. Vui lòng thử lại.</p>}
      
      {email && (
        <>
          <p>Nhập mã xác thực và mật khẩu mới của bạn.</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                value={email}
                disabled
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="code">Mã xác thực:</label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Mật khẩu mới:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu mới:</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        </>
      )}
      
      <div className="links">
        <Link to="/login">Quay lại đăng nhập</Link>
      </div>
    </div>
  );
};

export default ResetPassword;
