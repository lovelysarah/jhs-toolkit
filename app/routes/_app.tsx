import { json } from "@remix-run/node";
import {
    Outlet,
    isRouteErrorResponse,
    useLoaderData,
    useRouteError,
} from "@remix-run/react";
import {
    ErrorResponseMessage,
    UnknownErrorMessage,
} from "~/components/ErrorMessage";
import Navbar from "~/components/Navbar";
import { getUser } from "~/utils/session.server";

import type { ACCOUNT_TYPE } from "@prisma/client";
import type { LoaderFunction } from "@remix-run/node";
import { CONTENT } from "~/config";

type LoaderData = {
    isSignedIn: boolean;
    accountType: ACCOUNT_TYPE | undefined;
};

export const loader: LoaderFunction = async ({ request }) => {
    const user = await getUser(request);

    const data: LoaderData = {
        isSignedIn: user ? true : false,
        accountType: user?.account_type,
    };

    return json(data);
};

export default function AppLayoutRoute() {
    const { isSignedIn, accountType } = useLoaderData<LoaderData>();
    return (
        <main
            className="bg-base-100 w-full"
            id="root">
            <header className="col-center px-4">
                <div className="theme-box-width">
                    <Navbar
                        isSignedIn={isSignedIn}
                        accountType={accountType}
                    />
                </div>
            </header>
            <div className="flex justify-center items-start">
                <div className="theme-box-width px-8 xl:px-0">
                    <Outlet />
                </div>
            </div>
            <footer className="footer footer-center p-10 bg-base-100 pb-48">
                <div>
                    <img
                        src="/logo.jpg"
                        alt={CONTENT.FOOTER.LOGO_ALT_TEXT}
                    />
                    <p>Copyright © 2023 - All right reserved</p>
                </div>
                <div>
                    <div className="grid grid-flow-col gap-4">
                        {/*Links here*/}
                    </div>
                </div>
            </footer>
        </main>
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
