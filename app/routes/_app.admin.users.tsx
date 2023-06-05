import { LoaderFunction, json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useLocation } from "@remix-run/react";
import { AllUsers, getAllUsers } from "~/api/user";
import { Unpacked } from "~/types/utils";

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
};

const TableRow = ({ user }: TableRowProps) => {
    return (
        <tr>
            <td>
                <div className="flex items-center space-x-3">
                    <div>
                        <div className="font-bold">{user.name}</div>
                        <div className="text-sm opacity-50">
                            Last login: {new Date().toDateString()}
                        </div>
                    </div>
                </div>
            </td>
            <td>{user.account_type}</td>
            <th>
                <Link
                    to={`/admin/users/${user.id}`}
                    className="btn btn-ghost btn-xs">
                    MANAGE
                </Link>
            </th>
        </tr>
    );
};

export default function AdminIndexRoute() {
    const { users } = useLoaderData<LoaderData>();
    const location = useLocation();

    return (
        <section className="flex gap-4 items-start">
            <div className="overflow-x-auto basis-3/5">
                <table className="table w-full">
                    {/* head */}
                    <thead>
                        <tr>
                            {["Name", "Account Type"].map((th) => (
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
                                key={user.username}
                                user={user}
                            />
                        ))}
                        {/* row 2 */}
                    </tbody>
                    {/* foot */}
                    <tfoot>
                        <tr>
                            {["Name", "Account Type"].map((th) => (
                                <th
                                    className="bg-base-100"
                                    key={th}>
                                    {th}
                                </th>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="top-4 sticky basis-2/5">
                <Outlet />
            </div>
        </section>
    );
}
