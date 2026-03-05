import { useState, useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Button, Input, message, Switch, Alert, Space } from 'antd';
import { TrophyOutlined, GiftOutlined, WhatsAppOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useFirestoreSubscription, useFirestoreMutation } from '../../hooks/useFirestore';
import { Customer, LoyaltyLedger, SystemSettings } from '../../types';
import { CustomerForm } from '../customers/components/CustomerForm';
import { LOYALTY_RULES, getLoyaltyRewardSummary } from '../../utils/loyalty';

export const LoyaltyDashboardPage = () => {
    const { data: customers, loading: loadingCustomers } = useFirestoreSubscription<Customer>('customers');
    const { data: ledger } = useFirestoreSubscription<LoyaltyLedger>('loyalty_ledger');
    const { add, update } = useFirestoreMutation('customers');

    // Settings
    const { data: settings } = useFirestoreSubscription<SystemSettings>('settings');
    const { add: addSettings, update: updateSettings } = useFirestoreMutation('settings');

    const loyaltySettings = settings[0];
    const isLoyaltyEnabled = loyaltySettings ? loyaltySettings.loyaltyEnabled : true;

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

    const handleToggleLoyalty = async (checked: boolean) => {
        try {
            if (loyaltySettings) {
                await updateSettings(loyaltySettings.id, { loyaltyEnabled: checked } as any);
            } else {
                await addSettings({ loyaltyEnabled: checked } as any);
            }
            message.success(`Programa de lealtad ${checked ? 'activado' : 'desactivado'}`);
        } catch (error) {
            console.error(error);
            message.error('Error al actualizar la configuración');
        }
    };

    // --- Statistics ---
    const totalPointsIssued = useMemo(() => {
        return ledger.filter(l => l.reason === 'purchase').reduce((acc, l) => acc + Math.max(0, l.pointsChange), 0);
    }, [ledger]);

    const totalPointsRedeemed = useMemo(() => {
        return ledger.filter(l => l.reason === 'redemption').reduce((acc, l) => acc + Math.abs(l.pointsChange), 0);
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
        const isEligible = pts >= LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO;

        let msg = '';
        const firstName = customer.fullName.split(' ')[0] || customer.fullName;

        if (isEligible) {
            const rewardText = getLoyaltyRewardSummary(pts);
            msg = `Hola ${firstName}, tienes ${pts} puntos de lealtad acumulados en King Candy La Casa Del Tiramisu, ¡suficientes para redimir ${rewardText} gratis! Comunicate con nosotros para saber como redimirlos.`;
        } else {
            msg = `Hola ${firstName}, tienes ${pts} puntos de lealtad acumulados en King Candy La Casa Del Tiramisu. ¡Haz un pedido pronto para seguir sumando y ganar premios gratis!`;
        }

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
                    <Tag color={points >= LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO ? 'gold' : 'blue'} style={{ fontSize: 14, padding: '4px 8px' }}>
                        {points} pts
                        {points >= LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO && <TrophyOutlined style={{ marginLeft: 8 }} />}
                    </Tag>
                );
            }
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: unknown, record: Customer) => (
                <Button
                    type={record.loyaltyPoints && record.loyaltyPoints >= LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO ? 'primary' : 'default'}
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
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Tag color="volcano" style={{ fontSize: '13px', padding: '4px 8px' }}>
                            Regla Oficial: Los clientes sólo pueden hacer redenciones válidas al realizar una compra adicional (dinero nuevo).
                        </Tag>
                        <Tag color="green" style={{ fontSize: '13px', padding: '4px 8px' }}>
                            <b>Puntos por Compra:</b> Bambino ({LOYALTY_RULES.POINTS_PER_BAMBINO} pt), Mediano ({LOYALTY_RULES.POINTS_PER_MEDIANO} pts), Grande ({LOYALTY_RULES.POINTS_PER_GRANDE} pts)
                        </Tag>
                        <Tag color="blue" style={{ fontSize: '13px', padding: '4px 8px' }}>
                            <b>Costo de Redención:</b> Bambino ({LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO} pts), Mediano ({LOYALTY_RULES.POINTS_FOR_FREE_MEDIANO} pts), Grande ({LOYALTY_RULES.POINTS_FOR_FREE_GRANDE} pts)
                        </Tag>
                    </div>
                </div>
                <Space>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isLoyaltyEnabled ? '#f6ffed' : '#fff1f0', padding: '8px 16px', borderRadius: 8, border: `1px solid ${isLoyaltyEnabled ? '#b7eb8f' : '#ffa39e'}` }}>
                        <strong style={{ color: isLoyaltyEnabled ? '#389e0d' : '#cf1322' }}>
                            {isLoyaltyEnabled ? 'Programa Activo' : 'Programa Inactivo'}
                        </strong>
                        <Switch checked={isLoyaltyEnabled} onChange={handleToggleLoyalty} />
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCustomer}>
                        Nuevo Cliente
                    </Button>
                </Space>
            </div>

            {!isLoyaltyEnabled && (
                <Alert
                    message="El programa de lealtad está desactivado"
                    description="Los clientes no acumularán nuevos puntos ni podrán redimirlos en sus pedidos hasta que vuelvas a activarlo."
                    type="error"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
            )}

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
