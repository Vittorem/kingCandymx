import { useState } from 'react';
import { Button, Segmented, message } from 'antd';
import { PlusOutlined, UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useFirestoreSubscription, useFirestoreMutation } from '../../hooks/useFirestore';
import { Order, OrderStatus } from '../../types';
import { OrderForm } from './components/OrderForm';
import { OrderKanbanBoard } from './components/OrderKanbanBoard';
import { OrderList } from './OrderList';
import dayjs from 'dayjs';

export const OrdersPage = () => {
    const { data: orders, loading } = useFirestoreSubscription<Order>('orders');
    const { add, update, softDelete } = useFirestoreMutation('orders');

    const [viewMode, setViewMode] = useState<'Kanban' | 'List'>('Kanban');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

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
            const payload: any = { status: newStatus };
            if (newStatus === 'Entregado') {
                payload.deliveredAt = new Date(); // timestamp
            }
            await update(orderId, payload);
            message.success(`Estado actualizado a ${newStatus}`);
        } catch (e) {
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
        } catch (e) {
            message.error('Error al guardar pedido');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Eliminar pedido?')) {
            await softDelete(id);
        }
    };

    return (
        <div style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Segmented<string>
                    options={[
                        { label: 'Kanban', value: 'Kanban', icon: <AppstoreOutlined /> },
                        { label: 'Lista', value: 'List', icon: <UnorderedListOutlined /> }
                    ]}
                    value={viewMode}
                    onChange={(val) => setViewMode(val as any)}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                    Nuevo Pedido
                </Button>
            </div>

            {viewMode === 'Kanban' ? (
                <OrderKanbanBoard
                    orders={orders}
                    onStatusChange={handleStatusChange}
                    onEditOrder={handleEdit}
                />
            ) : (
                <OrderList
                    orders={orders}
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

export default OrdersPage;
