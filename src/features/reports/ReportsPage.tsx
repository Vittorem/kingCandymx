import { useState } from 'react';
import { Card, Button, DatePicker, Row, Col, message, Typography } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, FileTextOutlined, PieChartOutlined } from '@ant-design/icons';
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
            if (o.status !== 'Entregado') return false;
            const dateToUse = o.deliveredAt ? dayjs(o.deliveredAt.toDate()) : (o.deliveryDate ? dayjs(o.deliveryDate.seconds * 1000) : null);
            if (!dateToUse) return false;
            return dateToUse.isAfter(dateRange[0]) && dateToUse.isBefore(dateRange[1]);
        });
    };

    const handleExportExcel = () => {
        try {
            const filtered = getFilteredOrders();

            // Sheet 1: Orders
            const ordersData = filtered.map(o => {
                const dateToUse = o.deliveredAt ? dayjs(o.deliveredAt.toDate()) : (o.deliveryDate ? dayjs(o.deliveryDate.seconds * 1000) : null);
                return {
                    Fecha: dateToUse ? dateToUse.format('YYYY-MM-DD') : 'N/A',
                    Cliente: o.customerName,
                    Producto: o.productNameAtSale,
                    Sabor: o.flavorNameAtSale,
                    Cantidad: o.quantity,
                    Total: o.total,
                    Estado: o.status
                }
            });
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
            const tableData = filtered.map(o => {
                const dateToUse = o.deliveredAt ? dayjs(o.deliveredAt.toDate()) : (o.deliveryDate ? dayjs(o.deliveryDate.seconds * 1000) : null);
                return [
                    dateToUse ? dateToUse.format('DD/MM') : 'N/A',
                    o.customerName,
                    `${o.productNameAtSale} (${o.flavorNameAtSale})`,
                    o.quantity,
                    `$${o.total}`
                ];
            });

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

    const handleExportXML = () => {
        try {
            let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<clientes>\n';

            customers.forEach(c => {
                xmlContent += '  <cliente>\n';
                xmlContent += `    <id>${c.id}</id>\n`;
                xmlContent += `    <nombre>${c.fullName || ''}</nombre>\n`;
                xmlContent += `    <telefono>${c.phone || ''}</telefono>\n`;
                xmlContent += `    <tipo>${c.type || ''}</tipo>\n`;
                xmlContent += `    <medioContacto>${c.mainContactMethod || ''}</medioContacto>\n`;
                xmlContent += `    <email>${c.email || ''}</email>\n`;
                xmlContent += `    <genero>${c.gender || ''}</genero>\n`;
                xmlContent += `    <edad>${c.age || ''}</edad>\n`;
                xmlContent += `    <estadoCivil>${c.civilStatus || ''}</estadoCivil>\n`;
                xmlContent += `    <ocupacion>${c.occupation || ''}</ocupacion>\n`;
                xmlContent += `    <instagram>${c.instagramHandle || ''}</instagram>\n`;
                xmlContent += `    <facebook>${c.facebookLink || ''}</facebook>\n`;
                xmlContent += `    <colonia>${c.colonia || ''}</colonia>\n`;
                xmlContent += `    <ciudad>${c.city || ''}</ciudad>\n`;
                xmlContent += `    <notas><![CDATA[${c.notes || ''}]]></notas>\n`;
                xmlContent += `    <etiquetas>${(c.tags || []).join(', ')}</etiquetas>\n`;
                xmlContent += `    <gastoTotal>${c.totalSpent || 0}</gastoTotal>\n`;
                xmlContent += '  </cliente>\n';
            });

            xmlContent += '</clientes>';

            const blob = new Blob([xmlContent], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Clientes_Tiramisu_${dayjs().format('YYYYMMDD')}.xml`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            message.success('XML exportado');
        } catch (e) {
            console.error(e);
            message.error('Error exportando XML');
        }
    };

    const getDemographicData = () => {
        const filtered = getFilteredOrders();
        const uniqueCustomerIds = new Set(filtered.map(o => o.customerId));
        const activeCustomers = customers.filter(c => uniqueCustomerIds.has(c.id));

        // Gender
        const genderStats: Record<string, number> = { 'Femenino': 0, 'Masculino': 0, 'Otro/ND': 0 };
        activeCustomers.forEach(c => {
            if (c.gender === 'F') genderStats['Femenino']++;
            else if (c.gender === 'M') genderStats['Masculino']++;
            else genderStats['Otro/ND']++;
        });

        // Age
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

        // Occupation
        const occupationStats: Record<string, number> = {};
        activeCustomers.forEach(c => {
            const occ = c.occupation ? c.occupation.trim() : 'Sin Dato';
            occupationStats[occ] = (occupationStats[occ] || 0) + 1;
        });
        const topOccupations = Object.keys(occupationStats)
            .map(k => ({ name: k, value: occupationStats[k] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return { genderStats, ageBuckets, topOccupations, totalActive: activeCustomers.length };
    };

    const handleExportDemographicsXML = () => {
        try {
            const { genderStats, ageBuckets, topOccupations, totalActive } = getDemographicData();

            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<demografia>\n';
            xml += `  <periodo>${dateRange[0].format('YYYY-MM-DD')} al ${dateRange[1].format('YYYY-MM-DD')}</periodo>\n`;
            xml += `  <clientesActivos>${totalActive}</clientesActivos>\n`;

            xml += '  <genero>\n';
            Object.entries(genderStats).forEach(([key, val]) => {
                xml += `    <item><tipo>${key}</tipo><cantidad>${val}</cantidad></item>\n`;
            });
            xml += '  </genero>\n';

            xml += '  <edades>\n';
            Object.entries(ageBuckets).forEach(([key, val]) => {
                xml += `    <item><rango>${key}</rango><cantidad>${val}</cantidad></item>\n`;
            });
            xml += '  </edades>\n';

            xml += '  <ocupaciones>\n';
            topOccupations.forEach(item => {
                xml += `    <item><nombre>${item.name}</nombre><cantidad>${item.value}</cantidad></item>\n`;
            });
            xml += '  </ocupaciones>\n';

            xml += '</demografia>';

            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Demografia_Insights_${dayjs().format('YYYYMMDD')}.xml`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            message.success('XML Demográfico exportado');
        } catch (e) {
            console.error(e);
            message.error('Error exportando XML');
        }
    };

    const handleExportDemographicsPDF = () => {
        try {
            const { genderStats, ageBuckets, topOccupations, totalActive } = getDemographicData();
            const doc = new jsPDF();

            doc.setFontSize(16);
            doc.text('Reporte de Demografía (Insights)', 14, 20);
            doc.setFontSize(10);
            doc.text(`Periodo: ${dateRange[0].format('DD/MM/YYYY')} al ${dateRange[1].format('DD/MM/YYYY')}`, 14, 28);
            doc.text(`Clientes que compraron en periodo: ${totalActive}`, 14, 34);

            let currentY = 45;

            // Gender Table
            doc.setFontSize(12);
            doc.text('Distribución por Género', 14, currentY);
            autoTable(doc, {
                startY: currentY + 5,
                head: [['Género', 'Cantidad']],
                body: Object.entries(genderStats).map(([k, v]) => [k, v]),
            });

            // @ts-ignore
            currentY = doc.lastAutoTable.finalY + 15;

            // Age Table
            doc.text('Distribución por Edad', 14, currentY);
            autoTable(doc, {
                startY: currentY + 5,
                head: [['Rango de Edad', 'Cantidad']],
                body: Object.entries(ageBuckets).map(([k, v]) => [k, v]),
            });

            // @ts-ignore
            currentY = doc.lastAutoTable.finalY + 15;

            // Occupations Table
            doc.text('Top Ocupaciones', 14, currentY);
            autoTable(doc, {
                startY: currentY + 5,
                head: [['Ocupación', 'Cantidad']],
                body: topOccupations.map(t => [t.name, t.value]),
            });

            doc.save(`Demografia_Insights_${dayjs().format('YYYYMMDD')}.pdf`);
            message.success('PDF Demográfico exportado');
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
                <Col span={6}>
                    <Card title="Exportar Excel" hoverable onClick={handleExportExcel} style={{ cursor: 'pointer', textAlign: 'center' }}>
                        <FileExcelOutlined style={{ fontSize: 48, color: 'green', marginBottom: 16 }} />
                        <div>Generar archivo .xlsx con Pedidos y Clientes</div>
                        <Button type="primary" style={{ marginTop: 16 }}>Descargar Excel</Button>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card title="Exportar PDF (Corte)" hoverable onClick={handleExportPDF} style={{ cursor: 'pointer', textAlign: 'center' }}>
                        <FilePdfOutlined style={{ fontSize: 48, color: 'red', marginBottom: 16 }} />
                        <div>Generar corte de caja del periodo seleccionado</div>
                        <Button type="primary" danger style={{ marginTop: 16 }}>Descargar PDF</Button>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card title="Exportar Clientes XML" hoverable onClick={handleExportXML} style={{ cursor: 'pointer', textAlign: 'center' }}>
                        <FileTextOutlined style={{ fontSize: 48, color: 'purple', marginBottom: 16 }} />
                        <div>Base de datos completa de clientes con detalles</div>
                        <Button type="default" style={{ marginTop: 16, borderColor: 'purple', color: 'purple' }}>Descargar XML</Button>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card title="Exportar Demografía (Insights)" hoverable style={{ textAlign: 'center' }}>
                        <PieChartOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                        <div style={{ marginBottom: 16 }}>Reporte de Género, Edad y Ocupaciones</div>
                        <Button onClick={handleExportDemographicsPDF} type="dashed" danger style={{ marginRight: 8 }}>PDF</Button>
                        <Button onClick={handleExportDemographicsXML} type="dashed" style={{ borderColor: 'orange', color: 'orange' }}>XML</Button>
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
