import { LoaderFunction, json } from "@remix-run/node";
import {
    isRouteErrorResponse,
    useLoaderData,
    useRouteError,
} from "@remix-run/react";
import { requireAdmin } from "~/utils/session.server";

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
            <div id="content-heading">
                <h1 className="theme-text-h2 theme-text-gradient">
                    Admin Dashboard
                </h1>
                <h2 className="theme-text-h3">Welcome, {user.name}</h2>
            </div>
            <ul>
                <li>dev</li>
                <li>dev</li>
                <li>dev</li>
            </ul>
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
                <h1>Oops</h1>
                <p>Status: {error.status}</p>
                <p>{error.data.message}</p>
            </div>
        );
    }

    // Don't forget to typecheck with your own logic.
    // Any value can be thrown, not just errors!
    let errorMessage = "Unknown error";
    if (isDefinitelyAnError(error)) {
        errorMessage = error.message;
    }

    return (
        <div>
            <h1>Uh oh ...</h1>
            <p>Something went wrong.</p>
            <pre>{errorMessage}</pre>
        </div>
    );
}
