import { TypedResponse } from "@remix-run/node";

export type UserFormData = {
    name: string;
    username: string;
    password: string;
    confirmPassword: string;
    accountType: string;
};

/**
 * Form Action Data
 */

export type FormActionData<TFieldErrors, TFields> = {
    formError: string | null;
    fieldErrors: TFieldErrors | null;
    fields: TFields | null;
};

export type FieldErrors<TFields> = {
    [K in keyof TFields]?: TFields[K] | undefined;
};

// Create User
export type CreateUserFields = UserFormData;
export type CreateUserFieldErrors = FieldErrors<CreateUserFields>;
export type CreateUserActionData = FormActionData<
    CreateUserFieldErrors,
    CreateUserFields
>;

// Modify User
export type ModifyUserFields = UserFormData;
export type ModifyUserFieldErrors = FieldErrors<ModifyUserFields>;
export type ModifyUserActionData = FormActionData<
    ModifyUserFieldErrors,
    ModifyUserFields
>;

/**
 * Type validation
 */

export type TypeValidationFailure = {
    type: "TYPE_VALIDATION_FAILURE";
    error: TypedResponse<
        FormActionData<
            CreateUserFieldErrors | ModifyUserFieldErrors,
            CreateUserFields | ModifyUserFields
        >
    >;
};

export type TypeValidationSuccess<T> = {
    type: "TYPE_VALIDATION_SUCCESS";
    data: T;
};

export type TypeValidationResults<TSuccess> =
    | TypeValidationSuccess<TSuccess>
    | TypeValidationFailure;

export enum FORM_ACTION {
    USER_UPDATE = "USER_UPDATE",
    TYPE_VALIDATION = "TYPE_VALIDATION",
}

export enum FORM_VALIDATION_RESULT_TYPE {
    FAILURE = "FORM_VALIDATION_FAILURE",
    SUCCESS = "FORM_VALIDATION_SUCCESS",
}

export type UpdateFormValidationFailure<TActionData> = {
    action: FORM_ACTION.USER_UPDATE;
    type: FORM_VALIDATION_RESULT_TYPE.FAILURE;
    error: TypedResponse<TActionData> | null;
};

export type UpdateFormValidationSuccess = {
    action: FORM_ACTION.USER_UPDATE;
    type: FORM_VALIDATION_RESULT_TYPE.SUCCESS;
    data: ModifyUserFields;
};

export type UpdateFormValidationResults<TFailure> =
    | UpdateFormValidationSuccess
    | UpdateFormValidationFailure<TFailure>;
