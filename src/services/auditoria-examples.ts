/**
 * Exemplo de integração de Auditoria com Clientes
 * 
 * Este é um exemplo de como adicionar auditoria a qualquer serviço.
 * Copie este padrão para outros serviços (produtos, ordens, etc).
 */

import { FuncionarioContexto } from '../domains/auth/types';
import { registrarAuditoria } from '../services/firebase/auditoriaService';

// Exemplo 1: Ao criar um cliente
export async function criarClienteComAuditoria(
  empresaId: string,
  funcionario: FuncionarioContexto | null,
  dadosCliente: any
): Promise<string> {
  // 1. Criar o cliente normalmente (chamar clientService.ts)
  const clienteId = await criarCliente(empresaId, dadosCliente);
  
  // 2. Se foi criado por funcionário, registrar auditoria
  if (funcionario) {
    await registrarAuditoria(
      empresaId,
      funcionario,
      'criar_cliente',
      'clientes',
      clienteId,
      {
        nomeCli: dadosCliente.nome,
        tipoCliente: dadosCliente.tipo,
        documento: dadosCliente.documento,
      }
    );
  }
  
  return clienteId;
}

// Exemplo 2: Ao editar um cliente
export async function editarClienteComAuditoria(
  empresaId: string,
  clienteId: string,
  funcionario: FuncionarioContexto | null,
  dadosAntigos: any,
  dadosNovos: any
): Promise<void> {
  // 1. Editar o cliente normalmente
  await atualizarCliente(empresaId, clienteId, dadosNovos);
  
  // 2. Se foi editado por funcionário, registrar auditoria
  if (funcionario) {
    // Calcular o que mudou
    const mudancas: Record<string, any> = {};
    
    for (const key in dadosNovos) {
      if (dadosAntigos[key] !== dadosNovos[key]) {
        mudancas[key] = {
          de: dadosAntigos[key],
          para: dadosNovos[key],
        };
      }
    }
    
    await registrarAuditoria(
      empresaId,
      funcionario,
      'editar_cliente',
      'clientes',
      clienteId,
      dadosNovos,
      mudancas
    );
  }
}

// Exemplo 3: Ao deletar (desativar) um cliente
export async function deletarClienteComAuditoria(
  empresaId: string,
  clienteId: string,
  funcionario: FuncionarioContexto | null,
  motivoDeletion?: string
): Promise<void> {
  // 1. Deletar o cliente normalmente
  await deletarCliente(empresaId, clienteId);
  
  // 2. Se foi deletado por funcionário, registrar auditoria
  if (funcionario) {
    await registrarAuditoria(
      empresaId,
      funcionario,
      'deletar_cliente',
      'clientes',
      clienteId,
      {
        motivo: motivoDeletion || 'Não especificado',
      }
    );
  }
}

// ============================================================================
// PADRÃO PARA OUTROS SERVIÇOS
// ============================================================================

/*
 * Para produtos: mudar "cliente" por "produto"
 * Para ordens: mudar "cliente" por "ordem"
 * Para funcionários: mudar "cliente" por "funcionário"
 * 
 * Exemplo para criar produto:
 */

export async function criarProdutoComAuditoria(
  empresaId: string,
  funcionario: FuncionarioContexto | null,
  dadosProduto: any
): Promise<string> {
  const produtoId = await criarProduto(empresaId, dadosProduto);
  
  if (funcionario) {
    await registrarAuditoria(
      empresaId,
      funcionario,
      'criar_produto',
      'produtos',
      produtoId,
      {
        nome: dadosProduto.nome,
        categoria: dadosProduto.categoria,
        preco: dadosProduto.unitPrice,
      }
    );
  }
  
  return produtoId;
}

// ============================================================================
// COMO USAR NO REACT COMPONENT
// ============================================================================

/*
 * import { useFuncionario } from '../contexts/FuncionarioContext';
 * import { criarClienteComAuditoria } from '../services/auditoria-examples';
 * 
 * export const ClientForm = () => {
 *   const { funcionario } = useFuncionario();
 *   const { company } = useCompany();
 *   
 *   const handleCreate = async (dados) => {
 *     try {
 *       // Se funcionário está logado, vai registrar auditoria automaticamente
 *       const clienteId = await criarClienteComAuditoria(
 *         company.companyId,
 *         funcionario, // Se null, não registra auditoria
 *         dados
 *       );
 *       
 *       Alert.alert('Sucesso', 'Cliente criado!');
 *     } catch (error) {
 *       Alert.alert('Erro', error.message);
 *     }
 *   };
 *   
 *   return (
 *     // Form aqui
 *   );
 * };
 */

// Placeholder para imports - remover depois de implementar
function criarCliente(empresaId: string, dados: any): Promise<string> {
  throw new Error('Implementar criarCliente do clientService');
}

function atualizarCliente(empresaId: string, clienteId: string, dados: any): Promise<void> {
  throw new Error('Implementar atualizarCliente do clientService');
}

function deletarCliente(empresaId: string, clienteId: string): Promise<void> {
  throw new Error('Implementar deletarCliente do clientService');
}

function criarProduto(empresaId: string, dados: any): Promise<string> {
  throw new Error('Implementar criarProduto do produtoService');
}
