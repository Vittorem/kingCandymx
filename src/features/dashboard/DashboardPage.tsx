import { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Typography, Alert, Modal, Table, Button, List } from 'antd';
import { UserOutlined, ShoppingOutlined, RiseOutlined } from '@ant-design/icons';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RecTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { useFirestoreSubscription } from '../../hooks/useFirestore';
import { Order, Customer } from '../../types';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);


const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload && payload.isWeekend) {
        return (
            <svg x={cx - 5} y={cy - 5} width={10} height={10} fill="#faad14" viewBox="0 0 1024 1024">
                <circle cx="512" cy="512" r="512" />
            </svg>
        );
    }
    return (
        <svg x={cx - 3} y={cy - 3} width={6} height={6} fill="#8884d8" viewBox="0 0 1024 1024">
            <circle cx="512" cy="512" r="512" />
        </svg>
    );
};

const { RangePicker } = DatePicker;
const { Title } = Typography;

export const DashboardPage = () => {
    const { data: orders } = useFirestoreSubscription<Order>('orders');
    const { data: customers } = useFirestoreSubscription<Customer>('customers');

    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf('year'),
        dayjs().endOf('year')
    ]);

    // Modals State
    const [isBestClientModalOpen, setIsBestClientModalOpen] = useState(false);
    const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

    // --- Metrics Calculation ---
    const metrics = useMemo(() => {
        const start = dateRange[0];
        const end = dateRange[1];
        const daysDiff = end.diff(start, 'day');
        // Threshold: <= 35 days -> Daily View, > 35 days -> Monthly View
        const isDailyView = daysDiff <= 35;

        // Filter valid orders for sales stats: Status 'Entregado'
        const periodOrders = orders.filter(o => {
            if (o.status !== 'Entregado') return false;
            const dateToUse = o.deliveredAt ? dayjs(o.deliveredAt.toDate()) : (o.deliveryDate ? dayjs(o.deliveryDate.seconds * 1000) : null);
            if (!dateToUse) return false;
            return dateToUse.isAfter(start) && dateToUse.isBefore(end);
        });

        const totalSales = periodOrders.reduce((acc, curr) => acc + curr.total, 0);
        const totalOrders = periodOrders.length;
        const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

        // Active Clients in Period (Unique Customers who bought in this period)
        const uniqueCustomersInPeriod = new Set(periodOrders.filter(o => o.customerId).map(o => o.customerId)).size;

        let weekendSales = 0;

        // Group by Time Unit (Day vs Month)
        const salesMap: Record<string, { sales: number, isWeekend: boolean }> = {};

        let current = start.clone();

        if (isDailyView) {
            // Daily Logic
            current = current.startOf('day');
            while (current.isBefore(end) || current.isSame(end, 'day')) {
                const key = current.format('DD/MM');
                const dayNum = current.day();
                const isWeekend = [0, 4, 5, 6].includes(dayNum);
                salesMap[key] = { sales: 0, isWeekend };
                current = current.add(1, 'day');
            }
        } else {
            // Monthly Logic
            current = current.startOf('month');
            while (current.isBefore(end) || current.isSame(end, 'month')) {
                const key = current.format('MMM');
                salesMap[key] = { sales: 0, isWeekend: false };
                current = current.add(1, 'month');
            }
        }

        // Fill Data & Calculate Weekend Sales
        periodOrders.forEach(o => {
            const dateToUse = o.deliveredAt ? dayjs(o.deliveredAt.toDate()) : (o.deliveryDate ? dayjs(o.deliveryDate.seconds * 1000) : null);
            if (dateToUse) {
                const dayNum = dateToUse.day();
                if ([0, 4, 5, 6].includes(dayNum)) {
                    weekendSales += o.total;
                }

                const key = isDailyView ? dateToUse.format('DD/MM') : dateToUse.format('MMM');
                if (salesMap[key]) {
                    salesMap[key].sales += o.total;
                }
            }
        });

        const weekendSalesPercentage = totalSales > 0 ? (weekendSales / totalSales) * 100 : 0;

        const chartData = Object.keys(salesMap).map(k => ({
            name: k,
            sales: salesMap[k].sales,
            isWeekend: salesMap[k].isWeekend
        }));

        // Top Products
        const productCount = periodOrders.reduce((acc: any, curr) => {
            const key = curr.productNameAtSale;
            acc[key] = (acc[key] || 0) + curr.quantity;
            return acc;
        }, {});
        const topProducts = Object.keys(productCount).map(k => ({ name: k, value: productCount[k] })).sort((a, b) => b.value - a.value).slice(0, 5);

        return { totalSales, totalOrders, avgTicket, chartData, topProducts, weekendSalesPercentage, uniqueCustomersInPeriod };
    }, [orders, dateRange]);

    // --- Insights "AI" Heuristics ---
    const insights = useMemo(() => {
        const start = dateRange[0];
        const end = dateRange[1];

        // 1. BEST CUSTOMER (In Selected Period)
        // Calculate stats ONLY from filtered orders
        const periodOrders = orders.filter(o => {
            if (o.status !== 'Entregado') return false;
            const dateToUse = o.deliveredAt ? dayjs(o.deliveredAt.toDate()) : (o.deliveryDate ? dayjs(o.deliveryDate.seconds * 1000) : null);
            if (!dateToUse) return false;
            return dateToUse.isAfter(start) && dateToUse.isBefore(end);
        });

        const periodCustomerStats: Record<string, { totalSpent: number, count: number }> = {};
        periodOrders.forEach(o => {
            if (!o.customerId) return;
            if (!periodCustomerStats[o.customerId]) {
                periodCustomerStats[o.customerId] = { totalSpent: 0, count: 0 };
            }
            periodCustomerStats[o.customerId].totalSpent += o.total;
            periodCustomerStats[o.customerId].count += 1;
        });

        // Enrich Customers
        const validCustomersForRanking = customers.map(c => ({
            ...c,
            periodSpent: periodCustomerStats[c.id]?.totalSpent || 0,
            periodOrders: periodCustomerStats[c.id]?.count || 0
        })).filter(c => c.periodSpent > 0);

        // Rank All Customers (B2C + B2B)
        const rankedCustomers = validCustomersForRanking
            .sort((a, b) => b.periodSpent - a.periodSpent)
            .slice(0, 10);

        const bestCustomer = rankedCustomers[0];

        // 2. RETENTION (At Period End)
        // Check inactivity relative to the END of the selected period.
        const inactiveThresholdAtEnd = end.subtract(30, 'days');

        const historicalOrders = orders.filter(o => {
            if (o.status !== 'Entregado') return false;
            const dateToUse = o.deliveredAt ? dayjs(o.deliveredAt.toDate()) : (o.deliveryDate ? dayjs(o.deliveryDate.seconds * 1000) : null);
            if (!dateToUse) return false;
            return dateToUse.isBefore(end); // strictly before (or same) as end of period
        });

        const customerLastDates: Record<string, dayjs.Dayjs> = {};
        historicalOrders.forEach(o => {
            const dateToUse = o.deliveredAt ? dayjs(o.deliveredAt.toDate()) : (o.deliveryDate ? dayjs(o.deliveryDate.seconds * 1000) : null);
            if (dateToUse && o.customerId) {
                if (!customerLastDates[o.customerId] || dateToUse.isAfter(customerLastDates[o.customerId])) {
                    customerLastDates[o.customerId] = dateToUse;
                }
            }
        });

        const inactiveCustomers = customers.filter(c => {
            const lastDate = customerLastDates[c.id];
            if (!lastDate) return false;
            return lastDate.isBefore(inactiveThresholdAtEnd);
        });

        // 3. DEMOGRAPHICS (Gender, Age, Occupation)
        // Identify unique customers who BOUGHT in this period
        const uniqueCustomerIds = new Set(periodOrders.map(o => o.customerId));
        const activeCustomers = customers.filter(c => uniqueCustomerIds.has(c.id));

        // Gender Stats
        const genderStats: Record<string, number> = { 'Femenino': 0, 'Masculino': 0, 'Otro/ND': 0 };
        activeCustomers.forEach(c => {
            if (c.gender === 'F') genderStats['Femenino']++;
            else if (c.gender === 'M') genderStats['Masculino']++;
            else genderStats['Otro/ND']++;
        });
        const genderData = Object.keys(genderStats).map(k => ({ name: k, value: genderStats[k] })).filter(d => d.value > 0);

        // Age Stats
        const ageBuckets: Record<string, number> = { '< 20': 0, '20-29': 0, '30-39': 0, '40-49': 0, '50+': 0, 'N/A': 0 };
        activeCustomers.forEach(c => {
            if (!c.age) {
                ageBuckets['N/A']++;
            } else {
                if (c.age < 20) ageBuckets['< 20']++;
                else if (c.age < 30) ageBuckets['20-29']++;
                else if (c.age < 40) ageBuckets['30-39']++;
                else if (c.age < 50) ageBuckets['40-49']++;
                else ageBuckets['50+']++;
            }
        });
        const ageData = Object.keys(ageBuckets).map(k => ({ name: k, value: ageBuckets[k] }));

        // Occupation Stats
        const occupationStats: Record<string, number> = {};
        activeCustomers.forEach(c => {
            const occ = c.occupation ? c.occupation.trim() : 'Sin Dato';
            occupationStats[occ] = (occupationStats[occ] || 0) + 1;
        });
        const topOccupations = Object.keys(occupationStats)
            .map(k => ({ name: k, value: occupationStats[k] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return {
            inactiveCustomers,
            inactiveCount: inactiveCustomers.length,
            bestCustomerName: bestCustomer?.fullName || 'Nadie en este periodo',
            topCustomers: rankedCustomers.map(c => ({ ...c, totalSpent: c.periodSpent, ordersCount: c.periodOrders })),
            trendMessage: `El ${metrics.weekendSalesPercentage.toFixed(0)}% de las ventas ocurren en Fin de Semana (Jue-Dom).`,
            demographics: { genderData, ageData, topOccupations }
        };
    }, [customers, metrics, orders, dateRange]);

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
                            value={metrics.uniqueCustomersInPeriod}
                            suffix={`/ ${customers.length}`}
                            prefix={<UserOutlined />}
                        />
                        <div style={{ fontSize: 12, color: 'gray' }}>Que compraron en periodo / Total Global</div>
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
                                    <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} dot={<CustomizedDot />} />
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

            {/* Demographics Row (New) */}
            <Card title="📊 Demografía de Compradores (En Periodo)" style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <div style={{ textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>Género</div>
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={insights.demographics.genderData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label
                                    >
                                        {insights.demographics.genderData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RecTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Col>
                    <Col span={8}>
                        <div style={{ textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>Rango de Edad</div>
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={insights.demographics.ageData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RecTooltip />
                                    <Bar dataKey="value" fill="#8884d8" name="Clientes" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Col>
                    <Col span={8}>
                        <div style={{ textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>Top Ocupaciones</div>
                        <List
                            size="small"
                            bordered
                            dataSource={insights.demographics.topOccupations}
                            renderItem={(item) => <List.Item><Typography.Text strong>{item.name}</Typography.Text>: {item.value}</List.Item>}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Insights Panel */}
            <Card title="✨ Insights & Recomendaciones IA" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <div onClick={() => setIsBestClientModalOpen(true)} style={{ cursor: 'pointer' }}>
                            <Alert
                                message="Mejor Cliente"
                                description={`${insights.bestCustomerName} es tu cliente más valioso. ¡Envíale una promo! (Click para ver Top 10)`}
                                type="success"
                                showIcon
                            />
                        </div>
                    </Col>
                    <Col span={8}>
                        <div onClick={() => setIsRetentionModalOpen(true)} style={{ cursor: 'pointer' }}>
                            <Alert
                                message="Alerta de Retención"
                                description={`Tienes ${insights.inactiveCount} clientes (B2B + B2C) que no compran hace 30+ días. (Click para ver listado)`}
                                type="warning"
                                showIcon
                            />
                        </div>
                    </Col>
                    <Col span={8}>
                        <Alert
                            message="Tendencia"
                            description={insights.trendMessage}
                            type="info"
                            showIcon
                            icon={<RiseOutlined />}
                        />
                    </Col>
                </Row>
            </Card>

            {/* MODAL: BEST CLIENTS */}
            <Modal
                title="Top 10 Mejores Clientes (General)"
                open={isBestClientModalOpen}
                onCancel={() => setIsBestClientModalOpen(false)}
                footer={[<Button key="close" onClick={() => setIsBestClientModalOpen(false)}>Cerrar</Button>]}
            >
                <Table
                    dataSource={insights.topCustomers}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                        { title: 'Cliente', dataIndex: 'fullName', key: 'name' },
                        { title: 'Total Gastado', dataIndex: 'totalSpent', key: 'total', render: (val) => `$${(val || 0).toFixed(2)}` },
                        { title: 'Pedidos', dataIndex: 'ordersCount', key: 'orders' }
                    ]}
                />
            </Modal>

            {/* MODAL: RETENTION ALERT */}
            <Modal
                title="Clientes en Riesgo (Sin compra > 30 días)"
                open={isRetentionModalOpen}
                onCancel={() => setIsRetentionModalOpen(false)}
                footer={[<Button key="close" onClick={() => setIsRetentionModalOpen(false)}>Cerrar</Button>]}
            >
                <Table
                    dataSource={insights.inactiveCustomers}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    size="small"
                    columns={[
                        { title: 'Cliente', dataIndex: 'fullName', key: 'name' },
                        { title: 'Última Compra', dataIndex: 'lastDeliveredAt', key: 'last', render: (d) => d ? dayjs(d.toDate()).format('DD/MM/YYYY') : 'N/A' },
                        {
                            title: 'Días Inactivo',
                            key: 'days',
                            render: (_, r) => {
                                if (!r.lastDeliveredAt) return '-';
                                return dayjs().diff(dayjs(r.lastDeliveredAt.toDate()), 'day');
                            }
                        }
                    ]}
                />
            </Modal>
        </div>
    );
};
