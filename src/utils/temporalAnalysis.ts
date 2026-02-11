import { Order } from '../types';
import { getOrderDate } from './dateHelpers';

/**
 * Temporal analysis result
 */
export interface TemporalAnalysisResult {
    byDay: { name: string; orders: number; revenue: number }[];
    byHour: { hour: string; orders: number }[];
    peakDay: string;
    peakHour: string;
}

/**
 * Analyzes temporal patterns in orders.
 *
 * @param orders - Delivered orders to analyze
 * @returns Temporal patterns including day of week and hour distributions
 */
export function analyzeTemporalPatterns(orders: Order[]): TemporalAnalysisResult {
    // Day of week analysis
    const dayStats: Record<string, { orders: number; revenue: number }> = {
        'Lunes': { orders: 0, revenue: 0 },
        'Martes': { orders: 0, revenue: 0 },
        'Miércoles': { orders: 0, revenue: 0 },
        'Jueves': { orders: 0, revenue: 0 },
        'Viernes': { orders: 0, revenue: 0 },
        'Sábado': { orders: 0, revenue: 0 },
        'Domingo': { orders: 0, revenue: 0 },
    };

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // Hour analysis (0-23)
    const hourStats: Record<number, number> = {};

    orders.forEach(order => {
        const date = getOrderDate(order);
        if (!date) return;

        // Day of week
        const dayIndex = date.day(); // 0 = Sunday
        const dayName = dayNames[dayIndex];
        if (dayStats[dayName]) {
            dayStats[dayName].orders++;
            dayStats[dayName].revenue += order.total || 0;
        }

        // Hour of day
        const hour = date.hour();
        hourStats[hour] = (hourStats[hour] || 0) + 1;
    });

    // Format day data
    const byDay = Object.entries(dayStats).map(([name, data]) => ({
        name,
        orders: data.orders,
        revenue: data.revenue,
    }));

    // Format hour data
    const byHour = Object.entries(hourStats)
        .map(([hour, count]) => ({
            hour: `${hour.padStart(2, '0')}:00`,
            orders: count,
        }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    // Find peaks
    const peakDay = byDay.reduce((max, curr) =>
        curr.orders > max.orders ? curr : max,
        byDay[0] || { name: 'N/A', orders: 0, revenue: 0 }
    ).name;

    const peakHour = byHour.reduce((max, curr) =>
        curr.orders > max.orders ? curr : max,
        byHour[0] || { hour: 'N/A', orders: 0 }
    ).hour;

    return {
        byDay,
        byHour,
        peakDay,
        peakHour,
    };
}

/**
 * Format hour data for heatmap-style visualization
 * Groups hours into time blocks (morning, afternoon, evening)
 */
export function formatHoursByTimeBlock(byHour: { hour: string; orders: number }[]): {
    name: string;
    orders: number;
}[] {
    const blocks = {
        'Madrugada (0-5)': 0,
        'Mañana (6-11)': 0,
        'Mediodía (12-14)': 0,
        'Tarde (15-18)': 0,
        'Noche (19-23)': 0,
    };

    byHour.forEach(({ hour, orders }) => {
        const h = parseInt(hour.split(':')[0]);
        if (h >= 0 && h <= 5) blocks['Madrugada (0-5)'] += orders;
        else if (h >= 6 && h <= 11) blocks['Mañana (6-11)'] += orders;
        else if (h >= 12 && h <= 14) blocks['Mediodía (12-14)'] += orders;
        else if (h >= 15 && h <= 18) blocks['Tarde (15-18)'] += orders;
        else if (h >= 19 && h <= 23) blocks['Noche (19-23)'] += orders;
    });

    return Object.entries(blocks).map(([name, orders]) => ({ name, orders }));
}
