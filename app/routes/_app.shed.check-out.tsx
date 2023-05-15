import { LoaderFunction, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { CollectionOfItems, getCollectionOfItems } from "~/api/item";
import { getCartSession } from "~/utils/cart.server";

type LoaderData = {
    items: CollectionOfItems;
};

export const loader: LoaderFunction = async ({ request }) => {
    const cartSession = await getCartSession(request);
    const cartItems = await cartSession.getCart();

    const data: LoaderData = {
        items: await getCollectionOfItems(cartItems),
    };

    return json(data);
};

export default function ShedCheckOutRoute() {
    const { items } = useLoaderData<LoaderData>();

    return (
        <>
            <h2 className="theme-text-h3">Confirm items</h2>
            {items.map((item) => {
                return (
                    <li>
                        {item.name} | {item.shortId}
                    </li>
                );
            })}
        </>
    );
}
