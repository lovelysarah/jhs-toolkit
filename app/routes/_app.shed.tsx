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
        href: "/shed/activity",
        display: true,
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
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4 sticky top-14 md:static bg-base-100/95 p-4 border border-base-300 rounded-2xl mx-[-1rem] md:border-0">
                <h1 className="theme-text-h2 theme-text-gradient hidden md:block">
                    {formattedTitle}
                </h1>
                <nav className="flex gap-4 justify-around flex-wrap">
                    {shedMenuLinks.map((link) => {
                        const text =
                            link.text === "Check-out"
                                ? `${link.text} (${cartCount})`
                                : link.text;

                        const activeClasses = "btn btn-outline btn-primary";
                        const checkoutRoute = link.href === "/shed/check-out";

                        const passiveClasses =
                            cartCount > 0
                                ? "btn btn-ghost bg-base-100"
                                : checkoutRoute
                                ? "btn btn-ghost bg-base-100 btn-disabled opacity-50"
                                : "btn btn-ghost bg-base-100";

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
                                <span className="hidden sm:inline-block">
                                    {text}
                                </span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
            <Outlet />

            <div className="theme-padding-y">
                <h2 className="theme-text-h3">Recent activity</h2>
                <p>
                    Lorem ipsum, dolor sit amet consectetur adipisicing elit.
                    Quos, neque?
                </p>
            </div>
        </section>
    );
}
