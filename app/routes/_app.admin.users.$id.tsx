import { ACCOUNT_TYPE } from "@prisma/client";
import { ActionFunction, LoaderFunction, json } from "@remix-run/node";
import {
    Form,
    Link,
    isRouteErrorResponse,
    useActionData,
    useLoaderData,
    useRouteError,
    useSubmit,
} from "@remix-run/react";
import clsx from "clsx";
import { error } from "console";
import { AlertTriangle, CornerDownLeft, Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { UserInfo, getUserInfoById, modifyUSer, modifyUser } from "~/api/user";
import { FormAlert } from "~/components/FormAlert";
import {
    validateUserCreationForm,
    validateUserUpdateForm,
} from "~/helper/UserFormValidator";
import { CreateUserActionData } from "~/types/form";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";

type LoaderData = {
    user: UserInfo;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const url = new URL(request.url);

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
    const form = await request.formData();
    const name = form.get("name");
    const username = form.get("username");
    const accountType = form.get("accountType");
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");
    console.log({ name, username, accountType, password, confirmPassword });

    const fields = { name, username, accountType, password, confirmPassword };
    const validatedData = await validateUserUpdateForm({
        name,
        username,
        accountType,
        password,
        confirmPassword,
    });

    console.log({ validatedData });
    const isValid = "name" in validatedData;
    if (!isValid) return validatedData;

    const userExists = await db.user.findFirst({
        where: { username: validatedData.username },
    });

    if (userExists) {
        return badRequest<CreateUserActionData>({
            fieldErrors: null,
            fields: {
                ...validatedData,
                confirmPassword: confirmPassword as string,
            },
            formError: `User with username ${username} already exists`,
        });
    }

    const modifiedUser = await modifyUser(params.id, validatedData);
    console.log({ modifiedUser });

    return json({ success: true }, { status: 201 });
};

export default function AdminManageUserRoute() {
    const { user } = useLoaderData<LoaderData>();
    const action = useActionData<CreateUserActionData>();

    console.log(action);
    if (!user) {
        throw new Error("User not found");
    }

    const submit = useSubmit();
    const [clientFormError, setClientFormError] = useState("");

    const [name, setName] = useState(user.name);
    const [username, setUsername] = useState(user.username);
    const [selected, setSelected] = useState(user.account_type);

    const [modified, setModified] = useState(false);

    const [resetPassword, setResetPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const confirmDelete = useRef<HTMLDialogElement>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Reset client form error
        setClientFormError("");
        console.log({ tager: e.target });

        // Validata form data
        if (!name || !username || !selected)
            return setClientFormError("Please fill in all the fields.");

        if (resetPassword && password !== confirmPassword)
            return setClientFormError("Passwords do not match.");

        const formData = new FormData(e.target as HTMLFormElement);

        try {
            submit(formData, {
                method: "POST",
            });
        } catch (err) {
            const error = err as Error;
            setClientFormError(error.message);
        }
    };

    const resetPassordForm = () => {
        setResetPassword(false);
        setPassword("");
        setConfirmPassword("");
    };
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
    }, [name, username, selected, password, confirmPassword]);

    // Reset the form if the user changes
    useEffect(() => {
        //Reset form
        resetPassordForm();

        // Reset state
        setName(user.name);
        setUsername(user.username);
        setSelected(user.account_type);
    }, [user]);

    return (
        <div>
            <dialog
                id="confirm_delete_modal"
                className="modal"
                ref={confirmDelete}>
                <h2 className="theme-text-h1">TESINTG MODEL</h2>
                <form
                    method="dialog"
                    className="modal-box min-w-[500px] min-h-[500px]">
                    <h3 className="font-bold text-lg">Hello!</h3>
                    <p className="py-4">
                        Press ESC key or click the button below to close
                    </p>
                    <div className="modal-action">
                        {/* if there is a button in form, it will close the modal */}
                        <button className="btn">Close</button>
                    </div>
                </form>
            </dialog>
            <div className="flex justify-between">
                <h1 className="theme-text-h3 mb-2">{user.name}</h1>

                {/* // BROKEN */}
                <button
                    onClick={() =>
                        confirmDelete.current &&
                        confirmDelete.current.showModal()
                    }
                    className="flex gap-2 btn btn-ghost text-error-content">
                    <Trash />
                    Delete
                </button>
            </div>
            {clientFormError && (
                <span className="p-2 my-2 rounded-lg bg-error flex gap-2">
                    <AlertTriangle />
                    {clientFormError}
                </span>
            )}
            <Form
                onSubmit={handleSubmit}
                className="flex flex-col gap-2"
                method="POST">
                <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    type="text"
                    className="input input-bordered"
                    placeholder="Name"
                />
                <input
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    type="text"
                    className="input input-bordered"
                    placeholder="Username"
                />
                <select
                    name="accountType"
                    onChange={(e) =>
                        setSelected(e.currentTarget.value as ACCOUNT_TYPE)
                    }
                    value={selected || "DEFAULT"}
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
                {resetPassword ? (
                    <>
                        <span className="theme-text-h4">
                            Enter the new password
                        </span>
                    </>
                ) : (
                    <button
                        onClick={(e) => setResetPassword(true)}
                        className="btn btn-secondary">
                        Reset Password
                    </button>
                )}
                <input
                    hidden={!resetPassword}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    type="password"
                    className="input input-bordered"
                    placeholder="Password"
                />
                <input
                    hidden={!resetPassword}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    type="password"
                    className="input input-bordered"
                    placeholder="Confirm password"
                />
                <button
                    onClick={(e) => resetPassordForm()}
                    type="button"
                    className={clsx("btn btn-secondary", {
                        hidden: !resetPassword,
                    })}>
                    Cancel
                </button>
                {modified && (
                    <button
                        className="btn btn-primary"
                        type="submit">
                        Submit changes
                    </button>
                )}
                <Link
                    to="/admin/users"
                    className="btn btn-error btn-outline text-error-content">
                    Close
                </Link>
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
