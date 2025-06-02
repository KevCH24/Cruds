import { createContext, useContext, useState } from 'react';

// Creamos el contexto
export const WalletContext = createContext();

// Proveedor del contexto
export function WalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null);

  const connectWallet = async () => {
    try {
      const pk = await window.freighterApi.getPublicKey();
      setPublicKey(pk);
    } catch (e) {
      console.error('Error al conectar con Freighter:', e);
    }
  };

  return (
    <WalletContext.Provider value={{ publicKey, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}
