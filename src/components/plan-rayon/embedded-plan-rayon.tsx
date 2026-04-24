"use client";

import { useEffect, useRef } from "react";

function resizeIframe(iframe: HTMLIFrameElement | null) {
  if (!iframe) return;
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;
    const body = doc.body;
    const html = doc.documentElement;
    if (!body || !html) return;
    const nextHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight,
      900,
    );
    iframe.style.height = `${nextHeight}px`;
  } catch {
    // Same-origin is expected here; if it fails, keep the fallback height.
  }
}

export function EmbeddedPlanRayon() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let observer: ResizeObserver | null = null;
    let intervalId: number | null = null;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        doc.body.classList.add("embed");
        resizeIframe(iframe);

        observer = new ResizeObserver(() => resizeIframe(iframe));
        observer.observe(doc.body);
        observer.observe(doc.documentElement);

        intervalId = window.setInterval(() => resizeIframe(iframe), 1200);
      } catch {
        // Ignore if the iframe isn't accessible yet.
      }
    };

    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
      observer?.disconnect();
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="Plan de rayon"
      src="/plan-de-rayon.html"
      style={{
        width: "100%",
        minHeight: 980,
        border: "none",
        display: "block",
        background: "transparent",
      }}
    />
  );
}
