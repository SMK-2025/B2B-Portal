// Keep these rules in sync with apps/api/src/auth/password.ts.
export function passwordRequirements(password: string, confirmation?: string) {
  const populated = password.length > 0;
  const rules = [
    {
      id: "length",
      label: "12 bis 200 Zeichen",
      met: password.length >= 12 && password.length <= 200,
    },
    {
      id: "lowercase",
      label: "Mindestens ein Kleinbuchstabe (a–z, ä, ö, ü oder ß)",
      met: /[a-zäöüß]/.test(password),
    },
    {
      id: "uppercase",
      label: "Mindestens ein Großbuchstabe (A–Z, Ä, Ö oder Ü)",
      met: /[A-ZÄÖÜ]/.test(password),
    },
    {
      id: "number",
      label: "Mindestens eine Zahl",
      met: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "Mindestens ein Sonderzeichen (z. B. !, ? oder @)",
      met: /[^\p{L}\p{N}\s]/u.test(password),
    },
    {
      id: "individual",
      label: "Kein Beginn mit Passwort, Password, Qwertz, Qwerty oder 123456",
      met:
        populated &&
        !/^(?:passwort|password|qwertz|qwerty|123456)/i.test(password),
    },
    {
      id: "repetition",
      label: "Nicht dasselbe Zeichen sechsmal direkt hintereinander",
      met: populated && !/(.)\1{5,}/u.test(password),
    },
  ];
  if (confirmation !== undefined)
    rules.push({
      id: "match",
      label: "Beide Passwörter stimmen überein",
      met: populated && password === confirmation,
    });
  return rules;
}

export function passwordReady(password: string, confirmation?: string) {
  return passwordRequirements(password, confirmation).every((rule) => rule.met);
}
