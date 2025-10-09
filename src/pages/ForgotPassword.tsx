import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    navigate(`/reset-password?email=${encodeURIComponent(email)}`);
  };

  if (success) {
    return (
      <div className="reset-success">
        <h2>Yêu cầu đặt lại mật khẩu đã được gửi!</h2>
        <p>Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi mã xác thực đến email của bạn.</p>
        <p>Vui lòng kiểm tra hộp thư của bạn và nhấn nút bên dưới để tiếp tục.</p>
        <div className="buttons">
          <button onClick={handleResetPassword} className="primary-button">
            Tiếp tục đặt lại mật khẩu
          </button>
        </div>
        <div className="links">
          <Link to="/login">Quay lại đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-container">
      <h2>Quên mật khẩu</h2>
      <p>Nhập email của bạn để nhận mã đặt lại mật khẩu.</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Gửi yêu cầu'}
        </button>
      </form>
      
      <div className="links">
        <Link to="/login">Quay lại đăng nhập</Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
