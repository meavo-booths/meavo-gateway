import { getToolCardIcon } from "@/lib/tool-card-icons";

export function ToolCardIcon({
  iconKey,
  size = 40,
  className = "",
}: {
  iconKey: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const icon = getToolCardIcon(iconKey);
  if (!icon) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon.file}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
    />
  );
}
