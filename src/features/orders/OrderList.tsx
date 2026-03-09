import { useState } from 'react';
import { Table, Tag, Space, Button, Input, Select, List as AntList, Card } from 'antd';
import { EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { SwipeableList, SwipeableListItem, SwipeAction, TrailingActions, LeadingActions } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import { Order, OrderStatus, ORDER_STATUSES } from '../../types';
import { toDay } from '../../utils/dateHelpers';
import { useIsMobile } from '../../hooks/useIsMobile';

interface OrderListProps {
    orders: Order[];
    onEdit: (order: Order) => void;
    onDelete: (id: string) => void;
    onStatusChange?: (id: string, newStatus: OrderStatus) => void;
}

export const OrderList = ({ orders, onEdit, onDelete, onStatusChange }: OrderListProps) => {
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
    const isMobile = useIsMobile();

    const filteredData = orders
        .filter(o => {
            const matchesSearch =
                (o.customerName || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (o.notes || '').toLowerCase().includes(searchText.toLowerCase());
            const matchesStatus = statusFilter ? o.status === statusFilter : true;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const aDate = toDay(a.deliveryDate);
            const bDate = toDay(b.deliveryDate);
            return (bDate?.valueOf() ?? 0) - (aDate?.valueOf() ?? 0);
        });

    const columns = [
        {
            title: 'Cliente',
            dataIndex: 'customerName',
            key: 'customerName',
        },
        {
            title: 'Producto',
            key: 'product',
            render: (_: unknown, r: Order) => {
                if (r.items && r.items.length > 0) {
                    return r.items.map(i => `${i.quantity}x ${i.productNameAtSale} (${i.flavorNameAtSale})`).join(', ');
                }
                return `${r.quantity || 1}x ${r.productNameAtSale} (${r.flavorNameAtSale})`;
            },
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (val: number) => `$${val.toFixed(2)}`,
        },
        {
            title: 'Entrega',
            dataIndex: 'deliveryDate',
            key: 'deliveryDate',
            render: (date: Order['deliveryDate']) => {
                const d = toDay(date);
                return d ? d.format('DD/MM/YYYY HH:mm') : '-';
            },
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color={status === 'Entregado' ? 'green' : 'blue'}>{status}</Tag>,
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: unknown, record: Order) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)} />
                    <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record.id)} />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap' }}>
                <Input placeholder="Buscar cliente..." onChange={e => setSearchText(e.target.value)} style={{ width: isMobile ? '100%' : 200 }} />
                <Select
                    placeholder="Filtrar Estado"
                    allowClear
                    style={{ width: isMobile ? '100%' : 150 }}
                    onChange={setStatusFilter}
                >
                    {ORDER_STATUSES.map(s => (
                        <Select.Option key={s} value={s}>{s}</Select.Option>
                    ))}
                </Select>
            </Space>
            {isMobile ? (
                <SwipeableList threshold={0.3}>
                    <AntList
                        dataSource={filteredData}
                        renderItem={item => {
                            const currentIndex = ORDER_STATUSES.indexOf(item.status);

                            const leadingActions = () => (
                                <LeadingActions>
                                    <SwipeAction onClick={() => {
                                        if (onStatusChange && currentIndex !== -1 && currentIndex < ORDER_STATUSES.length - 1) {
                                            onStatusChange(item.id, ORDER_STATUSES[currentIndex + 1] as OrderStatus);
                                        }
                                    }}>
                                        <div style={{ background: '#52c41a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 24px', width: '100%', borderRadius: 8, marginBottom: 8 }}>
                                            <CheckOutlined style={{ fontSize: 24 }} /> <span style={{ marginLeft: 8, fontWeight: 'bold' }}>Avanzar</span>
                                        </div>
                                    </SwipeAction>
                                </LeadingActions>
                            );

                            const trailingActions = () => (
                                <TrailingActions>
                                    <SwipeAction destructive={true} onClick={() => onDelete(item.id)}>
                                        <div style={{ background: '#ff4d4f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', width: '100%', borderRadius: 8, marginBottom: 8 }}>
                                            <span style={{ marginRight: 8, fontWeight: 'bold' }}>Eliminar</span> <DeleteOutlined style={{ fontSize: 24 }} />
                                        </div>
                                    </SwipeAction>
                                </TrailingActions>
                            );

                            return (
                                <SwipeableListItem
                                    leadingActions={item.status !== 'Entregado' ? leadingActions() : undefined}
                                    trailingActions={trailingActions()}
                                >
                                    <Card size="small" style={{ marginBottom: 8, width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <strong style={{ fontSize: 16 }}>{item.customerName}</strong>
                                            <Tag color={item.status === 'Entregado' ? 'green' : 'blue'}>{item.status}</Tag>
                                        </div>
                                        <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>
                                            <div>📅 {toDay(item.deliveryDate)?.format('DD/MM/YYYY HH:mm')}</div>
                                            <div>📦 {item.items && item.items.length > 0
                                                ? item.items.map(i => `${i.quantity}x ${i.productNameAtSale}`).join(', ')
                                                : `${item.quantity || 1}x ${item.productNameAtSale}`}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                            <strong style={{ fontSize: 16 }}>${item.total.toFixed(2)}</strong>
                                            <Space>
                                                <Button icon={<EditOutlined />} onClick={() => onEdit(item)} />
                                                <Button icon={<DeleteOutlined />} danger onClick={() => onDelete(item.id)} />
                                            </Space>
                                        </div>
                                    </Card>
                                </SwipeableListItem>
                            );
                        }}
                    />
                </SwipeableList>
            ) : (
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="id"
                    size="small"
                />
            )}
        </div>
    );
};
