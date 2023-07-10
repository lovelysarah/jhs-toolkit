import {
    PackageMinus,
    ClipboardList,
    Loader2,
    Info,
    LayoutDashboard,
    StickyNote,
    History,
} from "lucide-react";
import { json } from "@remix-run/node";
import {
    Link,
    NavLink,
    Outlet,
    useLoaderData,
    useLocation,
    useNavigation,
    useParams,
} from "@remix-run/react";
import { requireUser } from "~/utils/session.server";
import { db } from "~/utils/db.server";

import type { LoaderArgs } from "@remix-run/node";
import invariant from "tiny-invariant";
import clsx from "clsx";

import dayjs from "dayjs";

import relativeTime from "dayjs/plugin/relativeTime";
import SideBySide from "~/components/layout/SideBySide";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import type { Unpacked } from "~/types/utils";
import { getAction } from "~/utils/txText";
import { isTxItem } from "~/types/tx";

import { FEATURE_FLAG } from "~/config";

dayjs.extend(relativeTime);

const getRecentTxs = async (inventoryId: string) => {
    return await db.transaction.findMany({
        where: { inventory: { short_id: inventoryId } },
        take: 10,
        orderBy: { created_at: "desc" },
        select: {
            user: { select: { name: true } },
            inventory: { select: { name: true } },
            id: true,
            link_id: true,
            created_at: true,
            resolved_at: true,
            item_count: true,
            items: true,
            action_type: true,
            note: true,
            checkout_type: true,
        },
    });
};

export const loader = async ({ request, params }: LoaderArgs) => {
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

    const recentTxs = FEATURE_FLAG.OVERVIEW_SHOW_RECENT_ACTIVITY
        ? await getRecentTxs(inventoryId)
        : null;

    const location = await db.inventoryLocation.findUniqueOrThrow({
        where: { short_id: inventoryId },
        select: {
            name: true,
            items: { where: { deleted_at: { isSet: false } } },
            description: true,
            _count: { select: { transactions: true } },
        },
    });

    const data = {
        cartCount: cart ? cart._count.items : 0,
        recentTxs,
        inventory: location,
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
        text: "Overview",
        href: "",
        end: true,
        display: true,
        icon: <LayoutDashboard />,
    },
    {
        text: "Summary",
        href: "/summary",
        display: true,
        icon: <ClipboardList />,
    },
    {
        text: "Check-out",
        href: "/check-out",
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
    const { cartCount, inventory, recentTxs } = useLoaderData<typeof loader>();

    const params = useParams();
    const nav = useNavigation();

    // Get the title from the URL
    const location = useLocation();
    const paths = location.pathname.split("/");
    const subPath = VALID_INVENTORY_SUB_PATH.includes(paths[paths.length - 1])
        ? paths[paths.length - 1]
        : "Overview";

    return (
        <section className="">
            <div className="z-20 flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4 sticky top-2 mt-8 md:mt-0 md:static bg-base-100/95 p-4 border border-base-300 rounded-2xl mx-[-1rem] md:border-0">
                <div className="flex flex-col items-start">
                    <h1 className="theme-text-h3 theme-text-gradient hidden md:block">
                        {inventory.name}
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

                        const linkTo = `/inventory/${params.inventoryId}${link.href}`;
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
            {inventory.description && (
                <div className="alert my-4">
                    <div>
                        <Info />
                        <span>{inventory.description}</span>
                    </div>
                </div>
            )}
            <Outlet />
            {FEATURE_FLAG.OVERVIEW_SHOW_RECENT_ACTIVITY && recentTxs && (
                <SideBySide
                    left={
                        <RecentActivity
                            recentTxs={recentTxs.map((tx) => ({
                                ...tx,
                                created_at: new Date(tx.created_at),
                                resolved_at: tx.resolved_at
                                    ? new Date(tx.resolved_at)
                                    : null,
                            }))}
                        />
                    }
                    right={
                        <InventoryStats
                            itemCount={inventory.items.length}
                            txCount={inventory._count.transactions}
                        />
                    }
                />
            )}
        </section>
    );
}

type RecentActivityProps = {
    recentTxs: Awaited<ReturnType<typeof getRecentTxs>>;
};

const TransactionDetails = ({
    tx,
    secondary,
    children,
}: {
    tx: Unpacked<RecentActivityProps["recentTxs"]>;
    secondary?: boolean;
} & PropsWithChildren) => {
    return (
        <>
            <div className="flex-start flex items-center">
                <div
                    className={clsx(
                        "-ml-[9px] -mt-2 mr-3 flex h-4 w-4 items-center justify-center",
                        {
                            "rounded-full bg-secondary": !secondary,
                        }
                    )}></div>
                <h4 className="-mt-2 theme-text-h4 font-semibold">
                    {!secondary ? tx.user.name : "They also"}
                </h4>
            </div>
            <div
                className={clsx("ml-6 pb-2 flex flex-col gap-2", {
                    "mb-4": secondary,
                })}>
                <span className="text-sm text-accent">
                    {getAction(tx.checkout_type, false)} {tx.item_count} items{" "}
                    {!secondary && dayjs(tx.created_at).fromNow()}
                </span>
                {children}
                <div>
                    {tx.items.map((item) => {
                        if (!isTxItem(item)) return null;
                        return (
                            <span
                                key={item.id}
                                className="btn btn-ghost">
                                {item.quantity} {item.name}
                            </span>
                        );
                    })}
                </div>
            </div>
        </>
    );
};
const RecentActivity = ({ recentTxs }: RecentActivityProps) => {
    const groups = useMemo(() => {
        const groups = new Map<string, typeof recentTxs>();

        recentTxs.forEach((tx) => {
            if (!groups.has(tx.link_id))
                groups.set(tx.link_id, [
                    ...recentTxs.filter((tx2) => tx2.link_id === tx.link_id),
                ]);
        });

        return groups;
    }, [recentTxs]);

    return (
        <div className="">
            <div className="flex items-center justify-between">
                <h2 className="theme-text-h3">Recent activity</h2>
                <Link
                    to="/activity"
                    className="btn btn-secondary btn-outline flex gap-2 items-center">
                    <History />
                    View entire history
                </Link>
            </div>

            <ol className="border-l-2 border-secondary mt-8">
                {[...groups].slice(0, 5).map(([link_id, txs]) => {
                    const multiple = txs.length > 1;

                    const Note = (): JSX.Element | null => {
                        if (!txs[0].note) return null;
                        return (
                            <div className="alert alert-warning">
                                <div>
                                    <StickyNote className="shrink-none" />
                                    <div>
                                        <h3 className="font-bold">
                                            Attached note
                                        </h3>
                                        <div className="text-xs">
                                            {txs[0].note}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    };
                    return (
                        <li key={txs[0].id}>
                            <TransactionDetails
                                tx={txs[0]}
                                children={<Note />}
                            />
                            {multiple && (
                                <>
                                    <div className="divider my-4"></div>
                                    <TransactionDetails
                                        tx={txs[1]}
                                        secondary
                                    />
                                </>
                            )}
                            {/* <pre>{JSON.stringify(tx, null, 2)}</pre> */}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

type InventoryStatsProps = {
    itemCount: number;
    txCount: number;
};
const InventoryStats = ({
    itemCount,
    txCount,
}: InventoryStatsProps): JSX.Element => {
    return (
        <>
            <h3 className="theme-text-h3">Stats</h3>
            <div className="flex items-center flex-col justify-around gap-8 theme-padding-y">
                <span className="theme-text-h3">
                    {itemCount}{" "}
                    <span className="opacity-60 font-normal">Items</span>
                </span>
                <span className="theme-text-h3">
                    {txCount}{" "}
                    <span className="opacity-60 font-normal">Transactions</span>
                </span>
            </div>
        </>
    );
};
