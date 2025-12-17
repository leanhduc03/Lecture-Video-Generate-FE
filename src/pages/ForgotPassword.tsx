import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';
import { Button } from 'antd';

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
      <div className="font-display bg-background-light text-slate-900 antialiased">
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
            <div className="w-full max-w-md mx-auto text-center">
                <div className="flex justify-center mb-6">
                    <div className="flex items-center justify-center h-16 w-16 bg-primary/10 rounded-full">
                        <span className="material-symbols-outlined text-3xl text-primary">mark_email_read</span>
                    </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                    Yêu cầu đặt lại mật khẩu đã được gửi!
                </h1>
                <p className="text-slate-600 mb-8 max-w-sm mx-auto">
                    Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi mã xác thực đến email của bạn. Vui lòng kiểm tra hộp thư của bạn và nhấn nút bên dưới để tiếp tục.
                </p>
                <div className="space-y-4">
                    <Button className="block w-full text-base font-medium text-center text-white bg-primary rounded-lg shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background-light transition-colors" 
                      onClick={handleResetPassword}>
                        Tiếp tục đặt lại mật khẩu
                    </Button>
                    <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors" to="/login">
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Quay lại đăng nhập
                    </Link>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light font-display text-slate-700">
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-8 m-4">
            <div className="text-center mb-8">
                <Link className="inline-flex items-center gap-2 text-2xl font-bold text-slate-800" to="#">
                  <span className="text-primary text-4xl">LectureStudio</span>
                </Link>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md border border-slate-200">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Quên mật khẩu?</h1>
                    <p className="text-slate-600">Nhập email của bạn để nhận mã đặt lại mật khẩu.</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="email">Email</label>
                        <input className="block w-full rounded-md border-slate-300 bg-slate-50  text-slate-900 pl-10 py-3 focus:border-primary focus:ring-primary placeholder-slate-400" id="email" name="email" placeholder="lecture@gmail.com" required type="email" 
                          onChange={(e) => setEmail(e.target.value)} value={email}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200">
                        {loading ? 'Đang xử lý...' : 'Gửi yêu cầu'}
                    </button>
                </form>
            </div>
            <div className="mt-6 text-center">
                <Link className="text-sm font-medium text-primary" to="/login">
                  <span className="inline-block">←</span> Quay lại đăng nhập
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
