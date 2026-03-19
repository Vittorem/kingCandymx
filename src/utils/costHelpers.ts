import { Order, Recipe, Ingredient } from '../types';

/**
 * Calculates the total cost of a single recipe based on its ingredients.
 */
export const calculateRecipeCost = (recipe: Recipe, allIngredients: Ingredient[]): number => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;
    
    return recipe.ingredients.reduce((total, ri) => {
        const ingredient = allIngredients.find(ing => ing.id === ri.ingredientId);
        if (!ingredient) return total;
        return total + (ingredient.cost_unit * ri.qty);
    }, 0);
};

/**
 * Calculates the per-serving cost of a recipe.
 */
export const calculateCostPerServing = (recipe: Recipe, allIngredients: Ingredient[]): number => {
    if (!recipe.servings_default || recipe.servings_default <= 0) return 0;
    const totalCost = calculateRecipeCost(recipe, allIngredients);
    return totalCost / recipe.servings_default;
};

/**
 * Matches an order (or its items) to a known recipe intelligently, 
 * estimating the operational cost based on current ingredient prices.
 */
export const calculateOrderEstimatedCost = (
    order: Order, 
    recipes: Recipe[], 
    ingredients: Ingredient[]
): number => {
    // Helper to find a matching recipe cost for a specific product and flavor
    const findProductCost = (
        productId: string | undefined,
        flavorId: string | undefined,
        productName: string, 
        flavorName: string | undefined, 
        quantity: number
    ): number => {
        // Pass 0: Strict ID Linkage Match (Highest Priority)
        let matchedRecipe = recipes.find(r => 
            r.linkedProductId && 
            r.linkedProductId === productId && 
            (flavorId ? r.linkedFlavorId === flavorId : true)
        );

        const prodLower = productName.toLowerCase().trim();
        const flavorLower = flavorName ? flavorName.toLowerCase().trim() : '';
        const combinedLower = `${prodLower} ${flavorLower}`.trim();

        // Pass 1: Exact Text Match (Fallback)
        if (!matchedRecipe) {
            matchedRecipe = recipes.find(r => r.name.toLowerCase() === prodLower);
        }

        // Pass 2: Flavor Match (e.g. "Mediano" + "Nuez" = "Mediano Nuez")
        if (!matchedRecipe && flavorLower) {
            matchedRecipe = recipes.find(r => {
                const rName = r.name.toLowerCase();
                return rName === combinedLower || (rName.includes(prodLower) && rName.includes(flavorLower));
            });
        }

        // Pass 3: Size Keyword Priority Match
        // If the product is explicitly a standard size, look for a recipe that contains that exact size word.
        if (!matchedRecipe) {
            const sizes = ['bambino', 'mediano', 'grande'];
            const detectedSize = sizes.find(s => prodLower.includes(s));
            
            if (detectedSize) {
                 // Try to find a recipe that has this size AND the flavor
                 if (flavorLower) {
                     matchedRecipe = recipes.find(r => r.name.toLowerCase().includes(detectedSize) && r.name.toLowerCase().includes(flavorLower));
                 }
                 // Try to find the generic recipe for this size (e.g. "Bambino Klassico")
                 if (!matchedRecipe) {
                     matchedRecipe = recipes.find(r => r.name.toLowerCase().includes(detectedSize));
                 }
            }
        }

        // Pass 4: Substring Inclusion (e.g. "Bambino Klassico" contains "Bambino")
        if (!matchedRecipe) {
            matchedRecipe = recipes.find(r => 
                r.name.toLowerCase().includes(prodLower) || 
                prodLower.includes(r.name.toLowerCase())
            );
        }

        if (matchedRecipe) {
            // Apply the formula: Estimated Cost = (Total Elements / Servings) * Quantity Sold
            const costPerServing = calculateCostPerServing(matchedRecipe, ingredients);
            return costPerServing * quantity;
        }
        
        // If no recipe found after all passes, assume 0 for margin calculation
        return 0;
    };

    if (order.items && order.items.length > 0) {
        // Multi-item cart order
        return order.items.reduce((total, item) => {
            return total + findProductCost(item.productId, item.flavorId, item.productNameAtSale, item.flavorNameAtSale, item.quantity);
        }, 0);
    } else if (order.productNameAtSale) {
        // Legacy single-item order
        return findProductCost(order.productId, order.flavorId, order.productNameAtSale, undefined, order.quantity || 1);
    }
    
    return 0;
};
