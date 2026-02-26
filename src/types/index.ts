import { Timestamp } from 'firebase/firestore';

export interface BaseEntity {
    id: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
    updatedBy: string;
    isDeleted?: boolean;
    deletedAt?: Timestamp;
}

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

// --- Catalogs ---

export interface Product extends BaseEntity {
    name: string;
    price: number;
    isActive: boolean;
}

export interface Flavor extends BaseEntity {
    name: string;
    isActive: boolean;
}

export interface Channel extends BaseEntity {
    name: string;
    isActive: boolean;
}

// --- Customers ---

export interface Customer extends BaseEntity {
    fullName: string;
    phone: string;
    mainContactMethod: 'Instagram' | 'WhatsApp' | 'Facebook' | 'Otro';
    gender?: 'M' | 'F' | 'Otro';
    age?: number;
    occupation?: string;
    civilStatus?: string;
    type: 'B2C' | 'B2B';

    // Optional
    email?: string;
    instagramHandle?: string;
    facebookLink?: string;
    colonia?: string;
    city?: string;
    notes?: string;
    tags?: string[];

    isActive: boolean;

    // Loyalty Program
    loyaltyPoints?: number;

    // Derived metrics
    totalSpent?: number;
    ordersCount?: number;
    avgOrderValue?: number;
    lastDeliveredAt?: Timestamp;
}

// --- Orders ---

export const ORDER_STATUSES = [
    'Pendiente',
    'Confirmado',
    'En preparación',
    'Listo para entregar',
    'Entregado',
    'Cancelado',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Kanban-visible statuses (excludes Cancelado) */
export const KANBAN_STATUSES: OrderStatus[] = [
    'Pendiente',
    'Confirmado',
    'En preparación',
    'Listo para entregar',
    'Entregado',
];

export interface Order extends BaseEntity {
    customerId: string;
    customerName?: string;
    productId: string;
    productNameAtSale: string;
    flavorId: string;
    flavorNameAtSale: string;
    channelId: string;

    quantity: number;
    unitPriceAtSale: number;

    deliveryDate: Timestamp;
    deliveryMethod: 'Recoge' | 'Envío';
    shippingCost: number;

    discountType: 'PERCENT' | 'AMOUNT';
    discountValue: number;

    extraCharges: number;
    extraChargesReason?: string;

    notes?: string;
    status: OrderStatus;

    // Loyalty Program tracking
    pointsEarned?: number;
    pointsRedeemed?: number;
    pointsAwarded?: boolean;

    // Calculated fields
    subtotal: number;
    discountAmount: number;
    total: number;

    deliveredAt?: Timestamp;
}

// --- Inventory ---

export interface InventoryItem extends BaseEntity {
    name: string;
    category: string;
    purchaseUnitLabel: 'bolsa' | 'caja' | 'paquete' | 'cartera';
    packageSize: number;
    stockPackages: number;
    minPackages: number;
    supplier?: string;
    notes?: string;
    isActive: boolean;
}

export interface InventoryMovement extends BaseEntity {
    itemId: string;
    itemName: string;
    type: 'IN' | 'OUT' | 'ADJUST';
    quantityPackages: number;
    date: Timestamp;
    note?: string;
}

// --- Recipes ---
export interface Recipe extends BaseEntity {
    productId: string;
    yieldUnits: number;
    ingredients: {
        itemId: string;
        qtyPackages: number;
    }[];
}

// --- Loyalty System ---
export interface LoyaltyLedger extends BaseEntity {
    customerId: string;
    orderId?: string; // Optional if reason is 'manual_adjustment'
    pointsChange: number; // Positive (earned) or negative (redeemed)
    reason: 'purchase' | 'redemption' | 'manual_adjustment';
}

