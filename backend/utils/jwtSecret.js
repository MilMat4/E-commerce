const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || /^(replace|generate)_/i.test(secret)) {
    throw new Error('Set JWT_SECRET in .env to a private random value of at least 32 characters.');
  }
  return secret;
};

module.exports = getJwtSecret;
