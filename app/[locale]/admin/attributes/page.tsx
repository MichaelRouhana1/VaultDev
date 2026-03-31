import { AttributesAdminClient } from "@/components/AttributesAdminClient";
import { getAttributesWithValuesAdmin } from "@/actions/attributes";

export default async function AdminAttributesPage() {
  const attributes = await getAttributesWithValuesAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Attributes</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Define groups (Fit, Style, …) and values. Value slugs appear in the shop as the query parameter{" "}
        <span className="font-mono text-xs">attributes</span> (comma-separated).
      </p>
      <AttributesAdminClient attributes={attributes} />
    </div>
  );
}
