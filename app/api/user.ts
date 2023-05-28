import { db } from "~/utils/db.server";

export const getUserInfoById = async (id: string) => {
    return await db.user.findUnique({
        where: { id },
        select: {
            username: true,
            id: true,
            account_type: true,
            shed_cart: true,
            name: true,
        },
    });
};

export type UserInfo = Awaited<ReturnType<typeof getUserInfoById>>;
