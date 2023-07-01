import {
    LoaderArgs,
    LoaderFunction,
    SerializeFrom,
    json,
} from "@remix-run/node";
import { Link, Outlet, useLoaderData, useNavigation } from "@remix-run/react";
import { AllUsers, getAllUsers } from "~/api/user";
import { Unpacked } from "~/types/utils";
import {
    BadgeCheck,
    Edit,
    Loader,
    LucideClipboardList,
    LucideClipboardList,
    PackagePlus,
    User,
    Users,
} from "lucide-react";
import { useState } from "react";
import { db } from "~/utils/db.server";
import { InventoryLocation, Item } from "@prisma/client";

const findAllLocationsWithCounts = async () => {
    return await db.inventoryLocation.findMany({
        where: { deleted_at: { isSet: false } },
        include: {
            _count: {
                select: { tags: true, items: true, transactions: true },
            },
        },
    });
};

type LocationsWithCount = Awaited<
    ReturnType<typeof findAllLocationsWithCounts>
>;

export const loader = async ({ request }: LoaderArgs) => {
    const users = await getAllUsers();
    const items = await db.item.findMany({});
    const locations: LocationsWithCount = await findAllLocationsWithCounts();

    const data = {
        users: users,
        items: items,
        locations: locations,
    };

    return json(data);
};

type TableRowProps = {
    location: SerializeFrom<Unpacked<LocationsWithCount>>;
    onSelect: () => void;
    isSelected: boolean;
};

const TableRow = ({ location, onSelect, isSelected }: TableRowProps) => {
    const { state } = useNavigation();

    const showLoadingIcon = state !== "idle" && isSelected;
    return (
        <tr>
            <td>
                <div className="flex items-center space-x-3">
                    <div>
                        <span className="font-bold flex gap-2">
                            {location.name}
                        </span>
                        <span className="text-sm opacity-50">
                            {location.short_id}
                        </span>
                    </div>
                </div>
            </td>
            <td className="hidden sm:table-cell">{location._count.items}</td>
            <td className="hidden sm:table-cell">
                {location._count.transactions}
            </td>
            <td className="hidden sm:table-cell">{location._count.tags}</td>
            <td>
                <Link
                    onClick={onSelect}
                    preventScrollReset={true}
                    to={`/admin/items/${location.short_id}`}
                    className="btn btn-ghost">
                    {showLoadingIcon ? (
                        <Loader className="animate-spin" />
                    ) : (
                        <PackagePlus />
                    )}
                </Link>
                <Link
                    onClick={onSelect}
                    preventScrollReset={true}
                    to={`/admin/locations/${location.id}`}
                    className="btn btn-ghost">
                    {showLoadingIcon ? (
                        <Loader className="animate-spin" />
                    ) : (
                        <Edit />
                    )}
                </Link>
            </td>
        </tr>
    );
};

export default function AdminManageShedRoute() {
    const { locations } = useLoaderData<typeof loader>();

    const smallList = ["Name"];
    const largeList = ["Name", "items", "transactions", "Tags"];

    const [selected, setSelected] = useState<string | null>(null);
    console.log({ locations });
    console.log({ selected });

    return (
        <section className="flex flex-col-reverse md:flex-row gap-4 items-start">
            <div className="overflow-x-auto w-full basis-full md:basis-3/5">
                {locations.length > 0 ? (
                    <table className="table w-full">
                        {/* head */}
                        <thead className="hidden sm:table-header-group">
                            <tr>
                                {largeList.map((th) => (
                                    <th
                                        className="bg-base-100"
                                        key={th}>
                                        {th}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <thead className="table-header-group sm:hidden">
                            <tr>
                                {smallList.map((th) => (
                                    <th
                                        className="bg-base-100"
                                        key={th}>
                                        {th}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {locations.map((location) => (
                                <TableRow
                                    onSelect={() => setSelected(location.id)}
                                    key={location.id}
                                    location={location}
                                    isSelected={selected === location.id}
                                />
                            ))}
                            {/* row 2 */}
                        </tbody>
                    </table>
                ) : (
                    <h3 className="theme-text-h3">No locations to display</h3>
                )}
            </div>
            <div className="top-0 py-4 sticky basis-full md:basis-2/5 bg-base-100 z-20 md:z-0 w-full border-b-2 border-base-300 md:border-b-0">
                <Outlet />
            </div>
        </section>
    );
}
