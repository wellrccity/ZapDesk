//ARQUIVO: backend/utils/helpers.js

/**
 * Substitui placeholders em uma string de texto por valores de um objeto de dados.
 * Ex: replacePlaceholders("Olá {nome}", { nome: "João" }) retorna "Olá João".
 * @param {string} text O texto contendo placeholders como {chave}.
 * @param {object} data O objeto com os dados para substituição.
 * @returns {string} O texto com os placeholders substituídos.
 */
function replacePlaceholders(text, data = {}) {
  if (!text) return '';
  return text.replace(/\{(.*?)\}/g, (match, key) => {
    const value = data[key.trim()];
    return value !== undefined && value !== null ? value : match;
  });
}

module.exports = { replacePlaceholders };