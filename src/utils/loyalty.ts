export const LOYALTY_RULES = {
    POINTS_PER_BAMBINO: 1,
    POINTS_PER_MEDIANO: 5,
    POINTS_PER_GRANDE: 8,
    POINTS_FOR_FREE_BAMBINO: 6,
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

export const calculateMaxRedeemableBambinos = (loyaltyPoints: number = 0): number => {
    return Math.floor(loyaltyPoints / LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO);
};

export const calculatePointsCost = (bambinosRedeemed: number): number => {
    return bambinosRedeemed * LOYALTY_RULES.POINTS_FOR_FREE_BAMBINO;
};
