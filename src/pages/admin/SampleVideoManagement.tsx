import React, { useState, useEffect } from 'react';
import {
  getSampleVideos,
  createSampleVideo,
  updateSampleVideo,
  deleteSampleVideo,
  uploadSampleVideoFile,
  SampleVideo,
} from '../../services/sampleVideoService';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Alert,
  Space,
  Spin,
  Tooltip,
  message,
  Empty,
  Upload,
  Progress,
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
import '../../styles/sample-video-management.scss';

const SampleVideoManagement: React.FC = () => {
  const [videos, setVideos] = useState<SampleVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<SampleVideo | null>(null);
  const [form] = Form.useForm();

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
      const response = await getSampleVideos(false);
      setVideos(response.videos || []);
    } catch (err: any) {
      setError('Không thể tải danh sách video mẫu');
      console.error(err);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handleVideoFileChange = (file: File) => {
    // Kiểm tra định dạng file
    const isVideo = file.type.startsWith('video/');
    if (!isVideo) {
      messageApi.error('Chỉ chấp nhận file video!');
      return false;
    }

    // Kiểm tra kích thước file (max 100MB)
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      messageApi.error('Video phải nhỏ hơn 100MB!');
      return false;
    }

    setVideoFile(file);
    
    // Tạo preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    return false; // Prevent auto upload
  };

  const handleSubmit = async (values: any) => {
    try {
      let videoUrl = editingVideo?.video_url || '';

      // Nếu có file mới được chọn, upload lên Cloudinary trước
      if (videoFile && !editingVideo) {
        setUploading(true);
        setUploadProgress(0);

        // Simulate progress
        // const progressInterval = setInterval(() => {
        //   setUploadProgress(prev => {
        //     if (prev >= 90) {
        //       clearInterval(progressInterval);
        //       return 90;
        //     }
        //     return prev + 10;
        //   });
        // }, 500);

        try {
        //   messageApi.loading('Đang upload video lên Cloudinary...', 0);
          const uploadResponse = await uploadSampleVideoFile(videoFile);
        //   clearInterval(progressInterval);
          setUploadProgress(100);
          videoUrl = uploadResponse.video_url;
          messageApi.destroy();
        //   messageApi.success('Upload video thành công!');
        } catch (uploadErr: any) {
        //   clearInterval(progressInterval);
          setUploading(false);
        //   setUploadProgress(0);
          messageApi.destroy();
          messageApi.error(uploadErr.response?.data?.detail || 'Upload video thất bại');
          return;
        }
      }

      // Sau khi có URL (từ upload hoặc từ video đang edit), tạo/cập nhật video
      const videoData = {
        name: values.name,
        video_url: videoUrl,
        is_active: values.is_active
      };

      if (editingVideo) {
        await updateSampleVideo(editingVideo.id, videoData);
        messageApi.success('Cập nhật video thành công');
      } else {
        await createSampleVideo(videoData);
        messageApi.success('Thêm video mới thành công');
      }
      
      await loadVideos();
      handleCancel();
      
    } catch (err: any) {
      messageApi.error(err.response?.data?.detail || 'Có lỗi xảy ra');
    } finally {
      setUploading(false);
    //   setUploadProgress(0);
    }
  };

  const handleEdit = (video: SampleVideo) => {
    setEditingVideo(video);
    form.setFieldsValue({
      name: video.name,
      is_active: video.is_active,
    });
    setPreviewUrl(video.video_url);
    setShowForm(true);
  };

  const handleDelete = async (videoId: number) => {
    Modal.confirm({
      title: 'Xóa video mẫu',
      content: 'Bạn có chắc muốn xóa video mẫu này?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await deleteSampleVideo(videoId);
          setVideos((prev) => prev.filter((v) => v.id !== videoId));
          messageApi.success('Xóa video thành công');
        } catch (err: any) {
          messageApi.error(err.response?.data?.detail || 'Không thể xóa video');
        }
      },
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVideo(null);
    setVideoFile(null);
    setPreviewUrl('');
    setUploadProgress(0);
    setUploading(false);
    form.resetFields();
  };

  const handleAddNew = () => {
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setEditingVideo(null);
    setVideoFile(null);
    setPreviewUrl('');
    setUploadProgress(0);
    setShowForm(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const columns: ColumnsType<SampleVideo> = [
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
      width: 200,
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
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 140,
      render: (isActive: boolean) => (
        <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
          {isActive ? '✓ Hiển thị' : '✗ Ẩn'}
        </span>
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
    <div className="sample-video-management">
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
              <p>Tổng số video mẫu</p>
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
        title={editingVideo ? 'Cập Nhật Video Mẫu' : 'Thêm Video Mẫu Mới'}
        open={showForm}
        onCancel={handleCancel}
        footer={null}
        width={700}
        className="sample-video-modal"
        maskClosable={!uploading}
        closable={!uploading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true }}
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
                
                {uploading 
                // && (
                //   <Progress 
                //     percent={uploadProgress} 
                //     status="active"
                //     style={{ marginTop: 12 }}
                //   />
                // )
                }
                
                {/* {previewUrl && (
                  <div className="video-preview-container" style={{ marginTop: 16 }}>
                    <video
                      src={previewUrl}
                      controls
                      style={{ width: '100%', maxHeight: '300px', borderRadius: '8px' }}
                    />
                  </div>
                )} */}
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

          <Form.Item
            label="Hiển thị cho người dùng"
            name="is_active"
            valuePropName="checked"
          >
            <Switch disabled={uploading} />
          </Form.Item>

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
          <Table<SampleVideo>
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
                  description="Chưa có video mẫu nào"
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

export default SampleVideoManagement;