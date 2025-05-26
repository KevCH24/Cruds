"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllProducts,
  addProduct,
  deleteProduct,
  connectWallet, 
  getPublicKey as getFreighterPublicKey 
} from './lib/soroban';

function HomePage() {
  const [products, setProducts] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductQuantity, setNewProductQuantity] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');

  const [publicKey, setPublicKey] = useState('');
  const [freighterConnected, setFreighterConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para verificar el estado de la conexión al cargar
  const checkInitialConnection = useCallback(async () => {
    console.log("[page.jsx/checkInitialConnection] Checking initial connection...");
    setIsLoading(true);
    setError(null);
    try {
      const pk = await getFreighterPublicKey(); // Use getFreighterPublicKey directly
      console.log("[page.jsx/checkInitialConnection] Public key from getFreighterPublicKey():", pk);
      if (pk) {
        setPublicKey(pk);
        setFreighterConnected(true);
        await loadProducts(); 
      } else {
        console.log("[page.jsx/checkInitialConnection] No public key returned, user likely not connected yet.");
        setFreighterConnected(false);
        // Attempt to load products even if not connected, as getAllProducts might be read-only
        await loadProducts(); 
      }
    } catch (e) {
      console.error("[page.jsx/checkInitialConnection] Error al verificar la conexión inicial:", e);
      setFreighterConnected(false);
      // Attempt to load products even on error, as getAllProducts might be read-only
      await loadProducts();
    } finally {
      setIsLoading(false);
    }
  }, []); 

  useEffect(() => {
    checkInitialConnection();
  }, [checkInitialConnection]);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("[page.jsx/loadProducts] Attempting to load products...");
      const prods = await getAllProducts();
      console.log("[page.jsx/loadProducts] Products received:", prods);
      setProducts(prods || []); 
    } catch (e) {
      console.error("[page.jsx/loadProducts] Error al cargar productos:", e);
      setError(`Error al cargar productos: ${e.message}`);
      setProducts([]); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    console.log("[page.jsx/handleConnectWallet] Attempting to connect wallet...");
    setIsLoading(true);
    setError(null);
    try {
      const pk = await connectWallet(); 
      console.log("[page.jsx/handleConnectWallet] connectWallet returned:", pk);
      if (pk) {
        setPublicKey(pk);
        setFreighterConnected(true);
        await loadProducts(); 
      } else {
        setError("No se pudo conectar la billetera. El usuario canceló o Freighter no está disponible/permitido.");
        setFreighterConnected(false);
      }
    } catch (e) {
      console.error("[page.jsx/handleConnectWallet] Error al conectar wallet:", e);
      setError(`Error al conectar Freighter: ${e.message}`);
      setFreighterConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!freighterConnected || !publicKey) {
      setError("Por favor, conecta tu wallet de Freighter primero.");
      return;
    }
    if (!newProductName || newProductQuantity === '' || newProductPrice === '') {
      setError("Por favor, completa todos los campos del producto (Nombre, Cantidad, Precio).");
      return;
    }

    // Verificar si el producto ya existe en la lista actual de productos
    if (products.find(p => p.name.toLowerCase() === newProductName.toLowerCase())) {
      setError(`El producto "${newProductName}" ya existe. Por favor, elige un nombre diferente.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const quantity = parseInt(newProductQuantity, 10);
      const price = parseInt(newProductPrice, 10);

      if (isNaN(quantity) || isNaN(price) || quantity < 0 || price < 0) {
        setError("Cantidad y Precio deben ser números positivos.");
        setIsLoading(false);
        return;
      }
      console.log(`[page.jsx/handleSubmit] Calling addProduct with: ${newProductName}, ${quantity}, ${price}`);
      await addProduct(newProductName, quantity, price);
      console.log("[page.jsx/handleSubmit] addProduct finished.");
      setNewProductName('');
      setNewProductQuantity('');
      setNewProductPrice('');
      await loadProducts(); 
    } catch (e) {
      console.error("[page.jsx/handleSubmit] Error al agregar producto:", e);
      setError(`Error al agregar producto: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productName) => {
    if (!freighterConnected || !publicKey) {
      setError("Por favor, conecta tu wallet de Freighter primero.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log(`[page.jsx/handleDeleteProduct] Calling deleteProduct with: ${productName}`);
      await deleteProduct(productName);
      console.log("[page.jsx/handleDeleteProduct] deleteProduct finished.");
      await loadProducts(); 
    } catch (e) {
      console.error("[page.jsx/handleDeleteProduct] Error al eliminar producto:", e);
      setError(`Error al eliminar producto: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App" style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center' }}>Inventario de Productos (Soroban)</h1>

      {!freighterConnected && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button onClick={handleConnectWallet} disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isLoading ? 'Conectando...' : 'Conectar Wallet Freighter'}
          </button>
        </div>
      )}
      {publicKey && <p style={{ textAlign: 'center', marginBottom: '10px' }}>Conectado como: {publicKey.substring(0, 10)}...</p>}
      
      {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</p>}
      {/* isLoading state is handled by individual buttons now, but a general loading indicator can remain if desired for page load */}
      {isLoading && !products.length && <p style={{ textAlign: 'center', marginBottom: '10px' }}>Cargando...</p>}

      {/* Remove freighterConnected condition from here to always show the form and list */}
      <>
        <form onSubmit={handleSubmit} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
          <h2 style={{marginTop: 0}}>Agregar Nuevo Producto</h2>
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Nombre:</label>
            <input type="text" id="name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: 'calc(100% - 18px)' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="quantity" style={{ display: 'block', marginBottom: '5px' }}>Cantidad:</label>
            <input type="number" id="quantity" value={newProductQuantity} onChange={(e) => setNewProductQuantity(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: 'calc(100% - 18px)' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="price" style={{ display: 'block', marginBottom: '5px' }}>Precio:</label>
            <input type="number" id="price" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: 'calc(100% - 18px)' }} />
          </div>
          <button type="submit" disabled={isLoading || !freighterConnected} style={{ padding: '10px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isLoading && freighterConnected ? 'Agregando...' : 'Agregar Producto'}
          </button>
          {!freighterConnected && <p style={{fontSize: '0.8em', color: 'grey', marginTop: '5px'}}>Conecta tu wallet para agregar productos.</p>}
        </form>

        <h2 style={{textAlign: 'center'}}>Lista de Productos</h2>
        {/* Show loading indicator for products if isLoading and products haven't loaded yet */}
        {isLoading && products.length === 0 && <p style={{textAlign: 'center'}}>Cargando productos...</p>}
        {!isLoading && products.length === 0 && <p style={{textAlign: 'center'}}>No hay productos en el inventario o no se pudieron cargar.</p>}
        
        {products.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Nombre (ID)</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Cantidad</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Precio</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.name}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.quantity}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.price}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <button 
                      onClick={() => handleDeleteProduct(product.name)} 
                      disabled={isLoading || !freighterConnected} 
                      style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {isLoading && freighterConnected ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    </div>
  );
}

export default HomePage;
