/**
 * Valida formato do CNPJ
 */
export function validateCNPJFormat(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) {
    return false;
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
    return false;
  }

  // Valida dígitos verificadores
  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  const digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) {
    return false;
  }

  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) {
    return false;
  }

  return true;
}

/**
 * Valida se o email é corporativo (pertence à empresa)
 * Verifica se o domínio do email contém parte da razão social da empresa
 */
export function validateCorporateEmail(email: string, companyName: string): boolean {
  if (!email || !companyName) return false;

  const emailDomain = email.split('@')[1]?.toLowerCase() || '';
  const companyParts = companyName.toLowerCase().split(' ');

  // Verifica se o domínio contém alguma palavra-chave da empresa
  return companyParts.some(part => 
    part.length > 3 && emailDomain.includes(part.replace(/[^a-z0-9]/g, ''))
  );
}

/**
 * Busca dados de um CNPJ válido usando a API pública
 */
export async function fetchCNPJData(cnpj: string) {
  try {
    const cleanCNPJ = cnpj.replace(/\D/g, '');

    if (!validateCNPJFormat(cleanCNPJ)) {
      throw new Error('CNPJ inválido');
    }

    // Usar API pública do Brasil API
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);

    if (!response.ok) {
      throw new Error('CNPJ não encontrado na base de dados');
    }

    const data = await response.json();

    return {
      name: data.nome || '',
      phone: data.ddd && data.telefone ? `(${data.ddd}) ${data.telefone}` : '',
      email: data.email || '',
      street: data.logradouro || '',
      number: data.numero || '',
      complement: data.complemento || '',
      city: data.municipio || '',
      state: data.uf || '',
      zipCode: data.cep ? data.cep.replace(/\D/g, '') : '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar CNPJ';
    throw new Error(message);
  }
}
