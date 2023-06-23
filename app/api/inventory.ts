import type { Item, ShedTransaction, User } from "@prisma/client";
import { countItemsInCart } from "~/utils/cart";
import { db } from "~/utils/db.server";
import type { InfoFromUser } from "./user";
import type { CheckoutResult } from "~/types/inventory";
import { CHECKOUT_ERROR_MESSAGES } from "~/types/inventory";

type CheckoutQueryInfo = {
    cart: string[];
    displayName: string;
    note: string;
    user: Pick<InfoFromUser, "id" | "account_type" | "name">;
};

type CheckoutResultData = {
    user: Partial<User>;
    transaction: Partial<ShedTransaction>;
    items: Partial<Item>[];
};
export const checkout = async (
    data: CheckoutQueryInfo
): Promise<CheckoutResult<CheckoutResultData>> => {
    // save items to user's checked out

    const count = countItemsInCart(data.cart);
    const items = Object.entries(count).map(([name, quantity]) => ({
        name,
        quantity,
    }));

    // Why try catch won't work here..?
    const result: CheckoutResult<CheckoutResultData> = (await db
        .$transaction(async (tx) => {
            let items_result = [] as any[];

            let error = false;

            for (let { name, quantity } of items) {
                if (error) return;
                console.log({ name, quantity });

                const previous = await tx.item.findFirstOrThrow({
                    where: { name },
                    select: { quantity: true },
                });

                if (previous.quantity - quantity < 0)
                    throw new Error("NO_STOCK");

                const modified = await tx.item.update({
                    where: { name },
                    data: { quantity: previous.quantity - quantity },
                });

                items_result.push(modified);
            }

            const transaction = await tx.shedTransaction.create({
                data: {
                    user: { connect: { id: data.user.id } },
                    shed_location: "FLANDERS",
                    action_type: "CHECK_OUT",
                    display_name:
                        data.user.account_type === "GUEST"
                            ? data.displayName
                            : data.user.name,
                    note: data.note ? data.note : null,
                    created_at: new Date(),
                    item_ids: { set: data.cart },
                },
                select: {
                    id: true,
                    user: { select: { name: true } },
                    created_at: true,
                },
            });
            // Update user's checked out items
            const user = await tx.user.update({
                where: { id: data.user.id },
                data: {
                    shed_cart: [],
                    shed_checked_out: { push: data.cart },
                },
                select: { name: true },
            });

            const result = {
                transaction,
                user,
                items: items_result,
            } as CheckoutResultData;

            return {
                type: "CHECKOUT_SUCCESS",
                data: result,
                messsage: "Success!",
            };
        })
        .catch((e) => {
            const error = e as Error;
            let message = CHECKOUT_ERROR_MESSAGES.SERVER_ERROR;
            if (error.message === "NO_STOCK")
                message = CHECKOUT_ERROR_MESSAGES.NO_STOCK;

            return { type: "CHECKOUT_FAILURE", message };
        })) as CheckoutResult<CheckoutResultData>;

    return result;

    // decrement items from inventory
    // create transaction
    // return transaction id
};
