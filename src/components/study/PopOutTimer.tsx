import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PipApi = { requestWindow: (o: { width: number; height: number }) => Promise<Window> };

function copyStyles(target: Window) {
  for (const node of Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))) {
    target.document.head.appendChild(node.cloneNode(true));
  }
  target.document.documentElement.className = document.documentElement.className;
  target.document.body.className = "bg-background text-foreground";
}

export function usePopOut() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const win = useRef<Window | null>(null);

  const close = useCallback(() => {
    win.current?.close();
    win.current = null;
    setContainer(null);
  }, []);

  const open = useCallback(async () => {
    if (win.current) {
      win.current.focus();
      return;
    }
    const pip = (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture;
    let w: Window | null = null;
    try {
      if (pip) w = await pip.requestWindow({ width: 320, height: 210 });
    } catch {
      w = null;
    }
    if (!w) {
      w = window.open("", "focus-timer-popout", "popup=yes,width=340,height=240");
      if (w) w.document.title = "Focus Timer";
    }
    if (!w) return;
    copyStyles(w);
    const mount = w.document.createElement("div");
    w.document.body.appendChild(mount);
    win.current = w;
    setContainer(mount);
    w.addEventListener("pagehide", () => {
      win.current = null;
      setContainer(null);
    });
  }, []);

  useEffect(() => () => win.current?.close(), []);

  return { container, open, close, isOpen: container !== null };
}

export function PopOut({ container, children }: { container: HTMLElement | null; children: React.ReactNode }) {
  if (!container) return null;
  return createPortal(children, container);
}
