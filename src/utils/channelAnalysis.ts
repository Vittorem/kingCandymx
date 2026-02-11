import { Order } from '../types';

/**
 * Channel performance metrics
 */
export interface ChannelPerformance {
    channelId: string;
    channelName: string;
    orders: number;
    revenue: number;
    avgTicket: number;
    growth: number; // Percentage vs previous period
}

/**
 * Analyzes channel performance comparing current and previous periods.
 *
 * @param currentOrders - Orders in current period (delivered only)
 * @param previousOrders - Orders in previous period (delivered only)
 * @param channels - Optional map of channelId to channel name (if not provided, uses channelId)
 * @returns Array of channel performance metrics sorted by revenue
 */
export function analyzeChannelPerformance(
    currentOrders: Order[],
    previousOrders: Order[],
    channels?: Record<string, string>
): ChannelPerformance[] {
    // Aggregate current period
    const currentStats = aggregateByChannel(currentOrders);

    // Aggregate previous period
    const previousStats = aggregateByChannel(previousOrders);

    // All unique channel IDs
    const allChannelIds = new Set([
        ...Object.keys(currentStats),
        ...Object.keys(previousStats)
    ]);

    const results: ChannelPerformance[] = [];

    allChannelIds.forEach(channelId => {
        const current = currentStats[channelId] || { orders: 0, revenue: 0 };
        const previous = previousStats[channelId] || { orders: 0, revenue: 0 };

        const growth = previous.revenue > 0
            ? ((current.revenue - previous.revenue) / previous.revenue) * 100
            : current.revenue > 0 ? 100 : 0;

        const avgTicket = current.orders > 0 ? current.revenue / current.orders : 0;

        results.push({
            channelId,
            channelName: channels?.[channelId] || channelId,
            orders: current.orders,
            revenue: current.revenue,
            avgTicket,
            growth,
        });
    });

    return results.sort((a, b) => b.revenue - a.revenue);
}

/**
 * Helper: aggregate orders by channel
 */
function aggregateByChannel(orders: Order[]): Record<string, { orders: number; revenue: number }> {
    const stats: Record<string, { orders: number; revenue: number }> = {};

    orders.forEach(order => {
        const channelId = order.channelId || 'Sin Canal';
        if (!stats[channelId]) {
            stats[channelId] = { orders: 0, revenue: 0 };
        }
        stats[channelId].orders++;
        stats[channelId].revenue += order.total || 0;
    });

    return stats;
}

/**
 * Format for recharts: channel comparison
 */
export function formatChannelForChart(performance: ChannelPerformance[]): {
    name: string;
    pedidos: number;
    revenue: number;
}[] {
    return performance.map(p => ({
        name: p.channelName,
        pedidos: p.orders,
        revenue: p.revenue,
    }));
}
