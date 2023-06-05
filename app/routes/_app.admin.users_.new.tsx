import { ActionFunction, json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigate } from "@remix-run/react";
import { FieldErrors, FormActionData } from "~/types/form";
import { badRequest } from "~/utils/request.server";
import { ACCOUNT_TYPE } from "@prisma/client";
import { FormAlert } from "~/components/FormAlert";
import { createUser } from "~/api/user";
import { db } from "~/utils/db.server";

type CreateUserFields = {
    name: string;
    username: string;
    password: string;
    confirmPassword: string;
    accountType: string;
};

type CreateUserFieldErrors = FieldErrors<CreateUserFields>;
type SignInActionData = FormActionData<CreateUserFieldErrors, CreateUserFields>;

function validateName(name: string) {
    if (name.length < 1) return "Name is required";
    if (name.length < 2) return "Name must be at least 2 characters long";
}

function validateUsername(username: string) {
    if (username.length < 1) return "Username is required";
    if (username.length < 5)
        return "Username must be at least 5 characters long";
}

function validatePassword(password: string, confirmPassword: string) {
    if (password.length < 1) return "Password is required";
    if (password !== confirmPassword) return "Passwords do not match";

    if (password.length < 6)
        return "Password must be at least 6 characters long";
}

function ValidateAccountType(accountType: string) {
    // Verify if account type is a value in the ACCOUNT_TYPE enum
    if (!Object.values(ACCOUNT_TYPE).includes(accountType as ACCOUNT_TYPE)) {
        return "Please select an account type";
    }
}

export const action: ActionFunction = async ({ request }) => {
    const form = await request.formData();
    const name = form.get("name");
    const username = form.get("username");
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");
    const accountType = form.get("accountType") ?? "";

    // If any of the fields are missing, return a 400 with an error message
    if (
        typeof name !== "string" ||
        typeof username !== "string" ||
        typeof password !== "string" ||
        typeof confirmPassword !== "string" ||
        typeof accountType !== "string"
    ) {
        return badRequest<SignInActionData>({
            fieldErrors: null,
            fields: null,
            formError: "Fields are required",
        });
    }

    // Validate the fields
    const fields = { name, username, password, confirmPassword, accountType };

    const fieldErrors: CreateUserFieldErrors = {
        name: validateName(name),
        username: validateUsername(username),
        password: validatePassword(password, confirmPassword),
        accountType: ValidateAccountType(accountType),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<SignInActionData>({
            fieldErrors,
            fields,
            formError: "Fields are invalid",
        });
    }
    console.log({ fields });

    const userExists = await db.user.findFirst({
        where: { username },
    });

    if (userExists) {
        return badRequest({
            fieldErrors: null,
            fields,
            formError: `User with username ${username} already exists`,
        });
    }

    const data = { name, username, password, accountType };
    const createdUser = await createUser(data);

    console.log({ createdUser });

    // return json({ success: true }, { status: 201 });
    return redirect("/admin/users");
    // Logic here to create the user
};

export default function AdminCreateUserRoute() {
    const action = useActionData<SignInActionData>();

    return (
        <div>
            <h1 className="theme-text-h4 mb-2">Create a new user</h1>
            <Form
                className="flex flex-col gap-2"
                method="POST">
                <input
                    name="name"
                    defaultValue={action?.fields?.name}
                    type="text"
                    className="input input-bordered"
                    placeholder="Name"
                />
                <FormAlert
                    condition={action?.fieldErrors?.name}
                    variant="warning"
                />
                <input
                    name="username"
                    defaultValue={action?.fields?.username}
                    type="text"
                    className="input input-bordered"
                    placeholder="Username"
                />
                <FormAlert
                    condition={action?.fieldErrors?.username}
                    variant="warning"
                />
                <input
                    name="password"
                    type="password"
                    defaultValue={action?.fields?.password}
                    className="input input-bordered"
                    placeholder="Password"
                />
                <input
                    name="confirmPassword"
                    type="password"
                    defaultValue={action?.fields?.confirmPassword}
                    className="input input-bordered"
                    placeholder="Confirm password"
                />
                <FormAlert
                    condition={action?.fieldErrors?.password}
                    variant="warning"
                />
                <select
                    name="accountType"
                    defaultValue={action?.fields?.accountType || "DEFAULT"}
                    className="select select-primary w-full">
                    <option
                        disabled
                        value="DEFAULT">
                        Select account type
                    </option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USER</option>
                    <option value="GUEST">GUEST</option>
                </select>
                <FormAlert
                    condition={action?.fieldErrors?.accountType}
                    variant="warning"
                />
                <FormAlert
                    condition={action?.formError}
                    variant="error"
                />
                <button
                    className="btn btn-primary"
                    type="submit">
                    Create user
                </button>
                <Link
                    to="/admin/users"
                    className="btn btn-error btn-outline">
                    Cancel
                </Link>
            </Form>
        </div>
    );
}
