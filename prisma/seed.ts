import { Item, User } from "@prisma/client";
import { db } from "~/utils/db.server";
import { nanoid } from "nanoid";

async function setup() {
    await db.item.deleteMany({});
    await db.user.deleteMany({});
}

async function seed() {
    getUsers.forEach(async (user) => {
        await db.user.create({
            data: {
                ...user,
                shed_cart: [],
                shed_checked_out: [],
            },
        });
    });
    createItems.forEach(async (item) => {
        await db.item.create({
            data: {
                ...item,
                quantity: Math.floor(Math.random() * 10) + 2,
                note: "This is a test",
                last_checked_out_by: "YESS Group",
            },
        });
    });
}

const getUsers: Pick<
    User,
    "username" | "password" | "name" | "account_type"
>[] = [
    {
        username: "admin",
        password:
            "$2a$10$FZ8WtmO.1/EsKEibQofj.eP2sZqLx.kbUWdIndkNsXriMlP58cfH.",
        name: "Sarah Robichaud",
        account_type: "ADMIN",
    },
    {
        username: "pablo971",
        password:
            "$2a$10$FZ8WtmO.1/EsKEibQofj.eP2sZqLx.kbUWdIndkNsXriMlP58cfH.",
        name: "Foo bar",
        account_type: "USER",
    },
    {
        username: "guest123",
        password:
            "$2a$10$FZ8WtmO.1/EsKEibQofj.eP2sZqLx.kbUWdIndkNsXriMlP58cfH.",
        name: "Guest",
        account_type: "GUEST",
    },
];

const createItems: Pick<Item, "name" | "shortId" | "category">[] = [
    { name: "Broom", shortId: nanoid(10), category: "GENERAL" },
    { name: "Dolly", shortId: nanoid(10), category: "GENERAL" },

    { name: "Lawn mower", shortId: nanoid(10), category: "HEAVY_EQUIPMENT" },
    {
        name: "Lawn mower pouch",
        shortId: nanoid(10),
        category: "HEAVY_EQUIPMENT",
    },
    { name: "Snow blower", shortId: nanoid(10), category: "HEAVY_EQUIPMENT" },

    { name: "Winter shovel", shortId: nanoid(10), category: "WINTER" },
    { name: "Ice breaker", shortId: nanoid(10), category: "WINTER" },
    { name: "Scrapper", shortId: nanoid(10), category: "WINTER" },
    { name: "Car brush", shortId: nanoid(10), category: "WINTER" },

    { name: "Portable BBQ", shortId: nanoid(10), category: "SUMMER" },
    { name: "Propane can", shortId: nanoid(10), category: "SUMMER" },
    { name: "Mini cooler", shortId: nanoid(10), category: "SUMMER" },
    { name: "Small cooler", shortId: nanoid(10), category: "SUMMER" },
    { name: "Medium cooler", shortId: nanoid(10), category: "SUMMER" },
    { name: "Big cooler", shortId: nanoid(10), category: "SUMMER" },
    { name: "Sun Shelter", shortId: nanoid(10), category: "SUMMER" },
    { name: "Camping chair", shortId: nanoid(10), category: "SUMMER" },
    { name: "Folding Chair", shortId: nanoid(10), category: "SUMMER" },
    { name: "Wood Splitter", shortId: nanoid(10), category: "SUMMER" },

    { name: "Shovel", shortId: nanoid(10), category: "GARDENING" },
    { name: "Hand cultivator", shortId: nanoid(10), category: "GARDENING" },
    { name: "Turf edger", shortId: nanoid(10), category: "GARDENING" },
    { name: "Hand rake", shortId: nanoid(10), category: "GARDENING" },
    { name: "Prong cultivator", shortId: nanoid(10), category: "GARDENING" },
    { name: "Weed Remover", shortId: nanoid(10), category: "GARDENING" },
    { name: "Earth blender", shortId: nanoid(10), category: "GARDENING" },
    { name: "Hoe", shortId: nanoid(10), category: "GARDENING" },
    { name: "Watering can", shortId: nanoid(10), category: "GARDENING" },
    { name: "Fork", shortId: nanoid(10), category: "GARDENING" },
    { name: "Rake", shortId: nanoid(10), category: "GARDENING" },
];
(async () => {
    await setup();
    await seed();
})();
