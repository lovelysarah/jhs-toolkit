import type { Item } from "@prisma/client";

export const countItemsInCart = (cart: string[]): { [key: string]: number } =>
    cart.reduce((acc: any, item) => {
        // For each item in the cart, add it to the accumulator
        // If it doesn't exist, set it to 0 to prevent adding to undefined
        acc[item] = (acc[item] || 0) + 1;
        return acc;
    }, {});

export type AdjustedItem = Item & {
    quantity: number;
    checked_out: number;
    adjusted: boolean;
};

export const getAdjustedStock = (
    items: Item[],
    cart: string[]
): [AdjustedItem[], string[]] => {
    const newCart = [...cart];

    const removeItemFromCart = (item: Item, amount: number) => {
        for (let i = 0; i < amount; i++) {
            console.log("Remove from cart", item.name);
            // Remove element
            const index = newCart.indexOf(item.name);
            console.log({ index });
            if (index > -1) newCart.splice(index, 1);
        }
    };

    const newItemList = items.map((item): AdjustedItem => {
        const extraInfo = {
            quantity: 0,
            checked_out: 0,
            adjusted: false,
        };

        const baseQuantity = item.quantity;
        // Get amount of item in cart
        const amountInCart = cart.filter((i) => i === item.name).length;

        // Verify if there is enough in stock
        const hasEnough = baseQuantity - amountInCart > -1;

        if (hasEnough) {
            extraInfo.quantity = baseQuantity - amountInCart;
            extraInfo.checked_out = amountInCart;

            return {
                ...item,
                ...extraInfo,
            };
        }

        // Mark as adjusted
        extraInfo.adjusted = true;

        // Calculate difference
        const diff = baseQuantity - amountInCart;

        const removeSteps = diff * -1;

        removeItemFromCart(item, removeSteps);

        extraInfo.quantity = baseQuantity - (amountInCart + diff);
        extraInfo.checked_out = amountInCart - removeSteps;

        return {
            ...item,
            ...extraInfo,
        };
    });
    return [newItemList, newCart];
};
