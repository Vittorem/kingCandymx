import { useEffect, useState } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button, Card, Spin, Typography, Layout, message } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Content } = Layout;

interface AuthGateProps {
    children: React.ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            setLoading(true);
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            await signInWithPopup(auth, provider);
            message.success('Bienvenido a Tiramisú CRM');
        } catch (error: any) {
            console.error(error);
            message.error(`Error al iniciar sesión: ${error.message}`);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" tip="Cargando..." />
            </div>
        );
    }

    if (!user) {
        return (
            <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
                <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Card style={{ width: 400, textAlign: 'center', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <Title level={2} style={{ marginBottom: 8 }}>Tiramisú CRM</Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>Sistema de Gestión y Pedidos</Text>

                        <Button
                            type="primary"
                            icon={<GoogleOutlined />}
                            size="large"
                            block
                            onClick={handleLogin}
                            style={{ height: 48, fontSize: 16 }}
                        >
                            Iniciar Sesión con Google
                        </Button>
                    </Card>
                </Content>
            </Layout>
        );
    }

    return <>{children}</>;
};

export const useAuth = () => {
    const [user] = useState<User | null>(auth.currentUser);
    return { user, logout: () => signOut(auth) };
};
