import type { Item } from "@prisma/client";
import { getAllItems, getCollectionOfItems } from "~/api/item";

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

type AdjustmentInfo = {
    stock: AdjustedItem[];
    cart: string[];
    diff: { [key: string]: number };
};

export const adjustForQuantities = async (
    cart: string[],
    allItems: boolean = false
): Promise<AdjustmentInfo> => {
    // Should it get all items or just the ones in the cart?
    const items = allItems
        ? await getAllItems()
        : await getCollectionOfItems(cart);

    const newCart = [...cart];

    // List of items that have been adjusted and by how much
    const difference = {} as { [key: string]: number };

    const removeItemFromCart = (item: Item, amount: number) => {
        for (let i = 0; i < amount; i++) {
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

        difference[item.name] = diff;

        const removeSteps = diff * -1;

        removeItemFromCart(item, removeSteps);

        extraInfo.quantity = baseQuantity - (amountInCart + diff);
        extraInfo.checked_out = amountInCart - removeSteps;

        return {
            ...item,
            ...extraInfo,
        };
    });
    return { stock: newItemList, cart: newCart, diff: difference };
};
