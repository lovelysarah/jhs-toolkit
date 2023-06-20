import { json } from "@remix-run/node";
import {
    Link,
    Outlet,
    useFetcher,
    useLoaderData,
    useNavigation,
    useSubmit,
} from "@remix-run/react";
import { useRevalidator } from "@remix-run/react";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { useCart } from "~/context/CartContext";
import { adjustForQuantities, countItemsInCart } from "~/utils/cart";
import { getCartSession } from "~/utils/cart.server";

import type { AdjustedItem } from "~/utils/cart";
import type {
    FetcherWithComponents,
    SubmitFunction,
    SubmitOptions,
} from "@remix-run/react";
import type { Dispatch, PropsWithChildren, SetStateAction } from "react";
import type { Category } from "@prisma/client";
import type { SerializeFrom, LoaderArgs } from "@remix-run/node";

const POLLING_RATE_MS = 10000;

export const loader = async ({ request, params }: LoaderArgs) => {
    const cartSession = await getCartSession(request);

    const cart = cartSession.getCart();

    const adjustment = await adjustForQuantities(cart, true);

    cartSession.updateCart(adjustment.cart);

    const data = {
        itemId: params.itemId,
        initialCart: adjustment.cart,
        items: adjustment.stock,
        diff: adjustment.diff,
    };

    return json(data, {
        headers: { "Set-cookie": await cartSession.commit() },
    });
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
                <div className="py-2 px-4 flex items-center basis-full sm:basis-[50%] md:basis-[70%]">
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
    diff: number;
    adjusted: boolean;
    expanded: boolean;
} & PropsWithChildren;

const ItemCard = ({
    item,
    selectHandler,
    expanded,
    diff,
    adjusted,
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
        <div className={`flex flex-col sm:flex-row sm:items-start gap-2`}>
            <div className="basis-full sm:basis-[50%] md:basis-[70%]">
                <Link
                    key={item.name}
                    to={expanded ? "/shed/summary" : item.shortId}
                    onClick={handleExpand}
                    preventScrollReset={true}
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
                    <span className="basis-[80%] md:flex-1 font-bold">
                        {item.checked_out > 0
                            ? `${item.checked_out} ${item.name} in cart`
                            : item.name}{" "}
                        {adjusted && (
                            <span className="badge ml-2">
                                Adjusted ({diff})
                            </span>
                        )}
                    </span>
                    <span className="basis-[20%] md:flex-1 text-right md:text-left">
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
    diffs: { [key: string]: number };
    cart: string[];
    lastUpdated: Date | undefined;
};
const AwaitingCheckout = ({
    diffs,
    cart,
    lastUpdated,
}: AwaitingCheckoutProps) => {
    const clearCart = useFetcher();

    const itemCounts = countItemsInCart(cart);
    const uniqueCart = [...new Set(cart)].sort();
    return (
        <div className="hidden bottom-0 left-0 right-0 md:fixed bg-base-200 px-8 pt-2 pb-8 rounded-t-2xl z-30">
            <div className="bg-base-100/90 rounded-2xl relative border-base-300 border z-30 p-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex gap-2">
                        <h4 className="theme-text-h4">Awaiting check out </h4>

                        <span className="opacity-50">
                            {lastUpdated
                                ? `Stock last updated at ${lastUpdated.toLocaleTimeString()}`
                                : `Stock updates every ${
                                      POLLING_RATE_MS / 1000
                                  } seconds`}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <span className="badge badge-lg">In Cart</span>
                        <span className="badge badge-lg badge-primary">
                            Quantity adjusted
                        </span>
                    </div>
                </div>
                <div className="flex justify-between items-start px-2 py-4 rounded-lg">
                    <div className="flex gap-2  flex-wrap">
                        {uniqueCart.map((item) => {
                            const adjusted = Object.keys(diffs).includes(item);
                            const count = itemCounts[item];
                            return (
                                <span
                                    className={clsx(
                                        "shadow-lg badge badge-lg",
                                        {
                                            "badge-primary": adjusted,
                                        }
                                    )}
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
                                onClick={(e) => {
                                    clearCart.submit(
                                        { cart: JSON.stringify([]) },
                                        {
                                            action: "/action/update-cart",
                                            method: "POST",
                                        }
                                    );
                                }}>
                                Clear
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

type InventoryActionProps = {
    item: AdjustedItem;
    cart: string[];
    selected: boolean;
};

const InventoryAction = ({
    item,
    cart,
    selected,
}: InventoryActionProps): JSX.Element | null => {
    const inventoryAction = useFetcher();

    const submitOptions: SubmitOptions = {
        action: "/action/update-cart",
        method: "POST",
    };

    const addToCheckout = async (toAdd: string) => {
        item.quantity = item.quantity - 1;

        inventoryAction.submit(
            {
                cart: JSON.stringify([...cart, toAdd]),
                action: "add",
                item: item.name,
            },
            submitOptions
        );
    };

    const removeFromCheckout = (toRemove: string) => {
        // Finds first instance on the item to remove.
        const idx = cart.findIndex((cartItem) => cartItem === toRemove);

        // Removes first instance of the item to remove
        const cartCopy = [...cart];
        cartCopy.splice(idx, 1);

        const string = JSON.stringify(cartCopy);

        inventoryAction.submit(
            { cart: string, action: "remove", item: item.name },
            submitOptions
        );

        console.log({ inventoryAction });

        item.quantity = item.quantity + 1;
    };
    return (
        <div className="flex gap-2 w-full sm:w-[50%] md:w-[30%]">
            {item.quantity !== 0 && (
                <button
                    className="btn btn-neutral flex-1"
                    type="button"
                    onClick={() => addToCheckout(item.name)}>
                    Add
                </button>
            )}
            {item.checked_out > 0 && (
                <button
                    className="btn btn-error flex-1"
                    type="button"
                    onClick={() => removeFromCheckout(item.name)}>
                    Remove
                </button>
            )}
            {selected && (
                <button className="btn btn-warning flex-1">Modify</button>
            )}
        </div>
    );
};

export default function ShedSummaryRoute() {
    // Get loader data
    // const revalidator = useRevalidator();

    const inventoryAction = useSubmit();

    const { items, initialCart, itemId, diff } = useLoaderData<typeof loader>();

    const cartCTX = useCart();
    // Initialize cart
    const [cart, setCart] = useState<typeof initialCart>(initialCart);

    // Used to prevent a POST request if cart and inital cart are out of sync
    // const [syncing, setSyncing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>();

    // Initialized selected item
    const [selected, setSelected] = useState<string | undefined>(itemId);

    // Last category assigned to headers
    let lastCategory: Category | null = null;

    // TODO: Fix dependencies
    useEffect(() => {
        const polling = setInterval(() => {
            setLastUpdated(new Date());
            // revalidator.revalidate();
        }, POLLING_RATE_MS);
        return () => {
            clearInterval(polling);
        };
    }, []);

    useEffect(() => {
        if (initialCart.length === cart.length) return;

        cartCTX.updateDiffs(diff);
        setCart(initialCart);
    }, [initialCart]);
    console.log({ inventoryAction });

    return (
        <>
            {initialCart.length > 0 && (
                <AwaitingCheckout
                    diffs={cartCTX.diffs}
                    cart={initialCart}
                    lastUpdated={lastUpdated}
                />
            )}
            <pre>{JSON.stringify(cartCTX.diffs, null, 2)}</pre>
            <div className="flex flex-col gap-2 pb-8">
                {items.map((item) => {
                    let addHeader = false;
                    if (lastCategory !== item.category) {
                        addHeader = true;
                        lastCategory = item.category;
                    }

                    return (
                        <div key={item.shortId}>
                            {addHeader && (
                                <CategoryHeader category={item.category} />
                            )}

                            <ItemCard
                                adjusted={Object.keys(cartCTX.diffs).includes(
                                    item.name
                                )}
                                diff={cartCTX.diffs[item.name]}
                                item={item}
                                selectHandler={setSelected}
                                expanded={selected === item.shortId}>
                                <InventoryAction
                                    selected={selected === item.shortId}
                                    cart={cart}
                                    item={{
                                        ...item,
                                        last_checked_out_at: new Date(
                                            item.last_checked_out_at
                                        ),
                                    }}
                                />
                            </ItemCard>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
