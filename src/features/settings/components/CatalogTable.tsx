import { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Switch, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useFirestoreSubscription, useFirestoreMutation } from '../../../hooks/useFirestore';
import { BaseEntity } from '../../../types';

interface CatalogTableProps<T> {
    title: string;
    collectionName: string;
    columns?: any[];
    renderFormFields: () => React.ReactNode;
}

export function CatalogTable<T extends BaseEntity & { isActive: boolean }>({
    title,
    collectionName,
    columns = [],
    renderFormFields
}: CatalogTableProps<T>) {
    const { data, loading } = useFirestoreSubscription<T>(collectionName);
    const { add, update, softDelete } = useFirestoreMutation(collectionName);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [form] = Form.useForm();

    const handleAdd = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true });
        setIsModalVisible(true);
    };

    const handleEdit = (record: T) => {
        setEditingItem(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await softDelete(id);
            message.success('Elemento eliminado');
        } catch (error) {
            message.error('Error al eliminar');
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingItem) {
                await update(editingItem.id, values);
                message.success('Actualizado correctamente');
            } else {
                await add(values);
                message.success('Creado correctamente');
            }
            setIsModalVisible(false);
        } catch (error) {
            console.error(error);
            message.error('Error al guardar');
        }
    };

    const defaultColumns = [
        ...columns,
        {
            title: 'Estado',
            dataIndex: 'isActive',
            width: 100,
            render: (active: boolean) => (
                <span style={{ color: active ? 'green' : 'gray' }}>
                    {active ? 'Activo' : 'Inactivo'}
                </span>
            )
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 150,
            render: (_: any, record: T) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
                    <Popconfirm title="¿Eliminar?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3>{title}</h3>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Nuevo
                </Button>
            </div>

            <Table
                dataSource={data.filter(x => !x.isDeleted)}
                columns={defaultColumns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingItem ? `Editar ${title}` : `Nuevo ${title}`}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    {renderFormFields()}
                    <Form.Item name="isActive" label="Activo" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
