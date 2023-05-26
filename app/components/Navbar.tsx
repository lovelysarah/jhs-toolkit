import { NavLink } from "@remix-run/react";

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

type NavbarProps = {
    isSignedIn: boolean;
};
export default function Navbar({ isSignedIn }: NavbarProps) {
    return (
        <header className="navbar my-4 bg-neutral rounded-lg px-4">
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
                                    className={({ isActive, isPending }) =>
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
        </header>
    );
}
