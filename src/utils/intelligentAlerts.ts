import dayjs from 'dayjs';
import { Customer, Order } from '../types';
import { getInactiveCustomers } from './demographicsHelpers';
import { computeCustomerRFMScores } from './rfmAnalysis';

/**
 * Alert types
 */
type AlertType = 'CHURN_RISK' | 'VIP_INACTIVE' | 'UPSELL_OPPORTUNITY' | 'SALES_DROP';

/**
 * Alert severity
 */
type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Intelligent alert
 */
interface IntelligentAlert {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    count: number;
    affectedCustomers?: Customer[];
}

/**
 * Metrics for comparison (current vs previous)
 */
export interface PeriodMetrics {
    totalRevenue: number;
    totalOrders: number;
    avgTicket: number;
}

/**
 * Generates intelligent alerts based on customer and order data.
 *
 * @param customers - All customers
 * @param orders - All orders
 * @param currentDate - Reference date
 * @param currentMetrics - Metrics for current period
 * @param previousMetrics - Metrics for previous period
 * @returns Array of alerts sorted by severity
 */
export function generateIntelligentAlerts(
    customers: Customer[],
    orders: Order[],
    currentDate: dayjs.Dayjs,
    currentMetrics: PeriodMetrics,
    previousMetrics: PeriodMetrics
): IntelligentAlert[] {
    const alerts: IntelligentAlert[] = [];

    // 1. Churn Risk: Customers inactive for 45+ days
    const churnRiskCustomers = getInactiveCustomers(customers, orders, currentDate, 45);
    if (churnRiskCustomers.length > 0) {
        alerts.push({
            type: 'CHURN_RISK',
            severity: 'HIGH',
            title: 'Clientes en Riesgo de Abandono',
            description: `${churnRiskCustomers.length} clientes sin compra en 45+ días. Considera enviar promociones o recordatorios.`,
            count: churnRiskCustomers.length,
            affectedCustomers: churnRiskCustomers,
        });
    }

    // 2. VIP Inactive: Champions without recent purchase (15 days)
    const rfmScores = computeCustomerRFMScores(customers, orders, currentDate);
    const vipInactive = rfmScores.filter(score => {
        if (score.segment !== 'Champions' && score.segment !== 'Loyal') return false;
        if (!score.lastOrderDate) return false;
        const daysSince = currentDate.diff(score.lastOrderDate, 'days');
        return daysSince >= 15;
    });

    if (vipInactive.length > 0) {
        const vipCustomers = customers.filter(c =>
            vipInactive.some(v => v.customerId === c.id)
        );
        alerts.push({
            type: 'VIP_INACTIVE',
            severity: 'MEDIUM',
            title: 'Clientes VIP Inactivos',
            description: `${vipInactive.length} clientes VIP sin compra en 15+ días. Prioriza la reactivación de estos compradores frecuentes.`,
            count: vipInactive.length,
            affectedCustomers: vipCustomers,
        });
    }

    // 3. Upsell Opportunity: High frequency, low ticket
    const upsellCandidates = rfmScores.filter(score => {
        return score.frequencyScore >= 4 && score.monetaryScore <= 2 && score.orderCount >= 5;
    });

    if (upsellCandidates.length > 0) {
        const upsellCustomers = customers.filter(c =>
            upsellCandidates.some(u => u.customerId === c.id)
        );
        alerts.push({
            type: 'UPSELL_OPPORTUNITY',
            severity: 'LOW',
            title: 'Oportunidades de Up-Sell',
            description: `${upsellCandidates.length} clientes frecuentes con ticket bajo. Ofrece productos premium o paquetes.`,
            count: upsellCandidates.length,
            affectedCustomers: upsellCustomers,
        });
    }

    // 4. Sales Drop: Revenue decline > 15%
    if (previousMetrics.totalRevenue > 0) {
        const revenueChange = ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue) * 100;
        if (revenueChange < -15) {
            alerts.push({
                type: 'SALES_DROP',
                severity: 'HIGH',
                title: 'Caída en Ventas',
                description: `Las ventas disminuyeron ${Math.abs(revenueChange).toFixed(1)}% vs período anterior. Revisa estrategia comercial.`,
                count: 1,
            });
        }
    }

    // Sort by severity
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
