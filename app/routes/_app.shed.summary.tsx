import { Category } from "@prisma/client";
import { LoaderFunction, SerializeFrom, json } from "@remix-run/node";
import { Link, Outlet, useFetcher, useLoaderData } from "@remix-run/react";
import { useRevalidator } from "@remix-run/react";

import clsx from "clsx";
import {
    Dispatch,
    PropsWithChildren,
    SetStateAction,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { getAllItems } from "~/api/item";
import { getAdjustedStock, countItemsInCart, AdjustedItem } from "~/utils/cart";
import { getCartSession } from "~/utils/cart.server";

type LoaderData = {
    items: AdjustedItem[];
    initialCart: string[];
    itemId: string | undefined;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const cartSession = await getCartSession(request);

    const cart = cartSession.getCart();
    const items = await getAllItems();

    const [adjustedStock, updatedCart] = getAdjustedStock(items, cart);

    // cartSession.updateCart(updatedCart);

    const data: LoaderData = {
        itemId: params.itemId,
        initialCart: updatedCart,
        items: adjustedStock,
    };

    return json(data);
};

type CategoryHeaderProps = {
    category: Category;
};
const CategoryHeader = ({ category }: CategoryHeaderProps) => {
    return (
        <>
            <div className="divider"></div>
            <h3 className="theme-text-h3 mt-4">{category.replace("_", " ")}</h3>

            <div className="flex">
                <div className="py-2 px-4 flex items-center basis-full sm:basis-[70%]">
                    <span className="flex-1">Name</span>
                    <span className="flex-1 text-right md:text-left">
                        Quantity
                    </span>
                </div>
            </div>
        </>
    );
};

type ItemCardProps = {
    item: SerializeFrom<AdjustedItem>;
    selectHandler: Dispatch<SetStateAction<string | undefined>>;
    expanded: boolean;
} & PropsWithChildren;

const ItemCard = ({
    item,
    selectHandler,
    expanded,
    children,
}: ItemCardProps) => {
    // Toggles card expansion
    const handleExpand = (
        e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
    ) => {
        if (expanded) return selectHandler(undefined);
        selectHandler(item.shortId);
    };

    return (
        <div className={`flex flex-col md:flex-row md:items-start gap-2`}>
            <div className="basis-full sm:basis-[70%]">
                <Link
                    key={item.name}
                    to={expanded ? "/shed/summary" : item.shortId}
                    onClick={handleExpand}
                    className={clsx(
                        `text-left no-animation btn shadow-lg
                        rounded-md flex justify-between items-center `,
                        {
                            "btn-ghost":
                                !expanded &&
                                item.quantity > 0 &&
                                item.checked_out === 0,
                            "btn-ghost text-error":
                                !expanded &&
                                item.quantity === 0 &&
                                item.checked_out === 0,
                            "btn-success": !expanded && item.checked_out !== 0,
                            "btn-primary": expanded,
                        }
                    )}>
                    <span className="flex-1 font-bold">
                        {item.checked_out > 0
                            ? `${item.checked_out} ${item.name} in cart`
                            : item.name}{" "}
                        {item.adjusted && (
                            <span className="badge ml-2">
                                Auto-adjusted for stock
                            </span>
                        )}
                    </span>
                    <span className="flex-1 text-right md:text-left">
                        {item.quantity}
                    </span>
                </Link>
                {expanded && <Outlet />}
            </div>
            {children}
        </div>
    );
};

type AwaitingCheckoutProps = {
    cart: string[];
    clearCart: () => void;
    lastUpdated: Date;
};
const AwaitingCheckout = ({
    cart,
    clearCart,
    lastUpdated,
}: AwaitingCheckoutProps) => {
    const itemCounts = countItemsInCart(cart);
    const uniqueCart = [...new Set(cart)];
    return (
        <>
            <div className="flex justify-between items-center mb-2">
                <h4 className="theme-text-h4">Awaiting check out</h4>
                <span>
                    Stocks last updated {lastUpdated.getHours()}:
                    {lastUpdated.getMinutes()}:{lastUpdated.getSeconds()}
                </span>
            </div>
            <div className="flex justify-between items-start px-2 py-4 rounded-lg">
                <div className="flex gap-2 basis-[70%] flex-wrap">
                    {uniqueCart.map((item) => {
                        const count = itemCounts[item];
                        return (
                            <span
                                className="badge badge-neutral badge-lg"
                                key={item}>
                                {count} {item}
                            </span>
                        );
                    })}
                </div>
                <ul className="bg-base-100 rounded-lg">
                    <li>
                        <button
                            className="border btn btn-error px-4 py-2"
                            onClick={(e) => clearCart()}>
                            Clear
                        </button>
                    </li>
                </ul>
            </div>
        </>
    );
};

export default function ShedSummaryRoute() {
    // Get loader data
    const revalidator = useRevalidator();

    const { items, initialCart, itemId } = useLoaderData<LoaderData>();

    // Initialize cart
    const [cart, setCart] = useState<typeof initialCart>(initialCart);

    // Used to prevent a POST request if cart and inital cart are out of sync
    // const [syncing, setSyncing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Initialized selected item
    const [selected, setSelected] = useState<string | undefined>(itemId);

    // Last category assigned to headers
    let lastCategory: Category | null = null;

    const persistCart = useFetcher();
    const persistCartRef = useRef(persistCart);
    const mountRun = useRef(false);

    useEffect(() => {
        const pollingRate = 5000;
        const polling = setInterval(() => {
            setLastUpdated(new Date());
            revalidator.revalidate();
        }, pollingRate);
        return () => {
            clearInterval(polling);
        };
    }, []);

    useEffect(() => {
        if (initialCart.length === cart.length) return;

        setCart(initialCart);
        // setSyncing(true);
    }, [initialCart]);

    // Displays badges for each unique item in the cart with their count.

    useEffect(() => {
        persistCartRef.current = persistCart;
    }, [persistCart]);

    useEffect(() => {
        if (!mountRun.current) {
            mountRun.current = true;
            return;
        }

        // if (syncing) return setSyncing(false);
        console.log("POST");

        const string = JSON.stringify(cart);
        persistCartRef.current.submit(
            { cart: string },
            { action: "/action/update-cart", method: "post" }
        );
    }, [cart]);

    return (
        <>
            {initialCart.length > 0 && (
                <AwaitingCheckout
                    cart={initialCart}
                    clearCart={() => setCart([])}
                    lastUpdated={lastUpdated}
                />
            )}
            <div className="flex flex-col gap-2">
                {items.map((item) => {
                    let addHeader = false;
                    if (lastCategory !== item.category) {
                        addHeader = true;
                        lastCategory = item.category;
                    }

                    const addToCheckout = (toAdd: string) => {
                        item.quantity = item.quantity - 1;
                        setCart((prev) => [...prev, toAdd]);
                    };

                    const removeFromCheckout = (toRemove: string) => {
                        // Finds first instance on the item to remove.
                        const idx = cart.findIndex(
                            (cartItem) => cartItem === toRemove
                        );

                        // Updates state to updated array
                        // Removes first instance of the item to remove

                        setCart((prev) => {
                            const copy = [...prev];
                            copy.splice(idx, 1);
                            return copy;
                        });

                        item.quantity = item.quantity + 1;
                    };
                    return (
                        <div key={item.shortId}>
                            {addHeader && (
                                <CategoryHeader category={item.category} />
                            )}

                            <ItemCard
                                item={item}
                                selectHandler={setSelected}
                                expanded={selected === item.shortId}>
                                <div className="flex gap-2 w-full md:w-[30%]">
                                    {item.quantity !== 0 && (
                                        <button
                                            className="btn btn-neutral flex-1"
                                            onClick={(e) =>
                                                addToCheckout(item.name)
                                            }>
                                            Add
                                        </button>
                                    )}
                                    {item.checked_out > 0 && (
                                        <button
                                            className="btn btn-error flex-1"
                                            onClick={(e) =>
                                                removeFromCheckout(item.name)
                                            }>
                                            Remove
                                        </button>
                                    )}
                                    {selected === item.shortId && (
                                        <button className="btn btn-warning flex-1">
                                            Modify
                                        </button>
                                    )}
                                </div>
                            </ItemCard>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
