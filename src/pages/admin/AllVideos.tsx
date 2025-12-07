import React, { useState, useEffect } from "react";
import { getAllVideos, deleteVideo } from "../../services/videoService";
import {
  Card,
  Table,
  Button,
  Modal,
  Alert,
  Space,
  Spin,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";

interface Video {
  id: number;
  video_url: string;
  username: string;
  created_at: string;
}

const AllVideos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setError(null);
      if (videos.length === 0) setLoading(true);
      setTableLoading(true);
      const response = await getAllVideos();
      setVideos(response.videos || []);
    } catch (err: any) {
      setError("Không thể tải danh sách video");
      console.error(err);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handleDelete = async (videoId: number) => {
    Modal.confirm({
      title: "Xóa video",
      content: "Bạn có chắc muốn xóa video này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await deleteVideo(videoId);
          setVideos((prev) => prev.filter((v) => v.id !== videoId));
          messageApi.success("Xóa video thành công");
        } catch (err) {
          console.error(err);
          messageApi.error("Không thể xóa video");
        }
      },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const columns: ColumnsType<Video> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Người tạo",
      dataIndex: "username",
      key: "username",
      width: 180,
    },
    {
      title: "Thời gian tạo",
      dataIndex: "created_at",
      key: "created_at",
      width: 220,
      render: (value: string) => formatDate(value),
    },
    {
      title: "Video",
      dataIndex: "video_url",
      key: "video",
      render: (url: string) => (
        <video
          src={url}
          controls
          className="max-w-xs w-full rounded-md border border-border-light dark:border-border-dark"
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="Tải video">
            <Button type="default" size="small">
              <a href={record.video_url} download>
                Tải
              </a>
            </Button>
          </Tooltip>
          <Tooltip title="Xóa video">
            <Button
              danger
              size="small"
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
      <div className="flex items-center justify-center h-64">
        {contextHolder}
        <Spin tip="Đang tải..." />
      </div>
    );
  }

  return (
    <div className="all-videos-page">
      {contextHolder}
      <header>
        <h2 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
          Quản lý video
        </h2>
        <p className="mt-2 text-text-muted-light dark:text-text-muted-dark">
          Xem, tải xuống và quản lý tất cả video trong hệ thống.
        </p>
      </header>
      {error && (
        <div className="mt-4">
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError(null)}
          />
        </div>
      )}
      <section className="mt-6">
        <Card className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark">
                Tổng số video
              </p>
              <p className="mt-1 text-2xl font-bold text-text-light dark:text-text-dark">
                {videos.length}
              </p>
            </div>
            <Button onClick={loadVideos}>Tải lại</Button>
          </div>
        </Card>
      </section>
      <section className="mt-8">
        <Card
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark"
          bodyStyle={{ padding: 0 }}
        >
          <Table<Video>
            rowKey="id"
            columns={columns}
            dataSource={videos}
            loading={tableLoading}
            pagination={false}
            className="overflow-x-auto"
            size="middle"
          />
        </Card>
      </section>
    </div>
  );
};

export default AllVideos;
