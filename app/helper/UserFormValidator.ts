import { ACCOUNT_TYPE } from "@prisma/client";
import { TypedResponse } from "@remix-run/node";
import {
    CreateUserActionData,
    CreateUserFieldErrors,
    CreateUserFields,
    FORM_ACTION,
    FORM_VALIDATION_RESULT_TYPE,
    FormActionData,
    ModifyUserActionData,
    TypeValidationResults,
    UpdateFormValidationFailure,
    UpdateFormValidationResults,
} from "~/types/form";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";

const validate = {
    name: (name: string) => {
        if (name.length < 1) return "Name is required";
        if (name.length < 2 || name.length > 22)
            return "Name must be between 2-22 characters";
    },
    username: (username: string) => {
        if (username.length < 1) return "Username is required";
        if (username.length < 5 || username.length > 22)
            return "Username must be between 5-22 characters";
    },
    password: (password: string, confirmPassword?: string) => {
        if (password.length < 1) return "Password is required";
        if (confirmPassword && password !== confirmPassword)
            return "Passwords do not match";

        if (password.length < 6 || password.length > 64)
            return "Password must be between 6-64 characters";
    },
    accountType: (accountType: string) => {
        // Verify if account type is a value in the ACCOUNT_TYPE enum
        if (
            !Object.values(ACCOUNT_TYPE).includes(accountType as ACCOUNT_TYPE)
        ) {
            return "Please select an account type";
        }
    },
};

type UserFormData = {
    name: unknown;
    username: unknown;
    password: unknown;
    confirmPassword: unknown;
    accountType: unknown;
};

const validateTypes = <T extends Record<string, unknown>>(
    obj: T
): TypeValidationResults<{ [key in keyof T]: string }> => {
    const newObj = {} as { [key in keyof T]: string };
    let failed = false;

    const error = badRequest<CreateUserActionData | ModifyUserActionData>({
        fieldErrors: null,
        fields: null,
        formError: "Fields are required",
    });

    Object.entries(obj).forEach(([key, value]) => {
        if (typeof value !== "string") return (failed = true);
        newObj[key as keyof T] = value as string;
    });

    return failed
        ? { type: "TYPE_VALIDATION_FAILURE", error }
        : { type: "TYPE_VALIDATION_SUCCESS", data: newObj };
};

export const validateUserCreationForm = async (data: UserFormData) => {
    const { name, username, password, confirmPassword, accountType } = data;

    // If any of the fields are missing, return a 400 with an error message
    if (
        typeof name !== "string" ||
        typeof username !== "string" ||
        typeof password !== "string" ||
        typeof confirmPassword !== "string" ||
        typeof accountType !== "string"
    ) {
        return badRequest<CreateUserActionData>({
            fieldErrors: null,
            fields: null,
            formError: "Fields are required",
        });
    }
    // Validate the fields
    const fields = {
        name,
        username,
        password,
        confirmPassword,
        accountType,
    };
    const fieldErrors: CreateUserFieldErrors = {
        name: validate["name"](name),
        username: validate["username"](username),
        password: validate["password"](password, confirmPassword),
        accountType: validate["accountType"](accountType),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<CreateUserActionData>({
            fieldErrors,
            fields,
            formError: "Fields are invalid",
        });
    }

    return { name, username, password, confirmPassword, accountType };
};

export const validateUserUpdateForm = async (
    data: UserFormData,
    userId: string
): Promise<UpdateFormValidationResults<ModifyUserActionData>> => {
    const fieldValidationResults = validateTypes(data);

    // Failure boilerplate
    const failure: UpdateFormValidationFailure<ModifyUserActionData> = {
        type: FORM_VALIDATION_RESULT_TYPE.FAILURE,
        action: FORM_ACTION.USER_UPDATE,
        error: null,
    };

    // Exit if basic type validation fails
    if (fieldValidationResults.type === "TYPE_VALIDATION_FAILURE") {
        failure.error = fieldValidationResults.error;
        return failure;
    }

    const { name, username, password, confirmPassword, accountType } =
        fieldValidationResults.data;

    // Indivial field validation
    const fieldErrors = {
        name: validate["name"](name),
        username: validate["username"](username),

        // If password is changed, validate it
        password:
            password.length > 1
                ? validate["password"](password, confirmPassword)
                : undefined,
        accountType: validate["accountType"](accountType),
    };

    // If any of the fields are invalid, return failure
    if (Object.values(fieldErrors).some(Boolean)) {
        failure.error = badRequest<ModifyUserActionData>({
            fieldErrors,
            fields: fieldValidationResults.data,
            formError: "Fields are invalid",
        });

        return failure;
    }

    const userExists = await db.user.findFirst({
        where: { username: username },
    });

    // If the username is taken, return failure except if it's the user getting updated
    if (userExists && userExists.id !== userId) {
        failure.error = badRequest<ModifyUserActionData>({
            fieldErrors: null,
            fields: fieldValidationResults.data,
            formError: `User with username ${username} already exists`,
        });
        return failure;
    }

    return {
        action: FORM_ACTION.USER_UPDATE,
        type: FORM_VALIDATION_RESULT_TYPE.SUCCESS,
        data: fieldValidationResults.data,
    };
};
