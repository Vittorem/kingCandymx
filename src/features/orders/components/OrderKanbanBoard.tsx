import { useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    useSensors,
    useSensor,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    closestCenter
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Order, OrderStatus } from '../../../types';
import { Card, Tag, Typography } from 'antd';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface KanbanBoardProps {
    orders: Order[];
    onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
    onEditOrder: (order: Order) => void;
}

const COLUMNS: OrderStatus[] = ['Pendiente', 'Confirmado', 'En preparación', 'Listo para entregar', 'Entregado'];

// Sortable Item (The Card)
function SortableItem({ order, onClick }: { order: Order; onClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: order.id,
        data: { order }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        marginBottom: 8,
        cursor: 'grab',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <Card size="small" hoverable onClick={onClick} bodyStyle={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Typography.Text strong>{order.customerName}</Typography.Text>
                    <Tag color="blue">${order.total}</Tag>
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                    {order.productNameAtSale} ({order.flavorNameAtSale}) x {order.quantity}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    {new Date(order.deliveryDate.seconds * 1000).toLocaleDateString()}
                </div>
            </Card>
        </div>
    );
}

// Droppable Column
function KanbanColumn({ status, orders, onEdit }: { status: OrderStatus; orders: Order[]; onEdit: (o: Order) => void }) {
    const { setNodeRef } = useDroppable({ id: status });

    return (
        <div ref={setNodeRef} style={{ flex: 1, background: '#f0f2f5', padding: 8, borderRadius: 8, minWidth: 250, display: 'flex', flexDirection: 'column' }}>
            <Typography.Title level={5} style={{ margin: '0 0 12px 0', textAlign: 'center' }}>
                {status} ({orders.length})
            </Typography.Title>
            <div style={{ flex: 1 }}>
                {orders.map(order => (
                    <SortableItem key={order.id} order={order} onClick={() => onEdit(order)} />
                ))}
            </div>
        </div>
    );
}

export const OrderKanbanBoard = ({ orders, onStatusChange, onEditOrder }: KanbanBoardProps) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const orderId = active.id as string;
        const newStatus = over.id as OrderStatus;

        // Find if status changed
        const order = orders.find(o => o.id === orderId);
        if (order && order.status !== newStatus) {
            onStatusChange(orderId, newStatus);
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, height: 'calc(100vh - 200px)' }}>
                {COLUMNS.map(status => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        orders={orders.filter(o => o.status === status && !o.isDeleted)}
                        onEdit={onEditOrder}
                    />
                ))}
            </div>
        </DndContext>
    );
};
