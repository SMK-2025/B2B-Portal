type SetupValues = Partial<Record<string, unknown>>;

// Keep publication requirements in sync with NetworksService.saveProfile.
const groups = [
  { title: 'Unternehmen', step: 0, fields: [['companyName', 2], ['tagline', 5], ['description', 30], ['street', 3], ['postalCode', 4], ['city', 2], ['country', 2]] },
  { title: 'Leistungen', step: 1, fields: [['services', 10]] },
  { title: 'Kontakt', step: 3, fields: [['contactName', 3], ['contactPosition', 2], ['contactEmail', 3], ['contactPhone', 5]] },
] as const;

export function companySetupProgress(values: SetupValues | null | undefined) {
  const checks = groups.map(group => ({
    title: group.title,
    step: group.step,
    complete: group.fields.every(([key, minimum]) => {
      const value = String(values?.[key] ?? '').trim();
      return value.length >= minimum && (key !== 'contactEmail' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    }),
  }));
  const completed = checks.filter(check => check.complete).length;
  return { checks, completed, total: checks.length, ready: completed === checks.length, nextStep: checks.find(check => !check.complete)?.step ?? 3 };
}
