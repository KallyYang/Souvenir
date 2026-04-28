"use client";

import { useRef, useState } from "react";
import type { MemoryEntry } from "@/lib/memories";

interface Props {
  date: string;
  entry: MemoryEntry | null;
  onChange: (entry: MemoryEntry | null, date: string) => void;
}

export default function DayDetail({ date, entry, onChange }: Props) {
  const [note, setNote] = useState(entry?.note || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePickFile(file: File) {
    if (!file) return;
    setError(null);
    setInfo(null);

    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) {
      setError("图片大小不能超过 10MB");
      return;
    }

    setUploading(true);
    try {
      const sigRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, contentType: file.type }),
      });
      if (!sigRes.ok) {
        const data = await sigRes.json().catch(() => ({}));
        throw new Error(data.error || "获取上传地址失败");
      }
      const { uploadUrl, key, publicUrl } = (await sigRes.json()) as {
        uploadUrl: string;
        key: string;
        publicUrl: string;
      };

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`上传到 R2 失败 (${putRes.status})`);
      }

      const saveRes = await fetch("/api/memories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          imageKey: key,
          imageUrl: publicUrl,
          note,
        }),
      });
      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }
      const { entry: saved } = (await saveRes.json()) as {
        entry: MemoryEntry;
      };
      onChange(saved, date);
      setInfo("图片已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSaveNote() {
    if (!entry) {
      setError("请先上传一张图片");
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/memories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }
      const { entry: saved } = (await res.json()) as { entry: MemoryEntry };
      onChange(saved, date);
      setInfo("备注已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    if (!confirm("确定要删除这一天的回忆吗？")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/memories?date=${encodeURIComponent(date)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "删除失败");
      }
      onChange(null, date);
      setNote("");
      setInfo("已删除");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  const noteChanged = (entry?.note || "") !== note;

  return (
    <div className="mt-4 space-y-4">
      <div>
        {entry?.imageUrl ? (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="group relative block w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 text-left dark:border-neutral-800 dark:bg-neutral-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.imageUrl}
              alt={`${date} 的回忆`}
              className="h-auto w-full object-cover transition group-hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/55 via-black/10 to-transparent px-3 py-3 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
              <span className="text-xs font-medium">点击放大查看</span>
              <span className="text-lg leading-none">↗</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500 transition hover:border-orange-400 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/50"
          >
            <span className="text-2xl">＋</span>
            <span>{uploading ? "上传中…" : "点击添加今天的图片"}</span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePickFile(f);
          }}
        />

        {entry?.imageUrl ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              {uploading ? "上传中…" : "替换图片"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              删除
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="note"
          className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300"
        >
          备注（可选）
        </label>
        <div className="relative">
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="写下这一天值得记住的事…"
            maxLength={2000}
            rows={4}
            className="block w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100 dark:focus:ring-neutral-100/10"
          />
          {entry && noteChanged ? (
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={saving}
              className="absolute bottom-3 right-3 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
            >
              {saving ? "保存中…" : "保存"}
            </button>
          ) : null}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            {note.length}/2000
          </span>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600 dark:bg-green-950/40 dark:text-green-400">
          {info}
        </p>
      ) : null}

      {previewOpen && entry?.imageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
          >
            ×
          </button>
          <div
            className="max-h-full max-w-5xl overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.imageUrl}
              alt={`${date} 的回忆大图`}
              className="max-h-[88vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
