import type { V2_MetaFunction } from "@remix-run/node";

export const meta: V2_MetaFunction = () => {
    return [{ title: "JHS Toolkit | Announcements" }];
};

export default function Index() {
    return (
        <div className="flex flex-col items-start">
            <h1 className="theme-text-h2 theme-text-gradient my-4">
                Announcement
            </h1>
            <div className="bg-base-200 rounded-box px-4 py-2">
                <h2 className="theme-text-h3">Welcome to the team!</h2>
                <p className="line-clamp-2">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    Corrupti at eum quidem quod necessitatibus dolorem excepturi
                    odio ea eaque, voluptatum non molestiae dolores minima et
                    adipisci dolor suscipit. Amet provident eligendi adipisci
                    sint sapiente impedit quam? Nobis consequatur illum
                    blanditiis.
                </p>
            </div>
        </div>
    );
}
