import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateCurrentUser } from '../../services/authService';

const Profile = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Kiểm tra nếu có thay đổi mật khẩu
      if (password) {
        if (password !== confirmPassword) {
          setError('Mật khẩu xác nhận không khớp');
          setLoading(false);
          return;
        }
      }

      const updateData: {email?: string; password?: string} = {};
      
      if (email !== user?.email) {
        updateData.email = email;
      }
      
      if (password) {
        updateData.password = password;
      }

      if (Object.keys(updateData).length === 0) {
        setError('Không có thông tin nào được thay đổi');
        setLoading(false);
        return;
      }

      await updateCurrentUser(updateData);
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Cập nhật thông tin thất bại. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <section className="board">
          <h1 className="board-title">Thông tin cá nhân</h1>
          <p className="board-description">Quản lý thông tin của bạn và cập nhật mật khẩu.</p>
      </section>
      
      {success && <div className="success-message">Cập nhật thông tin thành công!</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="profile-wrapper">
          <div className="profile-info">
              <div className="profile-info-wrapper">
                  <h2 className="header-title">Thông tin tài khoản</h2>
                  <div className="content">
                      <div>
                          <h3 className="field-info">Tên đăng nhập</h3>
                          <p className="field-value">{user?.username}</p>
                      </div>
                      <div>
                          <h3 className="field-info">Vai trò</h3>
                          <p className="field-value">{user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</p>
                      </div>
                      <div>
                          <h3 className="field-info">Ngày tạo</h3>
                          <p className="field-value">{new Date(user?.created_at || '').toLocaleDateString('vi-VN')}</p>
                      </div>
                  </div>
              </div>
          </div>
          <div className="profile-form">
              <div className="profile-form-wrapper">
                  <h2 className="header-title">Cập nhật thông tin</h2>
                  <form className="form" onSubmit={handleSubmit}>
                      <div>
                          <label className="form-label">Email</label>
                          <div className="input-wrapper">
                              <input className="input-field" id="email" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                          </div>
                      </div>
                      <div>
                          <label className="form-label">Mật khẩu mới (để trống nếu không đổi)</label>
                          <div className="input-wrapper">
                              <input className="input-field" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                          </div>
                      </div>
                      <div>
                          <label className="form-label">Xác nhận mật khẩu mới</label>
                          <div className="input-wrapper">
                              <input className="input-field" id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={!password} />
                          </div>
                      </div>
                      <div className="btn-wrapper">
                          <button className="btn-submit" type="submit" disabled={loading}>
                              {loading ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Profile;
