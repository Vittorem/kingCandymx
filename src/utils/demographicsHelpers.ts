import { Customer, Order } from '../types';
import { getOrderDate } from './dateHelpers';
import dayjs from 'dayjs';

export interface DemographicResult {
    genderData: { name: string; value: number }[];
    ageData: { name: string; value: number }[];
    topOccupations: { name: string; value: number }[];
    totalActive: number;
}

/**
 * Computes demographic stats for customers who bought within the given period orders.
 */
export function computeDemographics(
    customers: Customer[],
    periodOrders: Order[]
): DemographicResult {
    const uniqueCustomerIds = new Set(periodOrders.map(o => o.customerId));
    const activeCustomers = customers.filter(c => uniqueCustomerIds.has(c.id));

    // Gender
    const genderStats: Record<string, number> = { Femenino: 0, Masculino: 0, 'Otro/ND': 0 };
    activeCustomers.forEach(c => {
        if (c.gender === 'F') genderStats['Femenino']++;
        else if (c.gender === 'M') genderStats['Masculino']++;
        else genderStats['Otro/ND']++;
    });
    const genderData = Object.keys(genderStats)
        .map(k => ({ name: k, value: genderStats[k] }))
        .filter(d => d.value > 0);

    // Age
    const ageBuckets: Record<string, number> = {
        '< 20': 0, '20-29': 0, '30-39': 0, '40-49': 0, '50+': 0, 'N/A': 0,
    };
    activeCustomers.forEach(c => {
        if (!c.age) {
            ageBuckets['N/A']++;
        } else if (c.age < 20) {
            ageBuckets['< 20']++;
        } else if (c.age < 30) {
            ageBuckets['20-29']++;
        } else if (c.age < 40) {
            ageBuckets['30-39']++;
        } else if (c.age < 50) {
            ageBuckets['40-49']++;
        } else {
            ageBuckets['50+']++;
        }
    });
    const ageData = Object.keys(ageBuckets).map(k => ({ name: k, value: ageBuckets[k] }));

    // Occupations
    const occupationStats: Record<string, number> = {};
    activeCustomers.forEach(c => {
        const occ = c.occupation ? c.occupation.trim() : 'Sin Dato';
        occupationStats[occ] = (occupationStats[occ] || 0) + 1;
    });
    const topOccupations = Object.entries(occupationStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return { genderData, ageData, topOccupations, totalActive: activeCustomers.length };
}

/**
 * Finds inactive customers based on a threshold date.
 * Returns customers whose last order was before `thresholdDate`.
 */
export function getInactiveCustomers(
    customers: Customer[],
    orders: Order[],
    endDate: dayjs.Dayjs,
    inactiveDays = 30
): Customer[] {
    const thresholdDate = endDate.subtract(inactiveDays, 'days');

    // Get all delivered orders before end date
    const historicalOrders = orders.filter(o => {
        if (o.isDeleted) return false;
        if (o.status !== 'Entregado') return false;
        const d = getOrderDate(o);
        return d ? d.isBefore(endDate) : false;
    });

    // Last purchase date per customer
    const customerLastDates: Record<string, dayjs.Dayjs> = {};
    historicalOrders.forEach(o => {
        const d = getOrderDate(o);
        if (d && o.customerId) {
            if (!customerLastDates[o.customerId] || d.isAfter(customerLastDates[o.customerId])) {
                customerLastDates[o.customerId] = d;
            }
        }
    });

    return customers.filter(c => {
        const lastDate = customerLastDates[c.id];
        if (!lastDate) return false;
        return lastDate.isBefore(thresholdDate);
    });
}
