import { useState } from 'react';
import { Table, Tag, Space, Button, Input, DatePicker, Select } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Order, OrderStatus } from '../../../types';
import dayjs from 'dayjs';

interface OrderListProps {
    orders: Order[];
    onEdit: (order: Order) => void;
    onDelete: (id: string) => void;
}

const { RangePicker } = DatePicker;

export const OrderList = ({ orders, onEdit, onDelete }: OrderListProps) => {
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);

    const filteredData = orders
        .filter(o => !o.isDeleted)
        .filter(o => {
            const matchesSearch =
                (o.customerName || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (o.notes || '').toLowerCase().includes(searchText.toLowerCase());
            const matchesStatus = statusFilter ? o.status === statusFilter : true;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => b.deliveryDate?.seconds - a.deliveryDate?.seconds); // Newest first

    const columns = [
        {
            title: 'Cliente',
            dataIndex: 'customerName',
            key: 'customerName',
        },
        {
            title: 'Producto',
            key: 'product',
            render: (_: any, r: Order) => `${r.productNameAtSale} (${r.flavorNameAtSale}) x${r.quantity}`
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (val: number) => `$${val.toFixed(2)}`
        },
        {
            title: 'Entrega',
            dataIndex: 'deliveryDate',
            key: 'deliveryDate',
            render: (date: any) => date?.seconds ? dayjs(date.seconds * 1000).format('DD/MM/YYYY HH:mm') : '-'
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color={status === 'Entregado' ? 'green' : 'blue'}>{status}</Tag>
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: any, record: Order) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)} />
                    <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record.id)} />
                </Space>
            )
        }
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
                    <Select.Option value="Pendiente">Pendiente</Select.Option>
                    <Select.Option value="Confirmado">Confirmado</Select.Option>
                    <Select.Option value="En preparación">En preparación</Select.Option>
                    <Select.Option value="Listo para entregar">Listo</Select.Option>
                    <Select.Option value="Entregado">Entregado</Select.Option>
                    <Select.Option value="Cancelado">Cancelado</Select.Option>
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
