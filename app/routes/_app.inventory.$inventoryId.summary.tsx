import { json } from "@remix-run/node";
import {
    Link,
    isRouteErrorResponse,
    useFetcher,
    useLoaderData,
    useParams,
    useRevalidator,
    useRouteError,
} from "@remix-run/react";

import clsx from "clsx";
import invariant from "tiny-invariant";
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Edit,
    Eye,
    Loader,
    Loader2,
    Search,
} from "lucide-react";

import { db } from "~/utils/db.server";
import { requireUser } from "~/utils/session.server";
import {
    calculateInventoryAndCartQuantities,
    isProcessedStockWithCart,
} from "~/utils/cart";

import { CART_ACTION, CHECKOUT_TYPE } from "~/types/inventory";

import { FEATURE_FLAG } from "~/config";

import type { Unpacked } from "~/types/utils";
import type { SerializeFrom, LoaderArgs } from "@remix-run/node";
import type { AdjustedItem, ProcessedCart } from "~/utils/cart";
import type { FetcherWithComponents, SubmitOptions } from "@remix-run/react";
import useDebounce from "~/hooks/useDebounce";
import {
    ErrorResponseMessage,
    UnknownErrorMessage,
} from "~/components/ErrorMessage";

const POLLING_RATE_MS = 10000;

export const loader = async ({ request, params }: LoaderArgs) => {
    const userId = await requireUser(request);
    const inventoryId = params.inventoryId;

    invariant(inventoryId, "Inventory ID is required");

    const inventory = await db.inventoryLocation.findFirst({
        where: {
            short_id: inventoryId,
        },
        select: { deleted_at: true },
    });

    if (inventory && inventory.deleted_at)
        throw new Response(
            `This inventory was archived on ${inventory.deleted_at.toLocaleDateString()}.`,
            { status: 401 }
        );

    const processed = await calculateInventoryAndCartQuantities(
        inventoryId,
        userId
    );

    const user = await db.user.findFirstOrThrow({
        where: { id: userId },
        select: { account_type: true, name: true },
    });

    const data = {
        user,
        itemId: params.itemId,
        inventory: processed.items,
        cart: isProcessedStockWithCart(processed) ? processed.cart : null,
    };

    return json(data);
};

/**
 * Displays the category and the the table headers for the items.
 */

type TagHeaderProps = {
    tag: SerializeFrom<AdjustedItem["tag"]>;
};
const TagHeader = ({ tag }: TagHeaderProps) => {
    return (
        <div className="mt-8">
            <h3 className="theme-text-h4 mt-4">{tag.name.replace("_", " ")}</h3>
            <p className="theme-text-p opacity-60">{tag.description}</p>
            <div className="flex">
                <div className="py-2 px-4 flex items-center opacity-70 basis-full sm:basis-[50%] md:basis-[70%]">
                    <span className="flex-1">Name</span>
                    <span className="flex-1 text-right md:text-left">
                        Quantity
                    </span>
                </div>
            </div>
        </div>
    );
};

/**
 * Displays the actions available for an item.
 * Allows for adding, removing of items
 */

type InventoryActionProps = {
    item: SerializeFrom<AdjustedItem>;
    checkoutType: CHECKOUT_TYPE;
    fetcher: FetcherWithComponents<any>;
};
const InventoryAction = ({
    item,
    fetcher,
    checkoutType,
}: InventoryActionProps): JSX.Element | null => {
    const { inventoryId } = useParams();
    const [quantity, setQuantity] = useState(0);
    const [action, setAction] = useState<CART_ACTION>();

    invariant(inventoryId, "Inventory ID was expected");

    const submitOptions: SubmitOptions = {
        action: "/action/update-cart",
        method: "POST",
    };

    const [debouncedQuantity, isPending] = useDebounce(quantity, 500);

    const borrowing = checkoutType === CHECKOUT_TYPE.TEMPORARY;

    const isIdle = fetcher.state === "idle";

    type SubmitData = {
        action: CART_ACTION;
        checkoutType: CHECKOUT_TYPE;
    };

    const submit = (data: SubmitData) => {
        const requestData = {
            ...data,
            inventoryId,
            itemId: item.id,
            quantity: quantity.toString(),
        };
        fetcher.submit(requestData, submitOptions);
    };

    useEffect(() => {
        if (quantity > 0) {
            submit({
                action: action || CART_ACTION.ADD,
                checkoutType: borrowing
                    ? CHECKOUT_TYPE.TEMPORARY
                    : CHECKOUT_TYPE.PERMANENT,
            });
            setQuantity(0);
        }
    }, [debouncedQuantity]);

    const handleAddButton = () => {
        setAction(CART_ACTION.ADD);
        setQuantity((prev) => prev + 1);
    };

    const handleRemoveButton = () => {
        setAction(CART_ACTION.REMOVE);
        setQuantity((prev) => prev + 1);
    };

    const addPending = isPending && action === CART_ACTION.ADD;
    const removePending = isPending && action === CART_ACTION.REMOVE;
    const adding = action === CART_ACTION.ADD;
    const removing = action === CART_ACTION.REMOVE;

    const totalCheckedOut = useMemo(() => {
        const match = borrowing
            ? CHECKOUT_TYPE.TEMPORARY
            : CHECKOUT_TYPE.PERMANENT;
        return item.checked_out
            .filter((cartItem) => cartItem.checkout_type === match)
            .reduce((acc, curr) => {
                return acc + curr.quantity;
            }, 0);
    }, [item.checked_out, borrowing]);

    return (
        <div className="flex gap-2 w-full sm:w-[50%] md:w-[30%]">
            <button
                className={clsx("btn flex-1", {
                    "btn-primary": borrowing,
                })}
                type="button"
                disabled={
                    item.quantity === 0 ||
                    quantity >= item.quantity ||
                    !isIdle ||
                    removePending
                }
                onClick={handleAddButton}>
                {borrowing
                    ? `Borrow ${adding && quantity > 0 ? quantity : ""}`
                    : `Take ${adding && quantity > 0 ? quantity : ""}`}
            </button>
            <button
                disabled={
                    item.checked_out.length < 1 ||
                    quantity >= totalCheckedOut ||
                    !isIdle ||
                    addPending
                }
                className="btn btn-error flex-1"
                type="button"
                // Could type this better
                onClick={handleRemoveButton}>
                Remove {removing && quantity > 0 ? quantity : ""}
            </button>
        </div>
    );
};

/**
 * Displays the item name and quantity.
 * TODO: Make expandable to show item details
 */

type ItemCardProps = {
    canModify: boolean;
    checkoutType: CHECKOUT_TYPE;
    item: SerializeFrom<
        Unpacked<
            Awaited<
                ReturnType<typeof calculateInventoryAndCartQuantities>
            >["items"]
        >
    >;
};
const ItemCard = ({ item, canModify, checkoutType }: ItemCardProps) => {
    const inventoryAction = useFetcher();
    const params = useParams();

    const isIdle = inventoryAction.state === "idle";

    /**
     * Field Text
     */

    // Quantity
    const displayQuantityOrMessage =
        item.checked_out.length > 0 ? item.quantity : "Out of stock";

    const quantityFieldText =
        item.quantity > 0 ? item.quantity : displayQuantityOrMessage;

    // Name
    const displayItemNameorInCartMessage = isIdle
        ? `${item.combinedCartQuantity} ${item.name} in cart`
        : `${item.name}`;

    const nameFieldText =
        item.checked_out.length > 0
            ? displayItemNameorInCartMessage
            : item.name;

    /**
     * Styles
     */
    const s_base =
        "text-left no-animation btn flex justify-between items-center cursor-default";

    const s_inStockAndNotInCart =
        isIdle && item.quantity > 0 && item.checked_out.length === 0;

    const s_outOfStock = item.quantity === 0 && item.checked_out.length === 0;

    const s_inCart = isIdle && item.checked_out.length !== 0;

    return (
        <div className={`flex flex-col sm:flex-row sm:items-start gap-2`}>
            <div className="basis-full sm:basis-[50%] md:basis-[70%]">
                <div
                    key={item.name}
                    className={clsx(s_base, {
                        "btn-warning": !isIdle,
                        "btn-ghost": s_inStockAndNotInCart,
                        "btn-error": s_outOfStock,
                        "btn-info": s_inCart,
                        "cursor-default": true,
                    })}>
                    <span className="basis-[80%] md:flex-1 font-bold">
                        {nameFieldText}
                    </span>
                    <span className="basis-[20%] md:flex-1 flex md:text-left">
                        {isIdle ? (
                            <span className="ml-2">{quantityFieldText}</span>
                        ) : (
                            <Loader2 className="animate-spin" />
                        )}
                    </span>
                    {FEATURE_FLAG.SUMMARY_MORE_ACTIONS && (
                        <nav className="flex gap-2">
                            <Link
                                to={"#"}
                                className="btn btn-ghost btn-sm flex gap-2 items-center">
                                <Eye />
                                Details
                            </Link>
                            {canModify && (
                                <Link
                                    className="btn btn-ghost btn-sm"
                                    to={`/admin/items/${params.inventoryId}/edit-item/${item.id}`}>
                                    <Edit />
                                </Link>
                            )}
                        </nav>
                    )}
                </div>
            </div>
            <InventoryAction
                checkoutType={checkoutType}
                fetcher={inventoryAction}
                item={item}
            />
        </div>
    );
};

/**
 * Displays the items in the cart and functionality to clear the cart
 * TODO: Adjustment diffs
 */
type AwaitingCheckoutProps = {
    cart: ProcessedCart;
    lastUpdated: Date | undefined;
};
const AwaitingCheckout = ({ cart, lastUpdated }: AwaitingCheckoutProps) => {
    const clearCart = useFetcher();
    const { inventoryId } = useParams();

    invariant(inventoryId, "Inventory ID is undefined");

    const sortedItems = useMemo(() => {
        return cart.items
            .sort((a, b) => (a.item.name < b.item.name ? 1 : -1))
            .sort((a, b) => (a.checkout_type > b.checkout_type ? 1 : -1));
    }, [cart.items]);

    // Text
    const stockUpdateText = lastUpdated
        ? `Stock last updated at ${lastUpdated.toLocaleTimeString()}`
        : `Stock updates every ${POLLING_RATE_MS / 1000} seconds`;

    return (
        <div className="bottom-0 left-0 right-0 md:fixed bg-base-200 px-4 pt-2 pb-4 rounded-t-2xl z-30">
            <div className="bg-base-100/90 rounded-2xl relative border-base-300 border z-30 p-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex gap-2">
                        <h4 className="theme-text-h4">Awaiting check out </h4>

                        <span className="opacity-50">{stockUpdateText}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="badge badge-lg">Permanent</span>
                        <span className="badge badge-lg badge-outline">
                            Adjusted
                        </span>
                        <div className="divider divider-vertical">or</div>
                        <span className="badge badge-lg badge-primary">
                            Temporary
                        </span>
                        <span className="badge badge-lg badge-primary badge-outline">
                            Adjusted
                        </span>
                    </div>
                </div>
                <div className="flex justify-between items-start px-2 py-4 rounded-lg">
                    <div className="flex gap-2  flex-wrap">
                        {sortedItems.map(
                            ({ item, quantity, checkout_type, adjusted }) => {
                                // const count = itemCounts[item.name];
                                // Styles
                                const s_itemBadge = clsx(
                                    "badge badge-lg shadow-lg",
                                    {
                                        "badge-primary":
                                            checkout_type === "TEMPORARY",
                                        "badge-outline": adjusted,
                                    }
                                );
                                return (
                                    <span
                                        className={s_itemBadge}
                                        key={`${item.id}-${checkout_type}`}>
                                        {quantity} {item.name}
                                    </span>
                                );
                            }
                        )}
                    </div>
                    <button
                        className="border btn btn-error px-4 py-2"
                        disabled={clearCart.state !== "idle"}
                        onClick={(e) => {
                            clearCart.submit(
                                { action: CART_ACTION.CLEAR, inventoryId },
                                {
                                    action: "/action/update-cart",
                                    method: "POST",
                                }
                            );
                        }}>
                        {clearCart.state === "idle" ? (
                            "Clear"
                        ) : (
                            <Loader className="animate-spin" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function ShedSummaryRoute() {
    // Get loader data
    const revalidator = useRevalidator();

    const { inventory, cart, user } = useLoaderData<typeof loader>();

    // const cartCTX = useCart();
    // Initialize cart
    // const [cart, setCart] = useState(cart);

    // Used to prevent a POST request if cart and inital cart are out of sync
    // const [syncing, setSyncing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>();

    const [borrowing, setBorrowing] = useState(true);

    // Initialized selected item
    const [showTags, setShowTags] = useState(true);

    //Last category assigned to headers
    let lastCategory: string | null = null;

    // TODO: Fix dependencies
    useEffect(() => {
        // Updates the updatedTime and reloads the data
        const revalidate = () => {
            setLastUpdated(new Date());
            revalidator.revalidate();
        };

        // Start interval on mount
        let polling = setInterval(revalidate, POLLING_RATE_MS);

        // When the window is focused, revalidate and restart interval
        const onFocus = () => {
            revalidate();
            clearInterval(polling);
            polling = setInterval(revalidate, POLLING_RATE_MS);
        };

        window.addEventListener("focus", onFocus);

        return () => {
            // Cleanup
            clearInterval(polling);
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    // useEffect(() => {
    // cartCTX.updateDiffs(diff);
    // }, [cart]);

    // return <pre>{JSON.stringify(data, null, 2)}</pre>;

    return (
        <>
            {cart && cart.items.length > 0 && (
                <AwaitingCheckout
                    cart={cart}
                    lastUpdated={lastUpdated}
                />
            )}
            {/* <pre>{JSON.stringify({ user, cart, inventory }, null, 2)}</pre> */}
            {inventory.length < 1 ? (
                <div className="alert alert-warning flex gap-2 items-center mb-4">
                    <div>
                        <AlertTriangle />
                        <span>No items in inventory</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-2 mb-4">
                    <div className="form-control sticky top-32 sm:top-0 md:top-0 px-4 py-2 z-50 bg-base-100 border-b-2 border-b-base-300">
                        <div className="flex gap-4 items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <label className="label cursor-pointer">
                                    <span className="label-text mr-2">
                                        Show categories
                                    </span>
                                    <input
                                        onChange={(e) => {
                                            setShowTags((prev) => !prev);
                                        }}
                                        type="checkbox"
                                        className={clsx("toggle", {
                                            "toggle-primary": showTags,
                                        })}
                                        checked={showTags}
                                    />
                                </label>
                                <label className="label cursor-pointer">
                                    <span className="label-text mr-2">
                                        Borrowing
                                    </span>
                                    <input
                                        onChange={(e) => {
                                            setBorrowing(e.target.checked);
                                        }}
                                        type="checkbox"
                                        className={clsx("toggle", {
                                            "toggle-primary": borrowing,
                                        })}
                                        checked={borrowing}
                                    />
                                </label>
                            </div>
                            {FEATURE_FLAG.SUMMARY_SEARCH && (
                                <div className="input-group justify-end">
                                    <input
                                        type="text"
                                        placeholder="Search…"
                                        className="input input-bordered"
                                    />
                                    <button className="btn btn-square">
                                        <Search />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    {inventory.map((item) => {
                        let addHeader = false;

                        invariant(item.tag, "Missing item tag");
                        if (item.tag.name && lastCategory !== item.tag.name) {
                            addHeader = true;
                            lastCategory = item.tag.name;
                        }

                        return (
                            <div
                                key={item.short_id}
                                className={clsx({
                                    "mt-3": !showTags,
                                })}>
                                {addHeader && showTags && (
                                    <TagHeader tag={item.tag} />
                                )}

                                <ItemCard
                                    canModify={user.account_type === "ADMIN"}
                                    item={item}
                                    checkoutType={
                                        borrowing
                                            ? CHECKOUT_TYPE.TEMPORARY
                                            : CHECKOUT_TYPE.PERMANENT
                                    }></ItemCard>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return <ErrorResponseMessage error={error} />;
    }

    let errorMessage = "Couldn't load the summary component";

    return <UnknownErrorMessage message={errorMessage} />;
}
