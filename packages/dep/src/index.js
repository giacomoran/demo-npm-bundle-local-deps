import lande from "lande";

export const detectLanguage = (input) => {
  const result = lande(input);
  return result[0][0];
};
