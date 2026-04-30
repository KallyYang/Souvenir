"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import type { MemoryEntry } from "@/lib/memories";

const CROP_MODES = [
  { value: "free", label: "自由裁切" },
  { value: "square", label: "1:1", aspect: 1 },
  { value: "standard", label: "4:3", aspect: 4 / 3 },
  { value: "widescreen", label: "16:9", aspect: 16 / 9 },
] as const;

const MIN_CROP_SIZE = 80;

type CropMode = (typeof CROP_MODES)[number]["value"];

interface Props {
  date: string;
  entry: MemoryEntry | null;
  onChange: (entry: MemoryEntry | null, date: string) => void;
  imageDirection?: "left" | "right";
}

function getCenteredAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

function getDefaultFreeCrop(): Crop {
  return {
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };
}

export default function DayDetail({ date, entry, onChange, imageDirection = "left" }: Props) {
  const [note, setNote] = useState(entry?.note || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<CropMode>("free");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [cropViewport, setCropViewport] = useState<{ width: number; height: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);

  const [displayedDate, setDisplayedDate] = useState(date);
  const [displayedEntry, setDisplayedEntry] = useState<MemoryEntry | null>(entry);
  const [imagePhase, setImagePhase] = useState<"idle" | "exit" | "enter">("idle");
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const IMAGE_ANIM_DURATION = 200;

  useEffect(() => {
    if (date === displayedDate) {
      setDisplayedEntry(entry);
      return;
    }
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    setImagePhase("exit");
    exitTimerRef.current = setTimeout(() => {
      setDisplayedDate(date);
      setDisplayedEntry(entry);
      setImagePhase("enter");
      enterTimerRef.current = setTimeout(() => {
        setImagePhase("idle");
      }, IMAGE_ANIM_DURATION);
    }, IMAGE_ANIM_DURATION);
  }, [date, entry, displayedDate]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setNote(entry?.note || "");
    setError(null);
    setInfo(null);
  }, [date, entry?.note]);

  useLayoutEffect(() => {
    if (!cropOpen) {
      setCropViewport(null);
      return;
    }

    const element = cropContainerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCropViewport({ width: rect.width, height: rect.height });
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [cropOpen]);

  function resetCropState() {
    setCropMode("free");
    setCrop(undefined);
    setCompletedCrop(undefined);
    setImageSize(null);
    cropImageRef.current = null;
  }

  function openCropper(file: File) {
    setError(null);
    setInfo(null);

    const MAX = 50 * 1024 * 1024;
    if (file.size > MAX) {
      setError("图片大小不能超过 50MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSourceFile(file);
    setCropImageUrl(objectUrl);
    resetCropState();
    setCropOpen(true);
  }

  function closeCropper() {
    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }
    setCropOpen(false);
    setSourceFile(null);
    setCropImageUrl(null);
    resetCropState();
  }

  function applyCropMode(mode: CropMode, width: number, height: number) {
    const selectedMode = CROP_MODES.find((item) => item.value === mode);
    const aspect = selectedMode && "aspect" in selectedMode ? selectedMode.aspect : undefined;
    const nextCrop = aspect
      ? getCenteredAspectCrop(width, height, aspect)
      : getDefaultFreeCrop();

    setCropMode(mode);
    setCrop(nextCrop);
  }

  async function createCroppedFile(): Promise<File> {
    if (!cropImageRef.current || !completedCrop || !sourceFile) {
      throw new Error("裁切信息不完整");
    }

    const canvas = document.createElement("canvas");
    const scaleX = cropImageRef.current.naturalWidth / cropImageRef.current.width;
    const scaleY = cropImageRef.current.naturalHeight / cropImageRef.current.height;
    const pixelWidth = Math.max(1, Math.floor(completedCrop.width * scaleX));
    const pixelHeight = Math.max(1, Math.floor(completedCrop.height * scaleY));
    const pixelX = Math.floor(completedCrop.x * scaleX);
    const pixelY = Math.floor(completedCrop.y * scaleY);

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法创建裁切画布");
    }

    ctx.drawImage(
      cropImageRef.current,
      pixelX,
      pixelY,
      pixelWidth,
      pixelHeight,
      0,
      0,
      pixelWidth,
      pixelHeight,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), sourceFile.type || "image/png", 0.92);
    });

    if (!blob) {
      throw new Error("裁切导出失败");
    }

    return new File([blob], sourceFile.name, {
      type: blob.type || sourceFile.type,
      lastModified: Date.now(),
    });
  }

  async function handlePickFile(file: File) {
    if (!file) return;
    openCropper(file);
  }

  async function handleConfirmCrop() {
    let file: File;
    try {
      file = await createCroppedFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "裁切失败");
      return;
    }

    closeCropper();

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
        <div
          className={[
            "image-anim",
            imagePhase === "exit"
              ? imageDirection === "left"
                ? "image-anim-exit-left"
                : "image-anim-exit-right"
              : "",
            imagePhase === "enter"
              ? imageDirection === "left"
                ? "image-anim-enter-left"
                : "image-anim-enter-right"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {displayedEntry?.imageUrl ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="group relative block w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 text-left dark:border-neutral-800 dark:bg-neutral-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayedEntry.imageUrl}
                alt={`${displayedDate} 的回忆`}
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
        </div>

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

        {displayedEntry?.imageUrl ? (
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

      {previewOpen && displayedEntry?.imageUrl ? (
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
              src={displayedEntry.imageUrl}
              alt={`${displayedDate} 的回忆大图`}
              className="max-h-[88vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      ) : null}

      {cropOpen && cropImageUrl ? (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="flex h-dvh flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
              <h3 className="text-sm font-medium">裁切图片</h3>
              <button
                type="button"
                onClick={closeCropper}
                className="rounded-md px-3 py-1 text-sm transition hover:bg-white/10"
              >
                取消
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-stretch px-4 py-4">
              <div className="mx-auto grid h-full max-h-full w-full max-w-7xl min-h-0 gap-4 overflow-hidden grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-1">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-sm font-medium text-white">裁切比例</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CROP_MODES.map((mode) => {
                      const active = cropMode === mode.value;

                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => {
                            if (!imageSize) {
                              setCropMode(mode.value);
                              return;
                            }

                            applyCropMode(mode.value, imageSize.width, imageSize.height);
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            active
                              ? "bg-white text-neutral-900"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-white/70">
                    自由裁切模式下可以直接拖动四边和四角，自由调整宽高比例。
                  </p>
                </div>

                <div className="flex min-w-0 min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div
                    ref={cropContainerRef}
                    className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-xl"
                  >
                    <ReactCrop
                      crop={crop}
                      onChange={(nextCrop) => setCrop(nextCrop)}
                      onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                      aspect={(() => {
                        const mode = CROP_MODES.find((item) => item.value === cropMode);
                        return mode && "aspect" in mode ? mode.aspect : undefined;
                      })()}
                      minWidth={MIN_CROP_SIZE}
                      minHeight={MIN_CROP_SIZE}
                      keepSelection
                      ruleOfThirds
                      style={
                        cropViewport
                          ? { maxWidth: cropViewport.width, maxHeight: cropViewport.height }
                          : { maxWidth: "100%", maxHeight: "100%" }
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={cropImageRef}
                        src={cropImageUrl}
                        alt="待裁切图片"
                        onLoad={(e) => {
                          const { width, height } = e.currentTarget;
                          setImageSize({ width, height });
                          applyCropMode(cropMode, width, height);
                        }}
                        style={
                          cropViewport
                            ? {
                                maxWidth: cropViewport.width,
                                maxHeight: cropViewport.height,
                                width: "auto",
                                height: "auto",
                              }
                            : { maxWidth: "100%", maxHeight: "100%" }
                        }
                        className="block object-contain"
                      />
                    </ReactCrop>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-4 text-white">
              <span className="text-xs text-white/70">
                拖动裁切框可移动，拖拽边角可调整大小；固定比例模式下会锁定比例。
              </span>
              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={!completedCrop?.width || !completedCrop?.height}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                使用裁切结果
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
