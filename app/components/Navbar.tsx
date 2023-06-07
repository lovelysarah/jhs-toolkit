import { NavLink } from "@remix-run/react";
import {
    Megaphone,
    LayoutDashboard,
    Package,
    LogIn,
    LogOut,
} from "lucide-react";

type NavbarLink = {
    title: string;
    href: string;
    private?: true;
    admin?: true;
    icon: JSX.Element;
};

const navbarLinks: NavbarLink[] = [
    { title: "Announcement", href: "/", icon: <Megaphone /> },
    {
        title: "Shed Inventory",
        href: "/shed",
        private: true,
        icon: <Package />,
    },
    { title: "Sign in", href: "/auth", icon: <LogIn /> },
    {
        title: "Admin",
        href: "/admin",
        private: true,
        admin: true,
        icon: <LayoutDashboard />,
    },
];

type NavbarProps = {
    isSignedIn: boolean;
    accountType: string | undefined;
};
export default function Navbar({ isSignedIn, accountType }: NavbarProps) {
    return (
        <>
            <nav className="fixed bottom-4 bg-base-100/90 left-4 right-4 md:hidden z-40 rounded-2xl border border-base-300 ">
                {/* MOBILE */}

                <ul className="flex px-1 justify-around items-center">
                    {navbarLinks.map((link) => {
                        if (
                            (accountType !== "ADMIN" && link.admin) ||
                            (!isSignedIn && link.private) ||
                            (isSignedIn && link.href === "/auth")
                        )
                            return;

                        return (
                            <li key={link.href}>
                                <NavLink
                                    to={link.href}
                                    className={({ isActive, isPending }) =>
                                        isPending
                                            ? "text-base-content flex gap-2 p-8"
                                            : isActive
                                            ? "text-base-content flex gap-2 p-8"
                                            : "text-base-content/60 flex gap-2 p-8"
                                    }>
                                    {link.icon}
                                    <span className="hidden sm:inline">
                                        {link.title}
                                    </span>
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
                                    className="flex gap-2 p-8 text-error">
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
            <header className="navbar my-4 rounded-lg px-4">
                {/* DESKTOP */}
                <div className="flex-1">
                    <NavLink
                        to="/"
                        className="text-3xl font-bold">
                        JHS{" "}
                        <span className="font-normal theme-text-gradient">
                            Toolkit
                        </span>
                    </NavLink>
                </div>
                <div className="flex-none hidden md:block">
                    <ul className="flex gap-8 px-1 items-center">
                        {navbarLinks.map((link) => {
                            if (
                                (accountType !== "ADMIN" && link.admin) ||
                                (!isSignedIn && link.private) ||
                                (isSignedIn && link.href === "/auth")
                            )
                                return;

                            return (
                                <li key={link.href}>
                                    <NavLink
                                        to={link.href}
                                        className={({ isActive, isPending }) =>
                                            isPending
                                                ? "text-base-content flex gap-2"
                                                : isActive
                                                ? "text-base-content flex gap-2"
                                                : "text-base-content/60 flex gap-2"
                                        }>
                                        {link.icon}
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
                                        className="flex gap-2 text-error">
                                        <LogOut />
                                        Sign out
                                    </button>
                                </form>
                            </li>
                        )}
                    </ul>
                </div>
            </header>
        </>
    );
}
