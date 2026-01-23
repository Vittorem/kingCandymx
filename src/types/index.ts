export interface BaseEntity {
    id: string;
    createdAt: any; // Firestore Timestamp
    updatedAt: any;
    createdBy: string;
    updatedBy: string;
    isDeleted?: boolean;
    deletedAt?: any;
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

    // Derived metrics (not always persisted, but useful in UI)
    totalSpent?: number;
    ordersCount?: number;
    avgOrderValue?: number;
    lastDeliveredAt?: any; // Timestamp
}

// --- Orders ---

export type OrderStatus = 'Pendiente' | 'Confirmado' | 'En preparación' | 'Listo para entregar' | 'Entregado' | 'Cancelado';

export interface Order extends BaseEntity {
    customerId: string;
    customerName?: string; // Denormalized for ease
    productId: string;
    productNameAtSale: string;
    flavorId: string;
    flavorNameAtSale: string;
    channelId: string;

    quantity: number;
    unitPriceAtSale: number;

    deliveryDate: any; // Timestamp
    deliveryMethod: 'Recoge' | 'Envío';
    shippingCost: number;

    discountType: 'PERCENT' | 'AMOUNT';
    discountValue: number;

    extraCharges: number;
    extraChargesReason?: string;

    notes?: string;
    status: OrderStatus;

    // Calculated fields (stored for history integrity)
    subtotal: number;
    discountAmount: number;
    total: number;

    deliveredAt?: any; // Set when status -> Entregado
}

// --- Inventory ---

export interface InventoryItem extends BaseEntity {
    name: string;
    category: string;
    purchaseUnitLabel: 'bolsa' | 'caja' | 'paquete' | 'cartera';
    packageSize: number; // e.g. 500 (g/ml/units inside)
    stockPackages: number; // Whole packages
    minPackages: number; // Alert threshold
    supplier?: string;
    notes?: string;
    isActive: boolean;
}

export interface InventoryMovement extends BaseEntity {
    itemId: string;
    itemName: string;
    type: 'IN' | 'OUT' | 'ADJUST';
    quantityPackages: number; // +/-
    date: any; // Timestamp
    note?: string;
}

// --- Recipes (Simple) ---
export interface Recipe extends BaseEntity {
    productId: string;
    yieldUnits: number; // How many tiramisus from this batch
    ingredients: {
        itemId: string;
        qtyPackages: number; // e.g. 0.5 package or 2 packages
    }[];
}

