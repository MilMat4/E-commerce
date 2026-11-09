const toPaise = (amount) => Math.round((amount + Number.EPSILON * Math.abs(amount)) * 100);
const fromPaise = (paise) => paise / 100;

module.exports = { toPaise, fromPaise };
