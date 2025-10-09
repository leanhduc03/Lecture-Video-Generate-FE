const NotFound = () => {
  return (
    <div className="not-found">
      <h1>404</h1>
      <h2>Trang không tồn tại</h2>
      <p>Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
      <a href="/" className="back-link">Quay lại trang chủ</a>
    </div>
  );
};

export default NotFound;
