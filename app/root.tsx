import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import {
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "@remix-run/react";

import global from "~/styles/global.css";
import { CartProvider } from "./context/CartContext";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: global }];

export default function App() {
    return (
        <html
            lang="en"
            data-theme="winter">
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width,initial-scale=1"
                />
                <Meta />
                <Links />
            </head>
            <body>
                <CartProvider>
                    <Outlet />
                </CartProvider>
                {/* <ScrollRestoration /> */}
                <Scripts />
                <LiveReload />
            </body>
        </html>
    );
}
