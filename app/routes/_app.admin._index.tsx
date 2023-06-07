import { Link } from "@remix-run/react";

export default function AdminIndexRoute() {
    return (
        <ul className="flex justify-between items-center">
            <li>
                <Link
                    className="btn btn-primary"
                    to={"/admin/users"}>
                    Manage users
                </Link>
            </li>
        </ul>
    );
}
