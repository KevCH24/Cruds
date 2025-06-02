import { Contract, Server, Address, nativeToScVal, xdr } from 'soroban-client';

const RPC_URL = 'https://rpc-futurenet.stellar.org'; // usa el endpoint correcto
const CONTRACT_ID = 'TU_CONTRACT_ID_AQUI'; // reemplaza por tu ID real

const server = new Server(RPC_URL, { allowHttp: true }); // ✅ CORRECTO

export async function leerDesdeContrato(publicKey, methodName) {
  const contract = new Contract(CONTRACT_ID);
  const account = new Address(publicKey);

  try {
    const result = await server.simulateTransaction(
      contract.call(methodName, account),
      { simulate: true }
    );
    return result.result?.value().toString();
  } catch (error) {
    console.error('Error leyendo contrato:', error);
    throw error;
  }
}

export async function enviarATransaccion(publicKey, methodName, args = []) {
  const contract = new Contract(CONTRACT_ID);
  const address = new Address(publicKey);

  try {
    const tx = await contract.call(methodName, ...args).sign(address);
    const signedXDR = await window.freighterApi.signTransaction(tx.toXDR(), {
      network: 'FUTURENET',
    });

    const sendResult = await server.sendTransaction(signedXDR);
    return sendResult;
  } catch (error) {
    console.error('Error al enviar transacción:', error);
    throw error;
  }
}
