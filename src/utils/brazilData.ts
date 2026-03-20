import { cleanFormat } from "./formatters";
import { fetchCNPJData, validateCNPJFormat } from "./cnpjValidation";

export interface CPFPublicData {
  name: string;
}

export interface CEPPublicData {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
}

export function validateCPFFormat(cpf: string): boolean {
  const cleanCPF = cleanFormat(cpf);

  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

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

  return cleanCPF === `${baseDigits}${firstDigit}${secondDigit}`;
}

export async function fetchCPFData(cpf: string): Promise<CPFPublicData> {
  const cleanCPF = cleanFormat(cpf);

  if (!validateCPFFormat(cleanCPF)) {
    throw new Error("CPF inválido");
  }

  const response = await fetch(`https://brasilapi.com.br/api/cpf/v1/${cleanCPF}`);

  if (!response.ok) {
    throw new Error("CPF não encontrado na base de dados");
  }

  const data = await response.json();

  return {
    name: data?.name || data?.nome || data?.full_name || data?.nome_completo || "",
  };
}

export async function fetchAddressByCEP(cep: string): Promise<CEPPublicData> {
  const cleanCEP = cleanFormat(cep);

  if (cleanCEP.length !== 8) {
    throw new Error("CEP inválido");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);

  if (!response.ok) {
    throw new Error("CEP não encontrado");
  }

  const data = await response.json();

  if (data?.erro) {
    throw new Error("CEP não encontrado");
  }

  return {
    street: data.logradouro || "",
    neighborhood: data.bairro || "",
    city: data.localidade || "",
    state: data.uf || "",
    complement: data.complemento || "",
  };
}

export { fetchCNPJData, validateCNPJFormat };
