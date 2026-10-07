import clsx from "clsx";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { useNavigation, type ViewId } from "../../store/navigation";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { to: ViewId; focus?: string };

/** Link de texto que navega para outra tela do app (e opcionalmente foca um bloco nela). */
export function TextLink({ to, focus, className, onClick, ...rest }: Props) {
  const go = useNavigation((s) => s.go);
  return (
    <a
      href={"#" + to}
      className={clsx("btn-text", className)}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        onClick?.(e);
        go(to, { focus });
      }}
      {...rest}
    />
  );
}
