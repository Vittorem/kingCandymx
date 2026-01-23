import { useEffect, useState } from 'react';
import { Drawer, Form, Select, DatePicker, InputNumber, Radio, Divider, Input, Button, Space, Typography, Row, Col } from 'antd';
import { useFirestoreSubscription } from '../../../hooks/useFirestore';
import { Customer, Product, Flavor, Channel, Order } from '../../../types';
import dayjs from 'dayjs';

interface OrderFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: Partial<Order>) => Promise<void>;
    initialValues?: Order | null;
    loading?: boolean;
}

const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;

export const OrderForm = ({ open, onClose, onSubmit, initialValues, loading }: OrderFormProps) => {
    const [form] = Form.useForm();

    // Catalogs
    const { data: customers } = useFirestoreSubscription<Customer>('customers');
    const { data: products } = useFirestoreSubscription<Product>('catalog_products');
    const { data: flavors } = useFirestoreSubscription<Flavor>('catalog_flavors');
    const { data: channels } = useFirestoreSubscription<Channel>('catalog_channels');

    // Local state for calculations
    const [totals, setTotals] = useState({ subtotal: 0, discount: 0, total: 0 });

    useEffect(() => {
        if (open) {
            form.resetFields();
            if (initialValues) {
                // Hydrate form, converting timestamp to dayjs for DatePicker
                const deliveryDate = initialValues.deliveryDate ? dayjs(initialValues.deliveryDate.toDate()) : null;
                form.setFieldsValue({
                    ...initialValues,
                    deliveryDate,
                });
                calculateTotals(initialValues);
            } else {
                // Defaults
                form.setFieldsValue({
                    status: 'Pendiente',
                    quantity: 1,
                    shippingCost: 0,
                    discountValue: 0,
                    extraCharges: 0,
                    deliveryMethod: 'Recoge',
                    discountType: 'AMOUNT',
                    deliveryDate: dayjs(),
                });
            }
        }
    }, [open, initialValues, form]);

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            form.setFieldsValue({
                productNameAtSale: product.name,
                unitPriceAtSale: product.price
            });
            calculateTotals(form.getFieldsValue());
        }
    };

    const calculateTotals = (values: any) => {
        const qty = values.quantity || 0;
        const price = values.unitPriceAtSale || 0;
        const shipping = values.shippingCost || 0;
        const extra = values.extraCharges || 0;
        const discountVal = values.discountValue || 0;
        const discountType = values.discountType || 'AMOUNT';

        const subtotal = qty * price;
        let discountAmount = 0;

        if (discountType === 'PERCENT') {
            discountAmount = (subtotal * discountVal) / 100;
        } else {
            discountAmount = discountVal;
        }

        const total = subtotal + shipping + extra - discountAmount;

        setTotals({ subtotal, discount: discountAmount, total });
    };

    const onValuesChange = (_: any, allValues: any) => {
        calculateTotals(allValues);
    };

    const handleFinish = async () => {
        try {
            const values = await form.validateFields();

            const customer = customers.find(c => c.id === values.customerId);
            const flavor = flavors.find(f => f.id === values.flavorId);

            const payload: Partial<Order> = {
                ...values,
                customerName: customer?.fullName || 'Desconocido',
                flavorNameAtSale: flavor?.name || 'Desconocido',
                deliveryDate: values.deliveryDate.toDate(),
                subtotal: totals.subtotal,
                discountAmount: totals.discount,
                total: totals.total,
            };

            await onSubmit(payload);
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Drawer
            title={initialValues ? "Editar Pedido" : "Nuevo Pedido"}
            width={720}
            onClose={onClose}
            open={open}
            extra={<Space><Button onClick={onClose}>Cancelar</Button><Button type="primary" onClick={handleFinish} loading={loading}>Guardar</Button></Space>}
        >
            <Form form={form} layout="vertical" onValuesChange={onValuesChange} hideRequiredMark>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="customerId" label="Cliente" rules={[{ required: true }]}>
                            <Select showSearch optionFilterProp="children" placeholder="Selecciona Cliente">
                                {customers.filter(c => !c.isDeleted).map(c => (
                                    <Option key={c.id} value={c.id}>{c.fullName} - {c.phone}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="channelId" label="Canal de Venta" rules={[{ required: true }]}>
                            <Select placeholder="Selecciona Canal">
                                {channels.filter(c => !c.isDeleted).map(c => (
                                    <Option key={c.id} value={c.id}>{c.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">Producto</Divider>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="productId" label="Producto" rules={[{ required: true }]}>
                            <Select onChange={handleProductChange} placeholder="Producto">
                                {products.filter(p => !p.isDeleted).map(p => (
                                    <Option key={p.id} value={p.id}>{p.name} (${p.price})</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        {/* Hidden fields to freeze values */}
                        <Form.Item name="productNameAtSale" hidden><Input /></Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="flavorId" label="Sabor" rules={[{ required: true }]}>
                            <Select placeholder="Sabor">
                                {flavors.filter(f => !f.isDeleted).map(f => (
                                    <Option key={f.id} value={f.id}>{f.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="flavorNameAtSale" hidden><Input /></Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="quantity" label="Cantidad" rules={[{ required: true }]}>
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="unitPriceAtSale" label="Precio Unitario (Congelado)">
                            <InputNumber prefix="$" style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <div style={{ padding: '24px 0', textAlign: 'right' }}>
                            <Text strong>Subtotal: ${totals.subtotal.toFixed(2)}</Text>
                        </div>
                    </Col>
                </Row>

                <Divider orientation="left">Entrega & Cobro</Divider>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="deliveryDate" label="Fecha Entrega" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" showTime />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="deliveryMethod" label="Método">
                            <Radio.Group>
                                <Radio value="Recoge">Recoge</Radio>
                                <Radio value="Envío">Envío</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="shippingCost" label="Costo Envío">
                            <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="discountType" label="Tipo Descuento">
                            <Select>
                                <Option value="AMOUNT">Monto ($)</Option>
                                <Option value="PERCENT">Porcentaje (%)</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="discountValue" label="Valor Descuento">
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <div style={{ padding: '30px 0', color: 'red' }}>
                            Descuento: -${totals.discount.toFixed(2)}
                        </div>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="extraCharges" label="Cargos Extra">
                            <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={16}>
                        <Form.Item name="extraChargesReason" label="Motivo Cargo Extra">
                            <Input placeholder="Ej. Empaque especial" />
                        </Form.Item>
                    </Col>
                </Row>

                <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 24, textAlign: 'right' }}>
                    <Typography.Title level={3} style={{ margin: 0 }}>
                        Total: ${totals.total.toFixed(2)}
                    </Typography.Title>
                </div>

                <Form.Item name="status" label="Estado Inicial">
                    <Select>
                        <Option value="Pendiente">Pendiente</Option>
                        <Option value="Confirmado">Confirmado</Option>
                        <Option value="En preparación">En preparación</Option>
                        <Option value="Listo para entregar">Listo para entregar</Option>
                        <Option value="Entregado">Entregado</Option>
                        <Option value="Cancelado">Cancelado</Option>
                    </Select>
                </Form.Item>

                <Form.Item name="notes" label="Notas del Pedido">
                    <TextArea rows={3} />
                </Form.Item>
            </Form>
        </Drawer>
    );
};
