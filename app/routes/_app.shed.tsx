import { LoaderFunction, json, redirect } from "@remix-run/node";
import { NavLink, Outlet, useLoaderData, useLocation } from "@remix-run/react";
import { useEffect } from "react";
import { getCartSession } from "~/utils/cart.server";
import { useCart } from "~/context/CartContext";
import { getUserId, requireUser } from "~/utils/session.server";

type LoaderData = {
    cartCount: number;
};

export const loader: LoaderFunction = async ({ request }) => {
    // Redirect to login if user is not logged in
    await requireUser(request);

    // Get cart from session or empty array
    const cart = (await getCartSession(request)).getCart();

    const data: LoaderData = {
        cartCount: cart.length,
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
    // Get cart count from loader data
    const { cartCount } = useLoaderData<LoaderData>();

    // Get cart context
    const cart = useCart();

    // Get the title from the URL
    const location = useLocation();
    const title = location.pathname.split("/")[2];
    const formattedTitle = title
        ? title.slice(0, 1).toUpperCase() + title.slice(1)
        : "Shed Management";

    // Load cart count on page load
    useEffect(() => {
        cart.update(cartCount);
    }, []);

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
