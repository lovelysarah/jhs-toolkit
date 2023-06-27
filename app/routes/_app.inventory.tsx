import { json } from "@remix-run/node";
import {
    NavLink,
    Outlet,
    useLoaderData,
    useNavigation,
} from "@remix-run/react";
import { getAllUsers } from "~/api/user";
import { Loader2, MapPin } from "lucide-react";
import { db } from "~/utils/db.server";

import type { LoaderArgs } from "@remix-run/node";

const findAllLocationsWithCounts = async () => {
    return await db.inventoryLocation.findMany({
        where: { deleted_at: { isSet: false } },
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { items: true },
            },
        },
    });
};

type LocationsWithCount = Awaited<
    ReturnType<typeof findAllLocationsWithCounts>
>;

export const loader = async ({ request, params }: LoaderArgs) => {
    const users = await getAllUsers();
    const items = await db.item.findMany({});
    const locations: LocationsWithCount = await findAllLocationsWithCounts();

    const data = {
        selected: params.locationId || null,
        users: users,
        items: items,
        locations: locations,
    };

    return json(data);
};

export default function AdminItemRoute() {
    const { locations } = useLoaderData<typeof loader>();

    const nav = useNavigation();

    return (
        <section className="">
            <div className="w-full sticky top-4 z-50">
                <nav className="tabs tabs-boxed my-4 bg-base-200/50 backdrop-blur-sm">
                    {locations.map((location) => {
                        const link = `/inventory/${location.short_id}/summary`;
                        return (
                            <NavLink
                                to={link}
                                key={location.id}
                                className={({ isActive, isPending }) => {
                                    return isActive
                                        ? "tab tab-active flex gap-2 items-center"
                                        : "tab flex gap-2 items-center";
                                }}>
                                {nav.location?.pathname === link &&
                                nav.state !== "idle" ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <MapPin />
                                )}
                                {location.name}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
            <Outlet />
        </section>
    );
}
