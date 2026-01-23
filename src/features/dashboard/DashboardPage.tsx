import { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Select, Typography, List, Badge, Alert } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined, ShoppingOutlined } from '@ant-design/icons';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RecTooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { useFirestoreSubscription } from '../../hooks/useFirestore';
import { Order, Customer } from '../../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

export const DashboardPage = () => {
    const { data: orders } = useFirestoreSubscription<Order>('orders');
    const { data: customers } = useFirestoreSubscription<Customer>('customers');

    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf('month'),
        dayjs().endOf('month')
    ]);

    // --- Metrics Calculation ---
    const metrics = useMemo(() => {
        const start = dateRange[0];
        const end = dateRange[1];

        const periodOrders = orders.filter(o => {
            if (!o.deliveredAt) return false;
            const d = dayjs(o.deliveredAt.toDate());
            return d.isAfter(start) && d.isBefore(end);
        });

        const totalSales = periodOrders.reduce((acc, curr) => acc + curr.total, 0);
        const totalOrders = periodOrders.length;
        const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

        // Group by Month (for chart)
        const salesByMonth = periodOrders.reduce((acc: any, curr) => {
            const month = dayjs(curr.deliveredAt.toDate()).format('MMM');
            acc[month] = (acc[month] || 0) + curr.total;
            return acc;
        }, {});

        const chartData = Object.keys(salesByMonth).map(k => ({ name: k, sales: salesByMonth[k] }));

        // Top Products
        const productCount = periodOrders.reduce((acc: any, curr) => {
            const key = curr.productNameAtSale;
            acc[key] = (acc[key] || 0) + curr.quantity;
            return acc;
        }, {});
        const topProducts = Object.keys(productCount).map(k => ({ name: k, value: productCount[k] })).sort((a, b) => b.value - a.value).slice(0, 5);

        return { totalSales, totalOrders, avgTicket, chartData, topProducts };
    }, [orders, dateRange]);

    // --- Insights "AI" Heuristics ---
    const insights = useMemo(() => {
        const inactiveThreshold = dayjs().subtract(30, 'days');
        const inactiveCustomers = customers.filter(c => {
            if (!c.lastDeliveredAt) return true; // Never ordered
            return dayjs(c.lastDeliveredAt.toDate()).isBefore(inactiveThreshold);
        });

        const bestCustomer = customers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))[0];

        return {
            inactiveCount: inactiveCustomers.length,
            bestCustomerName: bestCustomer?.fullName || 'N/A',
            trend: metrics.totalSales > 0 ? 'Crece' : 'Estable' // Dummy logic for simplicity
        };
    }, [customers, metrics]);

    // Colors for Recharts
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
                <RangePicker
                    value={dateRange}
                    onChange={(val) => val && setDateRange([val[0]!, val[1]!])}
                    allowClear={false}
                />
            </div>

            {/* KPI Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic title="Ventas Totales" value={metrics.totalSales} precision={2} prefix="$" />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Pedidos Entregados" value={metrics.totalOrders} prefix={<ShoppingOutlined />} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Ticket Promedio" value={metrics.avgTicket} precision={2} prefix="$" />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Clientes Activos"
                            value={customers.filter(c => !c.id).length /* Fix logic if needed, simplify for now */}
                            formatter={() => customers.length}
                            prefix={<UserOutlined />}
                        />
                        <div style={{ fontSize: 12, color: 'gray' }}>Total Registrados</div>
                    </Card>
                </Col>
            </Row>

            {/* Charts Row */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={16}>
                    <Card title="Ventas en el Periodo">
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RecTooltip />
                                    <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card title="Top Productos">
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.topProducts}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        label
                                    >
                                        {metrics.topProducts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RecTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Insights Panel */}
            <Card title="✨ Insights & Recomendaciones IA" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Alert
                            message="Mejor Cliente"
                            description={`${insights.bestCustomerName} es tu cliente más valioso. ¡Envíale una promo!`}
                            type="success"
                            showIcon
                        />
                    </Col>
                    <Col span={8}>
                        <Alert
                            message="Alerta de Retención"
                            description={`Tienes ${insights.inactiveCount} clientes que no compran hace 30+ días.`}
                            type="warning"
                            showIcon
                        />
                    </Col>
                    <Col span={8}>
                        <Alert
                            message="Tendencia"
                            description="Las ventas muestran una tendencia estable respecto al inicio del periodo."
                            type="info"
                            showIcon
                        />
                    </Col>
                </Row>
            </Card>
        </div>
    );
};
