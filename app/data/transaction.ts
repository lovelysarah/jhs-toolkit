import type { Prisma } from "@prisma/client";
import { db } from "~/utils/db.server";

// Returns details about a specific transaction
export const getTransactionDetails = async (transactionId: string) => {
    return await db.transaction.findFirstOrThrow({
        where: { id: transactionId },
        include: { inventory: true, user: true },
    });
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
            by_guest: true,
            status: true,
            action_type: true,
            resolved_at: true,
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

export const resolveTransactions = async (ids: string[]) => {
    return await db.$transaction(async (tx) => {
        await tx.transaction.updateMany({
            where: { id: { in: ids } },
            data: {
                status: "COMPLETED",
                resolved_at: new Date(),
            },
        });

        return await db.transaction.findMany({
            where: { id: { in: ids } },
            select: { id: true, status: true, resolved_at: true },
        });
    });
};
