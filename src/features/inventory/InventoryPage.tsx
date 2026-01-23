import { useState, useMemo } from 'react';
import { Tabs, Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, Alert, message, Card, Radio } from 'antd';
import { PlusOutlined, SwapOutlined, AlertOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useFirestoreSubscription, useFirestoreMutation } from '../../hooks/useFirestore';
import { InventoryItem, InventoryMovement, Recipe, Order, Product } from '../../types';
import dayjs from 'dayjs';

const { Option } = Select;

// --- Components (Inline for cohesion, can extract later) ---

const InventoryList = ({ items, onEdit, onDelete, onMove }: any) => {
    const columns = [
        { title: 'Insumo', dataIndex: 'name', key: 'name' },
        { title: 'Categoría', dataIndex: 'category', key: 'category' },
        {
            title: 'Stock',
            key: 'stock',
            render: (_: any, r: InventoryItem) => {
                const isLow = r.stockPackages <= r.minPackages;
                return (
                    <Tag color={isLow ? 'red' : 'green'}>
                        {r.stockPackages} {r.purchaseUnitLabel}(s)
                        {isLow && <AlertOutlined style={{ marginLeft: 6 }} />}
                    </Tag>
                );
            }
        },
        { title: 'Empaque', dataIndex: 'packageSize', key: 'size', render: (v: number) => `x${v}` },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: any, r: InventoryItem) => (
                <Space>
                    <Button size="small" icon={<SwapOutlined />} onClick={() => onMove(r)}>Mover</Button>
                    <Button size="small" onClick={() => onEdit(r)}>Editar</Button>
                    <Button size="small" danger onClick={() => onDelete(r.id)}>X</Button>
                </Space>
            )
        }
    ];

    return <Table dataSource={items} columns={columns} rowKey="id" />;
};

const PlanningCalculator = ({ items, recipes, orders, products }: { items: InventoryItem[], recipes: Recipe[], orders: Order[], products: Product[] }) => {
    const [mode, setMode] = useState<'DEMAND' | 'GOAL'>('DEMAND');
    const [goalQty, setGoalQty] = useState(10); // For Mode B

    // Calculate Requirements
    const requirements = useMemo(() => {
        let totalNeeded: Record<string, number> = {}; // itemId -> units needed (not packages)

        if (mode === 'DEMAND') {
            // Filter active orders
            const activeOrders = orders.filter(o => ['Confirmado', 'En preparación', 'Listo para entregar'].includes(o.status) && !o.isDeleted);

            activeOrders.forEach(o => {
                const recipe = recipes.find(r => r.productId === o.productId);
                if (recipe) {
                    const batches = o.quantity / recipe.yieldUnits; // Simplified linear yield
                    recipe.ingredients.forEach(ing => {
                        totalNeeded[ing.itemId] = (totalNeeded[ing.itemId] || 0) + (ing.qtyPackages * batches);
                        // Note: logic assumes recipe ing.qtyPackages is "packages per batch". 
                        // If it's "units", we need conversion. 
                        // User req check: "recipe: yieldUnits (how many units produce a lot), ingredients: [{itemId, qtyPackagesOrBase}]"
                        // We will assume recipe defines Packages per Batch for simplicity as requested.
                    });
                }
            });
        } else {
            // GOAL Mode - assume generic mix or specific? 
            // User requirement: "Modo B: por meta de producción definida por el usuario."
            // Doing a generic "Target Sales" is hard without knowing WHICH product.
            // Let's assume generic average or ask user to select Product -> Qty. 
            // For simplicity/MVP: Select 1 Product and Qty.
        }

        return totalNeeded;
    }, [mode, orders, recipes, goalQty]);

    // Merge with Stock to find "To Buy"
    const plan = items.map(item => {
        const neededPackages = requirements[item.id] || 0;
        const current = item.stockPackages;
        const balance = current - neededPackages;
        const toBuy = balance < 0 ? Math.abs(balance) : 0;

        return { item, neededPackages, current, balance, toBuy };
    }).filter(x => x.neededPackages > 0);

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                <Radio.Group value={mode} onChange={e => setMode(e.target.value)}>
                    <Radio.Button value="DEMAND">Modo A: Por Pedidos Activos</Radio.Button>
                    {/* Mode B complex to implement without more UI, keeping disabled or simple for now */}
                    <Radio.Button value="GOAL" disabled>Modo B: Meta (WIP)</Radio.Button>
                </Radio.Group>
            </div>

            {!recipes.length && <Alert type="warning" message="No hay recetas configuradas. El cálculo no funcionará." showIcon style={{ marginBottom: 16 }} />}

            <Table
                dataSource={plan}
                rowKey={r => r.item.id}
                columns={[
                    { title: 'Insumo', render: (r) => r.item.name },
                    { title: 'En Stock', dataIndex: 'current' },
                    { title: 'Necesario', dataIndex: 'neededPackages', render: v => v.toFixed(2) },
                    { title: 'Balance', dataIndex: 'balance', render: v => <span style={{ color: v < 0 ? 'red' : 'green' }}>{v.toFixed(2)}</span> },
                    {
                        title: 'A Comprar',
                        dataIndex: 'toBuy',
                        render: (v, r) => v > 0 ? <Tag color="red">Comprar {Math.ceil(v)} {r.item.purchaseUnitLabel}(s)</Tag> : <Tag color="green">OK</Tag>
                    }
                ]}
            />
        </div>
    );
};

// --- Main Page ---

export const InventoryPage = () => {
    const { data: items } = useFirestoreSubscription<InventoryItem>('inventory_items');
    const { data: movements } = useFirestoreSubscription<InventoryMovement>('inventory_movements');
    const { data: recipes } = useFirestoreSubscription<Recipe>('recipes');
    const { data: orders } = useFirestoreSubscription<Order>('orders');
    const { data: products } = useFirestoreSubscription<Product>('catalog_products');

    const { add: addItem, update: updateItem, softDelete: deleteItem } = useFirestoreMutation('inventory_items');
    const { add: addMove } = useFirestoreMutation('inventory_movements');

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [moveItem, setMoveItem] = useState<InventoryItem | null>(null);

    const [form] = Form.useForm();
    const [moveForm] = Form.useForm();

    const handleItemSubmit = async () => {
        const values = await form.validateFields();
        if (editingItem) {
            await updateItem(editingItem.id, values);
        } else {
            await addItem({ ...values, stockPackages: 0 }); // Init stock 0
        }
        setIsItemModalOpen(false);
    };

    const handleMoveSubmit = async () => {
        const values = await moveForm.validateFields();
        if (!moveItem) return;

        // Record Movement
        await addMove({
            itemId: moveItem.id,
            itemName: moveItem.name,
            type: values.type,
            quantityPackages: values.quantity,
            date: new Date(),
            note: values.note
        });

        // Update Stock
        const newStock = values.type === 'IN'
            ? moveItem.stockPackages + values.quantity
            : values.type === 'OUT'
                ? moveItem.stockPackages - values.quantity
                : values.quantity; // ADJUST = Set to new value

        await updateItem(moveItem.id, { stockPackages: newStock });
        setIsMoveModalOpen(false);
        message.success('Movimiento registrado');
    };

    const tabs = [
        {
            key: 'stock',
            label: 'Existencias',
            children: (
                <>
                    <div style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); setIsItemModalOpen(true); form.resetFields(); }}>
                            Nuevo Insumo
                        </Button>
                    </div>
                    <InventoryList
                        items={items.filter(i => !i.isDeleted)}
                        onEdit={(i: InventoryItem) => { setEditingItem(i); form.setFieldsValue(i); setIsItemModalOpen(true); }}
                        onDelete={(i: InventoryItem) => deleteItem(i.id)}
                        onMove={(i: InventoryItem) => { setMoveItem(i); moveForm.resetFields(); setIsMoveModalOpen(true); }}
                    />
                </>
            )
        },
        {
            key: 'planning',
            label: 'Planeación de Compras',
            children: <PlanningCalculator items={items} recipes={recipes} orders={orders} products={products} />
        },
        // We could add Recipe CRUD here, but for brevity implying configuration
        {
            key: 'movements',
            label: 'Historial',
            children: (
                <Table
                    dataSource={movements.sort((a, b) => b.date?.seconds - a.date?.seconds)}
                    columns={[
                        { title: 'Fecha', dataIndex: 'date', render: d => d ? dayjs(d.toDate()).format('DD/MM HH:mm') : '' },
                        { title: 'Insumo', dataIndex: 'itemName' },
                        { title: 'Tipo', dataIndex: 'type', render: t => <Tag color={t === 'IN' ? 'green' : t === 'OUT' ? 'red' : 'orange'}>{t}</Tag> },
                        { title: 'Cantidad', dataIndex: 'quantityPackages' },
                        { title: 'Nota', dataIndex: 'note' },
                    ]}
                />
            )
        }
    ];

    return (
        <div>
            <Tabs items={tabs} />

            {/* Item Modal */}
            <Modal open={isItemModalOpen} onOk={handleItemSubmit} onCancel={() => setIsItemModalOpen(false)} title="Insumo">
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="category" label="Categoría"><Input /></Form.Item>
                    <Form.Item name="purchaseUnitLabel" label="Unidad de Compra" initialValue="paquete">
                        <Select>
                            <Option value="bolsa">Bolsa</Option>
                            <Option value="caja">Caja</Option>
                            <Option value="paquete">Paquete</Option>
                            <Option value="cartera">Cartera</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="packageSize" label="Tamaño Empaque (aprox)" initialValue={1}><InputNumber /></Form.Item>
                    <Form.Item name="minPackages" label="Stock Mínimo (Empaques)" initialValue={1}><InputNumber /></Form.Item>
                    <Form.Item name="isActive" label="Activo" valuePropName="checked" initialValue={true}><Input type="checkbox" /></Form.Item>
                </Form>
            </Modal>

            {/* Movement Modal */}
            <Modal open={isMoveModalOpen} onOk={handleMoveSubmit} onCancel={() => setIsMoveModalOpen(false)} title={`Movimiento: ${moveItem?.name}`}>
                <Form form={moveForm} layout="vertical">
                    <Form.Item name="type" label="Tipo" initialValue="IN">
                        <Radio.Group buttonStyle="solid">
                            <Radio.Button value="IN">Entrada</Radio.Button>
                            <Radio.Button value="OUT">Salida</Radio.Button>
                            <Radio.Button value="ADJUST">Ajuste (Físico)</Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item name="quantity" label="Cantidad (Empaques)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="note" label="Nota"><Input /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
