import { Link } from "@remix-run/react";

export default function AdminCreateUserRoute() {
    return (
        <>
            <h2 className="theme-text-h3">User management</h2>
            <div className="py-4">
                <Link
                    to={`/admin/users/new`}
                    className="btn btn-primary">
                    Create user
                </Link>
            </div>
        </>
    );
}
