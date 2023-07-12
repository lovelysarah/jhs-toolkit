import { json } from "@remix-run/node";
import {
    NavLink,
    Outlet,
    useLoaderData,
    useNavigate,
    useNavigation,
    useParams,
} from "@remix-run/react";
import { Loader2, MapPin } from "lucide-react";
import { db } from "~/utils/db.server";

import type { LoaderArgs } from "@remix-run/node";
import { useState } from "react";
import { requireUser } from "~/utils/session.server";

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
    await requireUser(request);
    const locations: LocationsWithCount = await findAllLocationsWithCounts();

    const data = {
        locations: locations,
    };

    return json(data);
};

export default function InventorySelectRoute() {
    const { locations } = useLoaderData<typeof loader>();

    const [navigatingTo, setNavigatingTo] = useState("");
    const nav = useNavigation();
    const navigate = useNavigate();
    const { inventoryId } = useParams();

    return (
        <section className="">
            <div className="form-control w-full max-w-xs md:hidden mt-8">
                <label className="label">
                    <span className="label-text flex gap-2">
                        {nav.location?.pathname === navigatingTo &&
                        nav.state !== "idle" ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <MapPin />
                        )}
                        Pick the location
                    </span>
                    <span className="label-text-alt">
                        {locations.length} available
                    </span>
                </label>
                <select
                    className="select select-bordered"
                    defaultValue={inventoryId || "DEFAULT"}
                    onChange={(e) => {
                        setNavigatingTo(`/inventory/${e.target.value}`);
                        navigate(`/inventory/${e.target.value}`);
                    }}>
                    <option
                        disabled
                        value={"DEFAULT"}>
                        Select one
                    </option>
                    {locations.map((location) => {
                        return (
                            <option
                                key={location.id}
                                value={location.short_id}>
                                {location.name}
                            </option>
                        );
                    })}
                </select>
            </div>
            <div className="w-full z-50 hidden md:block">
                <nav className="tabs tabs-boxed flex gap-1 my-4 bg-base-100 backdrop-blur-sm">
                    {locations.map((location) => {
                        const link = `/inventory/${location.short_id}`;
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
