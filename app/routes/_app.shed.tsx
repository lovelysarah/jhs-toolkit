import { LoaderFunction, json } from "@remix-run/node";
import { NavLink, Outlet, useLoaderData, useLocation } from "@remix-run/react";
import { getCartSession } from "~/utils/cart.server";
import { requireUser } from "~/utils/session.server";
import {
    PackagePlus,
    PackageMinus,
    Activity,
    ClipboardList,
} from "lucide-react";

type LoaderData = {
    cartCount: number;
};

export const loader: LoaderFunction = async ({ request }) => {
    // Redirect to login if user is not logged in
    await requireUser(request);

    // Get cart from session
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
    icon: JSX.Element;
};
const shedMenuLinks: ShedMenuLink[] = [
    {
        text: "Activity",
        href: "/shed",
        display: true,
        end: true,
        icon: <Activity />,
    },
    {
        text: "Summary",
        href: "/shed/summary",
        display: true,
        icon: <ClipboardList />,
    },
    {
        text: "Check-in",
        href: "/shed/check-in",
        display: true,
        icon: <PackagePlus />,
    },
    {
        text: "Check-out",
        href: "/shed/check-out",
        display: true,
        icon: <PackageMinus />,
    },
];

export default function ManageShedRoute() {
    // Get cart count from loader data
    const { cartCount } = useLoaderData<LoaderData>();

    // Get the title from the URL
    const location = useLocation();
    const title = location.pathname.split("/")[2];
    const formattedTitle = title
        ? title.slice(0, 1).toUpperCase() + title.slice(1)
        : "Overview";

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
                                ? `${link.text} (${cartCount})`
                                : link.text;

                        const activeClasses = "btn btn-outline btn-primary";
                        const checkoutRoute = link.href === "/shed/check-out";

                        const passiveClasses =
                            cartCount > 0
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
                                        ? "btn btn-ghost flex gap-2"
                                        : isActive
                                        ? activeClasses + " flex gap-2"
                                        : passiveClasses + " flex gap-2"
                                }
                                end={link.end}>
                                {link.icon}
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
