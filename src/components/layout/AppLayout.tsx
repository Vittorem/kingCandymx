import { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, theme, Drawer, List } from 'antd';
import { useIsMobile } from '../../hooks/useIsMobile';
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
    MoreOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/AuthGate';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

export const AppLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();


    const isMobile = useIsMobile();

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const menuItems = [
        { key: '/', icon: <AppstoreOutlined />, label: 'Dashboard' },
        { key: '/customers', icon: <UserOutlined />, label: 'Clientes' },
        { key: '/orders', icon: <ShoppingOutlined />, label: 'Pedidos' },
        { key: '/loyalty', icon: <TrophyOutlined />, label: 'Lealtad' },
        { key: '/inventory', icon: <InboxOutlined />, label: 'Inventario' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reportes' },
        { key: '/settings', icon: <SettingOutlined />, label: 'Configuración' },
    ];

    const mobileTabItems = [
        menuItems[0], // Dashboard
        menuItems[2], // Pedidos
        menuItems[1], // Clientes
        menuItems[4], // Inventario
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
        <Layout style={{ minHeight: '100vh', paddingBottom: isMobile ? 65 : 0, maxWidth: '100vw', overflowX: 'hidden' }}>
            {!isMobile && (
                <Sider trigger={null} collapsible collapsed={collapsed} breakpoint="md" onBreakpoint={setCollapsed}
                    style={{ position: 'sticky', top: 0, height: '100vh' }}>
                    <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                        {collapsed ? 'CRM' : 'TIRAMISÚ'}
                    </div>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        onClick={({ key }) => navigate(key)}
                    />
                </Sider>
            )}

            <Layout>
                <Header style={{ padding: '0 16px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,0.08)', position: 'sticky', top: 0, zIndex: 10 }}>
                    {isMobile ? (
                        <div style={{ fontWeight: 800, fontSize: 18, color: '#1677ff' }}>TIRAMISÚ CRM</div>
                    ) : (
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: '16px', width: 64, height: 64 }}
                        />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 500, display: isMobile ? 'none' : 'inline' }}>{user?.displayName}</span>
                        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
                            <Avatar src={user?.photoURL} icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
                        </Dropdown>
                    </div>
                </Header>

                <Content
                    style={{
                        margin: isMobile ? '12px' : '24px 16px',
                        padding: isMobile ? 12 : 24,
                        minHeight: 280,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>

            {/* Bottom Navigation Bar for Mobile */}
            {isMobile && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: colorBgContainer, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 0', zIndex: 1000, boxShadow: '0 -2px 8px rgba(0,0,0,0.05)' }}>
                    {mobileTabItems.map(item => (
                        <div key={item.key} onClick={() => navigate(item.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: location.pathname === item.key ? '#1677ff' : '#8c8c8c', flex: 1, cursor: 'pointer' }}>
                            <div style={{ fontSize: 22 }}>{item.icon}</div>
                            <div style={{ fontSize: 10, marginTop: 4, fontWeight: location.pathname === item.key ? 600 : 400 }}>{item.label}</div>
                        </div>
                    ))}
                    <div onClick={() => setMobileMenuOpen(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#8c8c8c', flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontSize: 24 }}><MoreOutlined /></div>
                        <div style={{ fontSize: 10, marginTop: 2 }}>Más</div>
                    </div>
                </div>
            )}

            {/* "More" Menu Drawer for Mobile */}
            <Drawer
                title="Menú Principal"
                placement="bottom"
                onClose={() => setMobileMenuOpen(false)}
                open={mobileMenuOpen}
                height="auto"
                styles={{ body: { padding: 0 } }}
            >
                <List
                    dataSource={menuItems}
                    renderItem={item => (
                        <List.Item
                            onClick={() => { navigate(item.key); setMobileMenuOpen(false); }}
                            style={{ padding: '16px 24px', cursor: 'pointer', background: location.pathname === item.key ? '#e6f4ff' : 'transparent' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: location.pathname === item.key ? '#1677ff' : 'inherit', fontWeight: location.pathname === item.key ? 600 : 400 }}>
                                <div style={{ fontSize: 20 }}>{item.icon}</div>
                                <div style={{ fontSize: 16 }}>{item.label}</div>
                            </div>
                        </List.Item>
                    )}
                />
            </Drawer>
        </Layout>
    );
};
