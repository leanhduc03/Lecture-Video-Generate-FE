import { FC } from "react";
import { Layout, Menu } from "antd";
import {
  TeamOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";

const { Sider } = Layout;

const AdminSidebar: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = (() => {
    if (location.pathname.startsWith("/admin/users")) return "users";
    if (location.pathname.startsWith("/admin/videos")) return "videos";
    return "dashboard";
  })();

  return (
    <Sider
      width={256}
      className="w-64 flex-shrink-0 bg-surface-light border-r border-border-light
        flex flex-col pt-24 fixed inset-y-0 left-0 z-10"
      theme="light"
    >
      <div className="flex-grow flex flex-col justify-between p-4">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => {
            if (key === "users") navigate("/admin/users");
            if (key === "videos") navigate("/admin/videos");
          }}
          className="border-0 bg-transparent"
          items={[
            {
              key: "users",
              icon: <TeamOutlined />,
              label: "Quản lý người dùng",
            },
            {
              key: "videos",
              icon: <VideoCameraOutlined />,
              label: "Quản lý video",
            },
          ]}
        />
      </div>
    </Sider>
  );
};

export default AdminSidebar;