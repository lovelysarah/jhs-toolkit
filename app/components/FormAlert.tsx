import clsx from "clsx";
import { AlertTriangle, Check } from "lucide-react";

export const FormAlert = ({
    condition,
    variant,
}: {
    condition: unknown;
    variant: "success" | "warning" | "error";
}) => {
    if (typeof condition !== "string" || condition.length < 1) return null;

    return (
        <span
            className={clsx("p-2 border rounded-lg flex gap-2", {
                "text-warning-content bg-warning": variant === "warning",
                "text-success-content bg-success": variant === "success",
                "text-error-content bg-error": variant === "error",
            })}>
            {variant === "error" || variant === "warning" ? (
                <AlertTriangle />
            ) : (
                <Check />
            )}
            {condition}
        </span>
    );
};
