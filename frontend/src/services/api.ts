//Aponta para o servidor Django que roda na porta 8000
// Todas as chamadas da API passam por aqui

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
})

export default api