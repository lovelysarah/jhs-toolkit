import { Link } from "@remix-run/react";
import { ClipboardList, MapPin, Package2, UserCog } from "lucide-react";

export default function AdminIndexRoute() {
    return (
        <ul className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <li>
                <Link
                    className="btn btn-ghost flex gap-2"
                    to={"/admin/users"}>
                    <UserCog />
                    Manage users
                </Link>
            </li>
            <li>
                <Link
                    className="btn btn-ghost flex gap-2"
                    to={"/admin/locations"}>
                    <MapPin />
                    Manage locations
                </Link>
            </li>
            <li>
                <Link
                    className="btn btn-ghost flex gap-2"
                    to={"/admin/items"}>
                    <Package2 />
                    Manage items
                </Link>
            </li>
            <li>
                <Link
                    className="btn btn-ghost flex gap-2"
                    to={"/admin/transactions"}>
                    <ClipboardList />
                    Manage transactions
                </Link>
            </li>
        </ul>
    );
}
