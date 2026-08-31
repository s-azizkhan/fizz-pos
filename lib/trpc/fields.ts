// ponytail: `as never` beats hand-writing 11 input types — the zod schema on
// the procedure is the real trust boundary, and the `formData: FormData` param
// these calls used to take was just as untyped.
export const fields = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form)) as never;
