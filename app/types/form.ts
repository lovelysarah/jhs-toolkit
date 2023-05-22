export type FormActionData<TFieldErrors, TFields> = {
    formError?: string;
    fieldErrors?: TFieldErrors;
    fields?: TFields;
};

export type FieldErrors<TFields> = {
    [K in keyof TFields]?: TFields[K] | undefined;
};
