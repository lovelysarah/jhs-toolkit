import { Category, Item } from "@prisma/client";
import { LoaderFunction, SerializeFrom, json } from "@remix-run/node";
import {
    Form,
    Link,
    Outlet,
    useFetcher,
    useLoaderData,
    useMatches,
} from "@remix-run/react";
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
import { AllItemsResult, getAllItems } from "~/api/item";
import { useCart } from "~/context/CartContext";
import { countItemsInCart } from "~/utils/cart";
import { getCartSession } from "~/utils/cart.server";

type LoaderData = {
    items: AllItemsResult;
    cart: string[];
    itemId: string | undefined;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const cartSession = await getCartSession(request);
    const data: LoaderData = {
        itemId: params.itemId,
        cart: cartSession.getCart(),
        items: await getAllItems(),
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
    item: SerializeFrom<Item>;
    selectHandler: Dispatch<SetStateAction<string | undefined>>;
    expanded: boolean;
    queued: number;
} & PropsWithChildren;

const ItemCard = ({
    item,
    selectHandler,
    expanded,
    queued,
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
                                !expanded && item.quantity > 0 && queued === 0,
                            "btn-ghost text-error":
                                !expanded &&
                                item.quantity === 0 &&
                                queued === 0,
                            "btn-success": !expanded && queued !== 0,
                            "btn-primary": expanded,
                        }
                    )}>
                    <span className="flex-1 font-bold">
                        {queued > 0
                            ? `${queued} ${item.name} in cart`
                            : item.name}
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

type AwaitingCheckoutProps = { cart: JSX.Element[]; clearCart: () => void };
const AwaitingCheckout = ({ cart, clearCart }: AwaitingCheckoutProps) => {
    return (
        <>
            <h4 className="theme-text-h4 mb-2">Awaiting check out</h4>
            <div className="flex justify-between items-start px-2 py-4 rounded-lg">
                <div className="flex gap-2 basis-[70%] flex-wrap">{cart}</div>
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
    const { items, cart: initialCart, itemId } = useLoaderData<LoaderData>();

    // Initialize cart
    const [cart, setCart] = useState<string[]>(initialCart || []);

    // Initialized selected item
    const [selected, setSelected] = useState<string | undefined>(itemId);

    // Last category assigned to headers
    let lastCategory: Category | null = null;

    const cartContext = useCart();
    const persistCart = useFetcher();
    const persistCartRef = useRef(persistCart);
    const mountRun = useRef(false);

    const calculate = () => {
        return items.map((item) => {
            const modifier = cart.filter((i) => i === item.name).length;
            return {
                ...item,
                quantity: item.quantity - modifier,
                checked_out: modifier,
            };
        });
    };

    let calculated = useMemo(() => calculate(), [cart]);
    const itemCounts = useMemo(() => countItemsInCart(cart), [cart]);

    // Displays badges for each unique item in the cart with their count.
    const uniqueCart = useMemo(
        () =>
            [...new Set(cart)].map((item) => {
                const count = itemCounts[item];
                return (
                    <span
                        className="badge badge-neutral badge-lg"
                        key={item}>
                        {count} {item}
                    </span>
                );
            }),
        [cart]
    );

    useEffect(() => {
        calculated = calculate();
    }, [cart]);

    useEffect(() => {
        persistCartRef.current = persistCart;
    }, [persistCart]);

    useEffect(() => {
        if (!mountRun.current) {
            mountRun.current = true;
            return;
        }

        if (!cart) return;

        cartContext.update(cart.length);

        const string = JSON.stringify(cart);

        persistCartRef.current.submit(
            { cart: string },
            { action: "/action/add-to-cart", method: "post" }
        );
    }, [cart]);

    return (
        <div className="">
            {cart.length > 0 && (
                <AwaitingCheckout
                    cart={uniqueCart}
                    clearCart={() => setCart([])}
                />
            )}
            <div className="flex flex-col gap-2">
                {calculated.map((item, index) => {
                    let addHeader = false;
                    if (lastCategory !== item.category) {
                        addHeader = true;
                        lastCategory = item.category;
                    }

                    const [checkedOut, setCheckedOut] = useState(0);
                    useEffect(() => {
                        setCheckedOut(item.checked_out);
                    }, [cart]);

                    const addToCheckout = (toAdd: string) => {
                        setCheckedOut((prev) => prev + 1);
                        item.quantity = item.quantity - 1;
                        setCart((prev) => [...prev, toAdd]);
                    };

                    const removeFromCheckout = (toRemove: string) => {
                        // Finds first instance on the item to remove.
                        const idx = cart.findIndex(
                            (cartItem) => cartItem === toRemove
                        );

                        // Removes first instance of the item to remove
                        const removeFromArray = (prev: string[]) => {
                            const copy = [...prev];
                            copy.splice(idx, 1);
                            return copy;
                        };

                        // Updates state to updated array
                        setCart(removeFromArray);

                        setCheckedOut((prev) => prev - 1);
                        item.quantity = item.quantity + 1;
                    };
                    return (
                        <div key={item.shortId}>
                            {addHeader && (
                                <CategoryHeader category={item.category} />
                            )}

                            {/* {item.checked_out !== 0 && (
                                <span className="btn">
                                    {item.checked_out} in cart
                                </span>
                            )} */}
                            <ItemCard
                                item={item}
                                selectHandler={setSelected}
                                queued={checkedOut}
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
                                    {checkedOut > 0 && (
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
        </div>
    );
}
