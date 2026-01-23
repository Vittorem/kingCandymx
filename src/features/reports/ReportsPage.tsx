import { useState } from 'react';
import { Card, Button, DatePicker, Row, Col, message, Typography } from 'antd';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useFirestoreSubscription } from '../../hooks/useFirestore';
import { Order, Customer } from '../../types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

export const ReportsPage = () => {
    const { data: orders } = useFirestoreSubscription<Order>('orders');
    const { data: customers } = useFirestoreSubscription<Customer>('customers');

    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf('month'),
        dayjs().endOf('month')
    ]);

    const getFilteredOrders = () => {
        return orders.filter(o => {
            if (!o.deliveredAt) return false;
            const d = dayjs(o.deliveredAt.toDate());
            return d.isAfter(dateRange[0]) && d.isBefore(dateRange[1]);
        });
    };

    const handleExportExcel = () => {
        try {
            const filtered = getFilteredOrders();

            // Sheet 1: Orders
            const ordersData = filtered.map(o => ({
                Fecha: dayjs(o.deliveredAt.toDate()).format('YYYY-MM-DD'),
                Cliente: o.customerName,
                Producto: o.productNameAtSale,
                Sabor: o.flavorNameAtSale,
                Cantidad: o.quantity,
                Total: o.total,
                Estado: o.status
            }));
            const wsOrders = XLSX.utils.json_to_sheet(ordersData);

            // Sheet 2: Customers
            const clientsData = customers.map(c => ({
                Nombre: c.fullName,
                Telefono: c.phone,
                Tipo: c.type,
                GastoTotal: c.totalSpent || 0
            }));
            const wsClients = XLSX.utils.json_to_sheet(clientsData);

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsOrders, "Pedidos");
            XLSX.utils.book_append_sheet(wb, wsClients, "Clientes");

            XLSX.writeFile(wb, `Reporte_Tiramisu_${dayjs().format('YYYYMMDD')}.xlsx`);
            message.success('Excel exportado');
        } catch (e) {
            console.error(e);
            message.error('Error exportando Excel');
        }
    };

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();
            const filtered = filteredOrders || getFilteredOrders();

            doc.text(`Reporte de Corte - ${dateRange[0].format('DD/MM/YYYY')} al ${dateRange[1].format('DD/MM/YYYY')}`, 14, 20);

            // Summary
            const totalSales = filtered.reduce((acc, curr) => acc + curr.total, 0);
            doc.setFontSize(12);
            doc.text(`Total Ventas: $${totalSales.toFixed(2)}`, 14, 30);
            doc.text(`Total Pedidos: ${filtered.length}`, 14, 38);

            // Table
            const tableData = filtered.map(o => [
                dayjs(o.deliveredAt.toDate()).format('DD/MM'),
                o.customerName,
                `${o.productNameAtSale} (${o.flavorNameAtSale})`,
                o.quantity,
                `$${o.total}`
            ]);

            autoTable(doc, {
                head: [['Fecha', 'Cliente', 'Producto', 'Qty', 'Total']],
                body: tableData,
                startY: 45,
            });

            doc.save(`Corte_${dayjs().format('YYYYMMDD')}.pdf`);
            message.success('PDF exportado');
        } catch (e) {
            console.error(e);
            message.error('Error exportando PDF');
        }
    };

    const filteredOrders = getFilteredOrders();

    return (
        <div>
            <Title level={2}>Reportes</Title>

            <Card style={{ marginBottom: 24 }}>
                <Row gutter={16} align="middle">
                    <Col>
                        <Text strong>Rango de Fechas:</Text>
                    </Col>
                    <Col>
                        <RangePicker
                            value={dateRange}
                            onChange={(val) => val && setDateRange([val[0]!, val[1]!])}
                            allowClear={false}
                        />
                    </Col>
                </Row>
            </Card>

            <Row gutter={16}>
                <Col span={12}>
                    <Card title="Exportar Excel" hoverable onClick={handleExportExcel} style={{ cursor: 'pointer', textAlign: 'center' }}>
                        <FileExcelOutlined style={{ fontSize: 48, color: 'green', marginBottom: 16 }} />
                        <div>Generar archivo .xlsx con Pedidos y Clientes</div>
                        <Button type="primary" style={{ marginTop: 16 }}>Descargar Excel</Button>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="Exportar PDF (Corte)" hoverable onClick={handleExportPDF} style={{ cursor: 'pointer', textAlign: 'center' }}>
                        <FilePdfOutlined style={{ fontSize: 48, color: 'red', marginBottom: 16 }} />
                        <div>Generar corte de caja del periodo seleccionado</div>
                        <Button type="primary" danger style={{ marginTop: 16 }}>Descargar PDF</Button>
                    </Card>
                </Col>
            </Row>

            <Card title="Vista Previa (Resumen)" style={{ marginTop: 24 }}>
                <Row gutter={16} style={{ textAlign: 'center' }}>
                    <Col span={8}>
                        <Title level={4}>{filteredOrders.length}</Title>
                        <Text>Pedidos en periodo</Text>
                    </Col>
                    <Col span={8}>
                        <Title level={4}>${filteredOrders.reduce((acc, c) => acc + c.total, 0).toFixed(2)}</Title>
                        <Text>Ventas totales</Text>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};
