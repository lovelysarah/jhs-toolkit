import type { Cart, CartItem, Item } from "@prisma/client";
import { getCollectionOfItems } from "~/api/item";
import { db } from "./db.server";
import { Unpacked } from "~/types/utils";

export const countItemsInCart = (cart: string[]): { [key: string]: number } =>
    cart.reduce((acc: any, item) => {
        // For each item in the cart, add it to the accumulator
        // If it doesn't exist, set it to 0 to prevent adding to undefined
        acc[item] = (acc[item] || 0) + 1;
        return acc;
    }, {});

export type AdjustedItem = Unpacked<
    Awaited<ReturnType<typeof getItemsbyInventoryId>>
> & {
    checked_out: Pick<NonNullable<CartByInventory>, "items">;
    adjusted: boolean;
};

type AdjustmentInfo = {
    stock: AdjustedItem[];
    cart: Cart;
};

const getItemsbyInventoryId = async (inventoryId: string) => {
    return await db.item.findMany({
        where: { location: { short_id: inventoryId } },
        select: {
            tag: { select: { name: true } },
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

        include: {
            items: {
                select: {
                    quantity: true,
                    checkout_type: true,
                    item: { select: { name: true, quantity: true } },
                },
            },
        },
    });

    return cart;
};

type CartByInventory = Awaited<ReturnType<typeof getCartByInventoryId>>;

export const adjustForQuantities = async (
    inventoryId: string,
    userId: string,
    allItems: boolean = false
) => {
    // Should it get all items or just the ones in the cart?

    const items = await getItemsbyInventoryId(inventoryId);
    const cart = await getCartByInventoryId(userId, inventoryId);

    if (!cart) return { items, cart: [] };

    console.log(items);
    console.log({ cart });

    // : await getCollectionOfItems(cart);

    // const newCart = [...cart];
    const cartDup = { ...cart };

    // // List of items that have been adjusted and by how much
    // const difference = {} as { [key: string]: number };

    // const removeItemFromCart = (item: Item, amount: number) => {
    //     for (let i = 0; i < amount; i++) {
    //         // Remove element
    //         const index = newCart.indexOf(item.name);
    //         console.log({ index });
    //         if (index > -1) newCart.splice(index, 1);
    //     }
    // };

    const combinedQuantity = cart.items.reduce((acc, curr) => {
        if (Object.keys(acc).includes(curr.item.name)) {
            acc[curr.item.name] = curr.quantity + acc[curr.item.name];
        } else {
            acc[curr.item.name] = curr.quantity;
        }

        return acc;
    }, {} as { [key: string]: number });
    // Check overflow in quantities
    const adjustedItems = items.map((item) => {
        console.log({ name: item.name });
        const propertyOverwrite = {
            quantity: item.quantity,
            checked_out: {},
            adjusted: false,
        };

        const initialQuantity = item.quantity;

        if (
            cart.items.filter((cartItem) => cartItem.item.name === item.name)
                .length === 0
        )
            return { ...item, ...propertyOverwrite };

        const hasEnough = initialQuantity - combinedQuantity[item.name] > -1;

        if (hasEnough) {
            propertyOverwrite.quantity =
                initialQuantity - combinedQuantity[item.name];

            propertyOverwrite.checked_out = cart.items
                .filter((cartItem) => cartItem.item.name === item.name)
                .map(({ checkout_type, quantity }) => ({
                    quantity,
                    checkout_type,
                }));

            return { ...item, ...propertyOverwrite };
        }

        propertyOverwrite.adjusted = true;

        const diff = initialQuantity - combinedQuantity[item.name];
        console.log({ diff, combinedQuantity });

        const removeSteps = diff * -1;

        const index = cart.items.findIndex(
            (cartItem) => cartItem.item.name === item.name
        );

        if (!index) {
            throw new Error("Index not found");
        }
        console.log(cartDup.items[index]);

        cartDup.items[index].quantity =
            cartDup.items[index].quantity - removeSteps;

        console.log({ newItem: cartDup.items[index] });

        propertyOverwrite.quantity =
            initialQuantity - (combinedQuantity[item.name] + diff);
        propertyOverwrite.checked_out = cart.items
            .filter((cartItem) => cartItem.item.name === item.name)
            .map(({ checkout_type, quantity }) => ({
                quantity,
                checkout_type,
            }));

        return { ...item, ...propertyOverwrite };
    });

    return { cart: cartDup, items: adjustedItems };
};
