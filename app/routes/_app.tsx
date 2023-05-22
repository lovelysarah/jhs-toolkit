import { LoaderFunction, json } from "@remix-run/node";
import { NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { getUserId } from "~/utils/session.server";

type NavbarLink = {
    title: string;
    href: string;
    private?: true;
};

const navbarLinks: NavbarLink[] = [
    { title: "Announcement", href: "/" },
    { title: "Requests", href: "/requests", private: true },
    { title: "Shed Inventory", href: "/shed", private: true },
    {
        title: "Guidelines",
        href: "/guidelines",
        private: true,
    },
    { title: "Sign in", href: "/auth" },
];

type LoaderData = {
    isSignedIn: boolean;
};

export const loader: LoaderFunction = async ({ request }) => {
    const user = await getUserId(request);

    const data: LoaderData = {
        isSignedIn: user ? true : false,
    };

    return json(data);
};

export default function AppLayoutRoute() {
    const { isSignedIn } = useLoaderData<LoaderData>();
    return (
        <main className="bg-base-100 w-full">
            <header className="col-center px-4">
                <div className="theme-box-width">
                    <div className="navbar my-4 bg-neutral rounded-lg px-4">
                        <div className="flex-1">
                            <NavLink
                                to="/"
                                className="text-3xl font-bold text-base-100">
                                JHS{" "}
                                <span className="font-normal theme-text-gradient">
                                    Toolkit
                                </span>
                            </NavLink>
                        </div>
                        <div className="flex-none">
                            <ul className="flex gap-8 px-1 items-center">
                                {navbarLinks.map((link) => {
                                    if (
                                        (!isSignedIn && link.private) ||
                                        (isSignedIn && link.href === "/auth")
                                    )
                                        return;

                                    return (
                                        <li key={link.href}>
                                            <NavLink
                                                to={link.href}
                                                className={({
                                                    isActive,
                                                    isPending,
                                                }) =>
                                                    isPending
                                                        ? "text-neutral-content"
                                                        : isActive
                                                        ? "text-neutral-content"
                                                        : "text-neutral-content/60 underline"
                                                }>
                                                {link.title}
                                            </NavLink>
                                        </li>
                                    );
                                })}
                                {isSignedIn && (
                                    <li>
                                        <form
                                            action="/logout"
                                            method="post">
                                            <button
                                                type="submit"
                                                className="link text-error">
                                                Sign out
                                            </button>
                                        </form>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
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
                        rights. Developed by Sarah L. Robichaud
                    </p>
                </div>
            </div>
        </main>
    );
}
