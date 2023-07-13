import { db } from "~/utils/db.server";

const test = async () => {
    const test = await db.transaction.findMany({
        where: {
            items: { some: { id: { equals: "649adc06f45e2b047051c433" } } },
        },
    });

    console.log({ test });
};

(async () => {
    await test();
})();
