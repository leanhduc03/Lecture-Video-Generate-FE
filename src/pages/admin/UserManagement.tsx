import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getUsers, 
  updateUser, 
  deleteUser, 
  User, 
  UserUpdateData 
} from '../../services/adminService';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setError('');
    try {
      const response = await getUsers((page - 1) * limit, limit);
      setUsers(response.items);
      setTotalUsers(response.total);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Không thể tải danh sách người dùng');
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
    setError('');
    setSuccess('');
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await deleteUser(userId);
        setUsers(users.filter(user => user.id !== userId));
        setTotalUsers(prev => prev - 1);
        setSuccess('Xóa người dùng thành công');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Không thể xóa người dùng');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setError('');
    setSuccess('');

    try {
      // Chỉ gửi những trường đã thay đổi
      const updateData: UserUpdateData = {};
      if (formData.email !== selectedUser.email) updateData.email = formData.email;
      if (formData.role !== selectedUser.role) updateData.role = formData.role;
      if (formData.is_active !== selectedUser.is_active) updateData.is_active = formData.is_active;
      if (formData.password) updateData.password = formData.password;

      if (Object.keys(updateData).length === 0) {
        setError('Không có thông tin nào được thay đổi');
        return;
      }

      const updatedUser = await updateUser(selectedUser.id, updateData);
      
      // Cập nhật danh sách người dùng
      setUsers(users.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      
      setSuccess('Cập nhật thông tin người dùng thành công');
      setEditMode(false);
      setSelectedUser(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Không thể cập nhật thông tin người dùng');
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

  const totalPages = Math.ceil(totalUsers / limit);

  return (
    <div className="user-management">
      <h1>Quản lý người dùng</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="user-list-container">
        <div className="list-header">
          <h2>Danh sách người dùng ({totalUsers})</h2>
        </div>
        
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>Không có người dùng nào</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                    </span>
                  </td>
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
                      title={user.id === currentUser?.id ? 'Không thể sửa tài khoản của chính mình' : 'Sửa'}
                    >
                      Sửa
                    </button>
                    <button 
                      className="btn-delete" 
                      onClick={() => handleDelete(user.id)}
                      disabled={user.id === currentUser?.id}
                      title={user.id === currentUser?.id ? 'Không thể xóa tài khoản của chính mình' : 'Xóa'}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              Đầu
            </button>
            <button 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Trước
            </button>
            <span>Trang {page} / {totalPages}</span>
            <button 
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Sau
            </button>
            <button 
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              Cuối
            </button>
          </div>
        )}
      </div>

      {/* Modal chỉnh sửa */}
      {editMode && selectedUser && (
        <div className="modal-overlay" onClick={() => setEditMode(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <span>Tài khoản đang hoạt động</span>
                </label>
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Mật khẩu mới (để trống nếu không đổi):</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  minLength={6}
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
                    setError('');
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
