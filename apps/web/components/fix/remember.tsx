"use client";

import { useEffect } from "react";

export const MILESTONES_KEY = "unstuck.milestones";
const MAX = 50;

export function readRemembered(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(MILESTONES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function forget(id: string): string[] {
  const next = readRemembered().filter((v) => v !== id);
  try {
    window.localStorage.setItem(MILESTONES_KEY, JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
}

/** Keeps the milestones opened in this browser, newest first, for the /m list. Nothing leaves the browser. */
export function RememberMilestone({ id }: { id: string }) {
  useEffect(() => {
    try {
      const next = [id, ...readRemembered().filter((v) => v !== id)].slice(0, MAX);
      window.localStorage.setItem(MILESTONES_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked (private mode): the list page explains how to find milestones again.
    }
  }, [id]);
  return null;
}
