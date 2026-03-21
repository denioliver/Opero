export const isGenericUserName = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return true;
  return /^(usu[aá]rio|usuario|user)$/i.test(raw);
};

export const maskEmail = (value?: string | null) => {
  const email = (value || "").trim();
  if (!email || !email.includes("@")) return "—";

  const [namePart, domainPart] = email.split("@");
  if (!namePart || !domainPart) return "—";

  const visibleStart = namePart.slice(0, 2);
  return `${visibleStart}***@${domainPart}`;
};

export const maskPhone = (value?: string | null) => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "—";

  if (digits.length <= 4) {
    return `${"*".repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`;
  }

  const ddd = digits.slice(0, 2);
  const finalPart = digits.slice(-4);
  return `(${ddd}) *****-${finalPart}`;
};

export const maskDocument = (value?: string | null) => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "—";

  if (digits.length <= 4) {
    return `${"*".repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`;
  }

  const hidden = "*".repeat(Math.max(0, digits.length - 4));
  return `${hidden}${digits.slice(-4)}`;
};

export const maskAddressLine = (value?: string | null) => {
  const text = (value || "").trim();
  if (!text) return "—";
  return "Endereço oculto";
};
