import {
    ActionFunction,
    LoaderFunction,
    json,
    redirect,
} from "@remix-run/node";
import { useActionData, useSearchParams } from "@remix-run/react";
import { VALID_URLS } from "~/constant";
import { FieldErrors, FormActionData } from "~/types/form";
import { createUserSession, getUserId, login } from "~/utils/session.server";

type SignInFields = {
    username: string;
    password: string;
};

type SignInFieldErrors = FieldErrors<SignInFields>;
type SignInActionData = FormActionData<SignInFieldErrors, SignInFields>;

const badRequest = (data: SignInActionData) => json(data, { status: 400 });

function validateUrl(url: unknown) {
    if (typeof url !== "string" || !VALID_URLS.includes(url)) return "/";

    return url;
}

export const loader: LoaderFunction = async ({ request }) => {
    const user = await getUserId(request);

    if (user) return redirect("/");

    return null;
};

export const action: ActionFunction = async ({ request }) => {
    // Parse the body of the request as a form data object.
    const form = await request.formData();
    const username = form.get("username");
    const password = form.get("password");
    const redirectTo = validateUrl(form.get("redirectTo") || "/");

    // If the username or password is missing, return a 400 with an error message
    if (typeof username !== "string" || typeof password !== "string") {
        return badRequest({
            fieldErrors: null,
            fields: null,
            formError: "Username and password are required",
        });
    }

    const fields = { username, password };

    const authResponse = await login({ username, password });

    if (!authResponse.success) {
        return badRequest({
            fieldErrors: null,
            fields,
            formError: `Username/Password combination is incorrect`,
        });
    }

    return createUserSession(authResponse.user, redirectTo);
};

export default function AuthRoute() {
    const actionData = useActionData<SignInActionData>();
    const [searchParams] = useSearchParams();

    console.log(actionData);
    return (
        <div className="flex flex-col items-start">
            <h1 className="theme-text-h2 theme-text-gradient my-4">
                Authentication
            </h1>
            <form
                method="POST"
                className="flex flex-col justify-center gap-2 w-full">
                <input
                    type="hidden"
                    name="redirectTo"
                    value={searchParams.get("redirectTo") ?? undefined}
                />
                <input
                    name="username"
                    defaultValue={actionData?.fields?.username ?? ""}
                    className="input input-bordered"
                    placeholder="Username"></input>
                <input
                    name="password"
                    className="input input-bordered"
                    placeholder="Password"></input>
                <button
                    type="submit"
                    className="btn btn-primary">
                    Sign In
                </button>
            </form>
        </div>
    );
}
