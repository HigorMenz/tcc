let months = [
  "de Jan",
  "de Fev",
  "de Mar",
  "de Abr",
  "de Mai",
  "de Jun",
  "de Jul",
  "de Ago",
  "de Set",
  "de Out",
  "de Nov",
  "de Dez",
];
let days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export const getFullDay = (timestamp) => {
  let date = new Date(timestamp);

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const getDay = (timestamp) => {
  let date = new Date(timestamp);

  return `${date.getDate()} ${months[date.getMonth()]}`;
};

export const getDayName = (timestamp) => {
  let date = new Date(timestamp);

  return days[date.getDay()];
};
