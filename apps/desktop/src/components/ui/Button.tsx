import clsx from "clsx";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger" | "text";
type Props = ComponentProps<"button"> & { variant?: Variant; size?: "md" | "sm" };

/** Hierarquia do protótipo: uma ação primária por tela, secundárias com contorno, ações de texto sublinhadas. */
export function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={clsx(
        variant === "text" ? "btn-text" : "btn",
        variant === "primary" && "btn-primary",
        variant === "danger" && "btn-danger",
        size === "sm" && variant !== "text" && "btn-sm",
        className,
      )}
      {...rest}
    />
  );
}

export function IconButton({ className, type = "button", ...rest }: ComponentProps<"button">) {
  return <button type={type} className={clsx("icon-btn", className)} {...rest} />;
}
