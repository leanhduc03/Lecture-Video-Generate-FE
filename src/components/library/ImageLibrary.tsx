import React, { useState, useEffect } from 'react';
import { getMyImages, deleteUploadedImage, UploadedImage, uploadSourceImage } from '../../services/uploadedImageService';
import { MdDelete, MdFileUpload, MdImage, MdClose } from 'react-icons/md';

const ImageLibrary: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyImages();
      setImages(data);
    } catch (err) {
      setError('Không thể tải danh sách ảnh');
      console.error('Error loading images:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await uploadSourceImage(file);
      await loadImages();
    } catch (err) {
      setError('Không thể upload ảnh. Vui lòng thử lại.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh này?')) return;

    try {
      setError(null);
      await deleteUploadedImage(imageId);
      await loadImages();
      if (selectedImage?.id === imageId) {
        setSelectedImage(null);
        setShowPreview(false);
      }
    } catch (err) {
      setError('Không thể xóa ảnh. Vui lòng thử lại.');
      console.error('Delete error:', err);
    }
  };

  const handleImageClick = (image: UploadedImage) => {
    setSelectedImage(image);
    setShowPreview(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="library-loading">
        <div className="spinner"></div>
        <p>Đang tải thư viện ảnh...</p>
      </div>
    );
  }

  return (
    <div className="image-library">
      <div className="library-header">
        <div className="header-content">
          <MdImage className="header-icon" />
          <div>
            <h2>Thư viện ảnh</h2>
            <p>Quản lý các ảnh đã upload ({images.length} ảnh)</p>
          </div>
        </div>
        
        <label className="upload-btn">
          <MdFileUpload />
          <span>{isUploading ? 'Đang tải lên...' : 'Tải ảnh lên'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
            hidden
          />
        </label>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {images.length === 0 ? (
        <div className="empty-state">
          <MdImage className="empty-icon" />
          <h3>Chưa có ảnh nào</h3>
          <p>Upload ảnh đầu tiên của bạn để bắt đầu</p>
          <label className="upload-btn-primary">
            <MdFileUpload />
            <span>Tải ảnh lên</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={isUploading}
              hidden
            />
          </label>
        </div>
      ) : (
        <div className="images-grid">
          {images.map((image) => (
            <div key={image.id} className="image-card">
              <div className="image-wrapper" onClick={() => handleImageClick(image)}>
                <img src={image.image_url} alt={image.name} />
                <div className="image-overlay">
                  <span>Xem chi tiết</span>
                </div>
              </div>
              
              <div className="image-info">
                <h4 className="image-name" title={image.name}>
                  {image.name}
                </h4>
                <p className="image-date">{formatDate(image.uploaded_at)}</p>
              </div>

              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(image.id);
                }}
                title="Xóa ảnh"
              >
                <MdDelete />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedImage && (
        <div className="preview-modal" onClick={() => setShowPreview(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowPreview(false)}>
              <MdClose />
            </button>
            
            <img src={selectedImage.image_url} alt={selectedImage.name} />
            
            <div className="preview-info">
              <h3>{selectedImage.name}</h3>
              <p>Tải lên: {formatDate(selectedImage.uploaded_at)}</p>
              
              <div className="preview-actions">
                <a
                  href={selectedImage.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-view"
                >
                  Xem kích thước đầy đủ
                </a>
                <button
                  className="btn-delete"
                  onClick={() => {
                    setShowPreview(false);
                    handleDelete(selectedImage.id);
                  }}
                >
                  <MdDelete /> Xóa ảnh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageLibrary;