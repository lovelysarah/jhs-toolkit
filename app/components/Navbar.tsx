import { NavLink, useNavigation } from "@remix-run/react";
import clsx from "clsx";
import {
    Package,
    LogIn,
    LogOut,
    Loader2,
    Settings,
    PackagePlus,
    Activity,
} from "lucide-react";

import { CONTENT } from "~/config";

type NavbarLink = {
    title: string;
    href: string;
    private?: true;
    admin?: true;
    icon: JSX.Element;
};

const navbarLinks: NavbarLink[] = [
    { title: "Activity", href: "/activity", private: true, icon: <Activity /> },
    {
        title: "Inventory",
        href: "/inventory",
        private: true,
        icon: <Package />,
    },
    {
        title: "Return Items",
        href: "/check-in",
        private: true,
        icon: <PackagePlus />,
    },
    { title: "Sign in", href: "/auth", icon: <LogIn /> },
    {
        title: "Admin",
        href: "/admin",
        private: true,
        admin: true,
        icon: <Settings />,
    },
];

type NavbarProps = {
    isSignedIn: boolean;
    accountType: string | undefined;
};

const CustomLink = ({ link }: { link: NavbarLink }) => {
    const nav = useNavigation();
    return (
        <li key={link.href}>
            <NavLink
                to={link.href}
                className={({ isActive, isPending }) => {
                    return clsx("flex gap-2 p-8 md:p-0", {
                        "text-base-content": isPending || !isActive,
                        "text-base-content/60": !isPending && !isActive,
                    });
                }}>
                {nav.location?.pathname === link.href &&
                nav.state !== "idle" ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    link.icon
                )}
                <span className="hidden sm:inline">{link.title}</span>
            </NavLink>
        </li>
    );
};

export default function Navbar({ isSignedIn, accountType }: NavbarProps) {
    return (
        <>
            <nav
                className={`fixed 
                bottom-4 bg-base-100/90 left-4 right-4 
                z-40 rounded-2xl border border-base-300
                md:navbar
                md:static md:my-4 md:rounded-lg md:px-4
                md:border-0
                `}>
                <div className="flex-1 hidden md:block">
                    <NavLink
                        to="/"
                        className="text-3xl font-bold">
                        {CONTENT.HEADER.PREFIX}{" "}
                        <span className="font-normal theme-text-gradient">
                            {CONTENT.HEADER.NAME}
                        </span>
                    </NavLink>
                </div>
                <ul className="flex px-1 justify-around items-center md:gap-8">
                    {navbarLinks.map((link) => {
                        const cantViewAdminLinks =
                            link.admin && accountType !== "ADMIN";

                        const hiddenLink =
                            cantViewAdminLinks ||
                            (!isSignedIn && link.private) ||
                            (isSignedIn && link.href === "/auth");

                        if (hiddenLink) return null;

                        return (
                            <CustomLink
                                key={link.href}
                                link={link}
                            />
                        );
                    })}
                    {isSignedIn && (
                        <li>
                            <form
                                action="/logout"
                                method="post">
                                <button
                                    type="submit"
                                    className="flex gap-2 p-8 md:p-0 text-error">
                                    <LogOut />
                                    <span className="hidden sm:inline">
                                        Sign out
                                    </span>
                                </button>
                            </form>
                        </li>
                    )}
                </ul>
            </nav>
        </>
    );
}
