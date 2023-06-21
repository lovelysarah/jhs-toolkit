import { json, redirect } from "@remix-run/node";

import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";

export const action: ActionFunction = async ({ request }) => {
    const userId = await getUserId(request);

    if (!userId) {
        return redirect("/login", { status: 401 });
    }

    const requestText = await request.text();
    const form = new URLSearchParams(requestText);
    const action = form.get("action");
    const item = form.get("item");

    const failure = (message: string, status: number) =>
        json({ success: false, message }, { status });

    switch (action) {
        case "add":
            if (!item) return failure("Bad request", 400);

            try {
                await db.user.update({
                    where: { id: userId },
                    data: {
                        shed_cart: { push: item },
                    },
                });
            } catch (err) {
                const error = err as Error;
                return failure(error.message, 500);
            }

            break;
        case "remove":
            const dbResults = await db.user.findUnique({
                where: { id: userId },
                select: { shed_cart: true },
            });

            if (!item) return failure("Bad request", 400);

            if (!dbResults) return failure("Something went wrong!", 500);

            const index = dbResults.shed_cart.findIndex(
                (itemInCart) => itemInCart === item
            );

            const cartCopy = [...dbResults.shed_cart];
            cartCopy.splice(index, 1);

            try {
                await db.user.update({
                    where: { id: userId },
                    data: {
                        shed_cart: cartCopy,
                    },
                });
            } catch (err) {
                const error = err as Error;
                return failure(error.message, 500);
            }
            break;

        case "clear":
            try {
                await db.user.update({
                    where: { id: userId },
                    data: {
                        shed_cart: [],
                    },
                });
            } catch (err) {
                const error = err as Error;
                return failure(error.message, 500);
            }
            break;
        default:
            return null;
    }

    return json({ success: true, action });
};

export const loader: LoaderFunction = () => redirect("/", { status: 404 });
