import * as StellarSdk from '@stellar/stellar-sdk';
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
    serverInstance = new StellarSdk.SorobanRpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') });
  }
  if (!contractInstance) {
    contractInstance = new StellarSdk.Contract(CONTRACT_ID);
  }
  if (!networkPassphraseInstance) {
    networkPassphraseInstance = StellarSdk.Networks.TESTNET; 
  }
  return { server: serverInstance, contract: contractInstance, networkPassphrase: networkPassphraseInstance };
}


async function invokeContract(method, paramsScVal, userPublicKey) {
  console.log(`[soroban.js/invokeContract] Invoking method: ${method} with params:`, paramsScVal, `for user: ${userPublicKey}`);
  const { server, contract, networkPassphrase } = getSorobanInstances();
  const kit = await getKit(); 

  if (!kit || typeof kit.signTransaction !== 'function') {
    console.error("[soroban.js/invokeContract] StellarWalletsKit instance or signTransaction method is not available.");
    throw new Error("StellarWalletsKit or signTransaction not available for invoking contract.");
  }

  if (!userPublicKey) { 
    console.error("[soroban.js/invokeContract] User public key is required to invoke contract.");
    throw new Error("Clave pública del usuario no proporcionada para invocar contrato.");
  }

  try {
    const account = await server.getAccount(userPublicKey);
    console.log("[soroban.js/invokeContract] Account details:", account);

    const txBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: '1000000', 
      networkPassphrase: networkPassphrase,
      timebounds: await server.getTransactionTimebounds(60), 
    })
      .addOperation(contract.call(method, ...paramsScVal));

    const tx = txBuilder.build();
    console.log("[soroban.js/invokeContract] Transaction built:", tx.toXDR());

    console.log("[soroban.js/invokeContract] Requesting signature from StellarWalletsKit...");
    const signedTxXDR = await kit.signTransaction(tx.toXDR(), { 
        networkPassphrase: networkPassphrase, 
        // 'network' field might also be expected by some versions of the kit, ensure it matches WalletNetwork.TESTNET if needed
        // network: WalletNetwork.TESTNET 
    }); 
    console.log("[soroban.js/invokeContract] Transaction signed by kit:", signedTxXDR);

    const preparedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXDR, networkPassphrase);
    console.log("[soroban.js/invokeContract] Prepared transaction for submission:", preparedTx.toXDR());
    
    console.log("[soroban.js/invokeContract] Simulating transaction...");
    const simulateResponse = await server.simulateTransaction(preparedTx);
    console.log("[soroban.js/invokeContract] Simulation response:", simulateResponse);

    if (StellarSdk.SorobanRpc.isSimulationError(simulateResponse)) {
      console.error("[soroban.js/invokeContract] Transaction simulation failed:", simulateResponse);
      throw new Error(`Error en la simulación de la transacción: ${simulateResponse.error}`);
    }
    if (!simulateResponse.result?.retval) {
        if (simulateResponse.events && simulateResponse.events.length > 0) {
            console.warn("[soroban.js/invokeContract] Simulation returned no retval, but has events. Assuming success for void function or event-based confirmation.");
        } else if (method === "delete_product" || method === "update_product_inv") { 
             console.warn(`[soroban.js/invokeContract] Simulation for '${method}' returned no retval. Assuming success as it's a void-like function.`);
        } else {
            console.error("[soroban.js/invokeContract] Transaction simulation returned no result value (retval).", simulateResponse);
            throw new Error("La simulación de la transacción no devolvió un valor de resultado (retval).");
        }
    }


    console.log("[soroban.js/invokeContract] Submitting transaction...");
    const sendResponse = await server.sendTransaction(preparedTx);
    console.log("[soroban.js/invokeContract] Transaction submitted. SendResponse:", sendResponse);

    if (sendResponse.status === 'PENDING' || sendResponse.status === 'SUCCESS') {
      let getResponse = sendResponse;
      let attempts = 0;
      const maxAttempts = 20; 

      while ((getResponse.status === 'PENDING' || getResponse.status === 'NOT_FOUND') && attempts < maxAttempts) {
        attempts++;
        console.log(`[soroban.js/invokeContract] Transaction status is PENDING/NOT_FOUND. Attempt ${attempts}/${maxAttempts}. Waiting 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        getResponse = await server.getTransaction(sendResponse.hash);
        console.log(`[soroban.js/invokeContract] GetTransaction response (attempt ${attempts}):`, getResponse);
      }

      if (getResponse.status === 'SUCCESS') {
        console.log("[soroban.js/invokeContract] Transaction successful:", getResponse);
        if (getResponse.resultXdr) {
             const resultValue = StellarSdk.xdr.ScVal.fromXDR(getResponse.resultXdr, 'base64');
             console.log("[soroban.js/invokeContract] Decoded result value:", resultValue.value ? resultValue.value() : resultValue);
             return resultValue.value ? resultValue.value() : resultValue; 
        } else if (getResponse.resultMetaXdr) {
            console.warn("[soroban.js/invokeContract] Transaction successful but no resultXdr. Returning true as indication of success for void-like function.");
            return true; 
        } else {
            console.error("[soroban.js/invokeContract] Transaction successful but no resultXdr or resultMetaXdr found.");
            throw new Error("Transacción exitosa pero no se encontró resultXdr o resultMetaXdr.");
        }

      } else {
        console.error("[soroban.js/invokeContract] Transaction failed or timed out. Final status:", getResponse.status, "Response:", getResponse);
        throw new Error(`Error en la transacción: ${getResponse.status} - ${getResponse.resultXdr ? StellarSdk.xdr.ScVal.fromXDR(getResponse.resultXdr, 'base64').value() : 'No result XDR'}`);
      }
    } else {
      console.error("[soroban.js/invokeContract] Failed to submit transaction. Status:", sendResponse.status, "Response:", sendResponse);
      throw new Error(`Error al enviar la transacción: ${sendResponse.status} - ${sendResponse.errorResult?.result?.value()}`);
    }

  } catch (error) {
    console.error(`[soroban.js/invokeContract] Error invoking contract method ${method}:`, error);
    const errorMessage = error.message ? error.message : String(error);
    if (error.isSimulationError) { 
        throw new Error(`Error de simulación en ${method}: ${errorMessage}`);
    }
    throw new Error(`Error en ${method}: ${errorMessage}`);
  }
}

// --- Funciones CRUD para Productos ---

export async function getAllProducts() {
  console.log("[soroban.js/getAllProducts] Fetching all products.");
  let userPk = await getPublicKey(); 
  const { server, contract, networkPassphrase } = getSorobanInstances();

  try {
    // Para get_all_products, la cuenta de origen es necesaria para construir la transacción a simular,
    // pero no necesita ser una cuenta con fondos reales si solo estamos simulando.
    // Usamos la clave pública del usuario si está conectado, o una aleatoria si no.
    const sourceAccountForSim = userPk 
        ? new StellarSdk.Account(userPk, "1") // "1" es un placeholder para la secuencia, getAccount no es necesario para simulación.
        : new StellarSdk.Account(StellarSdk.Keypair.random().publicKey(), "1");

    const txToSimulate = new StellarSdk.TransactionBuilder(
        sourceAccountForSim,
        {
            fee: StellarSdk.SorobanRpc.MIN_RESOURCE_FEE.toString(), // Tarifa mínima para simulación
            networkPassphrase: networkPassphrase,
            timebounds: await server.getTransactionTimebounds(60), // Validez de la simulación
        }
    )
    .addOperation(contract.call("get_all_products"))
    .build();
    
    console.log(`[soroban.js/getAllProducts] Simulating get_all_products with source: ${sourceAccountForSim.accountId()}`);
    const txSim = await server.simulateTransaction(txToSimulate);

    if (StellarSdk.SorobanRpc.isSimulationError(txSim) || !txSim.result?.retval) {
      console.error("[soroban.js/getAllProducts] Simulation failed or no retval:", txSim);
      // Podríamos intentar decodificar el error de simulación si existe
      const simError = StellarSdk.SorobanRpc.isSimulationError(txSim) ? txSim.error : "No retval in simulation.";
      throw new Error(`Error al simular la obtención de todos los productos: ${simError}`);
    }
    const productsRaw = StellarSdk.xdr.ScVal.fromXDR(txSim.result.retval, 'base64').value();
    console.log("[soroban.js/getAllProducts] Products fetched (simulated):", productsRaw);
    return productsRaw.map(p => ({
      id: p.value().id.value().toString(), 
      name: p.value().name.value().toString(),
      quantity: parseInt(p.value().quantity.value().toString()), 
      price: parseInt(p.value().price.value().toString()) 
    }));

  } catch (e) {
    console.error("[soroban.js/getAllProducts] Error fetching products via simulation:", e);
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
    StellarSdk.nativeToScVal(name, { type: 'string' }), 
    StellarSdk.nativeToScVal(quantity, { type: 'u32' }),
    StellarSdk.nativeToScVal(price, { type: 'u32' })
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
    StellarSdk.nativeToScVal(productName, { type: 'string' }) 
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
    StellarSdk.nativeToScVal(productName, { type: 'string' }),    
    StellarSdk.nativeToScVal(newQuantity, { type: 'u32' }),
    StellarSdk.nativeToScVal(newPrice, { type: 'u32' })
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
//   const params = [StellarSdk.nativeToScVal(productName, { type: 'string' })];
//   // Asume que tienes una función "get_product" en tu contrato
//   const result = await invokeContract("get_product", params, userPublicKey); 
//   return result; // Adapta según la estructura de datos
// }

console.log("[soroban.js] Script loaded. CONTRACT_ID:", CONTRACT_ID);
// El siguiente bloque que llamaba a getAppFreighterModule() ha sido eliminado
// ya que getAppFreighterModule fue removida y la inicialización del kit
// ahora se maneja a través de getKit() cuando es necesario.
