export type FormActionData<TFieldErrors, TFields> = {
    formError: string | null;
    fieldErrors: TFieldErrors | null;
    fields: TFields | null;
};

export type FieldErrors<TFields> = {
    [K in keyof TFields]?: TFields[K] | undefined;
};

export type CreateUserFields = {
    name: string;
    username: string;
    password: string | null;
    confirmPassword: string | null;
    accountType: string;
};
export type CreateUserFieldErrors = FieldErrors<CreateUserFields>;

export type CreateUserActionData = FormActionData<
    CreateUserFieldErrors,
    CreateUserFields
>;
