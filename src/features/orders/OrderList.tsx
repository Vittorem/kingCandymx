import { useState } from 'react';
import { Table, Tag, Space, Button, Input, Select } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Order, OrderStatus, ORDER_STATUSES } from '../../types';
import { toDay } from '../../utils/dateHelpers';

interface OrderListProps {
    orders: Order[];
    onEdit: (order: Order) => void;
    onDelete: (id: string) => void;
}

export const OrderList = ({ orders, onEdit, onDelete }: OrderListProps) => {
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);

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
            render: (_: unknown, r: Order) => `${r.productNameAtSale} (${r.flavorNameAtSale}) x${r.quantity}`,
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
            <Space style={{ marginBottom: 16 }}>
                <Input placeholder="Buscar cliente..." onChange={e => setSearchText(e.target.value)} style={{ width: 200 }} />
                <Select
                    placeholder="Filtrar Estado"
                    allowClear
                    style={{ width: 150 }}
                    onChange={setStatusFilter}
                >
                    {ORDER_STATUSES.map(s => (
                        <Select.Option key={s} value={s}>{s}</Select.Option>
                    ))}
                </Select>
            </Space>
            <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="id"
                size="small"
            />
        </div>
    );
};
