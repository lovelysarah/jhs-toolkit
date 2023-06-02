import bcrypt from "bcryptjs";
import { db } from "./db.server";
import { KEYS } from "~/constant/cookie.server";
import { saveUserCart } from "~/api/cart";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { User } from "@prisma/client";
import { resolveNaptr } from "dns";

// Verify that session secret is set
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) throw new Error("SESSION_SECRET is not set");

// Pick the fields we want to expose from the user
type BasicUserInformation = Pick<User, "id" | "username" | "shed_cart">;

type LoginForm = {
    username: string;
    password: string;
};

type AuthSuccess = {
    success: true;
    user: BasicUserInformation;
    message?: string;
};

type AuthFailure = {
    success: false;
    error: Error;
};

type AuthResponse = AuthSuccess | AuthFailure;

type LoginFunction = ({}: LoginForm) => Promise<AuthResponse>;

const badResponse = (error: Error): AuthFailure => ({ success: false, error });

// Authenticate a user
export const login: LoginFunction = async ({ username, password }) => {
    // Look for the user by username
    const user = await db.user.findUnique({
        where: { username },
    });

    const invalidCredentials: AuthFailure = {
        success: false,
        error: new Error("Invalid username or password"),
    };

    // If the user doesn't exist, return AuthFailure
    if (!user) return invalidCredentials;

    // Verify that the password is correct
    const passwordCorrect = await bcrypt.compare(password, user.password);

    // If the password is incorrect, return AuthFailure
    if (!passwordCorrect) return invalidCredentials;

    // Return the user
    return {
        success: true,
        user: {
            id: user.id,
            username: user.username,
            shed_cart: user.shed_cart,
        },
    };
};

export const { commitSession, getSession, destroySession } =
    createCookieSessionStorage({
        cookie: {
            name: "__session",
            secure: process.env.NODE_ENV === "production",
            secrets: ["test"],
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            httpOnly: true,
        },
    });

export const requireAdmin = async (
    request: Request,
    redirectTo: string = new URL(request.url).pathname
) => {
    const userId = await requireUser(request, redirectTo);

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { account_type: true, username: true, name: true },
    });

    if (!user || user.account_type !== "ADMIN")
        throw new Response("Unauthorized", { status: 401 });

    return user;
};

type CreateUserSessionFunction = (
    user: BasicUserInformation,
    redirectTo: string
) => Promise<Response>;

export const createUserSession: CreateUserSessionFunction = async (
    user,
    redirectTo
) => {
    const session = await getSession();

    session.set(KEYS.USER_ID, user.id);
    session.set(KEYS.SHED_CART, user.shed_cart);

    return redirect(redirectTo, {
        headers: {
            "Set-Cookie": await commitSession(session),
        },
    });
};

const getUserSession = (request: Request) => {
    return getSession(request.headers.get("Cookie"));
};

export const getUserId = async (request: Request) => {
    const session = await getUserSession(request);
    const userId = session.get(KEYS.USER_ID);

    if (!userId || typeof userId !== "string") return null;

    return userId;
};

export const requireUser = async (
    request: Request,
    redirectTo: string = new URL(request.url).pathname
) => {
    const session = await getUserSession(request);
    const userId = session.get(KEYS.USER_ID);
    if (!userId || typeof userId !== "string") {
        const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
        throw redirect(`/auth?${searchParams}`);
    }

    return userId;
};
export async function logout(request: Request) {
    const session = await getUserSession(request);

    const userId = await getUserId(request);
    const cartItems = (await session.get(KEYS.SHED_CART)) as
        | string[]
        | undefined;

    if (userId && cartItems) {
        await saveUserCart(userId, cartItems);
    }

    return redirect("/auth", {
        headers: {
            "Set-Cookie": await destroySession(session),
        },
    });
}
export async function getUser(request: Request) {
    const userId = await getUserId(request);

    if (typeof userId !== "string") return null;

    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, account_type: true },
        });

        return user;
    } catch {
        throw logout(request);
    }
}
