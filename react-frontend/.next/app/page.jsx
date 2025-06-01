import { useState } from 'react';
import { invoke } from './lib/soroban';

export default function CRUDPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ id: '', value: '' });
  const [currentUser, setCurrentUser] = useState('user1'); // Simulamos usuario

  const handleCreate = async () => {
    await invoke('create', form.id, form.value, currentUser);
    setForm({ id: '', value: '' });
    fetchItems();
  };

  const fetchItems = async () => {
    // En una app real deberías tener una lista de IDs almacenada
    const mockIds = ['item1', 'item2', 'item3']; // Ejemplo
    const fetchedItems = await Promise.all(
      mockIds.map(async id => {
        const data = await invoke('read', id);
        return { id, data };
      })
    );
    setItems(fetchedItems.filter(item => item.data.length > 0));
  };

  const handleUpdate = async (id) => {
    const newValue = prompt("Nuevo valor:");
    if (newValue) {
      await invoke('update', id, newValue, currentUser);
      fetchItems();
    }
  };

  const handleDelete = async (id) => {
    if (confirm("¿Seguro que quieres eliminar este item?")) {
      await invoke('delete', id, currentUser);
      fetchItems();
    }
  };

  return (
    <div className="container">
      <h1>Mi CRUD Único</h1>
      <div className="user-section">
        <select 
          value={currentUser} 
          onChange={(e) => setCurrentUser(e.target.value)}
        >
          <option value="user1">Usuario 1</option>
          <option value="user2">Usuario 2</option>
        </select>
      </div>

      <div className="form-section">
        <input
          type="text"
          placeholder="ID"
          value={form.id}
          onChange={(e) => setForm({...form, id: e.target.value})}
        />
        <input
          type="text"
          placeholder="Valor"
          value={form.value}
          onChange={(e) => setForm({...form, value: e.target.value})}
        />
        <button onClick={handleCreate}>Crear</button>
      </div>

      <div className="items-list">
        {items.map((item) => (
          <div key={item.id} className="item-card">
            <h3>{item.id}</h3>
            <p>Valor: {item.data[0]}</p>
            <p>Owner: {item.data[1]}</p>
            <p>Creado: {new Date(item.data[2] * 1000).toLocaleString()}</p>
            
            <div className="item-actions">
              <button 
                onClick={() => handleUpdate(item.id)}
                disabled={!invoke('is_owner', item.id, currentUser)}
              >
                Editar
              </button>
              <button 
                onClick={() => handleDelete(item.id)}
                disabled={!invoke('is_owner', item.id, currentUser)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}