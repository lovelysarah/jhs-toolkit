import { NavLink, Outlet } from "@remix-run/react";

type NavbarLink = {
    title: string;
    href: string;
};
const navbarLinks: NavbarLink[] = [
    { title: "Requests", href: "/requests" },
    { title: "Shed Inventory", href: "/shed" },
    {
        title: "Guidelines",
        href: "/guidelines",
    },
];

export default function AppLayoutRoute() {
    return (
        <main className="bg-base-100 w-full">
            <header className="col-center px-4">
                <div className="theme-box-width">
                    <div className="navbar my-4 bg-black/10 rounded-lg">
                        <div className="flex-1">
                            <NavLink
                                to="/"
                                className="text-3xl font-bold theme-text-gradient">
                                JHS <span className="font-normal">Toolkit</span>
                            </NavLink>
                        </div>
                        <div className="flex-none">
                            <ul className="flex gap-8 px-1">
                                {navbarLinks.map((link) => {
                                    return (
                                        <li key={link.href}>
                                            <NavLink
                                                to={link.href}
                                                className={({
                                                    isActive,
                                                    isPending,
                                                }) =>
                                                    isPending
                                                        ? "text-black/40"
                                                        : isActive
                                                        ? "text-black"
                                                        : "text-black/60 underline"
                                                }>
                                                {link.title}
                                            </NavLink>
                                        </li>
                                    );
                                })}
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
            <div className="col-center theme-padding-x">
                <div className="theme-box-width row-center-start gap-5 theme-padding-y font-bold">
                    <p>Copyright © John Howard Society SENB 2023</p>
                </div>
            </div>
            {/* <iframe
                src="https://widgets.scribblemaps.com/sm/?d=true&amp;z=true&amp;l=true&amp;id=IjM8mZGQB_"
                width="1200"
                height="800"
                title="John Howard Society"
                allowFullScreen={true}></iframe> */}
        </main>
    );
}
