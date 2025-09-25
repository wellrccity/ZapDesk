// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

function AdminPage() {
  const [commands, setCommands] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [response, setResponse] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchCommands();
  }, []);

  const fetchCommands = async () => {
    const res = await api.get('/commands');
    setCommands(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { keyword, response };
    
    if (editingId) {
      await api.put(`/commands/${editingId}`, payload);
    } else {
      await api.post('/commands', payload);
    }
    
    resetForm();
    fetchCommands();
  };

  const handleEdit = (command) => {
    setEditingId(command.id);
    setKeyword(command.keyword);
    setResponse(command.response);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este comando?')) {
      await api.delete(`/commands/${id}`);
      fetchCommands();
    }
  };

  const resetForm = () => {
    setKeyword('');
    setResponse('');
    setEditingId(null);
  }

  return (
    <div>
      <h1>Gerenciador de Comandos</h1>
      <form onSubmit={handleSubmit}>
        <h3>{editingId ? 'Editar Comando' : 'Novo Comando'}</h3>
        <input 
          type="text" 
          placeholder="Palavra-chave (ex: !menu)" 
          value={keyword} 
          onChange={e => setKeyword(e.target.value)} 
          required 
        />
        <textarea 
          placeholder="Resposta do bot" 
          value={response} 
          onChange={e => setResponse(e.target.value)} 
          required
        ></textarea>
        <button type="submit">{editingId ? 'Salvar Alterações' : 'Criar Comando'}</button>
        {editingId && <button type="button" onClick={resetForm}>Cancelar Edição</button>}
      </form>

      <h2>Comandos Existentes</h2>
      <table>
        <thead>
          <tr>
            <th>Palavra-chave</th>
            <th>Resposta</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {commands.map(cmd => (
            <tr key={cmd.id}>
              <td>{cmd.keyword}</td>
              <td>{cmd.response.substring(0, 50)}...</td>
              <td>
                <button onClick={() => handleEdit(cmd)}>Editar</button>
                <button onClick={() => handleDelete(cmd.id)}>Deletar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPage;