import { ActionFunction, LoaderFunction, json } from "@remix-run/node";
import {
    Form,
    Link,
    useActionData,
    useLoaderData,
    useNavigation,
} from "@remix-run/react";
import clsx from "clsx";
import invariant from "tiny-invariant";
import { saveUserKit } from "~/api/cart";
import {
    CollectionOfItems,
    getAllItems,
    getCollectionOfItems,
} from "~/api/item";
import { UserInfo, getUserInfoById } from "~/api/user";
import { countItemsInCart, getAdjustedStock } from "~/utils/cart";
import { getCartSession } from "~/utils/cart.server";
import { getUserId } from "~/utils/session.server";

type LoaderData = {
    user: UserInfo;
    items: CollectionOfItems;
    cartCount: number;
    counts: { [key: string]: number };
};

export const loader: LoaderFunction = async ({ request }) => {
    const id = await getUserId(request);
    // This scenerio should never happen
    invariant(id, "User ID is not defined");

    const cartSession = await getCartSession(request);
    const cart = cartSession.getCart();
    const items = await getCollectionOfItems(cart);

    const [adjustedStock, updatedCart] = getAdjustedStock(items, cart);

    const itemCounts = countItemsInCart(updatedCart);

    const data: LoaderData = {
        user: await getUserInfoById(id),
        items: items,
        cartCount: items.length,
        counts: itemCounts,
    };

    return json(data);
};

export const action: ActionFunction = async ({ request }) => {
    const userId = await getUserId(request);
    invariant(userId, "Could not check out cart");

    const { getCart, commit, updateCart } = await getCartSession(request);
    const cart = getCart();

    await saveUserKit(userId, cart);

    updateCart([]);

    return json(
        { success: true },
        { headers: { "Set-Cookie": await commit() } }
    );
};

export default function ShedCheckOutRoute() {
    const { items, counts, user, cartCount } = useLoaderData<LoaderData>();
    const navigation = useNavigation();

    const actionData = useActionData();

    invariant(user, "Check out information not found");

    const submitting = navigation.state === "submitting";

    return (
        <section className="flex flex-col-reverse md:flex-row gap-12 items-start">
            <div className="w-full md:basis-4/6">
                <h2 className={clsx("theme-text-h3 mb-8")}>Items</h2>
                {cartCount < 1 ? (
                    <h3 className="theme-text-h4 rounded-lg w-full">
                        No items in cart,{" "}
                        <Link
                            to="/shed/summary"
                            className="link text-primary">
                            click here to add some
                        </Link>
                        .
                    </h3>
                ) : (
                    <ul className="flex flex-col gap-4">
                        {items.map((item) => {
                            const count = counts[item.name];
                            return (
                                <li className="bg-info text-info-content shadow-md flex flex-col py-2 px-4 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="theme-text-h4 py-2">
                                            {item.name}
                                        </span>
                                        <span>Quantity: {count}</span>
                                    </div>
                                    <p className="theme-text-p">{item.note}</p>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <aside className="w-full md:basis-2/6 sticky top-0 md:top-6 border p-8 rounded-lg border-base-300 bg-base-100">
                <h2 className="theme-text-h3">Information</h2>
                <Form
                    method="POST"
                    className="flex flex-col gap-2">
                    <span className="theme-text-p">
                        Check out as{" "}
                        <span className="font-bold">{user.name}</span>
                    </span>
                    <button
                        className={clsx("btn btn-primary", {
                            "btn-warning": submitting,
                            "btn-disabled": cartCount < 1,
                        })}>
                        {submitting ? "Submitting..." : "Submit"}
                    </button>
                </Form>
            </aside>
        </section>
    );
}
