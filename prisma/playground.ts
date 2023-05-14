import { db } from "~/utils/db.server";

const test = async () => {
    const items = await db.item.findMany({
        where: {
            shortId: {
                in: ["-eUAo0w_rt", "WVLYOAiVxm", "bMsZYDP36x", "YYDWINpSW6"],
            },
        },
        select: { name: true, shortId: true },
    });

    console.log(items);
};

(async () => {
    await test();
})();
