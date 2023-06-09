import { json, redirect } from "@remix-run/node";

import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import { Prisma } from "@prisma/client";
import { CART_ACTION, CHECKOUT_TYPE } from "~/types/inventory";

const getOrCreateCart = async (userId: string, inventoryId: string) => {
    // Try to find an existing cart
    const existingCart = await db.cart.findFirst({
        where: {
            AND: [
                { user_id: userId },
                { inventory: { short_id: inventoryId } },
            ],
        },
    });

    if (existingCart) return existingCart;

    // Create a new cart if one doesn't exist
    try {
        const newCart = await db.cart.create({
            data: {
                user: { connect: { id: userId } },
                inventory: { connect: { short_id: inventoryId } },
            },
        });

        return newCart;
    } catch (err) {
        const error = err as Error;
        return new Error(error.message);
    }
};

function assertCheckoutType(
    checkoutType: unknown
): asserts checkoutType is CHECKOUT_TYPE {
    if (!Object.values(CHECKOUT_TYPE).includes(checkoutType as CHECKOUT_TYPE)) {
        throw new Error("Invalid checkout type");
    }
}
function assertCartActionType(
    actionType: unknown
): asserts actionType is CART_ACTION {
    if (!Object.values(CART_ACTION).includes(actionType as CART_ACTION)) {
        throw new Error("Invalid cart action type");
    }
}
const failure = (message: string, status: number) => {
    return json({ success: false, message }, { status });
};
export const action: ActionFunction = async ({ request }) => {
    const userId = await getUserId(request);

    if (!userId) {
        return redirect("/login", { status: 401 });
    }

    const requestText = await request.text();
    const form = new URLSearchParams(requestText);

    const action = form.get("action");
    const checkoutType = form.get("checkoutType");
    const itemId = form.get("itemId");
    const inventoryId = form.get("inventoryId");
    const quantity = Number(form.get("quantity"));

    if (!inventoryId) return failure("Bad request", 400);

    // Verify that the inventory is modifiable
    const inventory = await db.inventoryLocation.findFirst({
        where: {
            short_id: inventoryId,
        },
        select: { deleted_at: true },
    });

    if (inventory && inventory.deleted_at)
        return failure("Inventory is archived.", 401);

    const cart = await getOrCreateCart(userId, inventoryId);

    if (cart instanceof Error) return failure(cart.message, 500);

    // Clear the cart
    if (action === CART_ACTION.CLEAR) {
        try {
            await db.cart.delete({ where: { id: cart.id } });
            return json({ success: true, action }, { status: 200 });
        } catch (err) {
            const error = err as Error;
            return failure(error.message, 500);
        }
    }

    if (!itemId) return failure("Bad request", 400);

    try {
        assertCheckoutType(checkoutType);
        assertCartActionType(action);
    } catch (err) {
        const error = err as Error;
        return failure(error.message, 400);
    }

    switch (action) {
        case CART_ACTION.ADD:
            try {
                const existingCartItem = await db.cartItem.findFirst({
                    where: {
                        AND: [
                            { checkout_type: checkoutType },
                            { cart_id: cart.id },
                            { item_id: itemId },
                        ],
                    },
                    include: { item: true },
                });

                if (!existingCartItem) {
                    // Create one
                    console.log("Create one");
                    try {
                        await db.cart.update({
                            where: { id: cart.id },
                            data: {
                                items: {
                                    create: {
                                        quantity: quantity,
                                        checkout_type: checkoutType,
                                        item: { connect: { id: itemId } },
                                    },
                                },
                            },
                        });

                        return json({ success: true }, { status: 201 });
                    } catch (err) {
                        console.log(err);
                        const error = err as Error;
                        return failure(error.message, 500);
                    }
                }

                console.log("INCREMENT ONE");
                if (existingCartItem.item.quantity < 0) {
                    //TODO: What http code should this be?
                    return failure("Item is out of stock", 401);
                }

                try {
                    await db.cartItem.update({
                        where: { id: existingCartItem.id },
                        data: {
                            quantity: { increment: quantity },
                        },
                    });
                } catch (err) {
                    const error = err as Error;
                    return failure(error.message, 500);
                }
            } catch (err) {
                const error = err as Error;
                return failure(error.message, 500);
            }

            break;
        case CART_ACTION.REMOVE:
            // Might give priority to removing temporary items first or permanent items
            // With checkout type
            const MAX_RETRIES = 3;
            let retries = 0;
            while (retries < MAX_RETRIES) {
                try {
                    const item = await db.cartItem.findFirstOrThrow({
                        where: {
                            AND: [
                                { cart_id: cart.id },
                                { item_id: itemId },
                                { checkout_type: checkoutType },
                            ],
                        },
                    });

                    if (item.quantity - quantity < 1) {
                        await db.cartItem.delete({ where: { id: item.id } });
                    } else {
                        await db.cartItem.update({
                            where: { id: item.id },
                            data: {
                                quantity: { decrement: quantity },
                            },
                        });
                    }

                    break;
                } catch (err) {
                    if (err instanceof Prisma.PrismaClientKnownRequestError) {
                        if (err.code === "P2034") {
                            retries++;
                            continue;
                        }
                    }
                    const error = err as Error;
                    // Write conflict or deadlock
                    return failure(error.message, 500);
                }
            }

            break;

        default:
            return failure("Invalid action type", 400);
    }

    return json({ success: true, action });
};

export const loader: LoaderFunction = () => redirect("/", { status: 404 });
