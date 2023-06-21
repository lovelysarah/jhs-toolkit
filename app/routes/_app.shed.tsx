import {
    PackagePlus,
    PackageMinus,
    Activity,
    ClipboardList,
    Loader2,
} from "lucide-react";
import { json } from "@remix-run/node";
import {
    NavLink,
    Outlet,
    useLoaderData,
    useLocation,
    useNavigation,
} from "@remix-run/react";
import { requireUser } from "~/utils/session.server";
import { db } from "~/utils/db.server";

import type { LoaderFunction } from "@remix-run/node";

type LoaderData = {
    cartCount: number;
};

export const loader: LoaderFunction = async ({ request }) => {
    // Redirect to login if user is not logged in
    const user = await requireUser(request)!;

    // Get cart from session
    // const cart = (await getCartSession(request)).getCart();
    const userInfo = await db.user.findUnique({
        where: { id: user },
        select: { shed_cart: true },
    });

    const data: LoaderData = {
        cartCount: userInfo?.shed_cart.length || 0,
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

    const nav = useNavigation();

    // Get the title from the URL
    const location = useLocation();
    const title = location.pathname.split("/")[2];
    const formattedTitle = title
        ? title.slice(0, 1).toUpperCase() + title.slice(1)
        : "Overview";

    return (
        <section className="">
            <div className="z-20 flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4 sticky top-2 mt-8 md:mt-0 md:static bg-base-100/95 p-4 border border-base-300 rounded-2xl mx-[-1rem] md:border-0">
                <h1 className="theme-text-h2 theme-text-gradient hidden md:block">
                    {formattedTitle}
                </h1>
                <nav className="flex gap-4 justify-around flex-wrap">
                    {shedMenuLinks.map((link) => {
                        const text =
                            link.text === "Check-out"
                                ? `${link.text} (${cartCount})`
                                : link.text;

                        const DisplayCartCount = (): JSX.Element => {
                            return (
                                <>
                                    <span className="hidden sm:inline-block">
                                        {link.text}({cartCount})
                                    </span>
                                    <span className="sm:hidden">
                                        {cartCount}
                                    </span>
                                </>
                            );
                        };

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
                                {nav.location?.pathname === link.href &&
                                nav.state !== "idle" ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    link.icon
                                )}

                                {link.text === "Check-out" ? (
                                    <DisplayCartCount />
                                ) : (
                                    <span className="hidden sm:inline-block">
                                        {text}
                                    </span>
                                )}
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
