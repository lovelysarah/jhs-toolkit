import { NavLink, useNavigation } from "@remix-run/react";
import {
    LayoutDashboard,
    Package,
    LogIn,
    LogOut,
    Loader,
    Loader2,
} from "lucide-react";

type NavbarLink = {
    title: string;
    href: string;
    private?: true;
    admin?: true;
    icon: JSX.Element;
};

const navbarLinks: NavbarLink[] = [
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

const CustomLink = ({ link }: { link: NavbarLink }) => {
    const nav = useNavigation();
    return (
        <li key={link.href}>
            <NavLink
                to={link.href}
                className={({ isActive, isPending }) =>
                    isPending
                        ? "text-base-content flex gap-2 p-8 md:p-0"
                        : isActive
                        ? "text-base-content flex gap-2 p-8 md:p-0"
                        : "text-base-content/60 flex gap-2 p-8 md:p-0"
                }>
                {nav.location?.pathname === link.href &&
                nav.state !== "idle" ? (
                    <Loader className="animate-spin" />
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
                        JHS{" "}
                        <span className="font-normal theme-text-gradient">
                            Toolkit
                        </span>
                    </NavLink>
                </div>
                <ul className="flex px-1 justify-around items-center md:gap-8">
                    {navbarLinks.map((link) => {
                        if (
                            (accountType !== "ADMIN" && link.admin) ||
                            (!isSignedIn && link.private) ||
                            (isSignedIn && link.href === "/auth")
                        )
                            return null;

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
            {/* <header className="navbar my-4 rounded-lg px-4"> */}
            {/* DESKTOP */}
            {/* <div className="flex-none hidden md:block">
                    <ul className="flex gap-8 px-1 items-center">
                        {navbarLinks.map((link) => {
                            if (
                                (accountType !== "ADMIN" && link.admin) ||
                                (!isSignedIn && link.private) ||
                                (isSignedIn && link.href === "/auth")
                            )
                                return null;

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
                                        className="flex gap-2 text-error">
                                        <LogOut />
                                        Sign out
                                    </button>
                                </form>
                            </li>
                        )}
                    </ul>
                </div>
            </header> */}
        </>
    );
}
