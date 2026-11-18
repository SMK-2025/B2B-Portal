"use client";

import { passwordRequirements } from "../lib/password-requirements";
import "./password-requirements.css";

export function PasswordRequirements({
  password,
  confirmation,
  id,
}: {
  password: string;
  confirmation?: string;
  id: string;
}) {
  const rules = passwordRequirements(password, confirmation);
  const remaining = rules.filter((rule) => !rule.met).length;
  return (
    <div className="passwordRequirements full" id={id}>
      <p className="passwordRequirementsTitle">
        Das Passwort muss alle Kriterien erfüllen:
      </p>
      <ul>
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={rule.met ? "passwordRuleMet" : "passwordRuleMissing"}
          >
            <span aria-hidden="true">{rule.met ? "✓" : "○"}</span>
            <span className="sr-only">
              {rule.met ? "Erfüllt: " : "Noch nicht erfüllt: "}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>
      <p
        role="status"
        aria-live="polite"
        className="passwordRequirementsSummary"
      >
        {remaining
          ? `Noch ${remaining} ${remaining === 1 ? "Kriterium offen" : "Kriterien offen"}.`
          : "Alle Kriterien erfüllt. Das Passwort kann gespeichert werden."}
      </p>
    </div>
  );
}
