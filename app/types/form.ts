export type FormActionData<TFieldErrors, TFields> = {
    formError: string | null;
    fieldErrors: TFieldErrors | null;
    fields: TFields | null;
};

export type FieldErrors<TFields> = {
    [K in keyof TFields]?: TFields[K] | undefined;
};
