import { Tabs, Form, Input, InputNumber } from 'antd';
import { CatalogTable } from './components/CatalogTable';
import { Product, Flavor, Channel } from '../../types';

export const SettingsPage = () => {
    const items = [
        {
            key: 'products',
            label: 'Productos',
            children: (
                <CatalogTable<Product>
                    title="Productos"
                    collectionName="catalog_products"
                    columns={[
                        { title: 'Nombre', dataIndex: 'name', key: 'name' },
                        {
                            title: 'Precio',
                            dataIndex: 'price',
                            key: 'price',
                            render: (val: number) => `$${val}`,
                        },
                    ]}
                    renderFormFields={() => (
                        <>
                            <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="price" label="Precio Default" rules={[{ required: true }]}>
                                <InputNumber prefix="$" style={{ width: '100%' }} />
                            </Form.Item>
                        </>
                    )}
                />
            ),
        },
        {
            key: 'flavors',
            label: 'Sabores',
            children: (
                <CatalogTable<Flavor>
                    title="Sabores"
                    collectionName="catalog_flavors"
                    columns={[{ title: 'Nombre', dataIndex: 'name', key: 'name' }]}
                    renderFormFields={() => (
                        <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    )}
                />
            ),
        },
        {
            key: 'channels',
            label: 'Canales de Venta',
            children: (
                <CatalogTable<Channel>
                    title="Canales"
                    collectionName="catalog_channels"
                    columns={[{ title: 'Nombre', dataIndex: 'name', key: 'name' }]}
                    renderFormFields={() => (
                        <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    )}
                />
            ),
        },
    ];

    return (
        <div>
            <h2>Configuración</h2>
            <Tabs defaultActiveKey="products" items={items} />
        </div>
    );
};
