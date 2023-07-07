import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
    Link,
    NavLink,
    Outlet,
    useLoaderData,
    useParams,
} from "@remix-run/react";
import { getAllUsers } from "~/data/user";
import { Edit, Menu, PackagePlus, Tag } from "lucide-react";
import { db } from "~/utils/db.server";
import invariant from "tiny-invariant";

export const loader = async ({ params }: LoaderArgs) => {
    const inventoryId = params.inventoryId;

    invariant(inventoryId, "Invalid location id");

    const users = await getAllUsers();

    const tags = await db.tag.findMany({
        where: {
            AND: [
                { inventory: { short_id: inventoryId } },
                { deleted_at: { isSet: false } },
            ],
        },
        orderBy: { name: "asc" },
        select: {
            name: true,
            id: true,
            items: { where: { deleted_at: { isSet: false } } },
        },
    });
    console.log(tags[0]);
    const data = {
        tags,
        users: users,
    };

    return json(data);
};

export default function AdminManageShedRoute() {
    const { tags } = useLoaderData<typeof loader>();

    const params = useParams();
    return (
        <section className="flex flex-col-reverse md:flex-row-reverse gap-4 items-start py-4">
            <div className="overflow-x-auto w-full basis-full md:basis-2/5 sticky top-16">
                <h2 className="theme-text-h4 flex gap-2 items-center mb-4">
                    <Menu />
                    Actions
                </h2>
                <nav className="py-4 flex gap-2">
                    {tags.length > 0 && (
                        <NavLink
                            to={`/admin/items/${params.inventoryId}/new-item`}
                            className={({ isActive }) => {
                                const base = "flex-1 flex gap-2 btn";
                                return isActive
                                    ? base + " btn-primary btn-outline"
                                    : base + " btn-ghost";
                            }}>
                            <PackagePlus />
                            Create item
                        </NavLink>
                    )}
                    <NavLink
                        to={`/admin/items/${params.inventoryId}/new-tag`}
                        className={({ isActive }) => {
                            const base = "flex-1 flex gap-2 btn";
                            return isActive
                                ? base + " btn-primary btn-outline"
                                : base + " btn-ghost";
                        }}>
                        <Tag />
                        Create tag
                    </NavLink>
                </nav>
                <div className="py-4 px-2">
                    <h3 className="theme-text-h4 flex gap-2 items-center mb-4">
                        <Tag />
                        Tags
                    </h3>
                    <ul className="flex flex-col gap-2 max-">
                        {tags.map((tag) => (
                            <li
                                key={tag.id}
                                className="">
                                <Link
                                    className="btn btn-ghost flex gap-2 justify-between items-center"
                                    to={`/admin/items/${params.inventoryId}/edit-tag/${tag.id}`}>
                                    <span>
                                        {tag.name}{" "}
                                        <span className="opacity-50">
                                            {tag.items.length} items
                                        </span>
                                    </span>
                                    <Edit />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="py-4 basis-full md:basis-3/5 bg-base-100 z-20 md:z-0 w-full border-b-2 border-base-300 md:border-b-0">
                <Outlet />
            </div>
        </section>
    );
}
