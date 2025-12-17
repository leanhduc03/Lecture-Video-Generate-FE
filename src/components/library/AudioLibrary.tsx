import React, { useState, useEffect } from 'react';
import { getMyAudios, deleteUploadedAudio, uploadReferenceAudio, updateReferenceText, UploadedAudio } from '../../services/uploadedAudioService';
import { MdDelete, MdFileUpload, MdAudiotrack, MdClose, MdEdit, MdSave } from 'react-icons/md';

const AudioLibrary: React.FC = () => {
  const [audios, setAudios] = useState<UploadedAudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<UploadedAudio | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadReferenceText, setUploadReferenceText] = useState('');
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    loadAudios();
  }, []);

  const loadAudios = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyAudios();
      setAudios(data);
    } catch (err) {
      setError('Không thể tải danh sách audio');
      console.error('Error loading audios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadFile(null);
    setUploadReferenceText('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError('Vui lòng chọn file audio');
      return;
    }

    setUploadFile(file);
  };

  const handleConfirmUpload = async () => {
    if (!uploadFile) {
      setError('Vui lòng chọn file audio');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await uploadReferenceAudio(uploadFile, uploadReferenceText);
      await loadAudios();
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadReferenceText('');
    } catch (err) {
      setError('Không thể upload audio. Vui lòng thử lại.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (audioId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa audio này?')) return;

    try {
      setError(null);
      await deleteUploadedAudio(audioId);
      await loadAudios();
      if (selectedAudio?.id === audioId) {
        setSelectedAudio(null);
        setShowPreview(false);
      }
    } catch (err) {
      setError('Không thể xóa audio. Vui lòng thử lại.');
      console.error('Delete error:', err);
    }
  };

  const handleAudioClick = (audio: UploadedAudio) => {
    setSelectedAudio(audio);
    setShowPreview(true);
  };

  const handleEditText = (audio: UploadedAudio) => {
    setEditingTextId(audio.id);
    setEditingText(audio.reference_text);
  };

  const handleSaveText = async (audioId: number) => {
    try {
      setError(null);
      await updateReferenceText(audioId, editingText);
      await loadAudios();
      setEditingTextId(null);
      setEditingText('');
    } catch (err) {
      setError('Không thể cập nhật reference text. Vui lòng thử lại.');
      console.error('Update error:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingTextId(null);
    setEditingText('');
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
        <p>Đang tải thư viện audio...</p>
      </div>
    );
  }

  return (
    <div className="audio-library">
      <div className="library-header">
        <div className="header-content">
          <MdAudiotrack className="header-icon" />
          <div>
            <h2>Thư viện giọng nói</h2>
            <p>Quản lý các audio reference đã upload ({audios.length} audio)</p>
          </div>
        </div>
        
        <button className="upload-btn" onClick={handleUploadClick}>
          <MdFileUpload />
          <span>Tải audio lên</span>
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {audios.length === 0 ? (
        <div className="empty-state">
          <MdAudiotrack className="empty-icon" />
          <h3>Chưa có audio nào</h3>
          <p>Upload audio đầu tiên của bạn để bắt đầu</p>
          <button className="upload-btn-primary" onClick={handleUploadClick}>
            <MdFileUpload />
            <span>Tải audio lên</span>
          </button>
        </div>
      ) : (
        <div className="audios-grid">
          {audios.map((audio) => (
            <div key={audio.id} className="audio-card">
              <div className="audio-icon-wrapper" onClick={() => handleAudioClick(audio)}>
                <MdAudiotrack className="audio-icon" />
                <div className="audio-overlay">
                  <span>Nghe audio</span>
                </div>
              </div>
              
              <div className="audio-info">
                <h4 className="audio-name" title={audio.name}>
                  {audio.name}
                </h4>
                <p className="audio-date">{formatDate(audio.uploaded_at)}</p>
                
                {editingTextId === audio.id ? (
                  <div className="reference-text-editor">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      placeholder="Nhập nội dung tương ứng với audio..."
                      rows={3}
                    />
                    <div className="editor-actions">
                      <button className="btn-save" onClick={() => handleSaveText(audio.id)}>
                        <MdSave /> Lưu
                      </button>
                      <button className="btn-cancel" onClick={handleCancelEdit}>
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="reference-text-display">
                    <p className="reference-text">
                      {audio.reference_text || 'Chưa có reference text'}
                    </p>
                    <button 
                      className="btn-edit-text" 
                      onClick={() => handleEditText(audio)}
                      title="Chỉnh sửa reference text"
                    >
                      <MdEdit />
                    </button>
                  </div>
                )}
              </div>

              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(audio.id);
                }}
                title="Xóa audio"
              >
                <MdDelete />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowUploadModal(false)}>
              <MdClose />
            </button>
            
            <h3>Upload Audio Reference</h3>
            
            <div className="upload-form">
              <div className="form-group">
                <label>Chọn file audio:</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                />
                {uploadFile && (
                  <div className="file-selected">
                    ✓ Đã chọn: {uploadFile.name}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Reference Text (nội dung của audio):</label>
                <textarea
                  value={uploadReferenceText}
                  onChange={(e) => setUploadReferenceText(e.target.value)}
                  placeholder="Nhập nội dung tương ứng với audio để cải thiện chất lượng clone giọng..."
                  rows={5}
                />
                <small>Reference text giúp mô hình hiểu rõ hơn về giọng nói trong file audio</small>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn-cancel" 
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                >
                  Hủy
                </button>
                <button 
                  className="btn-upload" 
                  onClick={handleConfirmUpload}
                  disabled={!uploadFile || isUploading}
                >
                  {isUploading ? 'Đang tải lên...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedAudio && (
        <div className="preview-modal" onClick={() => setShowPreview(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowPreview(false)}>
              <MdClose />
            </button>
            
            <div className="audio-preview">
              <MdAudiotrack className="preview-icon" />
              <audio src={selectedAudio.audio_url} controls autoPlay />
            </div>
            
            <div className="preview-info">
              <h3>{selectedAudio.name}</h3>
              <p>Tải lên: {formatDate(selectedAudio.uploaded_at)}</p>
              
              <div className="reference-text-section">
                <h4>Reference Text:</h4>
                <p>{selectedAudio.reference_text || 'Chưa có reference text'}</p>
              </div>
              
              <div className="preview-actions">
                <a
                  href={selectedAudio.audio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-view"
                >
                  Mở file gốc
                </a>
                <button
                  className="btn-delete"
                  onClick={() => {
                    setShowPreview(false);
                    handleDelete(selectedAudio.id);
                  }}
                >
                  <MdDelete /> Xóa audio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioLibrary;