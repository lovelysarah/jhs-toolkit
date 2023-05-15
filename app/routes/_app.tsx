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
                    <div className="navbar my-4">
                        <div className="flex-1">
                            <Link
                                to="/"
                                className="text-3xl font-bold theme-text-gradient">
                                JHS{" "}
                                <span className="font-normal text-black">
                                    Toolkit
                                </span>
                            </Link>
                        </div>
                        <div className="flex-none">
                            <ul className="menu menu-horizontal px-1">
                                {navbarLinks.map((link) => {
                                    return (
                                        <li key={link.href}>
                                            <Link to={link.href}>
                                                {link.title}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
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
            {/* <iframe
                src="https://widgets.scribblemaps.com/sm/?d=true&amp;z=true&amp;l=true&amp;id=IjM8mZGQB_"
                width="1200"
                height="800"
                title="John Howard Society"
                allowFullScreen={true}></iframe> */}
        </main>
    );
}
