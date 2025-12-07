import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getUsers,
  updateUser,
  deleteUser,
  User,
  UserUpdateData,
} from "../../services/adminService";
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Select,
  Switch,
  Pagination,
  Alert,
  Spin,
} from "antd";
import type { ColumnsType } from "antd/es/table";

const { Option } = Select;

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "user",
    is_active: false,
    password: "",
  });

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, [page, limit]);

  const fetchUsers = async () => {
    if (users.length === 0) setLoading(true);
    setTableLoading(true);
    setError("");
    try {
      const response = await getUsers((page - 1) * limit, limit);
      setUsers(response.items);
      setTotalUsers(response.total);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Không thể tải danh sách người dùng"
      );
      console.error(err);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      password: "",
    });
    setEditMode(true);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (userId: number) => {
    Modal.confirm({
      title: "Xóa người dùng",
      content: "Bạn có chắc chắn muốn xóa người dùng này?",
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      async onOk() {
        try {
          await deleteUser(userId);
          setUsers((prev) => prev.filter((user) => user.id !== userId));
          setTotalUsers((prev) => prev - 1);
          setSuccess("Xóa người dùng thành công");
          setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
          setError(
            err?.response?.data?.detail || "Không thể xóa người dùng"
          );
          console.error(err);
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setError("");
    setSuccess("");

    try {
      const updateData: UserUpdateData = {};
      if (formData.email !== selectedUser.email)
        updateData.email = formData.email;
      if (formData.role !== selectedUser.role)
        updateData.role = formData.role;
      if (formData.is_active !== selectedUser.is_active)
        updateData.is_active = formData.is_active;
      if (formData.password) updateData.password = formData.password;

      if (Object.keys(updateData).length === 0) {
        setError("Không có thông tin nào được thay đổi");
        return;
      }

      const updatedUser = await updateUser(selectedUser.id, updateData);

      setUsers((prev) =>
        prev.map((user) => (user.id === selectedUser.id ? updatedUser : user))
      );

      setSuccess("Cập nhật thông tin người dùng thành công");
      setEditMode(false);
      setSelectedUser(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Không thể cập nhật thông tin người dùng"
      );
      console.error(err);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  };

  const columns: ColumnsType<User> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role: User["role"]) => (
        <Tag color={role === "admin" ? "purple" : "blue"}>
          {role === "admin" ? "Quản trị viên" : "Người dùng"}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      render: (is_active: boolean) => (
        <Tag color={is_active ? "green" : "gold"}>
          {is_active ? "Hoạt động" : "Chưa kích hoạt"}
        </Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      render: (value: string) =>
        new Date(value).toLocaleDateString("vi-VN"),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, user) => {
        const isCurrent = user.id === currentUser?.id;
        return (
          <div className="flex gap-2">
            <Button
              size="small"
              onClick={() => handleEdit(user)}
              disabled={isCurrent}
              title={
                isCurrent
                  ? "Không thể sửa tài khoản của chính mình"
                  : "Sửa"
              }
            >
              Sửa
            </Button>
            <Button
              size="small"
              danger
              onClick={() => handleDelete(user.id)}
              disabled={isCurrent}
              title={
                isCurrent
                  ? "Không thể xóa tài khoản của chính mình"
                  : "Xóa"
              }
            >
              Xóa
            </Button>
          </div>
        );
      },
    },
  ];

  const totalPages = Math.ceil(totalUsers / limit);

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin tip="Đang tải dữ liệu..." />
      </div>
    );
  }
  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="user-management">
      <header>
        <h2 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
          Quản lý người dùng
        </h2>
        <p className="mt-2 text-text-muted-light dark:text-text-muted-dark">
          Xem, chỉnh sửa, và quản lý tất cả người dùng trong hệ thống.
        </p>
      </header>
      <div className="mt-4 space-y-2">
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError("")}
          />
        )}
        {success && (
          <Alert
            type="success"
            message={success}
            showIcon
            closable
            onClose={() => setSuccess("")}
          />
        )}
      </div>
      <section className="mt-8">
        <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
          Thống kê người dùng
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark">
                Tổng người dùng
              </p>
              <span className="material-symbols-outlined text-text-muted-light dark:text-text-muted-dark">
                group
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-text-light dark:text-text-dark">
              {totalUsers}
            </p>
          </Card>

          <Card
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark">
                Người dùng hoạt động (trang hiện tại)
              </p>
              <span className="material-symbols-outlined text-green-500">
                person_check
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-text-light dark:text-text-dark">
              {activeCount}
            </p>
          </Card>

          <Card
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark">
                Chưa kích hoạt (trang hiện tại)
              </p>
              <span className="material-symbols-outlined text-yellow-500">
                hourglass_top
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-text-light dark:text-text-dark">
              {inactiveCount}
            </p>
          </Card>
        </div>
      </section>
      <section className="mt-12">
        <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
          Danh sách người dùng
        </h3>

        <Card
          className="mt-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark"
          bodyStyle={{ padding: 0 }}
        >
          <Table<User>
            rowKey="id"
            columns={columns}
            dataSource={users}
            loading={tableLoading}
            pagination={false}
            className="overflow-x-auto"
            size="middle"
          />

          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-border-light dark:border-border-dark">
              <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
                Trang {page} / {totalPages}
              </span>
              <Pagination
                current={page}
                pageSize={limit}
                total={totalUsers}
                onChange={(p) => setPage(p)}
                showSizeChanger={false}
              />
            </div>
          )}
        </Card>
      </section>
      <Modal
        open={editMode && !!selectedUser}
        title="Chỉnh sửa người dùng"
        onCancel={() => {
          setEditMode(false);
          setSelectedUser(null);
          setError("");
        }}
        footer={null}
        destroyOnClose
      >
        {selectedUser && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tên đăng nhập:
              </label>
              <Input value={selectedUser.username} disabled />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email:
              </label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="role">
                Vai trò:
              </label>
              <Select
                id="role"
                value={formData.role}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, role: value }))
                }
                className="w-full"
              >
                <Option value="user">Người dùng</Option>
                <Option value="admin">Quản trị viên</Option>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tài khoản đang hoạt động</span>
              <Switch
                checked={formData.is_active}
                onChange={handleSwitchChange}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="password"
              >
                Mật khẩu mới (để trống nếu không đổi):
              </label>
              <Input.Password
                id="password"
                name="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                minLength={6}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => {
                  setEditMode(false);
                  setSelectedUser(null);
                  setError("");
                }}
              >
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Lưu thay đổi
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
