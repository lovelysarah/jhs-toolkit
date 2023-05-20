import { LoaderFunction, json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { CollectionOfItems, getCollectionOfItems } from "~/api/item";
import { countItemsInCart } from "~/utils/cart";
import { getCartSession } from "~/utils/cart.server";

type LoaderData = {
    items: CollectionOfItems;
    counts: { [key: string]: number };
};

export const loader: LoaderFunction = async ({ request }) => {
    const cartSession = await getCartSession(request);
    const cartItems = cartSession.getCart();

    const itemCounts = countItemsInCart(cartItems);
    console.log({ itemCounts });

    const data: LoaderData = {
        items: await getCollectionOfItems(cartItems),
        counts: itemCounts,
    };

    return json(data);
};

export default function ShedCheckOutRoute() {
    const { items, counts } = useLoaderData<LoaderData>();

    return (
        <>
            <section className="flex flex-col-reverse md:flex-row gap-12 items-start">
                <div className="w-full md:basis-4/6">
                    <h2 className="theme-text-h3 mb-8">Items</h2>
                    <ul className="flex flex-col gap-4">
                        {items.map((item) => {
                            const count = counts[item.name];
                            return (
                                <li className="bg-base-300 flex flex-col py-2 px-4 rounded-lg">
                                    {/* <pre>{JSON.stringify(item, null, 2)}</pre> */}
                                    {/* {count} {item.name} | {item.shortId} */}
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
                </div>

                <aside className="w-full md:basis-2/6 sticky top-0 md:top-6 border p-8 rounded-box border-base-300 bg-base-100">
                    <h2 className="theme-text-h3">Information</h2>
                    <Form className="flex flex-col gap-2">
                        <input
                            type="text"
                            className="input input-bordered"
                            placeholder="Enter your name"
                        />
                        <button className="btn btn-primary">Submit</button>
                    </Form>
                </aside>
            </section>
        </>
    );
}
