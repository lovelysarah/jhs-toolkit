import { Category, Item } from "@prisma/client";
import { LoaderFunction, SerializeFrom, json } from "@remix-run/node";
import {
    Form,
    Link,
    Outlet,
    useFetcher,
    useLoaderData,
} from "@remix-run/react";
import clsx from "clsx";
import {
    Dispatch,
    PropsWithChildren,
    SetStateAction,
    useEffect,
    useRef,
    useState,
} from "react";
import { AllItemsResult, getAllItems } from "~/api/item";
import { getCartSession } from "~/utils/cart.server";

type LoaderData = {
    items: AllItemsResult;
    cart: string[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const cartSession = await getCartSession(request);
    const data: LoaderData = {
        cart: await cartSession.getCart(),
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
            <h3 className="theme-text-h3 mt-4">{category.replace("_", " ")}</h3>

            <div className="flex">
                <div className="py-2 px-4 flex justify-between items-center basis-[92%]">
                    <span className="flex-1">Name</span>
                    <span className="flex-1">Quantity</span>
                    <span className="flex-1">Checked out</span>
                </div>
            </div>
        </>
    );
};

type ItemCardProps = {
    item: SerializeFrom<Item>;
    selectHandler: Dispatch<SetStateAction<string | null>>;
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
        if (expanded) return selectHandler(null);
        selectHandler(item.shortId);
    };

    return (
        <div className={`flex items-start gap-2`}>
            <div className="basis-[92%]">
                <Link
                    key={item.name}
                    to={expanded ? "/shed/summary" : item.shortId}
                    onClick={handleExpand}
                    className={clsx(
                        "py-2 px-4 border border-gray-400 hover:bg-slate-200 rounded-md flex justify-between items-center",
                        {
                            "bg-slate-100": expanded,
                            "bg-white": !expanded,
                            "!bg-red-300": item.quantity === 0 && queued === 0,
                            "!bg-green-300": queued !== 0,
                        }
                    )}>
                    <span className="flex-1 font-bold">{item.name}</span>
                    <span className="flex-1">{item.quantity}</span>
                    <span className="flex-1">{queued}</span>
                </Link>
                {expanded && <Outlet />}
            </div>
            {children}
        </div>
    );
};
export default function ShedSummaryRoute() {
    const { items, cart: initialCart } = useLoaderData<LoaderData>();
    const [cart, setCart] = useState<string[]>(initialCart || []);
    const [selected, setSelected] = useState<string | null>(null);
    let lastCategory: Category | null = null;

    const persistCart = useFetcher();
    const persistCartRef = useRef(persistCart);
    const mountRun = useRef(false);

    // Adjusts the item quantities based on the carts content
    const calculate = () => {
        return items.map((item) => {
            const modifier = cart.filter((i) => i === item.shortId).length;
            return {
                ...item,
                quantity: item.quantity - modifier,
                checked_out: modifier,
            };
        });
    };
    let calculated = calculate();

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

        const string = JSON.stringify(cart);

        persistCartRef.current.submit(
            { cart: string },
            { action: "/action/add-to-cart", method: "post" }
        );
    }, [cart]);

    return (
        <div>
            {cart.length > 0 && (
                <h4 className="theme-text-h4">Awaiting check out</h4>
            )}
            <div className="flex justify-between items-start">
                <div className="flex gap-2">
                    {cart.map((item, idx) => (
                        <pre key={idx}>{JSON.stringify(item, null, 2)}</pre>
                    ))}
                </div>

                {cart.length > 0 && (
                    <div>
                        <button
                            className="border text-xl px-4 py-2"
                            onClick={(e) => {
                                setCart([]);
                            }}>
                            Clear
                        </button>
                        <Link
                            to="/shed/check-out"
                            className="border text-xl px-4 py-2">
                            Checkout {cart.length} items
                        </Link>
                    </div>
                )}
            </div>
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

                    const addToCheckout = (id: string) => {
                        setCheckedOut((prev) => prev + 1);
                        item.quantity = item.quantity - 1;
                        setCart((prev) => [...prev, id]);
                    };

                    const removeFromCheckout = (id: string) => {
                        // Finds first instance on the item to remove.
                        const idx = cart.findIndex((itemID) => itemID === id);

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
                            <ItemCard
                                item={item}
                                selectHandler={setSelected}
                                queued={checkedOut}
                                expanded={selected === item.shortId}>
                                <div className="flex flex-col">
                                    {item.quantity !== 0 && (
                                        <button
                                            className="hover:underline"
                                            onClick={(e) =>
                                                addToCheckout(item.shortId)
                                            }>
                                            Add
                                        </button>
                                    )}
                                    {checkedOut > 0 && (
                                        <button
                                            onClick={(e) =>
                                                removeFromCheckout(item.shortId)
                                            }>
                                            Remove
                                        </button>
                                    )}
                                    {selected === item.shortId && (
                                        <button>Modify</button>
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
