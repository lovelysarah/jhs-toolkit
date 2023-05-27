import { KEYS } from "~/constant/cookie.server";
import { getSession, commitSession } from "~/utils/session.server";

export async function getCartSession(request: Request) {
    const session = await getSession(request.headers.get("Cookie"));

    const getCart = (): string[] => session.get(KEYS.SHED_CART) ?? [];

    const updateCart = (cartItems: string[]) =>
        session.set(KEYS.SHED_CART, cartItems);

    const commit = () => commitSession(session);

    return {
        getCart,
        updateCart,
        commit,
    };
}
