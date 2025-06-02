import { useState, useContext } from 'react'
import { WalletContext } from '../context/WalletContext'
import { enviarATransaccion } from '../services/soroban'

export default function ContractWriter() {
  const { publicKey } = useContext(WalletContext)
  const [mensaje, setMensaje] = useState('')
  const [resultado, setResultado] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await enviarATransaccion(publicKey, 'set_mensaje', [mensaje])
      setResultado('✅ Transacción enviada: ' + res.hash)
    } catch (error) {
      setResultado('❌ Error: ' + error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="text-center space-y-4">
      <input
        type="text"
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="Nuevo mensaje"
        className="border px-4 py-2 rounded-lg w-full max-w-md"
      />
      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition duration-300"
      >
        Enviar al contrato
      </button>
      {resultado && <p className="text-sm text-gray-700">{resultado}</p>}
    </form>
  )
}
