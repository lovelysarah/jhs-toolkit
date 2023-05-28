export const countItemsInCart = (cart: string[]): { [key: string]: number } =>
    cart.reduce((acc: any, item) => {
        // For each item in the cart, add it to the accumulator
        // If it doesn't exist, set it to 0 to prevent adding to undefined
        acc[item] = (acc[item] || 0) + 1;
        return acc;
    }, {});
