import React, { useState } from 'react';
import { uploadVideoForDeepfake, uploadVoiceSample, processFakelip } from '../../services/aiService';

const FakelipVideo = () => {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAudioFile(e.target.files[0]);
        }
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVideoFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!audioFile || !videoFile) {
            setError('Vui lòng chọn cả file âm thanh và video');
            return;
        }

        try {
            setIsProcessing(true);
            setError(null);

            // Upload files lên Cloudinary
            const audioUrl = await uploadVoiceSample(audioFile);
            const videoUrl = await uploadVideoForDeepfake(videoFile);

            // Gọi API Fakelip
            const result = await processFakelip(audioUrl.audio_url, videoUrl);

            setResultUrl(result.result_url);
        } catch (error) {
            console.error("Lỗi xử lý fakelip:", error);
            setError('Có lỗi xảy ra khi xử lý. Vui lòng thử lại sau.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async () => {
        if (!resultUrl) return;

        try {
            // Hiển thị thông báo đang tải
            setError(null);
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'download-loading';
            loadingMessage.textContent = 'Đang chuẩn bị tải xuống...';
            document.querySelector('.result-container')?.appendChild(loadingMessage);

            // Tải file từ URL
            const response = await fetch(resultUrl);
            const blob = await response.blob();

            // Tạo URL đối tượng từ blob
            const blobUrl = window.URL.createObjectURL(blob);

            // Tạo thẻ a ẩn để tải xuống
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;

            // Lấy tên file từ URL hoặc tạo tên mặc định
            const fileName = resultUrl.split('/').pop() || 'fakelip-video.mp4';
            downloadLink.download = fileName;

            // Thêm vào DOM, kích hoạt sự kiện click và xóa
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // Giải phóng URL đối tượng
            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
                document.querySelector('.download-loading')?.remove();
            }, 100);
        } catch (err) {
            console.error('Lỗi khi tải file:', err);
            setError('Không thể tải xuống video. Vui lòng thử lại sau.');
            document.querySelector('.download-loading')?.remove();
        }
    };

    return (
        <div className="fakelip-container">
            <h2>Tạo video nhép môi (Lip sync)</h2>
            <p>Upload file âm thanh và video để tạo video nhép môi tự động</p>

            <form onSubmit={handleSubmit} className="fakelip-form">
                <div className="form-group">
                    <label htmlFor="audioFile">File âm thanh (WAV):</label>
                    <input
                        type="file"
                        id="audioFile"
                        accept="audio/wav"
                        onChange={handleAudioChange}
                    />
                    {audioFile && <p className="file-selected">Đã chọn: {audioFile.name}</p>}
                </div>

                <div className="form-group">
                    <label htmlFor="videoFile">File video:</label>
                    <input
                        type="file"
                        id="videoFile"
                        accept="video/*"
                        onChange={handleVideoChange}
                    />
                    {videoFile && <p className="file-selected">Đã chọn: {videoFile.name}</p>}
                </div>

                <button
                    type="submit"
                    className="submit-btn"
                    disabled={isProcessing || !audioFile || !videoFile}
                >
                    {isProcessing ? 'Đang xử lý...' : 'Tạo video nhép môi'}
                </button>
            </form>

            {error && <div className="error-message">{error}</div>}

            {isProcessing && (
                <div className="processing-message">
                    <p>Đang xử lý video, vui lòng đợi...</p>
                </div>
            )}

            {resultUrl && (
                <div className="result-container">
                    <h3>Video đã xử lý:</h3>
                    <video controls width="100%" src={resultUrl} />
                    <div className="result-actions">
                        <button
                            onClick={handleDownload}
                            className="download-button"
                            title="Tải video xuống máy"
                        >
                            Tải video xuống
                        </button>
                        <button
                            className="new-fakelip-button"
                            onClick={() => {
                                setResultUrl(null);
                                setAudioFile(null);
                                setVideoFile(null);
                                // Reset input file elements
                                const audioInput = document.getElementById('audioFile') as HTMLInputElement;
                                const videoInput = document.getElementById('videoFile') as HTMLInputElement;
                                if (audioInput) audioInput.value = '';
                                if (videoInput) videoInput.value = '';
                            }}
                            title="Bắt đầu với video mới"
                        >
                            Tạo video mới
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FakelipVideo;