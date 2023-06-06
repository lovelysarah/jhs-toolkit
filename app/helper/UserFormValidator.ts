import { ACCOUNT_TYPE } from "@prisma/client";
import { CreateUserActionData, CreateUserFieldErrors } from "~/types/form";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";

const validate = {
    name: (name: string) => {
        if (name.length < 1) return "Name is required";
        if (name.length < 2) return "Name must be at least 2 characters long";
    },
    username: (username: string) => {
        if (username.length < 1) return "Username is required";
        if (username.length < 5)
            return "Username must be at least 5 characters long";
    },
    password: (password: string, confirmPassword?: string) => {
        if (password.length < 1) return "Password is required";
        if (confirmPassword && password !== confirmPassword)
            return "Passwords do not match";

        if (password.length < 6)
            return "Password must be at least 6 characters long";
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

    return { name, username, password, accountType };
};

const VALID_FIELDS = ["name", "username", "password", "accountType"] as const;

type UserFieldList = typeof VALID_FIELDS;
type UserField = UserFieldList[number];

export const validateUserUpdateForm = async (data: UserFormData) => {
    const isValidKey = (value: string): value is UserField => {
        return VALID_FIELDS.includes(value as UserField);
    };
    const removeEmptyFields = (obj: { [key: string]: unknown }) => {
        // Remove empty fields from the object
        return Object.entries(obj).reduce((acc, [key, value]) => {
            // If the value is not an empty string and is a string,
            // add it to the accumulator
            if (key === "confirmPassword") return acc;
            if (value !== "" && typeof value === "string" && isValidKey(key))
                acc[key] = value;

            return acc;
        }, {} as { [key in UserField]: string });
    };

    const filteredData = removeEmptyFields(data);

    const fieldErrors = Object.entries(filteredData).reduce(
        (acc, [key, value]) => {
            if (isValidKey(key)) acc[key] = validate[key](value);
            return acc;
        },
        {} as { [key in UserField]: string | undefined }
    );

    // Horrible
    const fields = {
        ...filteredData,
        confirmPassword: data.confirmPassword as string,
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<CreateUserActionData>({
            fieldErrors,
            fields,
            formError: "Fields are invalid",
        });
    }

    const { name, username, accountType, password } = fields;

    return { name, username, password, accountType };
};
