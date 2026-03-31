"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAttribute,
  createAttributeValue,
  deleteAttribute,
  deleteAttributeValue,
  type AttributeWithValues,
} from "@/actions/attributes";

export function AttributesAdminClient({ attributes }: { attributes: AttributeWithValues[] }) {
  const router = useRouter();
  const [newAttrName, setNewAttrName] = useState("");
  const [valueDrafts, setValueDrafts] = useState<Record<number, { name: string; slug: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function draftFor(attrId: number) {
    return valueDrafts[attrId] ?? { name: "", slug: "" };
  }

  function setDraft(attrId: number, patch: Partial<{ name: string; slug: string }>) {
    setValueDrafts((prev) => ({
      ...prev,
      [attrId]: { ...draftFor(attrId), ...patch },
    }));
  }

  async function onCreateAttribute(e: React.FormEvent) {
    e.preventDefault();
    const name = newAttrName.trim();
    if (!name) {
      toast.error("Attribute name is required");
      return;
    }
    setBusy("attr");
    const fd = new FormData();
    fd.set("name", name);
    const r = await createAttribute(fd);
    setBusy(null);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    setNewAttrName("");
    toast.success("Attribute created");
    router.refresh();
  }

  async function onAddValue(attrId: number) {
    const { name, slug } = draftFor(attrId);
    if (!name.trim()) {
      toast.error("Value name is required");
      return;
    }
    setBusy(`val-${attrId}`);
    const fd = new FormData();
    fd.set("name", name.trim());
    if (slug.trim()) fd.set("slug", slug.trim());
    const r = await createAttributeValue(attrId, fd);
    setBusy(null);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    setDraft(attrId, { name: "", slug: "" });
    toast.success("Value added");
    router.refresh();
  }

  async function onDeleteAttribute(attrId: number) {
    if (!window.confirm("Delete this attribute and all of its values? Products will lose these tags.")) return;
    setBusy(`del-attr-${attrId}`);
    const r = await deleteAttribute(attrId);
    setBusy(null);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Attribute deleted");
    router.refresh();
  }

  async function onDeleteValue(valueId: number) {
    setBusy(`del-val-${valueId}`);
    const r = await deleteAttributeValue(valueId);
    setBusy(null);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Value deleted");
    router.refresh();
  }

  return (
    <div className="space-y-10 max-w-3xl">
      <section className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold">New attribute</h2>
        <p className="text-sm text-muted-foreground">
          Create a group such as Fit, Style, or Material. Then add values (e.g. Oversized, Graphic) under it.
        </p>
        <form onSubmit={onCreateAttribute} className="flex flex-wrap items-end gap-3">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label htmlFor="new-attr-name">Name</Label>
            <Input
              id="new-attr-name"
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              placeholder="e.g. Fit"
            />
          </div>
          <Button type="submit" disabled={busy === "attr"}>
            {busy === "attr" ? "Adding…" : "Add attribute"}
          </Button>
        </form>
      </section>

      {attributes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attributes yet. Create one above.</p>
      ) : (
        <ul className="space-y-6">
          {attributes.map((attr) => (
            <li key={attr.id} className="rounded-lg border border-border p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{attr.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">ID {attr.id}</p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy?.startsWith("del-")}
                  onClick={() => onDeleteAttribute(attr.id)}
                >
                  Delete attribute
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Values</Label>
                {attr.values.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No values yet.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {attr.values.map((v) => (
                      <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{v.name}</span>
                          <span className="text-muted-foreground ml-2 font-mono text-xs">{v.slug}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={busy != null}
                          onClick={() => onDeleteValue(v.id)}
                        >
                          {busy === `del-val-${v.id}` ? "…" : "Remove"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-border">
                <div className="space-y-2 flex-1 min-w-[140px]">
                  <Label htmlFor={`val-name-${attr.id}`}>New value name</Label>
                  <Input
                    id={`val-name-${attr.id}`}
                    value={draftFor(attr.id).name}
                    onChange={(e) => setDraft(attr.id, { name: e.target.value })}
                    placeholder="e.g. Oversized"
                  />
                </div>
                <div className="space-y-2 flex-1 min-w-[140px]">
                  <Label htmlFor={`val-slug-${attr.id}`}>Slug (optional)</Label>
                  <Input
                    id={`val-slug-${attr.id}`}
                    value={draftFor(attr.id).slug}
                    onChange={(e) => setDraft(attr.id, { slug: e.target.value })}
                    placeholder="auto from name"
                    className="font-mono text-xs"
                  />
                </div>
                <Button
                  type="button"
                  disabled={busy === `val-${attr.id}`}
                  onClick={() => onAddValue(attr.id)}
                >
                  {busy === `val-${attr.id}` ? "Adding…" : "Add value"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
