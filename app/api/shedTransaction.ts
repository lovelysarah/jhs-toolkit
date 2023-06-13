import { PrismaClient, ShedTransaction } from "@prisma/client";
import { db } from "~/utils/db.server";

const PER_PAGE = 3;
export type GetAllShedTransactionsArgs = {
    skip?: number;
    take?: number;
};

export const getAllShedTransactions = async ({
    skip = PER_PAGE,
    take = PER_PAGE,
}: GetAllShedTransactionsArgs) => {
    const result = await db.shedTransaction.findMany({
        take: 3,
        skip: ,
        orderBy: { created_at: "desc" },
        select: {
            shed_location: true,
            item_ids: true,
            user: { select: { name: true } },
            action_type: true,
            created_at: true,
        },
    });

    return result;
};

export type AllShedTransactions = Awaited<
    ReturnType<typeof getAllShedTransactions>
>;

export const getLatestShedTransactions = async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await db.shedTransaction.findMany({
        orderBy: { created_at: "desc" },
        where: {
            created_at: { gte: oneWeekAgo },
        },
        select: {
            user: { select: { name: true } },
            action_type: true,
            created_at: true,
            item_ids: true,
            shed_location: true,
        },
    });

    return result;
};

export type LatestShedTransactions = Awaited<
    ReturnType<typeof getLatestShedTransactions>
>;
