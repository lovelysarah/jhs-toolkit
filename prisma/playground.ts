import { db } from "~/utils/db.server";

const test = async () => {
    await db.user.update({
        where: { id: "647ce74c90a277d4d047421f" },
        data: {
            shed_checked_out: [],
        },
    });
};

(async () => {
    await test();
})();
