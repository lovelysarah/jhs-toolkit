import { Link } from "@remix-run/react";

export default function AdminCreateUserRoute() {
    return (
        <>
            <h2 className="theme-text-h3">Management</h2>
            <div className="py-4">
                <Link
                    to={`/admin/locations/new`}
                    className="btn btn-primary">
                    Create location
                </Link>
            </div>
        </>
    );
}
