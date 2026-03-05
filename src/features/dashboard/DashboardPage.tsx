import { useMemo, useState } from 'react';
import { Row, Col, Card, Typography, Statistic, DatePicker, Divider, Button, Modal, List, Result, Tabs, Badge, Tag } from 'antd';
import {
    DollarOutlined,
    ShoppingCartOutlined,
    UserOutlined,
    RiseOutlined,
    FallOutlined,
    ExclamationCircleOutlined,
    TrophyOutlined,
    LineChartOutlined,
    ClockCircleOutlined,
    AlertOutlined,
} from '@ant-design/icons';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { useFirestoreSubscription } from '../../hooks/useFirestore';
import { Order, Customer } from '../../types';
import { getOrderDate, getDeliveredOrdersInRange } from '../../utils/dateHelpers';
import { computeDemographics, getInactiveCustomers } from '../../utils/demographicsHelpers';
import {
    computeCustomerRFMScores,
    aggregateRFMSegments,
    formatRFMForChart,
    type RFMSegmentResult
} from '../../utils/rfmAnalysis';
import {
    analyzeChannelPerformance,
    formatChannelForChart,
    type ChannelPerformance
} from '../../utils/channelAnalysis';
import {
    analyzeTemporalPatterns,
    formatHoursByTimeBlock
} from '../../utils/temporalAnalysis';
import {
    generateIntelligentAlerts,
    type IntelligentAlert,
    type PeriodMetrics
} from '../../utils/intelligentAlerts';
import { useIsMobile } from '../../hooks/useIsMobile';

const { RangePicker } = DatePicker;
const { Title } = Typography;
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// ─── Small sub-components ────────────────────────────────────────────────────

function KPICard(props: { title: string; value: string | number; prefix?: React.ReactNode; suffix?: React.ReactNode; color?: string }) {
    return (
        <Card bordered={false} style={{ borderTop: `3px solid ${props.color || '#1890ff'}` }}>
            <Statistic title={props.title} value={props.value} prefix={props.prefix} suffix={props.suffix} />
        </Card>
    );
}

interface CustomizedDotProps {
    cx?: number;
    cy?: number;
    value?: number;
}

function CustomizedDot({ cx = 0, cy = 0, value = 0 }: CustomizedDotProps) {
    const color = value > 0 ? '#52c41a' : '#ff4d4f';
    return <circle cx={cx} cy={cy} r={4} stroke={color} strokeWidth={2} fill={color} />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const DashboardPage = () => {
    const isMobile = useIsMobile();

    const { data: orders } = useFirestoreSubscription<Order>('orders');
    const { data: customers } = useFirestoreSubscription<Customer>('customers');

    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf('month'),
        dayjs().endOf('month'),
    ]);
    const [inactiveModalOpen, setInactiveModalOpen] = useState(false);

    // ─── Derived data ─────────────────────────────────────────────────

    const deliveredOrders = useMemo(
        () => getDeliveredOrdersInRange(orders, dateRange[0], dateRange[1]),
        [orders, dateRange]
    );

    const metrics = useMemo(() => {
        const totalSales = deliveredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        const totalOrders = deliveredOrders.length;
        const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
        const uniqueCustomers = new Set(deliveredOrders.map(o => o.customerId)).size;

        // Product ranking
        const productCount: Record<string, { qty: number; revenue: number }> = {};
        deliveredOrders.forEach(o => {
            if (o.items && o.items.length > 0) {
                o.items.forEach(item => {
                    const key = item.productNameAtSale || 'Sin Producto';
                    if (!productCount[key]) productCount[key] = { qty: 0, revenue: 0 };
                    productCount[key].qty += item.quantity || 1;
                    productCount[key].revenue += item.subtotal || 0;
                });
            } else {
                const key = o.productNameAtSale || 'Sin Producto';
                if (!productCount[key]) productCount[key] = { qty: 0, revenue: 0 };
                productCount[key].qty += o.quantity || 1;
                productCount[key].revenue += o.total || 0;
            }
        });
        const topProducts = Object.entries(productCount)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue);

        // Daily trend
        const dailyMap: Record<string, number> = {};
        deliveredOrders.forEach(o => {
            const date = getOrderDate(o);
            if (date) {
                const key = date.format('DD/MM');
                dailyMap[key] = (dailyMap[key] || 0) + o.total;
            }
        });
        const dailyTrend = Object.entries(dailyMap)
            .map(([date, ventas]) => ({ date, ventas }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return { totalSales, totalOrders, avgTicket, uniqueCustomers, topProducts, dailyTrend };
    }, [deliveredOrders]);

    const demographics = useMemo(
        () => computeDemographics(customers, deliveredOrders),
        [customers, deliveredOrders]
    );

    const inactiveCustomers = useMemo(
        () => getInactiveCustomers(customers, orders, dateRange[1]),
        [customers, orders, dateRange]
    );

    // ─── Previous period for comparisons ──────────────────────────────

    const previousPeriodRange = useMemo<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
        const duration = dateRange[1].diff(dateRange[0], 'days');
        return [
            dateRange[0].subtract(duration, 'days'),
            dateRange[0].subtract(1, 'days'),
        ];
    }, [dateRange]);

    const previousDeliveredOrders = useMemo(
        () => getDeliveredOrdersInRange(orders, previousPeriodRange[0], previousPeriodRange[1]),
        [orders, previousPeriodRange]
    );

    const previousMetrics = useMemo(() => {
        const totalRevenue = previousDeliveredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        const totalOrders = previousDeliveredOrders.length;
        const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        return { totalRevenue, totalOrders, avgTicket };
    }, [previousDeliveredOrders]);

    // ─── RFM Analysis ──────────────────────────────────────────────────

    const rfmScores = useMemo(
        () => computeCustomerRFMScores(customers, orders, dateRange[1]),
        [customers, orders, dateRange]
    );

    const rfmSegments = useMemo(
        () => aggregateRFMSegments(rfmScores),
        [rfmScores]
    );

    const rfmChartData = useMemo(
        () => formatRFMForChart(rfmSegments),
        [rfmSegments]
    );

    // ─── Channel Analysis ──────────────────────────────────────────────

    const channelPerformance = useMemo(
        () => analyzeChannelPerformance(deliveredOrders, previousDeliveredOrders),
        [deliveredOrders, previousDeliveredOrders]
    );

    const channelChartData = useMemo(
        () => formatChannelForChart(channelPerformance),
        [channelPerformance]
    );

    // ─── Temporal Analysis ─────────────────────────────────────────────

    const temporalAnalysis = useMemo(
        () => analyzeTemporalPatterns(deliveredOrders),
        [deliveredOrders]
    );

    const timeBlockData = useMemo(
        () => formatHoursByTimeBlock(temporalAnalysis.byHour),
        [temporalAnalysis]
    );

    // ─── Intelligent Alerts ────────────────────────────────────────────

    const currentPeriodMetrics: PeriodMetrics = {
        totalRevenue: metrics.totalSales,
        totalOrders: metrics.totalOrders,
        avgTicket: metrics.avgTicket,
    };

    const intelligentAlerts = useMemo(
        () => generateIntelligentAlerts(
            customers,
            orders,
            dateRange[1],
            currentPeriodMetrics,
            previousMetrics
        ),
        [customers, orders, dateRange, currentPeriodMetrics, previousMetrics]
    );

    // ─── Insights ─────────────────────────────────────────────────────

    const insights = useMemo(() => {
        const items: string[] = [];
        if (metrics.avgTicket > 0) items.push(`🎯 Ticket promedio: $${metrics.avgTicket.toFixed(0)}`);
        if (metrics.topProducts.length > 0) items.push(`🏆 Producto estrella: ${metrics.topProducts[0].name}`);
        if (inactiveCustomers.length > 0) items.push(`⚠️ ${inactiveCustomers.length} cliente(s) sin compra en 30 días`);
        if (demographics.genderData.length > 0) {
            const top = demographics.genderData.sort((a, b) => b.value - a.value)[0];
            items.push(`👥 Mayoría de compradores: ${top.name}`);
        }
        return items;
    }, [metrics, inactiveCustomers, demographics]);

    // ─── Tab Components ────────────────────────────────────────────────

    const rfmTabContent = (
        <Row gutter={[16, 16]}>
            <Col xs={24} md={10}>
                <Card title="Distribución de Segmentos" size="small">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={rfmChartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {rfmChartData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </Col>
            <Col xs={24} md={14}>
                <Card title="Detalle por Segmento" size="small">
                    <List
                        dataSource={rfmSegments}
                        renderItem={(segment: RFMSegmentResult) => (
                            <List.Item>
                                <List.Item.Meta
                                    title={`${segment.segment} (${segment.count} clientes)`}
                                    description={`Revenue: $${segment.totalRevenue.toFixed(2)} • Ticket Promedio: $${segment.avgOrderValue.toFixed(2)}`}
                                />
                            </List.Item>
                        )}
                    />
                </Card>
            </Col>
        </Row>
    );

    const channelTabContent = (
        <Row gutter={[16, 16]}>
            <Col xs={24}>
                <Card title="Comparación de Canales" size="small">
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={channelChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="pedidos" fill="#8884d8" name="Pedidos" />
                            <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </Col>
            <Col xs={24}>
                <Card title="Métricas Detalladas" size="small">
                    <List
                        dataSource={channelPerformance}
                        renderItem={(channel: ChannelPerformance) => (
                            <List.Item>
                                <List.Item.Meta
                                    title={channel.channelName}
                                    description={
                                        <>
                                            <span>Pedidos: {channel.orders} • </span>
                                            <span>Revenue: ${channel.revenue.toFixed(2)} • </span>
                                            <span>Ticket Avg: ${channel.avgTicket.toFixed(2)}</span>
                                        </>
                                    }
                                />
                                <Tag color={channel.growth >= 0 ? 'green' : 'red'}>
                                    {channel.growth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                                    {' '}{Math.abs(channel.growth).toFixed(1)}%
                                </Tag>
                            </List.Item>
                        )}
                    />
                </Card>
            </Col>
        </Row>
    );

    const temporalTabContent = (
        <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
                <Card title="Pedidos por Día de la Semana" size="small">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={temporalAnalysis.byDay}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="orders" fill="#1890ff" name="Pedidos" />
                        </BarChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Typography.Text strong>Día Pico: </Typography.Text>
                        <Tag color="blue">{temporalAnalysis.peakDay}</Tag>
                    </div>
                </Card>
            </Col>
            <Col xs={24} md={12}>
                <Card title="Distribución por Horario" size="small">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={timeBlockData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="orders" fill="#82ca9d" name="Pedidos" />
                        </BarChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Typography.Text strong>Hora Pico: </Typography.Text>
                        <Tag color="green">{temporalAnalysis.peakHour}</Tag>
                    </div>
                </Card>
            </Col>
        </Row>
    );

    const alertsTabContent = (
        <Row gutter={[16, 16]}>
            <Col xs={24}>
                {intelligentAlerts.length === 0 ? (
                    <Card>
                        <Result
                            status="success"
                            title="Sin Alertas"
                            subTitle="Todo está funcionando correctamente. No hay alertas en este momento."
                        />
                    </Card>
                ) : (
                    <List
                        dataSource={intelligentAlerts}
                        renderItem={(alert: IntelligentAlert) => {
                            const severityColors = { HIGH: 'red', MEDIUM: 'orange', LOW: 'blue' };
                            return (
                                <Card
                                    size="small"
                                    style={{
                                        marginBottom: 16,
                                        borderLeft: `4px solid ${severityColors[alert.severity]}`
                                    }}
                                >
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<Badge status={alert.severity === 'HIGH' ? 'error' : alert.severity === 'MEDIUM' ? 'warning' : 'processing'} />}
                                            title={
                                                <>
                                                    {alert.title}
                                                    {' '}
                                                    <Tag color={severityColors[alert.severity]}>
                                                        {alert.severity}
                                                    </Tag>
                                                </>
                                            }
                                            description={alert.description}
                                        />
                                    </List.Item>
                                </Card>
                            );
                        }}
                    />
                )}
            </Col>
        </Row>
    );

    // ─── Render ───────────────────────────────────────────────────────

    return (
        <div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, marginBottom: 24 }}>
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Dashboard</Title>
                <RangePicker
                    style={{ width: isMobile ? '100%' : 'auto' }}
                    value={dateRange}
                    onChange={(vals) => {
                        if (vals?.[0] && vals?.[1]) setDateRange([vals[0], vals[1]]);
                    }}
                    format="DD/MM/YYYY"
                />
            </div>

            {/* KPIs */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <KPICard title="Ventas Totales" value={`$${metrics.totalSales.toFixed(2)}`} prefix={<DollarOutlined />} color="#52c41a" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <KPICard title="Pedidos" value={metrics.totalOrders} prefix={<ShoppingCartOutlined />} color="#1890ff" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <KPICard title="Ticket Promedio" value={`$${metrics.avgTicket.toFixed(2)}`} prefix={<RiseOutlined />} color="#faad14" />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <KPICard title="Clientes Únicos" value={metrics.uniqueCustomers} prefix={<UserOutlined />} color="#722ed1" />
                </Col>
            </Row>

            {/* Charts Row */}
            <Divider />
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title="Tendencia de Ventas" size="small">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={metrics.dailyTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="ventas" stroke="#1890ff" dot={<CustomizedDot />} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title={`Productos (${metrics.topProducts.length})`} size="small">
                        <ResponsiveContainer width="100%" height={Math.max(200, metrics.topProducts.length * 50)}>
                            <BarChart data={metrics.topProducts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip formatter={(value: number | undefined) => [`$${value}`, 'Venta']} />
                                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                                    {metrics.topProducts.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Demographics Row */}
            <Divider />
            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <Card title="Género de Compradores" size="small">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={demographics.genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {demographics.genderData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card title="Rango de Edad" size="small">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={demographics.ageData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card title="Top Ocupaciones" size="small">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={demographics.topOccupations} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={80} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Insights */}
            <Divider />
            <Card title="✨ Insights" size="small">
                {insights.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {insights.map((insight, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>{insight}</li>
                        ))}
                    </ul>
                ) : (
                    <Result
                        icon={<ExclamationCircleOutlined />}
                        title="Sin datos suficientes"
                        subTitle="Registra pedidos entregados para ver insights."
                    />
                )}
                {inactiveCustomers.length > 0 && (
                    <Button type="link" icon={<FallOutlined />} onClick={() => setInactiveModalOpen(true)}>
                        Ver {inactiveCustomers.length} cliente(s) inactivos
                    </Button>
                )}
            </Card>

            {/* Advanced Insights Tabs */}
            <Divider />
            <Card title="📊 Análisis Avanzado" size="small" style={{ marginBottom: 16 }}>
                <Tabs
                    defaultActiveKey="rfm"
                    size={isMobile ? "small" : "middle"}
                    items={[
                        {
                            key: 'rfm',
                            label: (
                                <span>
                                    <TrophyOutlined /> {!isMobile && 'RFM Analysis'}
                                </span>
                            ),
                            children: rfmTabContent,
                        },
                        {
                            key: 'channels',
                            label: (
                                <span>
                                    <LineChartOutlined /> {!isMobile && 'Canales'}
                                </span>
                            ),
                            children: channelTabContent,
                        },
                        {
                            key: 'temporal',
                            label: (
                                <span>
                                    <ClockCircleOutlined /> {!isMobile && 'Patrones Temporales'}
                                </span>
                            ),
                            children: temporalTabContent,
                        },
                        {
                            key: 'alerts',
                            label: (
                                <span>
                                    <AlertOutlined />
                                    {' '}{!isMobile && 'Alertas'}
                                    {intelligentAlerts.length > 0 && (
                                        <Badge
                                            count={intelligentAlerts.length}
                                            style={{ marginLeft: 8 }}
                                        />
                                    )}
                                </span>
                            ),
                            children: alertsTabContent,
                        },
                    ]}
                />
            </Card>

            {/* Inactive customers modal */}
            <Modal
                title="Clientes Inactivos (30+ días sin compra)"
                open={inactiveModalOpen}
                onCancel={() => setInactiveModalOpen(false)}
                footer={null}
            >
                <List
                    dataSource={inactiveCustomers}
                    renderItem={c => (
                        <List.Item>
                            <List.Item.Meta title={c.fullName} description={c.phone} />
                        </List.Item>
                    )}
                />
            </Modal>
        </div>
    );
};
