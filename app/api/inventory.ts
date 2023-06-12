import { PrismaPromise } from "@prisma/client";
import { countItemsInCart } from "~/utils/cart";
import { db } from "~/utils/db.server";

export const CheckoutItems = async (userId: string, items: string[]) => {
    // save items to user's checked out
    const queries = getCheckoutQueries(userId, items);

    try {
        const result = await db.$transaction(queries);
        console.log(result);
    } catch (err) {
        const error = err as Error;
        console.log({ error });
    }

    // decrement items from inventory
    // create transaction
    // return transaction id
};

const getCheckoutQueries = (
    userId: string,
    cart: string[]
): PrismaPromise<any>[] => {
    const itemCounts = countItemsInCart(cart);

    // Decrement from inventory
    const promises: PrismaPromise<any>[] = Object.entries(itemCounts).map(
        ([name, quantity]) =>
            db.item.update({
                where: { name },
                data: { quantity: { decrement: quantity } },
                select: { id: true, quantity: true },
            })
    );

    // Create transaction record
    promises.push(
        db.shedTransaction.create({
            data: {
                user: { connect: { id: userId } },
                shed_location: "FLANDERS",
                action_type: "CHECK_OUT",
                created_at: new Date(),
                item_ids: { set: cart },
            },
            select: {
                id: true,
                user: { select: { name: true } },
                created_at: true,
            },
        })
    );

    // Update user's checked out items
    promises.push(
        db.user.update({
            where: { id: userId },
            data: {
                shed_cart: [],
                shed_checked_out: { push: cart },
            },
            select: { name: true },
        })
    );

    return promises;
};
