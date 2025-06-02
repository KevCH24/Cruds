import { useContext, useEffect, useState } from 'react'
import { WalletContext } from '../context/WalletContext'
import { leerDesdeContrato } from '../services/soroban'

export default function ContractViewer() {
  const { publicKey } = useContext(WalletContext)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    if (publicKey) {
      leerDesdeContrato(publicKey, 'get_mensaje')
        .then(setMensaje)
        .catch(console.error)
    }
  }, [publicKey])

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-gray-700">📨 Mensaje del contrato:</h2>
      <p className="mt-2 text-lg">{mensaje ?? 'Cargando...'}</p>
    </div>
  )
}
