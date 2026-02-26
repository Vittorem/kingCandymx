import { useState } from 'react';
import { Button, Segmented, message, DatePicker, Modal } from 'antd';
import { PlusOutlined, UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useFirestoreSubscription, useFirestoreMutation } from '../../hooks/useFirestore';
import { Order, OrderStatus, Customer } from '../../types';
import { OrderForm } from './components/OrderForm';
import { OrderKanbanBoard } from './components/OrderKanbanBoard';
import { OrderSummary } from './components/OrderSummary';
import { OrderList } from './OrderList';
import { getOrderDate } from '../../utils/dateHelpers';
import dayjs from 'dayjs';
import { increment } from 'firebase/firestore';
import { calculateProductPoints, LOYALTY_RULES, getPointsCostForProduct } from '../../utils/loyalty';


export const OrdersPage = () => {
    const { data: orders } = useFirestoreSubscription<Order>('orders');
    const { data: customers } = useFirestoreSubscription<Customer>('customers');
    const { add, update, softDelete } = useFirestoreMutation('orders');
    const { update: updateCustomer } = useFirestoreMutation('customers');
    const { add: addLoyalty } = useFirestoreMutation('loyalty_ledger');

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
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            const payload: Record<string, unknown> = { status: newStatus };
            if (newStatus === 'Entregado') {
                payload.deliveredAt = new Date();

                // Loyalty Points Logic
                if (!order.pointsAwarded && order.customerId) {
                    const pointsCost = getPointsCostForProduct(order.productNameAtSale);
                    const quantityRedeemed = pointsCost > 0 ? Math.round((order.pointsRedeemed || 0) / pointsCost) : 0;
                    const paidQuantity = Math.max(0, order.quantity - quantityRedeemed);

                    const pointsEarned = calculateProductPoints(order.productNameAtSale, paidQuantity);
                    const pointsRedeemed = order.pointsRedeemed || 0;
                    const pointsChange = pointsEarned - pointsRedeemed;

                    if (pointsChange !== 0) {
                        payload.pointsEarned = pointsEarned;
                        payload.pointsAwarded = true;

                        await updateCustomer(order.customerId, {
                            loyaltyPoints: increment(pointsChange)
                        });

                        await addLoyalty({
                            customerId: order.customerId,
                            orderId: order.id,
                            pointsChange: pointsChange,
                            reason: 'purchase'
                        });

                        const currentCustomer = customers.find(c => c.id === order.customerId);
                        const newPoints = (currentCustomer?.loyaltyPoints || 0) + pointsChange;
                        if (newPoints >= LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO) {
                            let rewardText = '';
                            if (newPoints >= LOYALTY_RULES.POINTS_FOR_FREE_GRANDE) {
                                const qty = Math.floor(newPoints / LOYALTY_RULES.POINTS_FOR_FREE_GRANDE);
                                rewardText = `${qty} Grande${qty > 1 ? 's' : ''}`;
                            } else if (newPoints >= LOYALTY_RULES.POINTS_FOR_FREE_MEDIANO) {
                                const qty = Math.floor(newPoints / LOYALTY_RULES.POINTS_FOR_FREE_MEDIANO);
                                rewardText = `${qty} Mediano${qty > 1 ? 's' : ''}`;
                            } else {
                                const qty = Math.floor(newPoints / LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO);
                                rewardText = `${qty} Bambino${qty > 1 ? 's' : ''}`;
                            }

                            Modal.confirm({
                                title: '¡Promoción de Lealtad!',
                                content: `El cliente ${currentCustomer?.fullName || ''} ahora tiene ${newPoints} puntos, suficientes para ${rewardText} gratis. ¿Enviar aviso por WhatsApp?`,
                                okText: 'Enviar WhatsApp',
                                cancelText: 'Cancelar',
                                onOk: () => {
                                    if (currentCustomer?.phone) {
                                        const phoneStr = currentCustomer.phone.replace(/\D/g, '');
                                        const firstName = currentCustomer.fullName.split(' ')[0] || currentCustomer.fullName;
                                        const msg = `Hola ${firstName}, gracias por comprar en King Candy La Casa Del Tiramisu, tu compra acumulo ${pointsChange} puntos de lealtad, ahora tienes ${newPoints} puntos acumulados. Comunicate con nosotros para saber como redimirlos.`;
                                        const url = `https://wa.me/52${phoneStr}?text=${encodeURIComponent(msg)}`;
                                        window.open(url, '_blank');
                                    } else {
                                        message.warning('El cliente no tiene teléfono registrado.');
                                    }
                                }
                            });
                        }
                    }
                }
            }
            await update(orderId, payload);
            message.success(`Estado actualizado a ${newStatus}`);
        } catch (e) {
            console.error('Error al actualizar estado:', e);
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
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                    Nuevo Pedido
                </Button>
            </div>

            <div style={{ marginBottom: 16 }}>
                <OrderSummary orders={filteredOrders} />
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
