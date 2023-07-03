import { ACCOUNT_TYPE } from "@prisma/client";
import { ActionFunction, LoaderFunction, json } from "@remix-run/node";
import {
    Form,
    Link,
    isRouteErrorResponse,
    useActionData,
    useLoaderData,
    useNavigation,
    useRouteError,
    useSubmit,
} from "@remix-run/react";
import clsx from "clsx";
import { AlertTriangle, Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { UserInfo, getUserInfoById, modifyUser } from "~/data/user";
import { FormAlert } from "~/components/FormAlert";
import { validateUserUpdateForm } from "~/helper/UserFormValidator";
import {
    CreateUserActionData,
    FORM_VALIDATION_RESULT_TYPE,
} from "~/types/form";
import { db } from "~/utils/db.server";

type LoaderData = {
    user: UserInfo;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    invariant(params.id, "Something went wrong!");

    let user;
    try {
        user = await getUserInfoById(params.id);
    } catch (err) {
        throw new Response("User not found", { status: 404 });
    }

    const data: LoaderData = {
        user: await getUserInfoById(params.id),
    };

    return json(data);
};

export const action: ActionFunction = async ({ request, params }) => {
    invariant(params.id, "Expected user ID!");

    const user = await db.user.findFirst({
        where: { id: params.id },
    });

    if (!user) {
        throw new Error("Something went wrong, user not found");
    }

    const form = await request.formData();
    const name = form.get("name") || user.name;
    const username = form.get("username") || user.username;
    const accountType = form.get("accountType") || user.account_type;
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");

    const validationResult = await validateUserUpdateForm(
        {
            name,
            username,
            accountType,
            password,
            confirmPassword,
        },
        params.id
    );

    if (validationResult.type === FORM_VALIDATION_RESULT_TYPE.FAILURE) {
        return validationResult.error;
    }

    await modifyUser(params.id, {
        name: validationResult.data.name,
        username: validationResult.data.username,
        accountType: validationResult.data.accountType,
        password: validationResult.data.password,
    });

    return json({ success: true }, { status: 201 });
};

export default function AdminManageUserRoute() {
    const { user } = useLoaderData<LoaderData>();
    const action = useActionData<CreateUserActionData>();
    const { state } = useNavigation();

    if (!user) {
        throw new Error("User not found");
    }

    const submit = useSubmit();

    const [formSubmitted, setFormSubmitted] = useState(false);

    // Has the form been modified
    const [modified, setModified] = useState(false);

    // Error from the client side validation
    const [clientFormError, setClientFormError] = useState("");

    // Basic info
    const [name, setName] = useState(user.name);
    const [username, setUsername] = useState(user.username);
    const [selected, setSelected] = useState<ACCOUNT_TYPE>(user.account_type);

    // Passowrd form
    const [resetPassword, setResetPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");

    // Modal reference
    const confirmDelete = useRef<HTMLDialogElement>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Reset client form error
        setClientFormError("");
        setFormSubmitted(false);

        // Validata form data
        if (!name || !username || !selected)
            return setClientFormError("Please fill in all the fields.");

        if (resetPassword && password !== confirmPassword)
            return setClientFormError("Verify password");

        if (resetPassword && password === "")
            return setClientFormError("Please enter a password");

        // Create form data
        const formData = new FormData();

        formData.append("name", name);
        formData.append("username", username);
        formData.append("accountType", selected);

        // Only append password if it has been changed
        formData.append("password", resetPassword ? password : "");
        formData.append(
            "confirmPassword",
            resetPassword ? confirmPassword : ""
        );

        // Submit form data
        try {
            submit(formData, {
                method: "POST",
            });
            setFormSubmitted(true);
            setFirstUpdate(true);
            setModified(false);
        } catch (err) {
            const error = err as Error;
            setClientFormError(error.message);
            setFormSubmitted(false);
        }
    };

    const resetPassordForm = () => {
        setResetPassword(false);
        setPassword("");
        setConfirmPassword("");
    };

    // Display error if password does not match
    useEffect(() => {
        if (confirmPassword.length !== 0 && password !== confirmPassword)
            return setPasswordError("Passwords do not match");
        setPasswordError("");
    }, [password, confirmPassword]);

    // Check if the form has been modified
    useEffect(() => {
        if (
            name !== user.name ||
            username !== user.username ||
            selected !== user.account_type ||
            password !== "" ||
            confirmPassword !== ""
        ) {
            setModified(true);
        } else {
            setModified(false);
        }

        // This breaks success alert on password reset
        if (!firstUpdate) return;

        setFormSubmitted(false);
    }, [name, username, selected, password, confirmPassword]);

    const [firstUpdate, setFirstUpdate] = useState(false);

    // Reset the form if the user changes
    useEffect(() => {
        //Reset form

        if (!firstUpdate) {
            setFormSubmitted(false);
        }
        if (firstUpdate) setFirstUpdate(false);

        if (
            !action?.fieldErrors?.password &&
            !action?.fieldErrors?.confirmPassword
        )
            resetPassordForm();

        // Reset state
        setName(action?.fields?.name || user.name);
        setUsername(action?.fields?.username || user.username);
        setSelected(
            (action?.fields?.accountType as ACCOUNT_TYPE) || user.account_type
        );
    }, [user]);

    const inputClasses = clsx("input input-bordered", {
        "input-disabled animate-pulse": state !== "idle",
    });

    const isLoading = state === "loading";
    const isSubmitting = state === "submitting";
    const isIdle = state === "idle";

    return (
        <div>
            <dialog
                id="confirm_delete_modal"
                className="modal"
                ref={confirmDelete}>
                <h2 className="theme-text-h1">TESINTG MODEL</h2>
            </dialog>
            <div className="flex justify-between">
                <h1
                    className={clsx("theme-text-h3 mb-2", {
                        "animate-pulse": isLoading,
                    })}>
                    {user.name}
                </h1>

                {/* // BROKEN */}
                {state !== "loading" && (
                    <button
                        onClick={() =>
                            confirmDelete.current &&
                            confirmDelete.current.showModal()
                        }
                        className="flex gap-2 btn btn-ghost text-error-content">
                        <Trash />
                        Delete
                    </button>
                )}
            </div>
            <Form
                onSubmit={handleSubmit}
                className="flex flex-col gap-2"
                method="POST">
                {clientFormError && (
                    <FormAlert
                        variant="warning"
                        condition={clientFormError}
                    />
                )}

                {formSubmitted && isIdle && !action?.fieldErrors && (
                    <FormAlert
                        condition={"User updated successfully!"}
                        variant="success"
                    />
                )}

                <FormAlert
                    variant="error"
                    condition={action?.formError}
                />
                <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    type="text"
                    className={inputClasses}
                    disabled={isLoading || isSubmitting}
                    placeholder="Name"
                />
                <FormAlert
                    variant="error"
                    condition={action?.fieldErrors?.name}
                />
                <input
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    type="text"
                    className={inputClasses}
                    disabled={isLoading || isSubmitting}
                    placeholder="Username"
                />
                <FormAlert
                    variant="error"
                    condition={action?.fieldErrors?.username}
                />
                <select
                    name="accountType"
                    onChange={(e) =>
                        setSelected(e.currentTarget.value as ACCOUNT_TYPE)
                    }
                    value={selected || "DEFAULT"}
                    disabled={isLoading || isSubmitting}
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
                    variant="error"
                    condition={action?.fieldErrors?.accountType}
                />
                {resetPassword && (
                    <>
                        <span className="theme-text-h4">
                            Enter the new password
                        </span>
                    </>
                )}
                <input
                    hidden={!resetPassword}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    type="password"
                    className={inputClasses}
                    disabled={isLoading || isSubmitting}
                    placeholder="Password"
                />
                <input
                    hidden={!resetPassword}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    type="password"
                    className={inputClasses}
                    disabled={isLoading || isSubmitting}
                    placeholder="Confirm password"
                />
                {passwordError && (
                    <FormAlert
                        variant="warning"
                        condition={passwordError}
                    />
                )}
                {isIdle && !resetPassword && (
                    <button
                        onClick={(e) => setResetPassword(true)}
                        className="btn btn-secondary">
                        Reset Password
                    </button>
                )}

                <FormAlert
                    variant="error"
                    condition={
                        action?.fieldErrors?.password ||
                        action?.fieldErrors?.confirmPassword
                    }
                />
                {isIdle && (
                    <button
                        onClick={(e) => resetPassordForm()}
                        type="button"
                        className={clsx("btn btn-secondary", {
                            hidden: !resetPassword,
                        })}>
                        Cancel
                    </button>
                )}
                {isIdle && modified && (
                    <button
                        className={clsx("btn", {
                            "btn-primary": modified,
                        })}
                        type="submit">
                        {state !== "idle"
                            ? state === "loading"
                                ? "Loading..."
                                : "Submiting..."
                            : "Submit changes"}
                    </button>
                )}
                {isIdle && (
                    <Link
                        to="/admin/users"
                        className="btn btn-error btn-outline text-error-content">
                        Close
                    </Link>
                )}
            </Form>
        </div>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    // when true, this is what used to go to `CatchBoundary`
    console.log(error);
    if (isRouteErrorResponse(error)) {
        return (
            <div className="p-8 bg-error text-error-content rounded-lg">
                <h1 className="theme-text-h3">Bad request!</h1>
                <p className="theme-text-h4 font-bold">
                    {error.status}{" "}
                    <span className="font-normal">{error.data}</span>
                </p>
            </div>
        );
    }

    // Don't forget to typecheck with your own logic.
    // Any value can be thrown, not just errors!
    let errorMessage = "Unknown error";
    // if (isDefinitelyAnError(error)) {
    // errorMessage = error.message;
    // }

    return (
        <div className="p-8 bg-error text-error-content">
            <h1 className="theme-text-h2">Uh oh ...</h1>
            <p>Something went wrong.</p>
            <pre>{errorMessage}</pre>
        </div>
    );
}
