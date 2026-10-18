import { notFound } from "next/navigation";

// Any unknown path under a valid locale renders the 404 inside the localized layout.
export default function CatchAll() {
  notFound();
}
