import type { ErrorResponse } from "@remix-run/router";

export const ErrorResponseMessage = ({ error }: { error: ErrorResponse }) => {
    let emoji = "😭";
    let message = "Something went wrong";

    if (error.status === 404) {
        emoji = "🔎";
        message = "This resource doesn't exist";
    }
    if (error.status === 401) {
        message = "This resource is protected";
        emoji = "🔒";
    }

    return (
        <div className="p-8 bg-base-200 text-error-content rounded-lg border border-error">
            <h1 className="theme-text-h3">
                {message} {emoji}
            </h1>
            <p className="theme-text-h4 font-bold">
                {error.status} <span className="font-normal">{error.data}</span>
            </p>
        </div>
    );
};
export const UnknownErrorMessage = ({ message }: { message: string }) => {
    return (
        <div className="p-8 bg-base-200 text-error-content rounded-lg border border-error">
            <h1 className="theme-text-h3">Something unexpected happened 😭</h1>
            <p>{message}.</p>
            <p>Try refreshing the page.</p>
        </div>
    );
};
