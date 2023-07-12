import { db } from "~/utils/db.server";

const test = async () => {
    await db.transaction.deleteMany({});
};

(async () => {
    await test();
})();
