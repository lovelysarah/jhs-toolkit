import clsx from "clsx";
import { Category, Item } from "@prisma/client";
import { LoaderFunction, SerializeFrom, json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useLocation } from "@remix-run/react";
import { nanoid } from "nanoid";
import {
    Dispatch,
    PropsWithChildren,
    ReactNode,
    SetStateAction,
    useState,
} from "react";
import invariant from "tiny-invariant";
import { AllItemsResult, getAllItems } from "~/api/item";
import { getCartSession } from "~/utils/cart.server";

type LoaderData = {
    items: AllItemsResult;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const test = await getCartSession(request);
    const data: LoaderData = {
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
                    to={expanded ? "/manage/shed" : item.shortId}
                    onClick={handleExpand}
                    className={clsx(
                        "py-2 px-4 border border-gray-400 hover:bg-slate-200 rounded-md flex justify-between items-center",
                        {
                            "bg-slate-100": expanded,
                            "bg-white": !expanded,
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

export default function ManageShedRoute() {
    const location = useLocation();
    const title = location.pathname.split("/")[2];
    const formattedTitle = title.slice(0, 1).toUpperCase() + title.slice(1);
    const [cart, setCart] = useState<string[]>([]);
    let lastCategory: Category | null = null;
    return (
        <section className="">
            <div className="flex gap-4 my-4 justify-between items-center">
                <h1 className="theme-text-h2">{formattedTitle}</h1>
                <div className="flex gap-4">
                    <button className="border text-xl px-4 py-2">
                        Add new item
                    </button>
                    <Link
                        className="border text-xl px-4 py-2"
                        to="/shed/check-in">
                        Check in
                    </Link>
                </div>
            </div>
            <Outlet />
            {/* <div>
                <h2 className="theme-text-h4">Currently checked out</h2>
                <div className="flex flex-col gap-2">
                    {items.map((item, index) => {
                        let addHeader = false;
                        if (lastCategory !== item.category) {
                            addHeader = true;
                            lastCategory = item.category;
                        }

                        const [checkedOut, setCheckedOut] = useState(0);

                        const addToCheckout = (id: string) => {
                            setCheckedOut((prev) => prev + 1);
                            item.quantity = item.quantity - 1;
                            setCart((prev) => [...prev, id]);
                        };

                        const removeFromCheckout = (id: string) => {
                            // Finds first instance on the item to remove.
                            const idx = cart.findIndex(
                                (itemID) => itemID === id
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
                                                Checkout
                                            </button>
                                        )}
                                        {checkedOut > 0 && (
                                            <button
                                                onClick={(e) =>
                                                    removeFromCheckout(
                                                        item.shortId
                                                    )
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
            </div> */}
            <h2 className="theme-text-h3">Main List</h2>
            <p>te</p>
            <h2 className="theme-text-h3">Activity</h2>
        </section>
    );
}
