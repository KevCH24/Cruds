import { motion } from 'framer-motion';
import ConnectWallet from '../components/ConnectWallet';
import ContractViewer from '../components/ContractViewer';
import ContractWriter from '../components/ContractWriter';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 to-white text-gray-800">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold text-blue-600 mb-2"
          >
            🚗 Sharecar
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-lg"
          >
            Tu plataforma descentralizada para compartir coches
          </motion.p>
        </motion.header>

        <section className="bg-white shadow-md rounded-2xl p-8 space-y-8">
          <ConnectWallet />
          <hr />
          <ContractViewer />
          <ContractWriter />
        </section>

        <footer className="text-center text-sm text-gray-500 mt-12">
          &copy; 2025 Sharecar. Todos los derechos reservados.
        </footer>
      </div>
    </main>
  );
}
