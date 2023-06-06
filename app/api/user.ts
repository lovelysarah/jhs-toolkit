import { ACCOUNT_TYPE } from "@prisma/client";
import { db } from "~/utils/db.server";
import bcrypt from "bcryptjs";
import { generateHash } from "~/utils/hash";
import { type } from "os";

export const getUserInfoById = async (id: string) => {
    return await db.user.findUnique({
        where: { id },
        select: {
            username: true,
            id: true,
            account_type: true,
            shed_cart: true,
            name: true,
        },
    });
};

export type UserInfo = Awaited<ReturnType<typeof getUserInfoById>>;

export const getAllUsers = async () => {
    return await db.user.findMany({
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
