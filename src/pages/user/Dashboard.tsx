import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdHistory, MdMenuBook, MdMovieCreation, MdClose, MdFolder, MdPlayCircle, MdAddCircle, MdSchedule, MdUploadFile } from "react-icons/md";
import imageIllustration from '../../static/image/image.png';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const handleGetStarted = () => {
    setShowModal(true);
  };

  const handleViewRecentVideos = () => {
    navigate('/my-videos');
  };

  const handleViewLibrary = () => {
    navigate('/my-library');
  };

  const handleChooseSlideToVideo = () => {
    setShowModal(false);
    navigate('/create-content', { state: { activeTab: 'slide' } });
  };

  const handleChooseUploadedSlide = () => {
    setShowModal(false);
    navigate('/create-content', { state: { activeTab: 'uploadedslide' } });
  };

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-2">
        <div>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">Tổng quan</h1>
          <p className="text-slate-600 mt-1 text-[15px]">
            Chào mừng trở lại, <span className="text-purple-600 font-semibold">{user?.username}</span>! Bạn đã sẵn sàng tạo video mới chưa?
          </p>
        </div>
        <div className="text-sm text-slate-600 font-medium bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
          <MdSchedule className="text-purple-600" />
          <span className="text-slate-900">{new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="w-full mb-5 group relative">
        <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-[2rem] -z-10 opacity-60"></div>
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-100 flex flex-col md:flex-row h-[320px]">
          <div className="p-7 md:p-10 md:w-1/2 flex flex-col justify-center relative z-10 order-2 md:order-1">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold w-fit mb-4 border border-purple-100 tracking-wide uppercase">
              <MdMovieCreation className="text-base" />
              <span>AI Powered</span>
            </div> */}
            <h2 className="text-[26px] font-bold text-slate-900 mb-3 leading-tight">
              Biến bài giảng thành video chuyên nghiệp
            </h2>
            <p className="text-slate-600 text-[15px] mb-5 leading-relaxed">
              Công nghệ AI giúp bạn chuyển đổi slide PowerPoint thành video thuyết minh sống động chỉ trong vài phút.
            </p>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={handleGetStarted}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-7 rounded-xl shadow-lg shadow-purple-600/30 transition-all transform hover:-translate-y-1 text-[15px]"
              >
                <MdAddCircle className="text-lg" />
                <span>Tạo Video Mới</span>
              </button>
              {/* <button className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-3 px-6 rounded-xl transition-colors text-[15px]">
                <MdPlayCircle className="text-lg" />
                <span>Xem Demo</span>
              </button> */}
            </div>
          </div>
          <div className="md:w-1/2 bg-slate-50 relative overflow-hidden flex items-center justify-center order-1 md:order-2">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-blue-50/50"></div>
            <div className="absolute top-10 right-10 w-28 h-28 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
            <div className="absolute bottom-10 left-10 w-36 h-36 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
            <img 
              src={imageIllustration}
              alt="AI Video Creation Illustration" 
              className="relative z-10 w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
            />
          </div>
        </div>
      </div>

      {/* Three Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 ">
        {/* Recent Videos Card */}
        <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
          <div className="h-36 overflow-hidden relative bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10 opacity-60"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MdHistory className="text-white text-7xl opacity-20" />
            </div>
            <div className="absolute bottom-3 left-4 z-20 text-white flex items-center gap-2">
              <MdPlayCircle className="text-white text-xl" />
              <span className="font-bold text-[15px]">Gần đây</span>
            </div>
          </div>
          <div className="p-5 flex flex-col flex-grow">
            <h3 className="text-[17px] font-bold text-slate-800 mb-2 group-hover:text-purple-600 transition-colors">
              Video Gần Đây
            </h3>
            <p className="text-slate-600 text-[13px] mb-5 flex-grow leading-relaxed">
              Truy cập lại các dự án video bạn đang thực hiện hoặc đã hoàn thành gần đây.
            </p>
            <button 
              onClick={handleViewRecentVideos}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 rounded-lg font-medium text-[13px] transition-all flex items-center justify-center gap-2 group/btn"
            >
              <span>Xem danh sách</span>
              <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>

        {/* Library Card */}
        <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
          <div className="h-36 overflow-hidden relative bg-gradient-to-br from-purple-500 to-pink-600">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10 opacity-60"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MdFolder className="text-white text-7xl opacity-20" />
            </div>
            <div className="absolute bottom-3 left-4 z-20 text-white flex items-center gap-2">
              <MdFolder className="text-white text-xl" />
              <span className="font-bold text-[15px]">Thư viện</span>
            </div>
          </div>
          <div className="p-5 flex flex-col flex-grow">
            <h3 className="text-[17px] font-bold text-slate-800 mb-2 group-hover:text-purple-600 transition-colors">
              Thư viện của tôi
            </h3>
            <p className="text-slate-600 text-[13px] mb-5 flex-grow leading-relaxed">
              Kho lưu trữ trung tâm cho tất cả hình ảnh, âm thanh và tài liệu bài giảng của bạn.
            </p>
            <button 
              onClick={handleViewLibrary}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-purple-600 hover:text-white text-slate-600 rounded-lg font-medium text-[13px] transition-all flex items-center justify-center gap-2 group/btn"
            >
              <span>Vào thư viện</span>
              <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>

        {/* User Guide Card */}
        <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
          <div className="h-36 overflow-hidden relative bg-gradient-to-br from-teal-500 to-green-600">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10 opacity-60"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MdMenuBook className="text-white text-7xl opacity-20" />
            </div>
            <div className="absolute bottom-3 left-4 z-20 text-white flex items-center gap-2">
              <MdMenuBook className="text-white text-xl" />
              <span className="font-bold text-[15px]">Hỗ trợ</span>
            </div>
          </div>
          <div className="p-5 flex flex-col flex-grow">
            <h3 className="text-[17px] font-bold text-slate-800 mb-2 group-hover:text-purple-600 transition-colors">
              Hướng Dẫn Sử Dụng
            </h3>
            <p className="text-slate-600 text-[13px] mb-5 flex-grow leading-relaxed">
              Tài liệu chi tiết và video hướng dẫn giúp bạn làm chủ công cụ nhanh chóng.
            </p>
            <button className="w-full py-2.5 px-4 bg-slate-50 hover:bg-teal-600 hover:text-white text-slate-600 rounded-lg font-medium text-[13px] transition-all flex items-center justify-center gap-2 group/btn">
              <span>Xem tài liệu</span>
              <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 animate-fadeIn" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-96 max-w-90% relative shadow-2xl animate-popUp" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors" onClick={() => setShowModal(false)}>
              <MdClose className="text-2xl" />
            </button>
            
            <h3 className="text-xl font-semibold text-slate-900 mb-6 text-center pr-6">
              Chọn phương thức
            </h3>
            
            <div className="flex flex-col gap-3">
              <button 
                className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-xl bg-white hover:border-purple-600 hover:bg-purple-50 transition-all hover:translate-x-1"
                onClick={handleChooseSlideToVideo}
              >
                <span className="text-2xl">📝</span>
                <span className="text-sm font-medium text-slate-900">Tạo PowerPoint từ văn bản</span>
              </button>
              
              <button 
                className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-xl bg-white hover:border-purple-600 hover:bg-purple-50 transition-all hover:translate-x-1"
                onClick={handleChooseUploadedSlide}
              >
                <span className="text-2xl">📤</span>
                <span className="text-sm font-medium text-slate-900">Upload PowerPoint</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Dashboard;
