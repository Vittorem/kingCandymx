import { useEffect } from 'react';
import { Drawer, Form, Input, Select, Button, InputNumber, Row, Col, Space, Divider, Switch, Grid } from 'antd';
import { Customer } from '../../../types';

interface CustomerFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: Partial<Customer>) => Promise<void>;
    initialValues?: Customer | null;
    loading?: boolean;
}

const { Option } = Select;
const { TextArea } = Input;

export const CustomerForm = ({ open, onClose, onSubmit, initialValues, loading }: CustomerFormProps) => {
    const [form] = Form.useForm();
    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();
    const isMobile = screens.md === false;

    useEffect(() => {
        if (open) {
            form.resetFields();
            if (initialValues) {
                form.setFieldsValue(initialValues);
            } else {
                form.setFieldsValue({ isActive: true, type: 'B2C', mainContactMethod: 'WhatsApp', loyaltyPoints: 0 });
            }
        }
    }, [open, initialValues, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            await onSubmit(values);
            onClose();
        } catch (error) {
            console.error('Validate Failed:', error);
        }
    };

    return (
        <Drawer
            title={initialValues ? 'Editar Cliente' : 'Nuevo Cliente'}
            width={isMobile ? '100%' : 720}
            placement={isMobile ? 'bottom' : 'right'}
            height={isMobile ? '90vh' : '100%'}
            onClose={onClose}
            open={open}
            styles={{ body: { paddingBottom: 80 } }}
            extra={
                <Space>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} type="primary" loading={loading}>
                        Guardar
                    </Button>
                </Space>
            }
        >
            <Form layout="vertical" form={form} requiredMark={false}>
                <Form.Item name="isActive" valuePropName="checked" hidden>
                    <Switch />
                </Form.Item>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="fullName" label="Nombre Completo" rules={[{ required: true, message: 'Ingresa el nombre' }]}>
                            <Input placeholder="Ej. Ana Pérez" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="phone" label="Teléfono" rules={[{ required: true, message: 'Ingresa el teléfono' }]}>
                            <Input placeholder="55 1234 5678" />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="loyaltyPoints" label="Puntos Lealtad (Bambinos)">
                            <InputNumber style={{ width: '100%' }} disabled />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="mainContactMethod" label="Medio de contacto principal" rules={[{ required: true }]}>
                            <Select>
                                <Option value="Instagram">Instagram</Option>
                                <Option value="WhatsApp">WhatsApp</Option>
                                <Option value="Facebook">Facebook</Option>
                                <Option value="Otro">Otro</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="type" label="Tipo de Cliente" rules={[{ required: true }]}>
                            <Select>
                                <Option value="B2C">Individual (B2C)</Option>
                                <Option value="B2B">Negocio (B2B)</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Divider plain>Perfil Demográfico</Divider>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="gender" label="Género">
                            <Select allowClear>
                                <Option value="F">Femenino</Option>
                                <Option value="M">Masculino</Option>
                                <Option value="Otro">Otro</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="age" label="Edad">
                            <InputNumber style={{ width: '100%' }} min={0} max={120} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="civilStatus" label="Estado Civil">
                            <Select allowClear>
                                <Option value="Soltero/a">Soltero/a</Option>
                                <Option value="Casado/a">Casado/a</Option>
                                <Option value="Divorciado/a">Divorciado/a</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="occupation" label="Ocupación">
                            <Input placeholder="Ej. Abogada" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="email" label="Email (Opcional)">
                            <Input type="email" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider plain>Redes & Ubicación</Divider>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="instagramHandle" label="Instagram User">
                            <Input prefix="@" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="facebookLink" label="Facebook Link">
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="colonia" label="Colonia">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="city" label="Ciudad">
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider plain>Notas y Etiquetas</Divider>

                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item name="tags" label="Etiquetas">
                            <Select mode="tags" style={{ width: '100%' }} placeholder="Ej. VIP, Alérgico a nuez" />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item name="notes" label="Notas Internas">
                            <TextArea rows={4} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Drawer>
    );
};
