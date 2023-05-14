import { LoaderFunction, json } from "@remix-run/node";
import { getCartSession } from "~/utils/cart.server";

type LoaderData = {
    selectedItems: string[];
};

export const loader: LoaderFunction = async ({ request }) => {
    const cartSession = await getCartSession(request);

    const data: LoaderData = {
        selectedItems: await cartSession.getCart(),
    };

    return json(data);
};

export default function ShedCheckOutRoute() {
    return (
        <>
            <h2 className="theme-text-h2">Confirm items</h2>
        </>
    );
}
