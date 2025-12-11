import { FC } from "react";
import { Layout, Menu } from "antd";
import {
  TeamOutlined,
  VideoCameraOutlined,
  PlayCircleOutlined
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";

const { Sider } = Layout;

const AdminSidebar: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = (() => {
    if (location.pathname.startsWith("/admin/users")) return "users";
    if (location.pathname.startsWith("/admin/videos")) return "videos";
    if (location.pathname.startsWith("/admin/sample-videos")) return "sample-videos";
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
            if (key === "sample-videos") navigate("/admin/sample-videos");
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
            {
              key: "sample-videos",
              icon: <PlayCircleOutlined />,
              label: "Quản lý video mẫu",
            }
          ]}
        />
      </div>
    </Sider>
  );
};

export default AdminSidebar;