import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button, Card, Spin, Typography, Layout, message } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Content } = Layout;

// ─── Auth Context ────────────────────────────────────────────────────────────

interface AuthContextValue {
    user: User | null;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Custom hook to access auth state. Uses React Context under the hood
 * so the user value is always in-sync with onAuthStateChanged.
 */
export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthGate>');
    return ctx;
};

// ─── AuthGate Component ──────────────────────────────────────────────────────

interface AuthGateProps {
    children: ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
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
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            console.error(error);
            message.error(`Error al iniciar sesión: ${msg}`);
            setLoading(false);
        }
    };

    const logout = () => signOut(auth);

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

    return (
        <AuthContext.Provider value={{ user, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
