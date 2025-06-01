import { SorobanRpc, xdr } from '@stellar/stellar-sdk';

const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
const networkPassphrase = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE;

export async function invoke(method, ...args) {
    try {
        const server = new SorobanRpc.Server(rpcUrl);
        
        // Convertimos los argumentos a valores que Soroban entienda
        const convertedArgs = args.map(arg => {
            if (typeof arg === 'string') {
                return xdr.ScVal.scvSymbol(arg);
            }
            // Aquí podrías añadir más conversiones para otros tipos
            return arg;
        });

        const operation = new SorobanRpc.InvokeHostFunctionOperation({
            function: method,
            contractId,
            args: convertedArgs
        });

        // Simulación de transacción (en realidad necesitarías firmar)
        const simulation = await server.simulateTransaction(
            new SorobanRpc.TransactionBuilder(
                await server.getAccount(contractId), 
                { networkPassphrase }
            )
            .addOperation(operation)
            .build()
        );

        return simulation.result.retval;
    } catch (error) {
        console.error("Error invoking contract:", error);
        throw error;
    }
}