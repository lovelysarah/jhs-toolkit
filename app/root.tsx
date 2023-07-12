import type { LinksFunction } from "@remix-run/node";
import {
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    isRouteErrorResponse,
    useRouteError,
} from "@remix-run/react";

import global from "~/styles/global.css";
import {
    ErrorResponseMessage,
    UnknownErrorMessage,
} from "./components/ErrorMessage";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: global }];

const Head = () => {
    return (
        <head>
            <meta charSet="utf-8" />
            <meta
                name="viewport"
                content="width=device-width,initial-scale=1"
            />
            <Meta />
            <title>JHS Toolkit</title>
            <Links />
        </head>
    );
};

export default function App() {
    return (
        <html
            lang="en"
            data-theme="jhs">
            <Head />
            <body>
                <Outlet />
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
            </body>
        </html>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    let errorMessage = "The app encountered an unexpected error";

    return (
        <html
            lang="en"
            data-theme="jhs">
            <Head />
            <body>
                <Outlet />
                {isRouteErrorResponse(error) ? (
                    <div className="m-4">
                        <ErrorResponseMessage error={error} />
                    </div>
                ) : (
                    <div className="m-4">
                        <UnknownErrorMessage message={errorMessage} />
                    </div>
                )}
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
            </body>
        </html>
    );
}
