import clsx from "clsx";
import { Category, Item } from "@prisma/client";
import { LoaderFunction, SerializeFrom, json } from "@remix-run/node";
import {
    Link,
    NavLink,
    Outlet,
    useLoaderData,
    useLocation,
} from "@remix-run/react";
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
import { useCart } from "~/context/CartContext";

type LoaderData = {
    items: AllItemsResult;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const data: LoaderData = {
        items: await getAllItems(),
    };

    return json(data);
};

type ShedMenuLink = {
    text: string;
    href: string;
    display: boolean;
    end?: true;
};
const shedMenuLinks: ShedMenuLink[] = [
    { text: "Activity", href: "/shed", display: true, end: true },
    { text: "Summary", href: "/shed/summary", display: true },
    { text: "Check-in", href: "/shed/check-in", display: true },
    { text: "Check-out", href: "/shed/check-out", display: true },
];

export default function ManageShedRoute() {
    const cart = useCart();
    const location = useLocation();
    const title = location.pathname.split("/")[2];
    const formattedTitle = title
        ? title.slice(0, 1).toUpperCase() + title.slice(1)
        : "Shed Management";

    return (
        <section className="">
            <div className="flex gap-4 my-4 justify-between items-center">
                <h1 className="theme-text-h2 theme-text-gradient">
                    {formattedTitle}
                </h1>
                <nav className="menu menu-horizontal gap-4">
                    {shedMenuLinks.map((link) => {
                        const text =
                            link.text === "Check-out"
                                ? `${link.text} (${cart.count})`
                                : link.text;

                        const activeClasses = "btn btn-outline btn-primary";
                        const checkoutRoute = link.href === "/shed/check-out";

                        console.log({ checkoutRoute });

                        const passiveClasses =
                            cart.count > 0
                                ? "btn btn-ghost"
                                : checkoutRoute
                                ? "btn btn-ghost btn-disabled opacity-50"
                                : "btn btn-ghost";

                        return (
                            <NavLink
                                key={link.text}
                                to={link.href}
                                className={({ isActive, isPending }) =>
                                    isPending
                                        ? "btn btn-ghost"
                                        : isActive
                                        ? activeClasses
                                        : passiveClasses
                                }
                                end={link.end}>
                                {text}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
            <Outlet />
        </section>
    );
}
