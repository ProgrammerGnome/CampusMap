/**
 * @file JSON-Server alapú mock szerver konfigurációja.
 * @description Biztosítja a REST API végpontokat és az egyedi bejelentkezési végpontot.
 */
const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db/db.json'));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

/**
 * Egyedi bejelentkezési végpont feldolgozója.
 * * @route POST /api/login
 * @param {Object} req - Az Express kérés objektum, amely tartalmazza a felhasználónevet és a jelszót.
 * @param {Object} res - Az Express válasz objektum.
 * @returns {Object} JSON válasz, amely tartalmazza a JWT tokent és a felhasználói adatokat, vagy hibaüzenetet sikertelen belépés esetén.
 */
server.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = router.db.getState();
  
  const user = db.users?.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
  }

  return res.status(200).json({
    token: `mock-jwt-token-${user.id}-${Date.now()}`,
    user: { id: user.id, username: user.username },
  });
});

server.use('/api', router);

const PORT = 3000;

/**
 * A szerver indítása a megadott porton.
 */
server.listen(PORT, () => {
  console.log(`JSON Server fut: http://localhost:${PORT}`);
});