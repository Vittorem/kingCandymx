import { useState } from 'react';
import { Button, Segmented, message, DatePicker, Statistic, Space, Divider, Typography } from 'antd';
import { PlusOutlined, UnorderedListOutlined, AppstoreOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useFirestoreSubscription, useFirestoreMutation } from '../../hooks/useFirestore';
import { Order, OrderStatus } from '../../types';
import { OrderForm } from './components/OrderForm';
import { OrderKanbanBoard } from './components/OrderKanbanBoard';
import { OrderList } from './OrderList';
import { getOrderDate } from '../../utils/dateHelpers';
import dayjs from 'dayjs';

const { Text } = Typography;

export const OrdersPage = () => {
    const { data: orders } = useFirestoreSubscription<Order>('orders');
    const { add, update, softDelete } = useFirestoreMutation('orders');

    const [viewMode, setViewMode] = useState<'Kanban' | 'List'>('Kanban');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(dayjs());

    const handleCreate = () => {
        setEditingOrder(null);
        setIsFormOpen(true);
    };

    const handleEdit = (order: Order) => {
        setEditingOrder(order);
        setIsFormOpen(true);
    };

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const payload: Record<string, unknown> = { status: newStatus };
            if (newStatus === 'Entregado') {
                payload.deliveredAt = new Date();
            }
            await update(orderId, payload);
            message.success(`Estado actualizado a ${newStatus}`);
        } catch {
            message.error('Error al actualizar estado');
        }
    };

    const handleSubmit = async (values: Partial<Order>) => {
        try {
            if (editingOrder) {
                await update(editingOrder.id, values);
                message.success('Pedido actualizado');
            } else {
                await add(values);
                message.success('Pedido creado');
            }
        } catch {
            message.error('Error al guardar pedido');
        }
    };

    const handleDelete = async (id: string) => {
        await softDelete(id);
        message.success('Pedido eliminado');
    };

    const filteredOrders = orders.filter(o => {
        const date = getOrderDate(o);
        if (!date) return false;
        return date.isSame(selectedMonth, 'month') && date.isSame(selectedMonth, 'year');
    });

    // Summary Statistics
    const activeOrders = filteredOrders.filter(o =>
        ['Confirmado', 'En preparación', 'Listo para entregar'].includes(o.status)
    );

    const pendingPrep = activeOrders.filter(o => ['Confirmado', 'En preparación'].includes(o.status));
    const ready = activeOrders.filter(o => o.status === 'Listo para entregar');

    const stats = {
        total: activeOrders.length,
        readyCount: ready.length,
        pendingCount: pendingPrep.length,
        bySize: pendingPrep.reduce((acc, order) => {
            const name = (order.productNameAtSale || '').toLowerCase();
            const qty = order.quantity || 1;
            if (name.includes('bambino')) acc.chico += qty;
            else if (name.includes('mediano')) acc.mediano += qty;
            else if (name.includes('grande')) acc.grande += qty;
            else acc.otro += qty;
            return acc;
        }, { chico: 0, mediano: 0, grande: 0, otro: 0 })
    };

    return (
        <div style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    <Segmented<string>
                        options={[
                            { label: 'Kanban', value: 'Kanban', icon: <AppstoreOutlined /> },
                            { label: 'Lista', value: 'List', icon: <UnorderedListOutlined /> },
                        ]}
                        value={viewMode}
                        onChange={(val) => setViewMode(val as 'Kanban' | 'List')}
                    />
                    <DatePicker
                        picker="month"
                        value={selectedMonth}
                        onChange={(val) => val && setSelectedMonth(val)}
                        allowClear={false}
                        format="MMMM YYYY"
                        placeholder="Seleccionar Mes"
                    />

                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fff', padding: '0 16px', borderRadius: 8, border: '1px solid #d9d9d9' }}>
                        <Space split={<Divider type="vertical" />}>
                            <Statistic
                                title="Progreso"
                                value={stats.readyCount}
                                suffix={`/ ${stats.total}`}
                                valueStyle={{ fontSize: 16, color: '#3f8600' }}
                                prefix={<CheckCircleOutlined />}
                            />
                            <Statistic
                                title="Por Preparar"
                                value={stats.pendingCount}
                                valueStyle={{ fontSize: 16, color: '#cf1322' }}
                                prefix={<ClockCircleOutlined />}
                            />
                            <Space direction="vertical" size={0} style={{ fontSize: 12 }}>
                                <Text type="secondary">Chico: {stats.bySize.chico}</Text>
                                <Text type="secondary">Mediano: {stats.bySize.mediano}</Text>
                                <Text type="secondary">Grande: {stats.bySize.grande}</Text>
                            </Space>
                        </Space>
                    </div>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                    Nuevo Pedido
                </Button>
            </div>

            {viewMode === 'Kanban' ? (
                <OrderKanbanBoard
                    orders={filteredOrders}
                    onStatusChange={handleStatusChange}
                    onEditOrder={handleEdit}
                />
            ) : (
                <OrderList
                    orders={filteredOrders}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <OrderForm
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                initialValues={editingOrder}
            />
        </div>
    );
};
