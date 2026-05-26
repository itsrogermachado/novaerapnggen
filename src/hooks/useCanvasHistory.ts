import { useState, useCallback, useEffect } from "react";
import { CanvasState } from "@/types/canvas";
import { getStateSignature } from "@/lib/layout-utils";

export function useCanvasHistory({
  currentState,
  setters
}: {
  currentState: CanvasState;
  setters: {
    setBgUrl: (v: string | null) => void;
    setBgUrlSigned: (v: string | null) => void;
    setBgImg: (v: HTMLImageElement | null) => void;
    setForegrounds: (v: CanvasState["foregrounds"] | ((prev: CanvasState["foregrounds"]) => CanvasState["foregrounds"])) => void;
    setLogo: (v: CanvasState["logo"]) => void;
    setTexts: (v: CanvasState["texts"]) => void;
    setFormat: (v: CanvasState["format"]) => void;
    setSelectedId: (v: string | null) => void;
  }
}) {
  const [past, setPast] = useState<CanvasState[]>([]);
  const [future, setFuture] = useState<CanvasState[]>([]);



  const saveToHistory = useCallback(() => {
    const currentSig = getStateSignature(currentState);

    setPast((prev) => {
      if (prev.length > 0) {
        const lastSig = getStateSignature(prev[prev.length - 1]);
        if (lastSig === currentSig) {
          return prev;
        }
      }
      const newPast = [...prev, currentState];
      if (newPast.length > 50) {
        newPast.shift();
      }
      return newPast;
    });
    setFuture([]);
  }, [currentState]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    setPast(newPast);
    setFuture((prev) => [currentState, ...prev]);

    setters.setBgUrl(previous.bgUrl);
    setters.setBgUrlSigned(previous.bgUrlSigned);
    setters.setBgImg(previous.bgImg);
    setters.setForegrounds(previous.foregrounds);
    setters.setLogo(previous.logo);
    setters.setTexts(previous.texts);
    setters.setFormat(previous.format);
  }, [past, currentState, setters]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast((prev) => [...prev, currentState]);
    setFuture(newFuture);

    setters.setBgUrl(next.bgUrl);
    setters.setBgUrlSigned(next.bgUrlSigned);
    setters.setBgImg(next.bgImg);
    setters.setForegrounds(next.foregrounds);
    setters.setLogo(next.logo);
    setters.setTexts(next.texts);
    setters.setFormat(next.format);
  }, [future, currentState, setters]);

  const goToHistoryState = useCallback((targetState: CanvasState, index: number, type: "past" | "future") => {
    if (type === "past") {
      const newPast = past.slice(0, index);
      const newFuture = [...past.slice(index + 1), currentState, ...future];
      setPast(newPast);
      setFuture(newFuture);
    } else {
      const newPast = [...past, currentState, ...future.slice(0, index)];
      const newFuture = future.slice(index + 1);
      setPast(newPast);
      setFuture(newFuture);
    }

    setters.setBgUrl(targetState.bgUrl);
    setters.setBgUrlSigned(targetState.bgUrlSigned);
    setters.setBgImg(targetState.bgImg);
    setters.setForegrounds(targetState.foregrounds);
    setters.setLogo(targetState.logo);
    setters.setTexts(targetState.texts);
    setters.setFormat(targetState.format);
    setters.setSelectedId(null);
  }, [past, future, currentState, setters]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditingText =
        activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
      if (isEditingText) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          undo();
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return { past, future, setPast, setFuture, saveToHistory, undo, redo, goToHistoryState };
}
