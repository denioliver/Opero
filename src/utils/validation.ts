/**
 * Validações para o app
 */

export const validateEmail = (email: string): { valid: boolean; message?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { valid: false, message: 'Email é obrigatório' };
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Email inválido' };
  }
  
  return { valid: true };
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (!password) {
    return { valid: false, message: 'Senha é obrigatória' };
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'Senha deve ter no mínimo 6 caracteres' };
  }
  
  return { valid: true };
};

export const validateCredentials = (email: string, password: string) => {
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return emailValidation;
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return passwordValidation;
  }
  
  return { valid: true };
};

/**
 * Valida CPF com algoritmo oficial (dígitos verificadores)
 */
export const validateCPFWithName = async (
  cpf: string,
  ownerName: string
): Promise<{ valid: boolean; message?: string }> => {
  const cleanCPF = cpf.replace(/\D/g, "");

  if (cleanCPF.length !== 11) {
    return { valid: false, message: "CPF deve ter 11 dígitos" };
  }

  if (!ownerName.trim()) {
    return { valid: false, message: "Nome do proprietário é obrigatório" };
  }

  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return { valid: false, message: "CPF inválido" };
  }

  const calculateDigit = (digits: string, factor: number) => {
    let total = 0;
    for (let i = 0; i < digits.length; i += 1) {
      total += Number(digits[i]) * (factor - i);
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const baseDigits = cleanCPF.slice(0, 9);
  const firstDigit = calculateDigit(baseDigits, 10);
  const secondDigit = calculateDigit(`${baseDigits}${firstDigit}`, 11);

  const isValid = cleanCPF === `${baseDigits}${firstDigit}${secondDigit}`;

  if (!isValid) {
    return { valid: false, message: "CPF inválido" };
  }

  const normalizeText = (text: string) => {
    return text
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const areNamesCompatible = (providedName: string, returnedName: string) => {
    const provided = normalizeText(providedName);
    const returned = normalizeText(returnedName);

    if (!provided || !returned) return false;
    if (provided === returned) return true;
    if (provided.includes(returned) || returned.includes(provided)) return true;

    const providedTokens = provided
      .split(" ")
      .filter((token) => token.length > 2);
    const returnedTokens = returned
      .split(" ")
      .filter((token) => token.length > 2);

    if (!providedTokens.length || !returnedTokens.length) return false;

    const commonTokens = providedTokens.filter((token) => returnedTokens.includes(token));
    const minTokenMatch = Math.max(2, Math.ceil(Math.min(providedTokens.length, returnedTokens.length) * 0.5));

    return commonTokens.length >= minTokenMatch;
  };

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cpf/v1/${cleanCPF}`);

    if (response.ok) {
      const data = await response.json();
      const returnedName = data?.name || data?.nome || data?.full_name || data?.nome_completo;

      if (returnedName && !areNamesCompatible(ownerName, returnedName)) {
        return { valid: false, message: `Nome não condiz com o CPF informado. Cadastro encontrado: "${returnedName}"` };
      }
    }
  } catch (error) {
    // Se provedor externo falhar, mantém validação local de CPF para não bloquear cadastro indevidamente
  }

  return { valid: true };
};

/**
 * Valida CNPJ contra a razão social da empresa usando BrasilAPI
 */
export const validateCNPJWithName = async (
  cnpj: string,
  companyName: string
): Promise<{ valid: boolean; message?: string; registeredName?: string }> => {
  const cleanCNPJ = cnpj.replace(/\D/g, "");

  if (cleanCNPJ.length !== 14) {
    return { valid: false, message: "CNPJ deve ter 14 dígitos" };
  }

  if (!companyName.trim()) {
    return { valid: false, message: "Razão social é obrigatória" };
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);

    if (response.status === 404) {
      return { valid: false, message: "CNPJ não encontrado na base de dados" };
    }

    if (!response.ok) {
      return { valid: false, message: "Erro ao validar CNPJ. Tente novamente" };
    }

    const data = await response.json();

    const registeredName = data.razao_social || data.nome || data.nome_fantasia;

    if (!registeredName) {
      return { valid: false, message: "CNPJ inválido" };
    }

    const removeBusinessSuffixes = (text: string) => {
      return text
        .replace(/\b(LTDA|LTD|S\/?A|SA|ME|MEI|EIRELI|SLU|SS|S\/?S|EPP|SIMPLES)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const normalizeText = (text: string) => {
      return text
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const registeredNameNormalized = normalizeText(removeBusinessSuffixes(registeredName));
    const inputNameNormalized = normalizeText(removeBusinessSuffixes(companyName));

    const areNamesCompatible = () => {
      if (!registeredNameNormalized || !inputNameNormalized) return false;

      if (registeredNameNormalized === inputNameNormalized) return true;

      if (
        registeredNameNormalized.includes(inputNameNormalized) ||
        inputNameNormalized.includes(registeredNameNormalized)
      ) {
        return true;
      }

      const registeredTokens = registeredNameNormalized
        .split(" ")
        .filter((token: string) => token.length > 2);
      const inputTokens = inputNameNormalized
        .split(" ")
        .filter((token: string) => token.length > 2);

      if (!registeredTokens.length || !inputTokens.length) return false;

      const commonTokens = inputTokens.filter((token: string) =>
        registeredTokens.includes(token)
      );

      const minMatches = Math.max(
        2,
        Math.ceil(Math.min(registeredTokens.length, inputTokens.length) * 0.5)
      );

      return commonTokens.length >= minMatches;
    };

    if (!areNamesCompatible()) {
      return {
        valid: false,
        message: `Razão social não condiz. CNPJ registrado como: "${registeredName}"`,
        registeredName,
      };
    }

    return { valid: true, registeredName };
  } catch (error) {
    return { valid: false, message: "Erro ao validar CNPJ. Tente novamente" };
  }
};
