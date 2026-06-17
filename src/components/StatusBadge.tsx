interface Props {
  found: boolean;
}

export default function StatusBadge({ found }: Props) {
  return (
    <span
      className={`status-badge ${found ? "found" : "not-found"}`}
      title={found ? "Found" : "Not found"}
    />
  );
}
