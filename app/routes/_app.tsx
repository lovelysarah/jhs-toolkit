import { ACCOUNT_TYPE } from "@prisma/client";
import { LoaderFunction, json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import Navbar from "~/components/Navbar";
import { getUser, getUserId } from "~/utils/session.server";

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
        <main className="bg-base-100 w-full">
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
            <div className="col-center px-8 xl:px-0">
                <div className="theme-box-width row-center-start gap-5 theme-padding-y font-bold">
                    <p className="">
                        © 2022 John Howard Society South East New Brunswick. All
                        rights.
                    </p>
                </div>
            </div>
        </main>
    );
}
