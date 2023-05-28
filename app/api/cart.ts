import {
    Item,
    Prisma,
    PrismaClient,
    PrismaPromise,
    User,
} from "@prisma/client";
import { countItemsInCart } from "~/utils/cart";
import { db } from "~/utils/db.server";

export const saveUserCart = async (userId: string, cartItems: string[]) => {
    return await db.user.update({
        where: { id: userId },
        data: {
            shed_cart: cartItems,
        },
    });
};

export const saveUserKit = async (userId: string, cart: string[]) => {
    const createQueries = (cart: string[]) => {
        const itemCounts = countItemsInCart(cart);
        const promises: PrismaPromise<any>[] = Object.entries(itemCounts).map(
            ([name, quantity]) =>
                db.item.update({
                    where: { name },
                    data: { quantity: { decrement: quantity } },
                })
        );

        promises.push(
            db.user.update({
                where: { id: userId },
                data: {
                    shed_cart: [],
                    shed_checked_out: { push: cart },
                },
            })
        );

        return promises;
    };

    const promises = createQueries(cart);

    try {
        db.$transaction(promises);
    } catch (error) {
        throw error;
    }
};

export type SaveUserCartResult = Awaited<ReturnType<typeof saveUserCart>>;
