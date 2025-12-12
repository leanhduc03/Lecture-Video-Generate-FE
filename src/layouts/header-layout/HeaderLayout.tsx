import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext';
import { Button } from 'antd';

const HeaderLayout = () => {
    const { user, logout } = useAuth();
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
                    <div className="user-menu">
                        <Link to="/profile" className='profile'>Hồ sơ</Link>
                        <Button className='btn-primary' onClick={logout}>Đăng xuất</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HeaderLayout;