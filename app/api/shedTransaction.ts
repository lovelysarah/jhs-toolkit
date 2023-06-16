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
            user: { select: { name: true } },
            shed_location: true,
            action_type: true,
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
    T extends Prisma.ShedTransactionFindManyArgs
>(
    options: T
) => {
    return await db.shedTransaction.findMany({
        select: {
            id: true,
            shed_location: true,
            item_ids: true,
            action_type: true,
            created_at: true,
            user: { select: { name: true } },
        },
        ...options,
    });
};
export type MultipleTransactions = Awaited<
    ReturnType<typeof getTransactionsFromRange>
>;
