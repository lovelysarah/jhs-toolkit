import { PrismaClient } from "@prisma/client";

let db: PrismaClient;

declare global {
    var __db: PrismaClient | undefined;
}

const production = process.env.NODE_ENV === "production";

if (production) {
    db = new PrismaClient();
} else {
    if (!global.__db) global.__db = new PrismaClient();
    db = global.__db;
}

export { db };
