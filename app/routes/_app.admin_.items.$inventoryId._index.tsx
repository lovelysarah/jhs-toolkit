import { json } from "@remix-run/node";
import { Link, useLoaderData, useNavigation } from "@remix-run/react";
import { Edit, Loader } from "lucide-react";
import { useState } from "react";
import invariant from "tiny-invariant";
import { db } from "~/utils/db.server";

import type { LoaderArgs, SerializeFrom } from "@remix-run/node";
import type { Unpacked } from "~/types/utils";

const findAllItemsOfLocationById = async (inventoryId: string) => {
    return await db.item.findMany({
        where: {
            AND: [
                { deleted_at: { isSet: false } },
                { location: { short_id: inventoryId } },
            ],
        },
        orderBy: [{ tag: { name: "asc" } }, { name: "asc" }],
        include: {
            tag: true,
            location: true,
        },
    });
};

type ItemsWithLocation = Awaited<ReturnType<typeof findAllItemsOfLocationById>>;

export const loader = async ({ request, params }: LoaderArgs) => {
    const inventoryId = params.inventoryId;
    invariant(inventoryId, "Invalid inventory id");

    const location = await db.inventoryLocation.findFirstOrThrow({
        where: { short_id: inventoryId },
    });

    const items = await findAllItemsOfLocationById(inventoryId);
    const tags = await db.tag.findMany({
        where: {
            AND: [
                { inventory: { short_id: inventoryId } },
                { deleted_at: { isSet: false } },
            ],
        },
        orderBy: { name: "asc" },
    });

    const data = {
        tags,
        items,
        location,
    };
    return json(data);
};
type TableRowProps = {
    item: SerializeFrom<Unpacked<ItemsWithLocation>>;
    onSelect: () => void;
    isSelected: boolean;
};

const TableRow = ({ item, onSelect, isSelected }: TableRowProps) => {
    const { state } = useNavigation();

    const showLoadingIcon = state !== "idle" && isSelected;
    return (
        <tr className="hover rounded-lg mb-1">
            <td className="w-[40%]">
                <div className="flex items-center space-x-3">
                    <div>
                        <span className="font-bold flex gap-2">
                            {item.name}{" "}
                        </span>
                    </div>
                </div>
            </td>
            <td className="hidden sm:table-cell w-[30%]">{item.quantity}</td>
            <td>
                <Link
                    onClick={onSelect}
                    to={`/admin/items/${item.location.short_id}/edit-item/${item.id}`}
                    className="btn btn-ghost btn-sm">
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

export default function AdminCreateUserRoute() {
    const { items, location, tags } = useLoaderData<typeof loader>();

    const smallList = ["Name"];
    const largeList = ["Name", "Quantity"];

    const [selected, setSelected] = useState<string | null>(null);
    return (
        <>
            <h2 className="theme-text-h3 md:top-14 md:sticky z-30 bg-base-100/50 backdrop-blur-sm border-b border-base-300 mb-4">
                {location.name}
            </h2>
            {items.length === 0 && (
                <div className="px-4 py-2 bg-warning rounded-lg text-warning-content">
                    <h3 className="theme-text-h4">No items</h3>
                </div>
            )}
            {tags.map((tag) => {
                const filteredItems = items.filter(
                    (item) => item.tag.id === tag.id
                );

                return filteredItems.length > 0 ? (
                    <div key={tag.id}>
                        <h3 className="theme-text-h4 theme-text-gradient">
                            {tag.name}
                        </h3>
                        {tag.description && (
                            <p className="opacity-70 text-sm">
                                {tag.description}
                            </p>
                        )}
                        <table className="table w-full z-20 table-compact rounded-none my-2">
                            {/* head */}
                            <thead className="hidden sm:table-header-group">
                                <tr>
                                    {largeList.map((th) => (
                                        <th
                                            className="bg-base-100 opacity-50"
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
                                            className="bg-base-100 opacity-50"
                                            key={th}>
                                            {th}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="rounded-none">
                                {filteredItems
                                    .filter((item) => item.tag.id === tag.id)
                                    .map((item) => (
                                        <TableRow
                                            onSelect={() =>
                                                setSelected(item.id)
                                            }
                                            key={item.id}
                                            item={item}
                                            isSelected={selected === item.id}
                                        />
                                    ))}
                                {/* row 2 */}
                            </tbody>
                        </table>{" "}
                    </div>
                ) : null;
            })}
        </>
    );
}
