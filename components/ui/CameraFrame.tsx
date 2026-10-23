"use client";

import { useEffect, useRef, useState } from "react";
import { canShareFile, chooseSaveRoute, dataUrlToFile, isTouchDevice, takePhoto } from "@/lib/capture";
import { sound } from "@/lib/sound";
import { useBrush } from "@/lib/store";
import { CameraIcon } from "./icons";

const FLASH_MS = 260;
const POLAROID_MS = 3200;

/**
 * The viewfinder: a solid camera body around an open window onto the scene. The body hides the tool windows;
 * the open middle passes pointers through, so dragging still turns the pumpkin.
 */
export default function CameraFrame() {
  const setCamera = useBrush((s) => s.setCamera);
  const hole = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  /** The photo shown big to press and hold, for a phone whose browser cannot open the share sheet. */
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCamera(false);
      else if (e.key === "Enter" || e.key === " ") shoot();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!photo) return;
    const t = setTimeout(() => setPhoto(null), POLAROID_MS);
    return () => clearTimeout(t);
  }, [photo]);

  function shoot() {
    if (!hole.current) return;
    const url = takePhoto(hole.current.getBoundingClientRect());
    if (!url) return;
    sound.shutter();
    setFlash(true);
    setTimeout(() => setFlash(false), FLASH_MS);
    setPhoto(url);

    const file = dataUrlToFile(url, "my-pumpkin.png");
    const route = chooseSaveRoute({ touch: isTouchDevice(), canShareFiles: canShareFile(file) });
    if (route === "share") {
      // Called straight from the tap, as browsers insist. Closing the sheet without choosing is not an error; a real failure falls back to the preview.
      navigator.share({ files: [file], title: "My pumpkin" }).catch((e: unknown) => {
        const name = e instanceof Error ? e.name : "";
        if (name !== "AbortError" && name !== "InvalidStateError") setPreview(url);
      });
    } else if (route === "preview") {
      setPreview(url);
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-pumpkin.png";
      a.click();
    }
  }

  return (
    <div className="cam" data-floating>
      <div className="float cam-bar cam-top" aria-hidden="true">
        <span className="cam-lens-ring" />
        <span className="cam-grille" />
        <span className="cam-led" />
      </div>
      <div className="float cam-bar cam-left" aria-hidden="true" />
      <div className="float cam-bar cam-right" aria-hidden="true" />
      <div className="float cam-bar cam-bottom">
        <button className="key cam-exit" onClick={() => setCamera(false)} aria-label="Close camera">
          <span className="key-label">Back</span>
        </button>
        <button className="shutter" onClick={shoot} aria-label="Capture">
          <CameraIcon />
        </button>
        <p className="cam-hint">Drag to turn · scroll to zoom</p>
      </div>
      <div className="cam-hole" ref={hole} aria-hidden="true">
        <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
        <i className="cross" />
      </div>
      {flash && <div className="cam-flash" />}
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="polaroid" src={photo} alt="Your photo" />
      )}
      {preview && (
        <div className="save-sheet" role="dialog" aria-label="Save your photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your photo" />
          <p>Press and hold the picture, then choose Save to Photos.</p>
          <button className="key" onClick={() => setPreview(null)}>
            <span className="key-label">Done</span>
          </button>
        </div>
      )}
    </div>
  );
}
