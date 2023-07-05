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
import invariant from "tiny-invariant";
import clsx from "clsx";

type LoaderData = {
    cartCount: number;
    locationName: string;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const inventoryId = params.inventoryId;
    invariant(inventoryId, "No inventory ID provided");
    // Redirect to login if user is not logged in
    const user = await requireUser(request)!;

    // Get cart from session
    // const cart = (await getCartSession(request)).getCart();
    const cart = await db.cart.findFirst({
        where: {
            AND: [{ user_id: user }, { inventory: { short_id: inventoryId } }],
        },
        select: { _count: { select: { items: true } } },
    });

    const location = await db.inventoryLocation.findUniqueOrThrow({
        where: { short_id: inventoryId },
        select: { name: true },
    });

    const data: LoaderData = {
        cartCount: cart ? cart._count.items : 0,
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
    // {
    //     text: "Debug transactions",
    //     href: "debug",
    //     display: true,
    //     icon: <List />,
    // },
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

const VALID_INVENTORY_SUB_PATH = [
    "activity",
    "summary",
    "check-in",
    "check-out",
];

export default function ManageShedRoute() {
    // Get cart count from loader data
    const { cartCount, locationName } = useLoaderData<LoaderData>();

    const params = useParams();
    const nav = useNavigation();

    // Get the title from the URL
    const location = useLocation();
    const paths = location.pathname.split("/");
    console.log("---------------");
    const subPath = VALID_INVENTORY_SUB_PATH.includes(paths[paths.length - 1])
        ? paths[paths.length - 1]
        : "Overview";

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

                        const linkTo = `/inventory/${params.inventoryId}/${link.href}`;
                        const checkoutRoute =
                            linkTo ===
                            `/inventory/${params.inventoryId}/check-out`;

                        return (
                            <NavLink
                                key={link.text}
                                to={linkTo}
                                className={({ isActive, isPending }) => {
                                    return clsx(
                                        "btn btn-ghost flex gap-2 bg-base",
                                        {
                                            "btn-outline text-primary btn-primary":
                                                isActive,
                                            "btn-disabled opacity-50":
                                                checkoutRoute &&
                                                cartCount === 0,
                                        }
                                    );
                                }}
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
