import { LoaderFunction, json } from "@remix-run/node";
import { Link, Outlet } from "@remix-run/react";
import { requireUser } from "~/utils/session.server";

export const loader: LoaderFunction = async ({ request }) => {
    return json(null);
};

export default function Guidelines() {
    return (
        <>
            <h1>Guidelines</h1>
            <Outlet />
        </>
    );
}
