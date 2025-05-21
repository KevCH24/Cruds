"use client";

import React, { useState, useEffect } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');

  useEffect(() => {
    // Simular la obtención de productos de la API
    const initialProducts = [
      { id: 1, name: 'Producto 1', description: 'Descripción 1' },
      { id: 2, name: 'Producto 2', description: 'Descripción 2' },
    ];
    setProducts(initialProducts);
  }, []);

  return (
    <div className="App" style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>CRUD de Productos</h1>
      {/* Formulario para crear productos */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Nombre:</label>
          <input type="text" id="name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '200px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="description" style={{ display: 'block', marginBottom: '5px' }}>Descripción:</label>
          <input type="text" id="description" value={newProductDescription} onChange={(e) => setNewProductDescription(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '200px' }} />
        </div>
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Agregar Producto</button>
      </form>
      {/* Tabla para mostrar los productos */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Nombre</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Descripción</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.id}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.name}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.description}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                <button onClick={() => handleDeleteProduct(product.id)} style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  function handleSubmit(event) {
    event.preventDefault();
    // Simular la creación de un producto
    const newProduct = {
      id: Math.random(), // Simular un ID
      name: newProductName,
      description: newProductDescription,
    };
    setProducts([...products, newProduct]);
    setNewProductName('');
    setNewProductDescription('');
  }

  function handleDeleteProduct(id) {
    // Simular la eliminación de un producto
    setProducts(products.filter(product => product.id !== id));
  }
}

export default App;
