"use client";

import { PrivacyNote } from "@/components/ui/privacy-note";
import { useEffect, useState, useRef } from "react";
import { Camera, Loader2, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Photo = { id: string; url: string; taken_at: string; storage_path: string };

// Progress photos gallery: upload, view, and delete before/after shots.
// Images live in the private 'progress-photos' bucket; we sign short-lived URLs.
export function ProgressPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only runs in the browser; if Supabase isn't configured, show empty state.
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setLoading(false); return; }
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: rows } = await supabase
          .from("progress_photos")
          .select("id, storage_path, taken_at")
          .eq("user_id", user.id)
          .order("taken_at", { ascending: false });
        if (!rows || cancelled) { setLoading(false); return; }
        const signed = await Promise.all(
          rows.map(async (r) => {
            const { data } = await supabase.storage
              .from("progress-photos")
              .createSignedUrl(r.storage_path, 3600);
            return { id: r.id, url: data?.signedUrl ?? "", taken_at: r.taken_at, storage_path: r.storage_path };
          })
        );
        if (!cancelled) setPhotos(signed.filter((p) => p.url));
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function upload(file: File) {
    if (uploading) return;
    setUploading(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Sign in to add photos."); return; }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, file);
      if (upErr) throw upErr;
      const { data: row, error: insErr } = await supabase
        .from("progress_photos")
        .insert({ user_id: user.id, storage_path: path })
        .select().single();
      if (insErr) throw insErr;
      const { data: signed } = await supabase.storage.from("progress-photos").createSignedUrl(path, 3600);
      setPhotos((p) => [{ id: row.id, url: signed?.signedUrl ?? "", taken_at: row.taken_at, storage_path: path }, ...p]);
      toast.success("Photo added.");
    } catch {
      toast.error("Couldn't upload the photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(photo: Photo) {
    const prev = photos;
    setPhotos((p) => p.filter((x) => x.id !== photo.id));
    const supabase = createClient();
    try {
      await supabase.storage.from("progress-photos").remove([photo.storage_path]);
      await supabase.from("progress_photos").delete().eq("id", photo.id);
      toast.success("Photo removed.");
    } catch {
      setPhotos(prev);
      toast.error("Couldn't remove the photo.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">Progress photos</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="pressable flex items-center gap-1.5 rounded-full bg-volt px-3 py-1.5 text-xs font-semibold text-volt-foreground disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          Add photo
        </button>
      </div>

      <div className="mt-1.5">
        <PrivacyNote>Progress photos are encrypted and private to your account.</PrivacyNote>
      </div>

      {loading ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton aspect-[3/4] rounded-xl" />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-8 text-center">
          <ImageOff className="h-6 w-6 text-muted-2" />
          <p className="text-xs text-muted">No photos yet. Add one to track your visual progress.</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Progress" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <p className="text-[10px] font-medium text-white">
                  {new Date(p.taken_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => remove(p)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="Delete photo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-2">Photos are private to you and stored securely.</p>
    </div>
  );
}
