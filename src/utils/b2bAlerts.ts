import dayjs from 'dayjs';
import { B2BDeliverySchedule, Order, JS_DAY_TO_DAY_OF_WEEK, DayOfWeek } from '../types';
import { getOrderDate } from './dateHelpers';

export interface B2BDeliveryAlert {
    schedule: B2BDeliverySchedule;
    deliveryDay: DayOfWeek;
    /** 'today' | 'tomorrow' */
    urgency: 'today' | 'tomorrow';
    /** true if a matching order already exists for this delivery window */
    hasOrder: boolean;
}

/**
 * Get today's DayOfWeek in our Spanish format.
 */
export function getTodayDayOfWeek(): DayOfWeek {
    return JS_DAY_TO_DAY_OF_WEEK[new Date().getDay()];
}

/**
 * Get tomorrow's DayOfWeek in our Spanish format.
 */
export function getTomorrowDayOfWeek(): DayOfWeek {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return JS_DAY_TO_DAY_OF_WEEK[tomorrow.getDay()];
}

/**
 * Check if an order exists for a given customer around a specific date.
 * We consider an order "matching" if:
 * - Same customerId
 * - deliveryDate is on the target date
 * - Status is NOT 'Cancelado'
 */
function hasMatchingOrder(
    orders: Order[],
    customerId: string,
    targetDate: dayjs.Dayjs
): boolean {
    return orders.some(order => {
        if (order.customerId !== customerId) return false;
        if (order.status === 'Cancelado') return false;
        const orderDate = getOrderDate(order);
        if (!orderDate) return false;
        return orderDate.isSame(targetDate, 'day');
    });
}

/**
 * Compute B2B delivery alerts for today and tomorrow.
 * Returns only alerts where an order has NOT been created yet.
 */
export function computeB2BAlerts(
    schedules: B2BDeliverySchedule[],
    orders: Order[]
): B2BDeliveryAlert[] {
    const today = getTodayDayOfWeek();
    const tomorrow = getTomorrowDayOfWeek();
    const todayDate = dayjs();
    const tomorrowDate = dayjs().add(1, 'day');

    const alerts: B2BDeliveryAlert[] = [];

    for (const schedule of schedules) {
        if (schedule.isActive === false) continue;

        // Check today
        if (schedule.deliveryDays.includes(today)) {
            const has = hasMatchingOrder(orders, schedule.customerId, todayDate);
            alerts.push({
                schedule,
                deliveryDay: today,
                urgency: 'today',
                hasOrder: has,
            });
        }

        // Check tomorrow
        if (schedule.deliveryDays.includes(tomorrow)) {
            const has = hasMatchingOrder(orders, schedule.customerId, tomorrowDate);
            alerts.push({
                schedule,
                deliveryDay: tomorrow,
                urgency: 'tomorrow',
                hasOrder: has,
            });
        }
    }

    // Sort: today first, then tomorrow; within same urgency, no-order first
    alerts.sort((a, b) => {
        if (a.urgency !== b.urgency) return a.urgency === 'today' ? -1 : 1;
        if (a.hasOrder !== b.hasOrder) return a.hasOrder ? 1 : -1;
        return a.schedule.customerName.localeCompare(b.schedule.customerName);
    });

    return alerts;
}

/**
 * Get only the alerts where an order is still missing (actionable alerts).
 */
export function getPendingB2BAlerts(
    schedules: B2BDeliverySchedule[],
    orders: Order[]
): B2BDeliveryAlert[] {
    return computeB2BAlerts(schedules, orders).filter(a => !a.hasOrder);
}

/**
 * For the weekly calendar: determine if a schedule has an order for a specific
 * day of the current week.
 */
export function hasOrderForDayThisWeek(
    orders: Order[],
    customerId: string,
    dayOfWeek: DayOfWeek
): boolean {
    const today = dayjs();
    // dayjs week starts on Sunday (0) by default
    const jsDayIndex = Object.entries(JS_DAY_TO_DAY_OF_WEEK)
        .find(([_, v]) => v === dayOfWeek)?.[0];
    if (jsDayIndex === undefined) return false;

    const targetDayNum = parseInt(jsDayIndex);
    const currentDayNum = today.day();
    const diff = targetDayNum - currentDayNum;
    const targetDate = today.add(diff, 'day');

    return orders.some(order => {
        if (order.customerId !== customerId) return false;
        if (order.status === 'Cancelado') return false;
        const orderDate = getOrderDate(order);
        if (!orderDate) return false;
        return orderDate.isSame(targetDate, 'day');
    });
}
