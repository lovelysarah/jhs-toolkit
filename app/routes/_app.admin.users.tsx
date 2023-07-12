import { Link, Outlet, useLoaderData, useNavigation } from "@remix-run/react";
import { json } from "@remix-run/node";
import { getAllUsers } from "~/data/user";
import { BadgeCheck, Edit, Loader, User, Users } from "lucide-react";
import { useState } from "react";

import type { AllUsers } from "~/data/user";
import type { LoaderFunction } from "@remix-run/node";
import type { Unpacked } from "~/types/utils";

type LoaderData = {
    users: AllUsers;
};
export const loader: LoaderFunction = async () => {
    const users = await getAllUsers();

    const data: LoaderData = {
        users: users,
    };

    return json(data);
};

type TableRowProps = {
    user: Unpacked<AllUsers>;
    onSelect: () => void;
    isSelected: boolean;
};

const TableRow = ({ user, onSelect, isSelected }: TableRowProps) => {
    const { state } = useNavigation();

    const showLoadingIcon = state !== "idle" && isSelected;
    return (
        <tr>
            <td>
                <div className="flex items-center space-x-3">
                    <div>
                        <span className="font-bold flex gap-2">
                            {user.account_type === "ADMIN" && <BadgeCheck />}
                            {user.account_type === "USER" && <User />}
                            {user.account_type === "GUEST" && <Users />}
                            {user.name}
                        </span>
                        <span className="text-sm opacity-50">
                            Last login: {new Date().toDateString()}
                        </span>
                    </div>
                </div>
            </td>
            <td className="hidden sm:table-cell">{user.account_type}</td>
            <th>
                <Link
                    onClick={onSelect}
                    preventScrollReset={true}
                    to={`/admin/users/${user.id}`}
                    className="btn btn-ghost">
                    {showLoadingIcon ? (
                        <Loader className="animate-spin" />
                    ) : (
                        <Edit />
                    )}
                </Link>
            </th>
        </tr>
    );
};

export default function AdminIndexRoute() {
    const { users } = useLoaderData<LoaderData>();

    const smallList = ["Name"];
    const largeList = ["Name", "Account Type"];

    const [selected, setSelected] = useState<string | null>(null);
    console.log({ selected });

    return (
        <section className="flex flex-col-reverse md:flex-row gap-4 items-start">
            <div className="overflow-x-auto w-full basis-full md:basis-3/5">
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
                        {users.map((user) => (
                            <TableRow
                                onSelect={() => setSelected(user.id)}
                                key={user.username}
                                user={user}
                                isSelected={selected === user.id}
                            />
                        ))}
                        {/* row 2 */}
                    </tbody>
                </table>
            </div>
            <div className="top-0 py-4 sticky basis-full md:basis-2/5 bg-base-100 z-20 md:z-0 w-full border-b-2 border-base-300 md:border-b-0">
                <Outlet />
            </div>
        </section>
    );
}
