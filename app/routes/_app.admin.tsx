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
import {
    ErrorResponseMessage,
    UnknownErrorMessage,
} from "~/components/ErrorMessage";
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
                <h1 className="theme-text-h3">Welcome, {user.name}</h1>
            </div>
            <BreadCrumbs paths={paths} />
            <div className="divider mt-0"></div>
            <Outlet />
        </>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    console.log(error);
    if (isRouteErrorResponse(error)) {
        return <ErrorResponseMessage error={error} />;
    }

    let errorMessage = "The app encountered an unexpected error";

    return (
        <div className="m-4">
            <UnknownErrorMessage message={errorMessage} />
        </div>
    );
}
