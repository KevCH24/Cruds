import { 
  SorobanRpc, 
  Contract, 
  Networks, 
  Account, 
  TransactionBuilder, 
  BASE_FEE, 
  xdr, 
  Keypair, 
  nativeToScVal 
} from '@stellar/stellar-sdk';
// Importar según el ejemplo funcional
import { StellarWalletsKit, FreighterModule, WalletNetwork, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';

// --- Configuración del Contrato y Red ---
const CONTRACT_ID = 'CALK3Q2CKTYZYP2JCW7PSQQ5MI3SJ2PQCUFKKVIZHZURLOHNTGCL37WI';
const RPC_URL = 'https://soroban-testnet.stellar.org:443';

let serverInstance;
let contractInstance;
let networkPassphraseInstance;

// Instancia del Kit y estado de conexión
let walletKitInstance = null;
let connectedPublicKey = null;
let kitInitializationPromise = null;

// Inicializa StellarWalletsKit de forma segura en el cliente
function initializeKit() {
  if (typeof window === 'undefined') {
    console.error("[soroban.js/initializeKit] Attempted to initialize on the server.");
    return Promise.reject(new Error("StellarWalletsKit can only be initialized on the client-side."));
  }

  if (!kitInitializationPromise) {
    console.log("[soroban.js/initializeKit] Creating new StellarWalletsKit initialization promise.");
    kitInitializationPromise = (async () => {
      try {
        console.log("[soroban.js/initializeKit] Initializing StellarWalletsKit (inside promise).");
        
        const kit = new StellarWalletsKit({
          network: WalletNetwork.TESTNET,
          selectedWalletId: FREIGHTER_ID,
          modules: [new FreighterModule()], 
        });
        
        console.log("[soroban.js/initializeKit] StellarWalletsKit instance CREATED successfully:", kit);
        walletKitInstance = kit; 

        // No intentar getAddress aquí automáticamente; se hará a través de connectWallet o getPublicKey explícito.
        return kit;
      } catch (error) {
        console.error("[soroban.js/initializeKit] Error during StellarWalletsKit initialization:", error);
        kitInitializationPromise = null; 
        walletKitInstance = null;
        throw error;
      }
    })();
  } else {
    console.log("[soroban.js/initializeKit] Returning existing StellarWalletsKit initialization promise.");
  }
  return kitInitializationPromise;
}

// Función para obtener la instancia del kit, asegurando que esté inicializada
async function getKit() {
  if (!walletKitInstance) {
    return initializeKit();
  }
  return walletKitInstance;
}

export async function connectWallet() {
  console.log("[soroban.js/connectWallet] Attempting to connect wallet.");
  try {
    const kit = await getKit();
    console.log("[soroban.js/connectWallet] StellarWalletsKit instance obtained:", kit);

    if (!kit || typeof kit.openModal !== 'function') {
      console.error("[soroban.js/connectWallet] StellarWalletsKit instance or openModal method is not available.");
      throw new Error("StellarWalletsKit no está disponible o no tiene openModal.");
    }

    return new Promise(async (resolve, reject) => {
      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            console.log("[soroban.js/connectWallet/onWalletSelected] Wallet selected:", option);
            kit.setWallet(option.id); 
            const { address } = await kit.getAddress(); 
            connectedPublicKey = address;
            console.log("[soroban.js/connectWallet/onWalletSelected] Wallet connected. Public key:", address);
            resolve(address);
          } catch (error) {
            console.error("[soroban.js/connectWallet/onWalletSelected] Error after wallet selection:", error);
            connectedPublicKey = null;
            reject(error);
          }
        },
        onClosed: (err) => { 
            if (err) { // err puede ser un objeto Error o un string
                const errorMessage = err.message || (typeof err === 'string' ? err : "Modal closed with an unknown error");
                console.error("[soroban.js/connectWallet/onClosed] Modal closed with error:", errorMessage);
                reject(new Error(`Modal cerrado con error: ${errorMessage}`));
            } else {
                console.log("[soroban.js/connectWallet/onClosed] Modal closed without selection (user cancellation).");
                resolve(null); // Indicar que el usuario canceló o cerró el modal.
            }
        }
      });
    });
  } catch (error) {
    console.error("[soroban.js/connectWallet] Error connecting wallet:", error);
    connectedPublicKey = null;
    throw error; 
  }
}

export async function getPublicKey() {
  console.log("[soroban.js/getPublicKey] Attempting to get public key.");
  if (connectedPublicKey) {
    console.log("[soroban.js/getPublicKey] Returning cached public key:", connectedPublicKey);
    return connectedPublicKey;
  }
  
  try {
    const kit = await getKit(); 
    console.log('[soroban.js/getPublicKey] StellarWalletsKit instance obtained for getAddress:', kit);

    if (!kit || typeof kit.getAddress !== 'function') {
      console.warn('[soroban.js/getPublicKey] StellarWalletsKit instance or getAddress method is not available. Wallet likely not connected.');
      return null;
    }
    
    const { address } = await kit.getAddress();
    if (address) {
      connectedPublicKey = address; 
      console.log('[soroban.js/getPublicKey] Public key obtained via kit.getAddress():', address);
      return address;
    } else {
      console.warn('[soroban.js/getPublicKey] kit.getAddress() returned no address. Wallet likely not connected or access not granted.');
      return null;
    }
  } catch (e) {
    // Un error común aquí es "Wallet Disconnected" o similar si el usuario no ha conectado aún.
    console.warn('[soroban.js/getPublicKey] Error calling kit.getAddress():', e.message, ". Wallet likely not connected or access not granted.");
    return null; 
  }
}

// --- Funciones del Contrato Soroban ---

function getSorobanInstances() {
  if (!serverInstance) {
    serverInstance = new SorobanRpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') });
  }
  if (!contractInstance) {
    contractInstance = new Contract(CONTRACT_ID);
  }
  if (!networkPassphraseInstance) {
    networkPassphraseInstance = Networks.TESTNET; 
  }
  return { server: serverInstance, contract: contractInstance, networkPassphrase: networkPassphraseInstance };
}


async function invokeContract(method, paramsScVal, userPublicKey) {
  console.log(`[soroban.js/invokeContract] Invoking method: ${method} with params:`, paramsScVal, `for user: ${userPublicKey}`);
  const { server, contract, networkPassphrase } = getSorobanInstances();
  const kit = await getKit();
  let signedTransaction; // Declarar aquí

  if (!kit || typeof kit.signTransaction !== 'function') {
    console.error("[soroban.js/invokeContract] StellarWalletsKit instance or signTransaction method is not available.");
    throw new Error("StellarWalletsKit or signTransaction not available for invoking contract.");
  }

  if (!userPublicKey) {
    console.error("[soroban.js/invokeContract] User public key is required to invoke contract.");
    throw new Error("Clave pública del usuario no proporcionada para invocar contrato.");
  }

  try {
    const sourceAccount = new Account(userPublicKey, "0"); // Sequence "0" is a placeholder
    const txBuilder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE, 
      networkPassphrase,
      timebounds: { minTime: "0", maxTime: "0" }, // Corrected timebounds
    })
      .addOperation(contract.call(method, ...paramsScVal));

    const transactionToPrepare = txBuilder.build();
    console.log("[soroban.js/invokeContract] Transaction built for preparation:", transactionToPrepare.toXDR());

    console.log("[soroban.js/invokeContract] Preparing transaction with server...");
    const preparedTransaction = await server.prepareTransaction(transactionToPrepare);
    console.log("[soroban.js/invokeContract] Transaction prepared by server. XDR type:", typeof preparedTransaction.toXDR(), "XDR value:", preparedTransaction.toXDR());

    console.log("[soroban.js/invokeContract] Requesting signature from StellarWalletsKit for prepared transaction...");
    let signedTxResponse; // Renombrado para reflejar que puede ser un objeto
    try {
        const xdrToSign = preparedTransaction.toXDR();
        if (typeof xdrToSign !== 'string' || xdrToSign.trim() === '') {
            console.error("[soroban.js/invokeContract] XDR to sign is invalid before calling kit.signTransaction. Value:", xdrToSign);
            throw new Error("El XDR preparado para firmar es inválido.");
        }
        signedTxResponse = await kit.signTransaction(String(xdrToSign), { // Asegurar que es una cadena
            networkPassphrase: networkPassphrase, 
            accountToSign: userPublicKey,
            network: WalletNetwork.TESTNET 
        });
        console.log("[soroban.js/invokeContract] Response from kit.signTransaction (raw):", signedTxResponse);

        if (signedTxResponse && typeof signedTxResponse === 'object') {
            console.log("[soroban.js/invokeContract] Keys in signedTxResponse object:", Object.keys(signedTxResponse));
            try {
                console.log("[soroban.js/invokeContract] Stringified signedTxResponse:", JSON.stringify(signedTxResponse));
            } catch (e) {
                console.warn("[soroban.js/invokeContract] Could not stringify signedTxResponse:", e.message);
            }

            // **** DETAILED LOGGING for signedTxResponse.signedTxXdr ****
            const xdrVal = signedTxResponse.signedTxXdr;
            console.log("[soroban.js/invokeContract] DEBUG: Value of signedTxResponse.signedTxXdr (direct access):", xdrVal);
            console.log("[soroban.js/invokeContract] DEBUG: Type of signedTxResponse.signedTxXdr (direct access):", typeof xdrVal);
            if (xdrVal && typeof xdrVal.trim === 'function') {
                 console.log("[soroban.js/invokeContract] DEBUG: Is signedTxResponse.signedTxXdr a non-empty trimmed string?", xdrVal.trim() !== '');
            } else if (xdrVal) {
                console.log("[soroban.js/invokeContract] DEBUG: signedTxResponse.signedTxXdr exists but does not have a trim function. Type is:", typeof xdrVal);
            } else {
                console.log("[soroban.js/invokeContract] DEBUG: signedTxResponse.signedTxXdr is null or undefined.");
            }
            // **** END DETAILED LOGGING ****
        }

        let actualSignedXDR = null;
        if (signedTxResponse && typeof signedTxResponse === 'object') {
            // Attempt to get XDR from the known property first
            if (signedTxResponse.signedTxXdr && typeof signedTxResponse.signedTxXdr === 'string' && signedTxResponse.signedTxXdr.trim() !== '') {
                actualSignedXDR = signedTxResponse.signedTxXdr;
                console.log("[soroban.js/invokeContract] Successfully extracted XDR from signedTxResponse.signedTxXdr.");
            } else {
                console.warn("[soroban.js/invokeContract] Failed to extract XDR from signedTxResponse.signedTxXdr directly or it was invalid. Condition was: (signedTxResponse.signedTxXdr && typeof signedTxResponse.signedTxXdr === 'string' && signedTxResponse.signedTxXdr.trim() !== ''). Fallback will not be attempted for now to isolate this issue.");
                // For now, removing fallback to focus on why the primary method fails.
                // If the primary documented way (signedTxXdr) fails with Freighter, it's the core issue.
            }
        } else if (typeof signedTxResponse === 'string' && signedTxResponse.trim() !== '') { 
             actualSignedXDR = signedTxResponse;
             console.log("[soroban.js/invokeContract] signedTxResponse was a direct string.");
        }
        
        if (!actualSignedXDR || typeof actualSignedXDR !== 'string' || actualSignedXDR.trim() === '') {
            console.error("[soroban.js/invokeContract] FINAL CHECK FAILED: kit.signTransaction returned invalid or empty XDR. Extracted XDR value:", actualSignedXDR, "Original response object:", signedTxResponse);
            throw new Error("La billetera devolvió un XDR firmado inválido, vacío o en un formato inesperado.");
        }
        
        console.log("[soroban.js/invokeContract] Transaction signed by kit. Extracted XDR for processing:", actualSignedXDR);
        
        // Usar actualSignedXDR de ahora en adelante
        // La variable signedTransaction ya está declarada en el ámbito superior.
        signedTransaction = TransactionBuilder.fromXDR(actualSignedXDR, networkPassphrase);
        console.log("[soroban.js/invokeContract] Signed transaction for submission:", signedTransaction.toXDR());

    } catch (signError) {
        console.error("[soroban.js/invokeContract] Error during or immediately after kit.signTransaction:", signError);
        const errorMessage = signError && signError.message ? signError.message : String(signError);
        throw new Error(`Error durante la firma con la billetera: ${errorMessage}`);
    }

    console.log("[soroban.js/invokeContract] Simulating signed transaction...");
    const simulateResponse = await server.simulateTransaction(signedTransaction);
    console.log("[soroban.js/invokeContract] Simulation response:", simulateResponse);

    // Add detailed diagnostic logs
    console.log("[soroban.js/invokeContract] DIAGNOSTIC: SorobanRpc object (raw):", SorobanRpc);
    try {
      console.log("[soroban.js/invokeContract] DIAGNOSTIC: SorobanRpc object (stringified):", JSON.stringify(SorobanRpc));
    } catch (e) {
      console.log("[soroban.js/invokeContract] DIAGNOSTIC: Could not stringify SorobanRpc:", e.message);
    }
    if (SorobanRpc && typeof SorobanRpc === 'object') {
      const keys = Object.keys(SorobanRpc);
      console.log("[soroban.js/invokeContract] DIAGNOSTIC: Actual keys of SorobanRpc:", keys.join(', '));
      keys.forEach(key => {
        try {
          console.log(`[soroban.js/invokeContract] DIAGNOSTIC: Key "${key}", typeof value: ${typeof SorobanRpc[key]}`);
        } catch (e) {
          console.log(`[soroban.js/invokeContract] DIAGNOSTIC: Error accessing key "${key}":`, e.message);
        }
      });
    }
    console.log("[soroban.js/invokeContract] DIAGNOSTIC: SorobanRpc.isSimulationError raw value:", SorobanRpc ? SorobanRpc.isSimulationError : "SorobanRpc is null/undefined");
    console.log("[soroban.js/invokeContract] DIAGNOSTIC: typeof SorobanRpc.isSimulationError:", SorobanRpc ? typeof SorobanRpc.isSimulationError : "SorobanRpc is null/undefined");

    if (SorobanRpc && SorobanRpc.isSimulationError && SorobanRpc.isSimulationError(simulateResponse)) {
      console.error("[soroban.js/invokeContract] Transaction simulation failed:", simulateResponse);
      throw new Error(`Error en la transacción: ${simulateResponse.error || JSON.stringify(simulateResponse)}`);
    }
    if (!simulateResponse.result?.retval) {
        if (simulateResponse.events && simulateResponse.events.length > 0) {
            console.warn("[soroban.js/invokeContract] Simulation returned no retval, but has events. Assuming success for void function or event-based confirmation.");
        } else if (method === "delete_product" || method === "update_product_inv" || method === "add_product") { 
             console.warn(`[soroban.js/invokeContract] Simulation for '${method}' returned no retval. Assuming success as it's a void-like function or returns no specific data on success.`);
        } else {
            console.error("[soroban.js/invokeContract] Transaction simulation returned no result value (retval).", simulateResponse);
            throw new Error("La simulación de la transacción no devolvió un valor de resultado (retval).");
        }
    }

    // 5. Enviar la transacción firmada
    console.log("[soroban.js/invokeContract] Submitting signed transaction...");
    const sendResponse = await server.sendTransaction(signedTransaction);
    console.log("[soroban.js/invokeContract] Transaction submitted. SendResponse:", sendResponse);

    if (sendResponse.status === 'PENDING' || sendResponse.status === 'SUCCESS' || sendResponse.status === 'ERROR') { // Incluir ERROR para obtener más detalles
      let getResponse = sendResponse;
      let attempts = 0;
      const maxAttempts = 20; 

      // Si ya está en SUCCESS o ERROR, no necesitamos el bucle getTransaction para esos estados iniciales.
      if (getResponse.status === 'PENDING' || getResponse.status === 'NOT_FOUND') {
        while ((getResponse.status === 'PENDING' || getResponse.status === 'NOT_FOUND') && attempts < maxAttempts) {
          attempts++;
          console.log(`[soroban.js/invokeContract] Transaction status is PENDING/NOT_FOUND. Attempt ${attempts}/${maxAttempts}. Waiting 3 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          getResponse = await server.getTransaction(sendResponse.hash); // Usar sendResponse.hash
          console.log(`[soroban.js/invokeContract] GetTransaction response (attempt ${attempts}):`, getResponse);
        }
      }

      if (getResponse.status === 'SUCCESS') {
        console.log("[soroban.js/invokeContract] Transaction successful:", getResponse);
        if (getResponse.resultXdr) { // Soroban-RPC v0.16.0+ usa resultXdr
             const resultValue = xdr.ScVal.fromXDR(getResponse.resultXdr, 'base64');
             console.log("[soroban.js/invokeContract] Decoded result value:", resultValue.value ? resultValue.value() : resultValue);
             // Para add_product, el contrato de ejemplo podría no devolver el producto completo, sino void o un ID.
             // Ajustar según lo que realmente devuelve el contrato.
             if (method === "add_product" && resultValue.switch().name === "scvVoid") {
                console.log("[soroban.js/invokeContract] add_product returned void, assuming success.");
                return true; // O algún indicador de éxito
             }
             return resultValue.value ? resultValue.value() : resultValue; 
        } else if (getResponse.returnValue) { // Algunas versiones/casos podrían usar returnValue
            const resultValue = getResponse.returnValue; // Asumiendo que ya está en el formato deseado o es un ScVal
            console.log("[soroban.js/invokeContract] Decoded result value (from returnValue):", resultValue.value ? resultValue.value() : resultValue);
            return resultValue.value ? resultValue.value() : resultValue;
        } else if (method === "delete_product" || method === "update_product_inv" || method === "add_product") {
            console.warn("[soroban.js/invokeContract] Transaction successful for a void-like/event-based method. Returning true.");
            return true; 
        } else {
            console.error("[soroban.js/invokeContract] Transaction successful but no resultXdr or returnValue found.");
            throw new Error("Transacción exitosa pero no se encontró resultXdr o returnValue.");
        }

      } else { // FAILED, ERROR, TIMEOUT
        console.error("[soroban.js/invokeContract] Transaction failed, timed out, or error. Final status:", getResponse.status, "Response:", getResponse);
        const errorResult = getResponse.resultXdr ? xdr.ScVal.fromXDR(getResponse.resultXdr, 'base64').value() : (getResponse.errorResult?.result?.value() || 'No detailed error XDR');
        throw new Error(`Error en la transacción: ${getResponse.status} - ${JSON.stringify(errorResult)}`);
      }
    } else { // Otros estados de sendResponse no esperados (ej. ni PENDING, SUCCESS, ERROR)
      console.error("[soroban.js/invokeContract] Failed to submit transaction or unexpected status. Status:", sendResponse.status, "Response:", sendResponse);
      const errorResult = sendResponse.errorResult?.result?.value() || 'No detailed error XDR';
      throw new Error(`Error al enviar la transacción: ${sendResponse.status} - ${JSON.stringify(errorResult)}`);
    }

  } catch (error) {
    console.error(`[soroban.js/invokeContract] Error invoking contract method ${method}:`, error);
    const errorMessage = error.message || String(error);
    // No es necesario verificar error.isSimulationError aquí si el error de simulación ya se lanzó antes.
    throw new Error(`Error en ${method}: ${errorMessage}`);
  }
}

// --- Funciones CRUD para Productos ---

export async function getAllProducts() {
  console.log("[soroban.js/getAllProducts] Fetching all products.");
  const { server, contract, networkPassphrase } = getSorobanInstances();

  try {
    const randomKeypair = Keypair.random();
    const sourceAccountForSim = new Account(randomKeypair.publicKey(), "0");

    const txBuilder = new TransactionBuilder(
        sourceAccountForSim,
        {
            fee: BASE_FEE, 
            networkPassphrase: networkPassphrase,
            timebounds: { minTime: "0", maxTime: "0" },
        }
    )
    .addOperation(contract.call("get_all_products"))
    .build();
    
    console.log(`[soroban.js/getAllProducts] Built transaction for preparation with source: ${sourceAccountForSim.accountId()}`);
    
    const preparedTxToSimulate = await server.prepareTransaction(txBuilder);
    console.log(`[soroban.js/getAllProducts] Prepared transaction for simulation.`);

    const txSim = await server.simulateTransaction(preparedTxToSimulate);
    console.log("[soroban.js/getAllProducts] Simulation response:", txSim);

    // Add detailed diagnostic logs
    console.log("[soroban.js/getAllProducts] DIAGNOSTIC: SorobanRpc object (raw):", SorobanRpc);
    try {
      console.log("[soroban.js/getAllProducts] DIAGNOSTIC: SorobanRpc object (stringified):", JSON.stringify(SorobanRpc));
    } catch (e) {
      console.log("[soroban.js/getAllProducts] DIAGNOSTIC: Could not stringify SorobanRpc:", e.message);
    }
    if (SorobanRpc && typeof SorobanRpc === 'object') {
      const keys = Object.keys(SorobanRpc);
      console.log("[soroban.js/getAllProducts] DIAGNOSTIC: Actual keys of SorobanRpc:", keys.join(', '));
      keys.forEach(key => {
        try {
          console.log(`[soroban.js/getAllProducts] DIAGNOSTIC: Key "${key}", typeof value: ${typeof SorobanRpc[key]}`);
        } catch (e) {
          console.log(`[soroban.js/getAllProducts] DIAGNOSTIC: Error accessing key "${key}":`, e.message);
        }
      });
    }
    console.log("[soroban.js/getAllProducts] DIAGNOSTIC: SorobanRpc.isSimulationError raw value:", SorobanRpc ? SorobanRpc.isSimulationError : "SorobanRpc is null/undefined");
    console.log("[soroban.js/getAllProducts] DIAGNOSTIC: typeof SorobanRpc.isSimulationError:", SorobanRpc ? typeof SorobanRpc.isSimulationError : "SorobanRpc is null/undefined");


    if (SorobanRpc.isSimulationError(txSim) || !txSim.result?.retval) {
      console.error("[soroban.js/getAllProducts] Simulation failed or no retval:", txSim);
      const simError = SorobanRpc.isSimulationError(txSim) ? (txSim.error || JSON.stringify(txSim)) : "No retval in simulation.";
      throw new Error(`Error al simular la obtención de todos los productos: ${simError}`);
    }
    
    // Correctly parse the ScMap returned by the contract
    const scMapEntries = xdr.ScVal.fromXDR(txSim.result.retval, 'base64').value();
    console.log("[soroban.js/getAllProducts] Raw ScMap entries from contract:", scMapEntries);

    if (!Array.isArray(scMapEntries)) {
        console.warn("[soroban.js/getAllProducts] Expected an array of map entries, but got:", scMapEntries);
        return []; // Return empty if the structure is not as expected
    }

    return scMapEntries.map(entry => {
      const name = entry.key().value().toString(); // key() is ScString
      const dataVec = entry.val().value(); // val() is ScVec, its .value() is an array of ScVals
      return {
        id: name, // Use name as ID, as it's the key in the map
        name: name,
        quantity: parseInt(dataVec[0].value().toString()), // dataVec[0] is ScInt32 for quantity
        price: parseInt(dataVec[1].value().toString())    // dataVec[1] is ScInt32 for price
      };
    });

  } catch (e) {
    console.error("[soroban.js/getAllProducts] Error fetching products via simulation:", e);
    // Devolver un array vacío o lanzar el error puede ser preferible dependiendo de cómo la UI lo maneje.
    // Por ahora, mantenemos el retorno de un array vacío en caso de error para evitar que la UI se rompa completamente.
    return []; 
  }
}

export async function addProduct(name, quantity, price) {
  console.log(`[soroban.js/addProduct] Adding product: ${name}, Qty: ${quantity}, Price: ${price}`);
  const userPublicKey = await getPublicKey();
  if (!userPublicKey) {
    throw new Error("Se requiere conexión con la billetera para agregar productos. Por favor, conecta tu billetera.");
  }
  const params = [
    nativeToScVal(name, { type: 'string' }), 
    nativeToScVal(quantity, { type: 'i32' }), // Corrected type to i32
    nativeToScVal(price, { type: 'i32' })     // Corrected type to i32
  ];
  const result = await invokeContract("add_product", params, userPublicKey);
  console.log("[soroban.js/addProduct] Product added successfully, result:", result);
  if (result && typeof result === 'object' && result.name) { 
    return {
        id: result.id.value().toString(), 
        name: result.name.value().toString(),
        quantity: parseInt(result.quantity.value().toString()),
        price: parseInt(result.price.value().toString())
    };
  }
  // Si add_product devuelve void en el contrato pero la simulación/transacción es exitosa,
  // invokeContract podría devolver true.
  return result; // Devolver el resultado de invokeContract (puede ser el producto o true)
}

export async function deleteProduct(productName) {
  console.log(`[soroban.js/deleteProduct] Deleting product: ${productName}`);
  const userPublicKey = await getPublicKey();
  if (!userPublicKey) {
    throw new Error("Se requiere conexión con la billetera para eliminar productos. Por favor, conecta tu billetera.");
  }
  const params = [
    nativeToScVal(productName, { type: 'string' }) 
  ];
  const result = await invokeContract("delete_product", params, userPublicKey);
  console.log(`[soroban.js/deleteProduct] Product ${productName} deletion result:`, result);
  return result; // Debería ser true si la invocación fue exitosa para una función void.
}

export async function updateProductInventory(productName, newQuantity, newPrice) {
  console.log(`[soroban.js/updateProductInventory] Updating product: ${productName} to Qty: ${newQuantity}, Price: ${newPrice}`);
  const userPublicKey = await getPublicKey();
  if (!userPublicKey) {
    throw new Error("Se requiere conexión con la billetera para actualizar productos. Por favor, conecta tu billetera.");
  }
  const params = [
    nativeToScVal(productName, { type: 'string' }),    
    nativeToScVal(newQuantity, { type: 'u32' }),
    nativeToScVal(newPrice, { type: 'u32' })
  ];
  const result = await invokeContract("update_product_inv", params, userPublicKey);
  console.log("[soroban.js/updateProductInventory] Product updated successfully, result:", result);
  if (result && typeof result === 'object' && result.name) { 
    return {
        id: result.id.value().toString(),
        name: result.name.value().toString(),
        quantity: parseInt(result.quantity.value().toString()),
        price: parseInt(result.price.value().toString())
    };
  }
  return result; // Devolver el resultado de invokeContract
}

// Ejemplo de cómo podrías querer obtener detalles de un producto específico (si tu contrato lo soporta)
// export async function getProductDetails(productName) {
//   const userPublicKey = await getPublicKey();
//   if (!userPublicKey) {
//     // Considera la simulación si es una llamada de solo lectura y no se requiere firma
//     console.warn("[soroban.js/getProductDetails] No user public key. Consider read-only call if applicable.");
//     // throw new Error("Wallet connection is required."); 
//   }
//   const params = [nativeToScVal(productName, { type: 'string' })];
//   // Asume que tienes una función "get_product" en tu contrato
//   const result = await invokeContract("get_product", params, userPublicKey); 
//   return result; // Adapta según la estructura de datos
// }

console.log("[soroban.js] Script loaded. CONTRACT_ID:", CONTRACT_ID);
// El siguiente bloque que llamaba a getAppFreighterModule() ha sido eliminado
// ya que getAppFreighterModule fue removida y la inicialización del kit
// ahora se maneja a través de getKit() cuando es necesario.
