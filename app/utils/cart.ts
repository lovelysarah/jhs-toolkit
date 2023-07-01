import { get } from "http";
import { db } from "./db.server";
import type { Unpacked } from "~/types/utils";
import { CHECKOUT_TYPE } from "@prisma/client";

export const countItemsInCart = (cart: string[]): { [key: string]: number } =>
    cart.reduce((acc: any, item) => {
        // For each item in the cart, add it to the accumulator
        // If it doesn't exist, set it to 0 to prevent adding to undefined
        acc[item] = (acc[item] || 0) + 1;
        return acc;
    }, {});

const getItemsbyInventoryId = async (inventoryId: string) => {
    return await db.item.findMany({
        where: { location: { short_id: inventoryId } },
        select: {
            tag: { select: { name: true, description: true } },
            name: true,
            quantity: true,
            last_checked_out_by: true,
            last_checked_out_at: true,
            id: true,
            short_id: true,
            description: true,
        },
        orderBy: [{ tag: { name: "asc" } }, { name: "asc" }],
    });
};

const getCartByInventoryId = async (userId: string, inventoryId: string) => {
    const cart = await db.cart.findFirst({
        where: {
            AND: [
                { user_id: userId },
                { inventory: { short_id: inventoryId } },
            ],
        },

        select: {
            id: true,
            inventory_id: true,
            user_id: true,
            items: {
                select: {
                    quantity: true,
                    checkout_type: true,
                    item: {
                        select: {
                            name: true,
                            quantity: true,
                            id: true,
                            description: true,
                            note: true,
                        },
                    },
                },
            },
        },
    });

    return cart;
};

type CartByInventory = Awaited<ReturnType<typeof getCartByInventoryId>>;
type ItemByInventory = Awaited<ReturnType<typeof getItemsbyInventoryId>>;

type FetchedCartItem = Unpacked<NonNullable<CartByInventory>["items"]> & {
    adjusted: boolean;
};

type CartWithAdjustedItems = Omit<CartByInventory, "items"> & {
    items: FetchedCartItem[];
};

export type AdjustedItem = Unpacked<ItemByInventory> & {
    combinedCartQuantity: number;
    checked_out: FetchedCartItem[];
    adjusted: boolean;
};

type ProcessedData = {
    items: AdjustedItem[];
    cart:
        | (CartWithAdjustedItems & {
              combinedQuantities: { [key: string]: number };
          })
        | null;
};

const getCombinedQuantities = (cart: CartWithAdjustedItems) => {
    if (!cart) return {};
    return cart.items.reduce((acc, curr) => {
        if (Object.keys(acc).includes(curr.item.id)) {
            acc[curr.item.id] = curr.quantity + acc[curr.item.id];
        } else {
            acc[curr.item.id] = curr.quantity;
        }
        return acc;
    }, {} as { [key: string]: number });
};

const nonAdjustedItem = (item: AdjustedItem, cart: CartWithAdjustedItems) => {
    const initialQuantity = item.quantity;

    item.quantity = initialQuantity - item.combinedCartQuantity;

    if (cart) {
        item.checked_out = cart.items.filter(
            (cartItem) => cartItem.item.id === item.id && cartItem.quantity > 0
        );
    }

    return item;
};
const adjustItemAndCart = (
    item: AdjustedItem,
    modifiedCart: Omit<CartByInventory, "items"> & { items: FetchedCartItem[] }
) => {
    const initialQuantity = item.quantity;
    item.adjusted = true;
    const diff = initialQuantity - item.combinedCartQuantity;

    const decrementBy = diff * -1;

    if (!modifiedCart) {
        throw new Error("Item processing failed: Expected cart");
    }

    const findIndexByType = (type: CHECKOUT_TYPE, arr: FetchedCartItem[]) => {
        return arr.findIndex(
            (cartItem) =>
                cartItem.item.id === item.id && cartItem.checkout_type === type
        );
    };
    modifiedCart.items = modifiedCart.items.map((cartItem) => ({
        ...cartItem,
        adjusted: false,
    }));

    const decrementLimit = decrementBy;
    let count = 0;
    while (count < decrementLimit) {
        // Prioritize decrementing items that are borrowed
        const priorityIndex = findIndexByType(
            CHECKOUT_TYPE.TEMPORARY,
            modifiedCart.items
        );

        const priority = modifiedCart.items[priorityIndex];

        if (!priority || priority.quantity - 1 < 0) {
            const secondaryIndex = findIndexByType(
                CHECKOUT_TYPE.PERMANENT,
                modifiedCart.items
            );
            const secondary = modifiedCart.items[secondaryIndex];
            secondary.quantity = secondary.quantity - 1;
            secondary.adjusted = true;
        } else {
            priority.quantity = priority.quantity - 1;
            priority.adjusted = true;
        }

        count++;
    }

    const nonEmptyItems = modifiedCart.items.filter(
        (item) => item.quantity > 0
    );

    modifiedCart = { ...modifiedCart, items: nonEmptyItems };

    item.quantity = initialQuantity - (item.combinedCartQuantity + diff);

    item.checked_out = modifiedCart.items.filter(
        (cartItem) => cartItem.item.id === item.id && cartItem.quantity > 0
    );

    // item.checked_out[checkedOutIndex].quantity =
    // item.checked_out[checkedOutIndex].quantity - decrementBy;

    item.combinedCartQuantity =
        getCombinedQuantities(modifiedCart)[item.id] || 0;

    return { adjustedItem: item, modifiedCart };
};

export const calculateInventoryAndCartQuantities = async (
    inventoryId: string,
    userId: string
): Promise<ProcessedData> => {
    // Should it get all items or just the ones in the cart?

    const items = await getItemsbyInventoryId(inventoryId);
    const cart = await getCartByInventoryId(userId, inventoryId);

    let cartDup = {
        ...cart,
        items: cart
            ? cart.items.map((item) => ({
                  ...item,
                  adjusted: false,
              }))
            : [],
    };

    // Check overflow in quantities
    const adjustedItems: AdjustedItem[] = items.map(
        (item, idx): AdjustedItem => {
            const newItem = {
                ...item,
                checked_out: [] as FetchedCartItem[],
                adjusted: false,
                combinedCartQuantity:
                    getCombinedQuantities(cartDup)[item.id] || 0,
            };

            const initialQuantity = item.quantity;

            const hasEnough =
                initialQuantity - newItem.combinedCartQuantity > -1;

            if (hasEnough || !cartDup) {
                return nonAdjustedItem(newItem, cartDup);
            }

            const { adjustedItem, modifiedCart } = adjustItemAndCart(
                newItem,
                cartDup
            );

            cartDup = modifiedCart;

            return adjustedItem;
        }
    );

    return {
        cart: cart
            ? {
                  ...cartDup,
                  combinedQuantities: getCombinedQuantities(cartDup),
              }
            : null,
        items: adjustedItems,
    };
};
