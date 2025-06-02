import { useContext } from 'react';
import { WalletContext } from '../context/WalletContext';

export default function ConnectWallet() {
  const { publicKey, connectWallet } = useContext(WalletContext);

  return (
    <div className="text-center">
      {publicKey ? (
        <p className="text-green-600 font-semibold">Conectado: {publicKey}</p>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Conectar Wallet
        </button>
      )}
    </div>
  );
}
