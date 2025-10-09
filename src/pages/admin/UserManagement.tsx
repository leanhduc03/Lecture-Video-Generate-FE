import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: '',
    is_active: false,
    password: ''
  });

  // Phân trang
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, [page, limit]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/v1/users?skip=${(page - 1) * limit}&limit=${limit}`);
      setUsers(response.data.items);
      setTotalUsers(response.data.total);
    } catch (err: any) {
      setError('Không thể tải danh sách người dùng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      password: ''
    });
    setEditMode(true);
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await axios.delete(`/api/v1/users/${userId}`);
        setUsers(users.filter(user => user.id !== userId));
        setTotalUsers(prev => prev - 1);
      } catch (err: any) {
        setError('Không thể xóa người dùng');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      // Chỉ gửi những trường đã thay đổi
      const updateData: any = {};
      if (formData.email !== selectedUser.email) updateData.email = formData.email;
      if (formData.role !== selectedUser.role) updateData.role = formData.role;
      if (formData.is_active !== selectedUser.is_active) updateData.is_active = formData.is_active;
      if (formData.password) updateData.password = formData.password;

      await axios.put(`/api/v1/users/${selectedUser.id}`, updateData);
      
      // Cập nhật danh sách người dùng
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, email: formData.email, role: formData.role, is_active: formData.is_active }
          : user
      ));
      
      setEditMode(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError('Không thể cập nhật thông tin người dùng');
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  if (loading && users.length === 0) {
    return <div className="loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="user-management">
      <h1>Quản lý người dùng</h1>
      {error && <div className="error-message">{error}</div>}

      <div className="user-list-container">
        <h2>Danh sách người dùng ({totalUsers})</h2>
        
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên đăng nhập</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</td>
                <td>
                  <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Hoạt động' : 'Chưa kích hoạt'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button 
                    className="btn-edit" 
                    onClick={() => handleEdit(user)}
                    disabled={user.id === currentUser?.id}
                  >
                    Sửa
                  </button>
                  <button 
                    className="btn-delete" 
                    onClick={() => handleDelete(user.id)}
                    disabled={user.id === currentUser?.id}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Phân trang */}
        <div className="pagination">
          <button 
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Trước
          </button>
          <span>Trang {page} / {Math.ceil(totalUsers / limit)}</span>
          <button 
            onClick={() => setPage(prev => (prev * limit < totalUsers ? prev + 1 : prev))}
            disabled={page * limit >= totalUsers}
          >
            Sau
          </button>
        </div>
      </div>

      {/* Modal chỉnh sửa */}
      {editMode && selectedUser && (
        <div className="edit-modal">
          <div className="modal-content">
            <h3>Chỉnh sửa người dùng</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên đăng nhập:</label>
                <input type="text" value={selectedUser.username} disabled />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="role">Vai trò:</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="user">Người dùng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="is_active">Trạng thái:</label>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="is_active">Hoạt động</label>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Mật khẩu mới (để trống nếu không đổi):</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-save">Lưu thay đổi</button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => {
                    setEditMode(false);
                    setSelectedUser(null);
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
