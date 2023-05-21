import { createCookieSessionStorage } from "@remix-run/node";

const cartSecret = process.env.CART_SECRET;

if (!cartSecret) throw new Error("CART_SECRET must be set");

const { commitSession, getSession, destroySession } =
    createCookieSessionStorage({
        cookie: {
            name: "CART_STATE",
            secure: process.env.NODE_ENV === "production",
            secrets: [cartSecret],
            sameSite: "lax",
            path: "/",
            httpOnly: true,
        },
    });

export async function getCartSession(request: Request) {
    const session = await getSession(request.headers.get("Cookie"));

    return {
        getCart: (): string[] | undefined => session.get("items"),
        updateCart: (cartItems: string[]) => session.set("items", cartItems),
        commit: () => commitSession(session),
    };
}
