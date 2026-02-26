import { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import {
    UserOutlined,
    ShoppingOutlined,
    AppstoreOutlined,
    BarChartOutlined,
    InboxOutlined,
    SettingOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    TrophyOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/AuthGate';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

export const AppLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { key: '/', icon: <AppstoreOutlined />, label: 'Dashboard' },
        { key: '/customers', icon: <UserOutlined />, label: 'Clientes' },
        { key: '/orders', icon: <ShoppingOutlined />, label: 'Pedidos' },
        { key: '/loyalty', icon: <TrophyOutlined />, label: 'Lealtad' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reportes' },
        { key: '/inventory', icon: <InboxOutlined />, label: 'Inventario' },
        { key: '/settings', icon: <SettingOutlined />, label: 'Configuración' },
    ];

    const userMenu = {
        items: [
            {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Cerrar Sesión',
                onClick: logout,
            },
        ],
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} breakpoint="lg" onBreakpoint={setCollapsed}>
                <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                    {collapsed ? 'CRM' : 'TIRAMISÚ CRM'}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <Layout>
                <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,0.08)' }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 500 }}>{user?.displayName}</span>
                        <Dropdown menu={userMenu}>
                            <Avatar src={user?.photoURL} icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
                        </Dropdown>
                    </div>
                </Header>
                <Content
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                        background: '#fff',
                        borderRadius: 8,
                        overflowY: 'auto',
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};
