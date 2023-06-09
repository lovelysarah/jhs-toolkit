import type { ACCOUNT_TYPE, Prisma } from "@prisma/client";
import { db } from "~/utils/db.server";
import { generateHash } from "~/utils/hash";

//TODO: Get rid of duplicate code
export const getInfoFromUserById = async (
    id: string,
    select: Pick<Prisma.UserFindFirstOrThrowArgs, "select">
) => {
    return await db.user.findFirstOrThrow({
        where: { id },
        ...select,
    });
};

export type InfoFromUser = Awaited<ReturnType<typeof getInfoFromUserById>>;

export const getUserInfoById = async (id: string) => {
    return await db.user.findFirstOrThrow({
        where: { AND: [{ id }, { deleted_at: { isSet: false } }] },
        select: {
            username: true,
            id: true,
            account_type: true,
            name: true,
        },
    });
};

export type UserInfo = Awaited<ReturnType<typeof getUserInfoById>>;

export const getAllUsers = async () => {
    return await db.user.findMany({
        where: { deleted_at: { isSet: false } },
        orderBy: { account_type: "asc" },
        select: { id: true, username: true, account_type: true, name: true },
    });
};

export type AllUsers = Awaited<ReturnType<typeof getAllUsers>>;

export type CreateUserInput = {
    name: string;
    username: string;
    password: string;
    accountType: string;
};
export const createUser = async (data: CreateUserInput) => {
    const hashedPassword = await generateHash(data.password);

    return await db.user.create({
        data: {
            username: data.username,
            password: hashedPassword,
            name: data.name,
            account_type: data.accountType as ACCOUNT_TYPE,
        },
        select: {
            id: true,
            username: true,
            account_type: true,
            name: true,
        },
    });
};

export type CreateUserResult = Awaited<ReturnType<typeof createUser>>;

export const modifyUser = async (id: string, data: CreateUserInput) => {
    let hashedPassword = null;
    if (data.password) hashedPassword = await generateHash(data.password);

    return await db.user.update({
        where: { id },
        data: {
            name: data.name,
            username: data.username,
            account_type: data.accountType as ACCOUNT_TYPE,
            ...(hashedPassword ? { password: hashedPassword } : {}),
        },
    });
};

export type ModifyUserResult = Awaited<ReturnType<typeof modifyUser>>;

// Returns a list of users that have at least 1 shed transactions
export const getUsersWithATransaction = async () => {
    return await db.user.findMany({
        where: {
            transactions: {
                some: {},
            },
        },
        select: { name: true, id: true },
    });
};

export type UsersWithATransaction = Awaited<
    ReturnType<typeof getUsersWithATransaction>
>;
