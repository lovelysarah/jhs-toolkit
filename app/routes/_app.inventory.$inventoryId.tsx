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
    useParams,
} from "@remix-run/react";
import { requireUser } from "~/utils/session.server";
import { db } from "~/utils/db.server";

import type { LoaderFunction } from "@remix-run/node";

type LoaderData = {
    cartCount: number;
    locationName: string;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const inventoryId = params.inventoryId;
    // Redirect to login if user is not logged in
    const user = await requireUser(request)!;

    // Get cart from session
    // const cart = (await getCartSession(request)).getCart();
    const userInfo = await db.user.findUnique({
        where: { id: user },
        select: { shed_cart: true },
    });

    const location = await db.inventoryLocation.findUniqueOrThrow({
        where: { short_id: inventoryId },
        select: { name: true },
    });

    const data: LoaderData = {
        cartCount: userInfo?.shed_cart.length || 0,
        locationName: location.name,
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
        href: "activity",
        display: true,
        icon: <Activity />,
    },
    {
        text: "Summary",
        href: "summary",
        display: true,
        icon: <ClipboardList />,
    },
    {
        text: "Check-in",
        href: "check-in",
        display: true,
        icon: <PackagePlus />,
    },
    {
        text: "Check-out",
        href: "check-out",
        display: true,
        icon: <PackageMinus />,
    },
];

export default function ManageShedRoute() {
    // Get cart count from loader data
    const { cartCount, locationName } = useLoaderData<LoaderData>();

    const params = useParams();
    const nav = useNavigation();

    // Get the title from the URL
    const location = useLocation();
    const paths = location.pathname.split("/");
    const subPath = paths[paths.length - 1];

    return (
        <section className="">
            <div className="z-20 flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4 sticky top-2 mt-8 md:mt-0 md:static bg-base-100/95 p-4 border border-base-300 rounded-2xl mx-[-1rem] md:border-0">
                <div className="flex flex-col items-start">
                    <h1 className="theme-text-h3 theme-text-gradient hidden md:block">
                        {locationName}
                    </h1>
                    <span className="text-md opacity-60">
                        {subPath.slice(0, 1).toUpperCase() + subPath.slice(1)}
                    </span>
                </div>
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

                        const linkTo = `/inventory/${params.inventoryId}/${link.href}`;

                        return (
                            <NavLink
                                key={link.text}
                                to={linkTo}
                                className={({ isActive, isPending }) =>
                                    isPending
                                        ? "btn btn-ghost flex gap-2"
                                        : isActive
                                        ? activeClasses + " flex gap-2"
                                        : passiveClasses + " flex gap-2"
                                }
                                end={link.end}>
                                {nav.location?.pathname === linkTo &&
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
