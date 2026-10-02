import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/** Shows server-side validation errors on the matching form fields. */
export function applyFieldErrors<T extends FieldValues>(
  form: { setError: UseFormSetError<T> },
  fieldErrors: Record<string, string[]> | undefined,
) {
  if (!fieldErrors) return;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) {
      form.setError(field as Path<T>, { type: "server", message: messages[0] });
    }
  }
}
