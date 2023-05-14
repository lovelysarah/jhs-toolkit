import { Link, Outlet } from "@remix-run/react";

type NavbarLink = {
    title: string;
    href: string;
};
const navbarLinks: NavbarLink[] = [
    { title: "Shed Inventory", href: "/shed/summary" },
    {
        title: "Guidelines",
        href: "/guidelines",
    },
];

export default function AppLayoutRoute() {
    return (
        <main className="bg-base-100 w-full overflow-hidden">
            <header className="col-center theme-padding-x">
                <div className="theme-box-width">
                    <div className="flex justify-between items-center py-4">
                        <Link
                            to="/"
                            className="text-3xl font-bold">
                            JHS <span className="font-normal">Toolkit</span>
                        </Link>
                        <ul className="flex gap-10">
                            {navbarLinks.map((link) => (
                                <li
                                    className="hover:underline"
                                    key={link.href}>
                                    <Link to={link.href}>{link.title}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </header>
            <div className="col-center">
                <div className="theme-box-width theme-padding xl:px-0">
                    <Outlet />
                </div>
            </div>
            <div className="col-center theme-padding-x">
                <div className="theme-box-width row-center-start gap-5 theme-padding-y font-bold"></div>
            </div>
        </main>
    );
}
