import { redirect } from "next/navigation";

export default function DevIndex(): never {
  redirect("/dev/preview");
}
