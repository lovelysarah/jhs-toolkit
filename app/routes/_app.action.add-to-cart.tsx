import {
    ActionFunction,
    LoaderFunction,
    json,
    redirect,
} from "@remix-run/node";
import { getCartSession } from "~/utils/cart.server";

export const action: ActionFunction = async ({ request }) => {
    const session = await getCartSession(request);

    const requestText = await request.text();
    console.log({ requestText });
    const form = new URLSearchParams(requestText);
    console.log({ form });
    const cart = form.get("cart");

    console.log({ cart });
    if (!cart) {
        return json({ success: false, message: "No cart object" });
    }

    session.updateCart(JSON.parse(cart));

    return json(
        { success: true },
        { headers: { "Set-Cookie": await session.commit() } }
    );
};
export const loader: LoaderFunction = () => redirect("/", { status: 404 });
