import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext';
import { Button, Dropdown, MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined} from "@ant-design/icons";

const HeaderLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const items: MenuProps["items"] = [
        {
            key: "profile",
            label: <Link to="/profile">Hồ sơ</Link>,
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
        <div className='header'>
            <div className="header-wrapper">
                <div className='header-wrapper-content'>
                    <div className="logo">
                        <Link to="/dashboard" className='logo-text'>LectureStudio</Link>
                    </div>
                    <nav className="header-menu">
                        <div className='header-menu-item'>
                            <Link to="/create-content">Tạo video</Link>
                        </div>
                        <div className='header-menu-item'>
                            <Link to="/my-videos">Video của tôi</Link>
                        </div>
                        <div className='header-menu-item'>
                            <Link to="/my-library">Thư viện của tôi</Link>
                        </div>
                    </nav>
                    <div className="flex items-center gap-4">
                        <Dropdown menu={{ items }} placement="bottomRight" trigger={["click"]}>
                            <Button
                                type="text"
                                className="flex items-center gap-2 text-sm text-text-muted-light hover:text-primary"
                                >
                                <UserOutlined />
                                <span>{user ? `${user.username}` : "Tài khoản"}</span>
                            </Button>
                        </Dropdown>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HeaderLayout;