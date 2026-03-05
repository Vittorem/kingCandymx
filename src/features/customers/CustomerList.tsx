import { useState } from 'react';
import { Table, Button, Input, Space, Tag, Popconfirm, message, Card, List as AntList } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useFirestoreSubscription, useFirestoreMutation } from '../../hooks/useFirestore';
import { Customer } from '../../types';
import { CustomerForm } from './components/CustomerForm';
import { useIsMobile } from '../../hooks/useIsMobile';

export const CustomerList = () => {
    const { data: customers, loading } = useFirestoreSubscription<Customer>('customers');
    const { add, update, softDelete } = useFirestoreMutation('customers');

    const [searchText, setSearchText] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const isMobile = useIsMobile();

    const handleAdd = () => {
        setEditingCustomer(null);
        setIsDrawerOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsDrawerOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await softDelete(id);
            message.success('Cliente eliminado');
        } catch {
            message.error('Error al eliminar');
        }
    };

    const handleSubmit = async (values: Partial<Customer>) => {
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

    const filteredData = customers.filter(c =>
        c.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
        c.phone.includes(searchText)
    );

    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'fullName',
            key: 'fullName',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: 'Teléfono',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Puntos Lealtad',
            dataIndex: 'loyaltyPoints',
            key: 'loyaltyPoints',
            render: (points: number) => (
                <Tag color={points >= 6 ? 'gold' : 'blue'}>
                    {points || 0} pts
                </Tag>
            ),
        },
        {
            title: 'Contacto',
            dataIndex: 'mainContactMethod',
            key: 'mainContactMethod',
            render: (method: string) => {
                let color = 'default';
                if (method === 'WhatsApp') color = 'green';
                if (method === 'Instagram') color = 'purple';
                if (method === 'Facebook') color = 'blue';
                return <Tag color={color}>{method}</Tag>;
            },
        },
        {
            title: 'Etiquetas',
            dataIndex: 'tags',
            key: 'tags',
            render: (tags?: string[]) => (
                <>
                    {tags?.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: unknown, record: Customer) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
                    <Popconfirm title="¿Eliminar cliente?" description="Esto es una eliminación lógica." onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>Clientes</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Nuevo Cliente
                </Button>
            </div>

            <Card>
                <div style={{ marginBottom: 16 }}>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Buscar por nombre o teléfono..."
                        style={{ width: isMobile ? '100%' : 300 }}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>

                {isMobile ? (
                    <AntList
                        dataSource={filteredData}
                        loading={loading}
                        renderItem={item => (
                            <Card size="small" style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <strong style={{ fontSize: 16 }}>{item.fullName}</strong>
                                    <Tag color={(item.loyaltyPoints || 0) >= 6 ? 'gold' : 'blue'}>{item.loyaltyPoints || 0} pts</Tag>
                                </div>
                                <div style={{ color: '#666', fontSize: 14 }}>
                                    <div>📱 {item.phone}</div>
                                    <div style={{ margin: '4px 0' }}>🗣️ {item.mainContactMethod}</div>
                                    <div>{item.tags && item.tags.length > 0 && item.tags.map(t => <Tag key={t} style={{ fontSize: 11, padding: '0 4px' }}>{t}</Tag>)}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                                    <Space>
                                        <Button icon={<EditOutlined />} onClick={() => handleEdit(item)} />
                                        <Popconfirm title="¿Eliminar cliente?" description="Esto es una eliminación lógica." onConfirm={() => handleDelete(item.id)}>
                                            <Button icon={<DeleteOutlined />} danger />
                                        </Popconfirm>
                                    </Space>
                                </div>
                            </Card>
                        )}
                    />
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        rowKey="id"
                        loading={loading}
                    />
                )}
            </Card>

            <CustomerForm
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSubmit={handleSubmit}
                initialValues={editingCustomer}
            />
        </div>
    );
};
