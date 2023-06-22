import { json, redirect } from "@remix-run/node";

import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import { Prisma } from "@prisma/client";

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
            if (!item) return failure("Bad request", 400);

            const MAX_RETRIES = 3;
            let retries = 0;
            while (retries < MAX_RETRIES) {
                try {
                    await db.$transaction(async (tx) => {
                        const { shed_cart } = await tx.user.findUniqueOrThrow({
                            where: { id: userId },
                            select: { shed_cart: true },
                        });

                        const cartCopy = [...shed_cart];

                        const index = shed_cart.findIndex((i) => i === item);
                        cartCopy.splice(index, 1);

                        console.log({ shed_cart, cartCopy });

                        await tx.user.update({
                            where: { id: userId },
                            data: {
                                shed_cart: cartCopy,
                            },
                        });
                    });
                    break;
                } catch (err) {
                    if (err instanceof Prisma.PrismaClientKnownRequestError) {
                        if (err.code === "P2034") {
                            retries++;
                            continue;
                        }
                    }
                    const error = err as Error;
                    // Write conflict or deadlock
                    return failure(error.message, 500);
                }
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
