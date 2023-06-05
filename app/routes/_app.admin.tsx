import { LoaderFunction, V2_MetaFunction, json } from "@remix-run/node";
import {
    Link,
    Outlet,
    isRouteErrorResponse,
    useLoaderData,
    useLocation,
    useRouteError,
} from "@remix-run/react";
import { requireAdmin } from "~/utils/session.server";

export const meta: V2_MetaFunction = () => {
    return [{ title: "JHS Toolkit | Admin" }];
};

type LoaderData = {
    user: Awaited<ReturnType<typeof requireAdmin>>;
};
export const loader: LoaderFunction = async ({ request }) => {
    const user = await requireAdmin(request);

    const data: LoaderData = {
        user,
    };
    return json(data);
};

export default function AdminRoute() {
    const { user } = useLoaderData<LoaderData>();
    return (
        <>
            <div
                id="content-heading"
                className="flex flex-col justify-between">
                <h1 className="theme-text-h2">Admin Dashboard</h1>
                <p className="theme-text-h4">Welcome, {user.name}</p>
            </div>
            <div className="divider"></div>
            <Outlet />
        </>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    // when true, this is what used to go to `CatchBoundary`
    if (isRouteErrorResponse(error)) {
        console.log(error);
        return (
            <div>
                <h1 className="theme-text-h1 theme-text-gradient">Oops</h1>
                <p className="theme-text-h3">
                    {error.status}{" "}
                    <span className="theme-text-gradient">{error.data}</span>
                </p>
            </div>
        );
    }

    // Don't forget to typecheck with your own logic.
    // Any value can be thrown, not just errors!
    let errorMessage = "Unknown error";
    // if (isDefinitelyAnError(error)) {
    // errorMessage = error.message;
    // }

    return (
        <div>
            <h1>Uh oh ...</h1>
            <p>Something went wrong.</p>
            <pre>{errorMessage}</pre>
        </div>
    );
}
