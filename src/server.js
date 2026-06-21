// json-server with custom /api/login endpoint
// Run: node src/server.js
const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db/db.json'));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Custom login endpoint
server.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = router.db.getState();
  const user = db.users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' });
  }

  const token = `mock-jwt-token-${user.id}-${Date.now()}`;
  return res.status(200).json({
    token,
    user: { id: user.id, username: user.username },
  });
});

// Prefix all json-server routes with /api
server.use('/api', router);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`JSON Server running at http://localhost:${PORT}`);
  console.log('Login: POST /api/login  { username: "admin", password: "test01" }');
  console.log('Buildings: GET/POST/PUT/DELETE /api/buildings');
});
