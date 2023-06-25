import type { LoaderFunction, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
    Link,
    Outlet,
    isRouteErrorResponse,
    useLoaderData,
    useLocation,
    useRouteError,
} from "@remix-run/react";
import clsx from "clsx";
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
const BreadCrumbs = ({ paths }: { paths: string[] }) => (
    <div className="breadcrumbs">
        <ul>
            <li>
                <Link
                    prefetch="intent"
                    to="/admin"
                    className={clsx({
                        "theme-text-gradient font-bold": paths.length === 0,
                    })}>
                    Dashboard
                </Link>
            </li>
            {paths.map((path, index, arr) => {
                const last = index === arr.length - 1;

                return (
                    <li key={path}>
                        {last ? (
                            <span className="theme-text-gradient font-bold">
                                {path}
                            </span>
                        ) : (
                            <Link to={path.toLowerCase()}>{path}</Link>
                        )}
                    </li>
                );
            })}
        </ul>
    </div>
);

export default function AdminRoute() {
    const { user } = useLoaderData<LoaderData>();
    const { pathname } = useLocation();

    const paths = pathname
        .split("/")
        .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
        .slice(2);

    return (
        <>
            <div
                id="content-heading"
                className="flex flex-col justify-between">
                <h1 className="theme-text-h2">Welcome, {user.name}</h1>
            </div>
            <BreadCrumbs paths={paths} />
            <div className="divider mt-0"></div>
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
