import { FC } from "react";
import { Button, Dropdown, MenuProps } from "antd";
import { Link, useNavigate } from "react-router-dom";
import {
  UserOutlined,
  LogoutOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";

const AdminHeader: FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items: MenuProps["items"] = [
    {
      key: "profile",
      label: <Link to="/admin/profile">Hồ sơ</Link>,
      icon: <UserOutlined />,
    },
    {
      key: "logout",
      label: "Đăng xuất",
      icon: <LogoutOutlined />,
      onClick: async () => {
        await logout();
        navigate("/login");
      },
    },
  ];

  return (
    <div
      className="h-16 flex items-center justify-between px-8 border-b border-border-light
        bg-surface-light/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
          <VideoCameraOutlined className="text-white text-lg" />
        </div>
        <Link
          to="/admin/dashboard"
          className="text-xl font-bold text-text-light"
        >
          LecVidGen
        </Link>
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <Dropdown menu={{ items }} placement="bottomRight" trigger={["click"]}>
          <Button
            type="text"
            className="flex items-center gap-2 text-sm text-text-muted-light hover:text-primary"
            >
            <UserOutlined />
            <span>{user ? `Admin: ${user.username}` : "Tài khoản"}</span>
          </Button>
        </Dropdown>
      </div>
    </div>
  );
};

export default AdminHeader;