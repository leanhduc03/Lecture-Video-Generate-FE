import React, { useState, useEffect } from 'react';
import {
  getMediaVideos,
  createMediaVideo,
  updateMediaVideo,
  deleteMediaVideo,
  uploadMediaVideoFile,
  MediaVideo,
} from '../../services/mediaVideoService';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Alert,
  Space,
  Spin,
  Tooltip,
  message,
  Empty,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import '../../styles/media-video-management.scss';

const MediaVideoManagement: React.FC = () => {
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<MediaVideo | null>(null);
  const [form] = Form.useForm();

  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setError(null);
      if (videos.length === 0) setLoading(true);
      setTableLoading(true);
      const response = await getMediaVideos('sample'); // Chỉ lấy video sample
      setVideos(response.videos || []);
    } catch (err: any) {
      setError('Không thể tải danh sách video');
      console.error(err);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handleVideoFileChange = (file: File) => {
    const isVideo = file.type.startsWith('video/');
    if (!isVideo) {
      messageApi.error('Chỉ chấp nhận file video!');
      return false;
    }

    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      messageApi.error('Video phải nhỏ hơn 100MB!');
      return false;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    return false;
  };

  const handleSubmit = async (values: any) => {
    try {
      let videoUrl = editingVideo?.video_url || '';

      if (videoFile && !editingVideo) {
        setUploading(true);

        try {
          const uploadResponse = await uploadMediaVideoFile(videoFile);
          videoUrl = uploadResponse.video_url;
        } catch (uploadErr: any) {
          setUploading(false);
          messageApi.error(uploadErr.response?.data?.detail || 'Upload video thất bại');
          return;
        }
      }

      const videoData = {
        name: values.name,
        video_url: videoUrl,
        video_type: 'sample' // Luôn là sample
      };

      if (editingVideo) {
        await updateMediaVideo(editingVideo.id, videoData);
        messageApi.success('Cập nhật video thành công');
      } else {
        await createMediaVideo(videoData);
        messageApi.success('Thêm video mới thành công');
      }
      
      await loadVideos();
      handleCancel();
      
    } catch (err: any) {
      messageApi.error(err.response?.data?.detail || 'Có lỗi xảy ra');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (video: MediaVideo) => {
    setEditingVideo(video);
    form.setFieldsValue({
      name: video.name,
    });
    setPreviewUrl(video.video_url);
    setShowForm(true);
  };

  const handleDelete = async (videoId: number) => {
    Modal.confirm({
      title: 'Xóa video',
      content: 'Bạn có chắc muốn xóa video này?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await deleteMediaVideo(videoId);
          setVideos((prev) => prev.filter((v) => v.id !== videoId));
          messageApi.success('Xóa video thành công');
        } catch (err: any) {
          messageApi.error(err.response?.data?.detail || 'Không thể xóa video');
        }
      }
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVideo(null);
    setVideoFile(null);
    setPreviewUrl('');
    setUploading(false);
    form.resetFields();
  };

  const handleAddNew = () => {
    form.resetFields();
    setEditingVideo(null);
    setVideoFile(null);
    setPreviewUrl('');
    setShowForm(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const columns: ColumnsType<MediaVideo> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Tên Video',
      dataIndex: 'name',
      key: 'name',
      width: 250,
    },
    {
      title: 'Preview',
      dataIndex: 'video_url',
      key: 'video',
      width: 320,
      render: (url: string) => (
        <video
          src={url}
          controls
          className="video-preview"
        />
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="default"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Sửa
            </Button>
          </Tooltip>
          <Tooltip title="Xóa video">
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              Xóa
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading && videos.length === 0) {
    return (
      <div className="loading-container">
        {contextHolder}
        <Spin tip="Đang tải..." size="large" />
      </div>
    );
  }

  return (
    <div className="media-video-management">
      {contextHolder}
      
      <header>
        <h2>Quản lý Video Giảng Viên Mẫu</h2>
        <p>Quản lý các video giảng viên mẫu để ghép video trong hệ thống.</p>
      </header>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={() => setError(null)}
          className="error-message"
        />
      )}

      <section className="stats-section">
        <Card>
          <div className="stats-content">
            <div className="stats-info">
              <p>Tổng số video giảng viên mẫu</p>
              <p>{videos.length}</p>
            </div>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddNew}
              >
                Thêm Video Mới
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={loadVideos}
              >
                Tải lại
              </Button>
            </Space>
          </div>
        </Card>
      </section>

      <Modal
        title={editingVideo ? 'Cập Nhật Video Giảng Viên' : 'Thêm Video Giảng Viên Mới'}
        open={showForm}
        onCancel={handleCancel}
        footer={null}
        width={700}
        className="media-video-modal"
        maskClosable={!uploading}
        closable={!uploading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Tên Video"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên video' }]}
          >
            <Input placeholder="Ví dụ: Video Giảng Viên 1" disabled={uploading} />
          </Form.Item>

          {!editingVideo && (
            <Form.Item 
              label="Upload Video"
              required
              rules={[{ required: true, message: 'Vui lòng chọn video' }]}
            >
              <div className="upload-section">
                <Upload
                  accept="video/*"
                  maxCount={1}
                  beforeUpload={handleVideoFileChange}
                  onRemove={() => {
                    setVideoFile(null);
                    setPreviewUrl('');
                  }}
                  fileList={videoFile ? [{
                    uid: '-1',
                    name: videoFile.name,
                    status: 'done',
                    url: previewUrl,
                  }] as UploadFile[] : []}
                  disabled={uploading}
                >
                  <Button icon={<UploadOutlined />} disabled={uploading}>
                    Chọn Video
                  </Button>
                </Upload>
                
                {uploading && (
                  <div style={{ marginTop: 12, color: '#1890ff' }}>
                    Đang upload video...
                  </div>
                )}
              </div>
            </Form.Item>
          )}

          {editingVideo && previewUrl && (
            <Form.Item label="Video hiện tại">
              <div className="video-preview-container">
                <video
                  src={previewUrl}
                  controls
                  style={{ width: '100%', maxHeight: '300px', borderRadius: '8px' }}
                />
              </div>
            </Form.Item>
          )}

          <Form.Item className="form-actions">
            <Space>
              <Button onClick={handleCancel} disabled={uploading}>
                Hủy
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={uploading}
                disabled={!editingVideo && !videoFile}
              >
                {uploading ? 'Đang xử lý...' : (editingVideo ? 'Cập Nhật' : 'Thêm Mới')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <section className="table-section">
        <Card bodyStyle={{ padding: 0 }}>
          <Table<MediaVideo>
            rowKey="id"
            columns={columns}
            dataSource={videos}
            loading={tableLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} video`,
            }}
            locale={{
              emptyText: (
                <Empty
                  description="Chưa có video giảng viên mẫu nào"
                  className="empty-state"
                />
              )
            }}
          />
        </Card>
      </section>
    </div>
  );
};

export default MediaVideoManagement;