import type { Prisma } from "@prisma/client";
import { countItemsInCart } from "~/utils/cart";
import { db } from "~/utils/db.server";

// Returns details about a specific transaction
export const getTransactionDetails = async (transactionId: string) => {
    const transactionDetails = await db.shedTransaction.findFirstOrThrow({
        where: { id: transactionId },
        select: {
            id: true,
            item_ids: true,
            display_name: true,
            user: { select: { name: true } },
            shed_location: true,
            action_type: true,
            note: true,
            created_at: true,
        },
    });

    const transactionCartCount = countItemsInCart(
        transactionDetails.item_ids.sort()
    );

    return {
        ...transactionDetails,
        count: transactionCartCount,
    };
};
export type TransactionDetails = Awaited<
    ReturnType<typeof getTransactionDetails>
>;

// Returns a list of transactions
export const getTransactionsFromRange = async <
    T extends Prisma.TransactionFindManyArgs
>(
    options: T
) => {
    return await db.transaction.findMany({
        ...options,
        select: {
            id: true,
            items: true,
            status: true,
            action_type: true,
            created_at: true,
            checkout_type: true,
            PERMA_user_account: true,
            PERMA_user_display_name: true,
            PERMA_inventory_name: true,
            inventory: { select: { name: true } },
            user: { select: { name: true } },
        },
    });
};
export type MultipleTransactions = Awaited<
    ReturnType<typeof getTransactionsFromRange>
>;
