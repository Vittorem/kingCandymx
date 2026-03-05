export const LOYALTY_RULES = {
    POINTS_PER_BAMBINO: 1,
    POINTS_PER_MEDIANO: 8,
    POINTS_PER_GRANDE: 11,
    POINTS_FOR_FREE_BAMBINO: 6,
    POINTS_FOR_FREE_MEDIANO: 50,
    POINTS_FOR_FREE_GRANDE: 65,
};

export const calculateProductPoints = (productName: string, quantity: number = 1): number => {
    const nameStr = (productName || '').toLowerCase();

    if (nameStr.includes('bambino')) {
        return LOYALTY_RULES.POINTS_PER_BAMBINO * quantity;
    }
    if (nameStr.includes('mediano')) {
        return LOYALTY_RULES.POINTS_PER_MEDIANO * quantity;
    }
    if (nameStr.includes('grande')) {
        return LOYALTY_RULES.POINTS_PER_GRANDE * quantity;
    }

    return 0; // Other products do not yield points
};

export const getPointsCostForProduct = (productName: string): number => {
    const nameStr = (productName || '').toLowerCase();
    if (nameStr.includes('bambino')) return LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO;
    if (nameStr.includes('mediano')) return LOYALTY_RULES.POINTS_FOR_FREE_MEDIANO;
    if (nameStr.includes('grande')) return LOYALTY_RULES.POINTS_FOR_FREE_GRANDE;
    return 0;
};

export const calculateMaxRedeemableProducts = (productName: string, loyaltyPoints: number = 0): number => {
    const cost = getPointsCostForProduct(productName);
    if (cost === 0) return 0;
    return Math.floor(loyaltyPoints / cost);
};

export const calculatePointsCost = (productName: string, quantityRedeemed: number): number => {
    return quantityRedeemed * getPointsCostForProduct(productName);
};

export const getLoyaltyRewardSummary = (points: number): string => {
    if (points >= LOYALTY_RULES.POINTS_FOR_FREE_GRANDE) {
        const qty = Math.floor(points / LOYALTY_RULES.POINTS_FOR_FREE_GRANDE);
        return `${qty} Grande${qty > 1 ? 's' : ''}`;
    } else if (points >= LOYALTY_RULES.POINTS_FOR_FREE_MEDIANO) {
        const qty = Math.floor(points / LOYALTY_RULES.POINTS_FOR_FREE_MEDIANO);
        return `${qty} Mediano${qty > 1 ? 's' : ''}`;
    } else if (points >= LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO) {
        const qty = Math.floor(points / LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO);
        return `${qty} Bambino${qty > 1 ? 's' : ''}`;
    }
    return '';
};

