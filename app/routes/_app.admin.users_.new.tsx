import { ActionFunction, redirect } from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";
import { CreateUserActionData } from "~/types/form";
import { FormAlert } from "~/components/FormAlert";
import { createUser } from "~/api/user";
import { validateUserCreationForm } from "~/helper/UserFormValidator";
import { useEffect, useState } from "react";
import { badRequest } from "~/utils/request.server";
import { db } from "~/utils/db.server";

export const action: ActionFunction = async ({ request }) => {
    // Get the form data
    const form = await request.formData();
    const name = form.get("name");
    const username = form.get("username");
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");
    const accountType = form.get("accountType") ?? "";

    // Validate the fields
    const validatedData = await validateUserCreationForm({
        name,
        username,
        password,
        confirmPassword,
        accountType,
    });

    const isValid = "name" in validatedData;

    // If the form is invalid, return the errors
    if (!isValid) return validatedData;

    // Check if the user already exists
    const userExists = await db.user.findFirst({
        where: { username: validatedData.username },
    });

    // If the user exists, return a 400 with an error message
    if (userExists) {
        return badRequest<CreateUserActionData>({
            fieldErrors: null,
            fields: validatedData,
            formError: `User with username ${username} already exists`,
        });
    }

    // Create the user
    const createdUser = await createUser(validatedData);
    console.log("test");

    // Redirect to the user page
    return redirect("/admin/users");
};

type NameInputProps = {
    defaultName: string | undefined;
    condition: string | undefined;
};
const NameInput = ({ defaultName, condition }: NameInputProps): JSX.Element => {
    return (
        <>
            <input
                name="name"
                defaultValue={defaultName}
                type="text"
                className="input input-bordered"
                placeholder="Name"
            />
            <FormAlert
                condition={condition}
                variant="warning"
            />
        </>
    );
};
type UsernameInputProps = {
    defaultUsername: string | undefined;
    condition: string | undefined;
};
const UsernameInput = ({
    defaultUsername,
    condition,
}: UsernameInputProps): JSX.Element => {
    return (
        <>
            <input
                name="username"
                defaultValue={defaultUsername}
                type="text"
                className="input input-bordered"
                placeholder="Username"
            />
            <FormAlert
                condition={condition}
                variant="warning"
            />
        </>
    );
};

type PasswordInputProps = {
    defaultPassword: string | undefined;
    defaultConfirmPassword: string | undefined;
    condition: string | undefined;
};
const PasswordInput = ({
    defaultPassword,
    defaultConfirmPassword,
    condition,
}: PasswordInputProps) => {
    const [password, setPassword] = useState(defaultPassword);
    const [confirmPassword, setConfirmPassword] = useState(
        defaultConfirmPassword
    );

    const [passwordError, setPasswordError] = useState("");

    // Verify is the passwords match
    useEffect(() => {
        if (confirmPassword !== password) {
            return setPasswordError("Passwords do not match");
        }

        setPasswordError("");
    }, [password, confirmPassword]);

    // Reset state
    useEffect(() => {
        setPasswordError("");
        setPassword(defaultPassword);
        setConfirmPassword(defaultConfirmPassword);
    }, [defaultPassword, defaultConfirmPassword]);

    return (
        <>
            <input
                name="password"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                className="input input-bordered"
                placeholder="Password"
            />
            <input
                name="confirmPassword"
                type="password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                value={confirmPassword}
                className="input input-bordered"
                placeholder="Confirm password"
            />
            <FormAlert
                condition={passwordError}
                variant="warning"
            />
            <FormAlert
                condition={condition}
                variant="error"
            />
        </>
    );
};

export default function AdminCreateUserRoute() {
    const action = useActionData<CreateUserActionData>();

    return (
        <div>
            <h1 className="theme-text-h3 mb-2">Create a new user</h1>
            <Form
                className="flex flex-col gap-2"
                method="POST">
                <span className="theme-text-h4">Enter information</span>
                <NameInput
                    defaultName={action?.fields?.name}
                    condition={action?.fieldErrors?.name}
                />{" "}
                <UsernameInput
                    defaultUsername={action?.fields?.username}
                    condition={action?.fieldErrors?.username}
                />
                <span className="theme-text-h4">Choose a password</span>
                <PasswordInput
                    defaultPassword={action?.fields?.password || ""}
                    defaultConfirmPassword={
                        action?.fields?.confirmPassword || ""
                    }
                    condition={action?.fieldErrors?.password || undefined}
                />
                <span className="theme-text-h4">Select an account type</span>
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
