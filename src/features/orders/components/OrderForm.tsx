import { useEffect, useState } from 'react';
import { Drawer, Form, Select, DatePicker, InputNumber, Radio, Divider, Input, Button, Space, Typography, Row, Col, Switch, Alert } from 'antd';
import { useFirestoreSubscription } from '../../../hooks/useFirestore';
import { Customer, Product, Flavor, Channel, Order, ORDER_STATUSES } from '../../../types';
import { calculateMaxRedeemableProducts, calculatePointsCost, getPointsCostForProduct } from '../../../utils/loyalty';
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
    const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);

    const currentCustomer = customers.find(c => c.id === form.getFieldValue('customerId'));
    const currentProduct = products.find(p => p.id === form.getFieldValue('productId'));
    const productName = currentProduct?.name || '';
    const pointsCost = getPointsCostForProduct(productName);
    const availablePoints = currentCustomer?.loyaltyPoints || 0;
    const canRedeem = pointsCost > 0 && availablePoints >= pointsCost;

    useEffect(() => {
        if (open) {
            form.resetFields();
            if (initialValues) {
                const deliveryDate = initialValues.deliveryDate
                    ? dayjs(initialValues.deliveryDate.toDate())
                    : null;
                form.setFieldsValue({ ...initialValues, deliveryDate });
                calculateTotals(initialValues as unknown as Record<string, unknown>);
            } else {
                form.setFieldsValue({
                    status: 'Pendiente',
                    quantity: 1,
                    shippingCost: 0,
                    discountValue: 0,
                    extraCharges: 0,
                    deliveryMethod: 'Recoge',
                    discountType: 'AMOUNT',
                    deliveryDate: dayjs(),
                    redeemLoyalty: false
                });
            }
        }
    }, [open, initialValues, form]);

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            form.setFieldsValue({
                productNameAtSale: product.name,
                unitPriceAtSale: product.price,
            });
            calculateTotals(form.getFieldsValue());
        }
    };

    const calculateTotals = (values: Record<string, unknown>) => {
        const qty = (values.quantity as number) || 0;
        const price = (values.unitPriceAtSale as number) || 0;
        const shipping = (values.shippingCost as number) || 0;
        const extra = (values.extraCharges as number) || 0;
        const discountVal = (values.discountValue as number) || 0;
        const discountType = (values.discountType as string) || 'AMOUNT';

        const subtotal = qty * price;
        const discountAmount = discountType === 'PERCENT'
            ? (subtotal * discountVal) / 100
            : discountVal;

        const redeemLoyalty = values.redeemLoyalty as boolean;
        let pLoyaltyDiscount = 0;
        const currentSelectedProduct = products.find(p => p.id === values.productId);
        const pName = currentSelectedProduct?.name || '';

        if (redeemLoyalty && getPointsCostForProduct(pName) > 0) {
            const maxFree = calculateMaxRedeemableProducts(pName, availablePoints);
            const freeUnits = Math.min(qty, maxFree);
            pLoyaltyDiscount = freeUnits * price;
        }

        const total = subtotal + shipping + extra - discountAmount - pLoyaltyDiscount;
        setLoyaltyDiscount(pLoyaltyDiscount);
        setTotals({ subtotal, discount: discountAmount, total });
    };

    const onValuesChange = (_: unknown, allValues: Record<string, unknown>) => {
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
                pointsRedeemed: values.redeemLoyalty && loyaltyDiscount > 0
                    ? calculatePointsCost(values.productNameAtSale as string || '', Math.round(loyaltyDiscount / (values.unitPriceAtSale || 1)))
                    : 0,
                subtotal: totals.subtotal,
                discountAmount: totals.discount,
                total: totals.total,
            };

            delete (payload as Record<string, unknown>).redeemLoyalty;

            await onSubmit(payload);
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Drawer
            title={initialValues ? 'Editar Pedido' : 'Nuevo Pedido'}
            width={720}
            onClose={onClose}
            open={open}
            extra={
                <Space>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="primary" onClick={handleFinish} loading={loading}>Guardar</Button>
                </Space>
            }
        >
            <Form form={form} layout="vertical" onValuesChange={onValuesChange} requiredMark={false}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="customerId" label="Cliente" rules={[{ required: true }]}>
                            <Select showSearch optionFilterProp="children" placeholder="Selecciona Cliente">
                                {customers.filter(c => c.isActive !== false).map(c => (
                                    <Option key={c.id} value={c.id}>{c.fullName} - {c.phone}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="channelId" label="Canal de Venta" rules={[{ required: true }]}>
                            <Select placeholder="Selecciona Canal">
                                {channels.filter(c => c.isActive).map(c => (
                                    <Option key={c.id} value={c.id}>{c.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                {currentCustomer && availablePoints > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <Alert
                            message={`Este cliente tiene ${availablePoints} puntos de lealtad.`}
                            type="info"
                            showIcon
                            action={
                                pointsCost === 0 ? (
                                    <Text type="secondary" style={{ fontSize: 12 }}>No aplica para este producto</Text>
                                ) : canRedeem ? (
                                    <Form.Item name="redeemLoyalty" valuePropName="checked" style={{ margin: 0 }}>
                                        <Switch checkedChildren="Redimir" unCheckedChildren="No usar" />
                                    </Form.Item>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Requiere {pointsCost} pts para este producto
                                    </Text>
                                )
                            }
                        />
                    </div>
                )}

                <Divider orientation="left">Producto</Divider>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="productId" label="Producto" rules={[{ required: true }]}>
                            <Select onChange={handleProductChange} placeholder="Producto">
                                {products.filter(p => p.isActive).map(p => (
                                    <Option key={p.id} value={p.id}>{p.name} (${p.price})</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="productNameAtSale" hidden><Input /></Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="flavorId" label="Sabor" rules={[{ required: true }]}>
                            <Select placeholder="Sabor">
                                {flavors.filter(f => f.isActive).map(f => (
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
                            {loyaltyDiscount > 0 && <span style={{ display: 'block' }}>Lealtad: -${loyaltyDiscount.toFixed(2)}</span>}
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
                        {ORDER_STATUSES.map(s => (
                            <Option key={s} value={s}>{s}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="notes" label="Notas del Pedido">
                    <TextArea rows={3} />
                </Form.Item>
            </Form>
        </Drawer>
    );
};
