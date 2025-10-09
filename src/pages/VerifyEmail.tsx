import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyEmail } from '../services/authService';

const VerifyEmail = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const username = searchParams.get('username') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      setError('Không có tên đăng nhập được cung cấp.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await verifyEmail(username, code);
      navigate('/login', { state: { message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.' } });
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Mã xác thực không hợp lệ hoặc đã hết hạn.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-email-container">
      <h2>Xác thực email</h2>
      
      {!username ? (
        <div className="error-message">
          <p>Không có tên đăng nhập được cung cấp. Vui lòng kiểm tra lại liên kết.</p>
          <button onClick={() => navigate('/login')}>Quay lại đăng nhập</button>
        </div>
      ) : (
        <>
          <p>Chúng tôi đã gửi mã xác thực đến email đăng ký của bạn. Vui lòng nhập mã để hoàn tất quá trình đăng ký.</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Tên đăng nhập:</label>
              <input
                type="text"
                id="username"
                value={username}
                disabled
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
            
            <button type="submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Xác thực'}
            </button>
          </form>
          
          <div className="links">
            <button 
              className="link-button" 
              onClick={() => navigate('/login')}
            >
              Quay lại đăng nhập
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VerifyEmail;
