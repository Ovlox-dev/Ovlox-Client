import Protected from "@/widgets/session-gate";

export default function NewOrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Protected>{children}</Protected>;
}
