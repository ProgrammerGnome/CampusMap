const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
// A fájl elérése legyen abszolút útvonal
const router = jsonServer.router(path.join(__dirname, 'db/db.json'));
const middlewares = jsonServer.defaults();

// 1. Middlewares (alapértelmezett, mint CORS, static, stb.)
server.use(middlewares);

// 2. Body Parser (nélkülözhetetlen a POST kéréshez)
server.use(jsonServer.bodyParser);

// 3. Egyedi login végpont (a router előtt!)
server.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // router.db.getState() biztonságos elérése
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

// 4. API router (prefix-elése)
server.use('/api', router);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`JSON Server fut: http://localhost:${PORT}`);
});