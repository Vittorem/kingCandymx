import { useState, useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Button, Input, message } from 'antd';
import { TrophyOutlined, GiftOutlined, WhatsAppOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useFirestoreSubscription, useFirestoreMutation } from '../../hooks/useFirestore';
import { Customer, LoyaltyLedger } from '../../types';
import { CustomerForm } from '../customers/components/CustomerForm';

export const LoyaltyDashboardPage = () => {
    const { data: customers, loading: loadingCustomers } = useFirestoreSubscription<Customer>('customers');
    const { data: ledger } = useFirestoreSubscription<LoyaltyLedger>('loyalty_ledger');
    const { add, update } = useFirestoreMutation('customers');

    const [searchText, setSearchText] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const handleAddCustomer = () => {
        setEditingCustomer(null);
        setIsDrawerOpen(true);
    };

    const handleCustomerSubmit = async (values: Partial<Customer>) => {
        try {
            if (editingCustomer) {
                await update(editingCustomer.id, values);
                message.success('Cliente actualizado');
            } else {
                await add(values);
                message.success('Cliente creado');
            }
        } catch (error) {
            message.error('Error al guardar');
            throw error;
        }
    };

    // --- Statistics ---
    const totalPointsIssued = useMemo(() => {
        return ledger.filter(l => l.reason === 'purchase' && l.pointsChange > 0).reduce((acc, l) => acc + l.pointsChange, 0);
    }, [ledger]);

    const totalPointsRedeemed = useMemo(() => {
        return ledger.filter(l => l.reason === 'redemption' && l.pointsChange > 0).reduce((acc, l) => acc + l.pointsChange, 0);
    }, [ledger]);

    const activeCustomersWithPoints = useMemo(() => {
        return customers.filter(c => (c.loyaltyPoints || 0) > 0).length;
    }, [customers]);

    // --- Table Data ---
    const topCustomers = useMemo(() => {
        return [...customers]
            .filter(c => (c.loyaltyPoints || 0) > 0)
            .sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0));
    }, [customers]);

    const filteredCustomers = topCustomers.filter(c =>
        c.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
        c.phone.includes(searchText)
    );

    const handleSendWhatsApp = (customer: Customer) => {
        if (!customer.phone) {
            message.warning('El cliente no tiene teléfono registrado.');
            return;
        }
        const phoneStr = customer.phone.replace(/\D/g, '');
        const pts = customer.loyaltyPoints || 0;
        const isEligible = pts >= 6;

        const msg = isEligible
            ? `¡Hola ${customer.fullName}! Tienes ${pts} puntos de lealtad en Tiramisú, ¡suficientes para redimir un Bambino gratis en tu próxima visita!`
            : `¡Hola ${customer.fullName}! Tienes ${pts} puntos de lealtad acumulados en Tiramisú. Haz un pedido pronto para llegar a los 6 puntos y ganar un Bambino gratis.`;

        const url = `https://wa.me/52${phoneStr}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const columns = [
        {
            title: 'Cliente',
            dataIndex: 'fullName',
            key: 'fullName',
            render: (text: string) => <strong>{text}</strong>,
        },
        {
            title: 'Teléfono',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Puntos Acumulados',
            dataIndex: 'loyaltyPoints',
            key: 'loyaltyPoints',
            sorter: (a: Customer, b: Customer) => (a.loyaltyPoints || 0) - (b.loyaltyPoints || 0),
            render: (pts: number) => {
                const points = pts || 0;
                return (
                    <Tag color={points >= 6 ? 'gold' : 'blue'} style={{ fontSize: 14, padding: '4px 8px' }}>
                        {points} pts
                        {points >= 6 && <TrophyOutlined style={{ marginLeft: 8 }} />}
                    </Tag>
                );
            }
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: unknown, record: Customer) => (
                <Button
                    type={record.loyaltyPoints && record.loyaltyPoints >= 6 ? 'primary' : 'default'}
                    icon={<WhatsAppOutlined />}
                    onClick={() => handleSendWhatsApp(record)}
                >
                    Notificar
                </Button>
            ),
        }
    ];

    return (
        <div style={{ padding: '0 24px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2>Programa de Lealtad (Dashboard)</h2>
                    <p style={{ color: '#666', margin: 0 }}>Monitorea el uso de puntos de tus clientes y contacta a los más leales.</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCustomer}>
                    Nuevo Cliente
                </Button>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Total Clientes Activos"
                            value={activeCustomersWithPoints}
                            prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Puntos Emitidos"
                            value={totalPointsIssued}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<GiftOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Puntos Redimidos"
                            value={totalPointsRedeemed}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<GiftOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card title="Tabla de Posiciones (Mejores Clientes)">
                <div style={{ marginBottom: 16 }}>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Buscar cliente por nombre o teléfono..."
                        style={{ width: 300 }}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredCustomers}
                    rowKey="id"
                    loading={loadingCustomers}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            <CustomerForm
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSubmit={handleCustomerSubmit}
                initialValues={editingCustomer}
            />
        </div>
    );
};
