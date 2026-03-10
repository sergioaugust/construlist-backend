import axios from 'axios'

// Aponta para o servidor Django que roda na porta 8000
// Todas as chamadas da API passam por aqui
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api