import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  return (
    <div className="bg-background-light font-display text-slate-800 antialiased">
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center py-16">
            <div className="relative inline-block">
              <span className="material-symbols-outlined text-8xl text-red-500/30 absolute -top-8 -left-12 -z-10 transform rotate-12">lock</span>
              <span className="material-symbols-outlined text-6xl text-red-500/20 absolute -bottom-10 right-4 -z-10 transform -rotate-6">gpp_bad</span>
              <h1 className="text-8xl md:text-9xl font-black text-slate-900 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-red-600">403</h1>
            </div>
            <h2 className="mt-4 text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Truy cập bị từ chối</h2>
            <p className="mt-3 text-lg text-slate-600 max-w-md mx-auto">Rất tiếc, bạn không có quyền truy cập vào trang này.</p>
            <div className="mt-8">
              {isAuthenticated ? (
                <Link to={isAdmin ? "/admin/users" : "/dashboard"} className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-sky-500 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-75 focus:ring-offset-2 focus:ring-offset-background-light">
                  <span className="material-symbols-outlined">home</span>
                  Về trang chủ
                </Link>
              ) : (
                <Link to="/login" className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-sky-500 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-75 focus:ring-offset-2 focus:ring-offset-background-light">
                  <span className="material-symbols-outlined">home</span>
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        </main>
        <footer className="mt-auto py-6">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
            <p>© 2025 LecVidGen. Bản quyền thuộc về DATN.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Unauthorized;
