import { LoaderFunction, json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useLocation } from "@remix-run/react";
import { AllUsers, getAllUsers } from "~/api/user";
import { Unpacked } from "~/types/utils";
import { Edit } from "lucide-react";

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
            <td className="hidden sm:table-cell">{user.account_type}</td>
            <th>
                <Link
                    to={`/admin/users/${user.id}`}
                    className="btn btn-ghost">
                    <Edit />
                </Link>
            </th>
        </tr>
    );
};

export default function AdminIndexRoute() {
    const { users } = useLoaderData<LoaderData>();
    const location = useLocation();

    const smallList = ["Name"];
    const largeList = ["Name", "Account Type"];

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
            <div className="top-0 py-4 sticky basis-full md:basis-2/5 bg-base-100 z-20 md:z-0 w-full border-b-2 border-base-300 md:border-b-0">
                <Outlet />
            </div>
        </section>
    );
}
