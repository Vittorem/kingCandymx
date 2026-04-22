import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';
import { Order } from '../types';

/**
 * Extracts a dayjs date from an Order, prioritizing deliveredAt over deliveryDate.
 * Handles both Firestore Timestamp objects and raw {seconds} objects.
 */
export function getOrderDate(order: Order): dayjs.Dayjs | null {
    if (order.deliveredAt) {
        return toDay(order.deliveredAt);
    }
    if (order.deliveryDate) {
        return toDay(order.deliveryDate);
    }
    return null;
}

/**
 * Converts a Firestore Timestamp (or Timestamp-like object) to dayjs.
 */
export function toDay(ts: Timestamp | { seconds: number } | undefined | null): dayjs.Dayjs | null {
    if (!ts) return null;
    if ('toDate' in ts && typeof ts.toDate === 'function') {
        return dayjs(ts.toDate());
    }
    if ('seconds' in ts) {
        return dayjs(ts.seconds * 1000);
    }
    return null;
}

/**
 * Filters orders to only delivered orders within a date range.
 */
export function getDeliveredOrdersInRange(
    orders: Order[],
    start: dayjs.Dayjs,
    end: dayjs.Dayjs
): Order[] {
    return orders.filter(o => {
        if (o.isDeleted) return false;
        if (o.status !== 'Entregado') return false;
        const date = getOrderDate(o);
        if (!date) return false;
        return date.isAfter(start) && date.isBefore(end);
    });
}
