import { db } from "~/utils/db.server";

export const saveUserCart = async (userId: string, cartItems: string[]) => {
    return await db.user.update({
        where: { id: userId },
        data: {
            shed_cart: cartItems,
        },
    });
};

export type SaveUserCartResult = Awaited<ReturnType<typeof saveUserCart>>;
