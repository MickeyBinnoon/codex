const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cookieSession = require('cookie-session');
const passport = require('passport');
const { encrypt } = require('./encryption');
dotenv.config();
const requiredEnv = ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','STRIPE_SECRET_KEY','STRIPE_PRICE_ID','SESSION_SECRET','STRIPE_WEBHOOK_SECRET','ENCRYPTION_KEY'];
const missing = requiredEnv.filter(k => !process.env[k]);
if(missing.length){
  console.error('Missing env vars: '+missing.join(', '));
  process.exit(1);
}
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? require("stripe")(stripeKey) : null;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('alchemist.db');

// create tables if not exists
const initDb = () => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    google_id TEXT,
    stripe_customer_id TEXT,
    is_active INTEGER DEFAULT 0,
    alpaca_api_key TEXT,
    alpaca_secret_key TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS global_stats (
    id INTEGER PRIMARY KEY,
    total_return REAL DEFAULT 0,
    win_rate REAL DEFAULT 0,
    trades_count INTEGER DEFAULT 0
  )`);
  db.get('SELECT * FROM global_stats WHERE id=1', (err,row)=>{
    if(!row){
      db.run('INSERT INTO global_stats (id,total_return,win_rate,trades_count) VALUES (1,0,0,0)');
    }
  });
};

initDb();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, cb) => {
  const email = profile.emails[0].value;
  db.get('SELECT * FROM users WHERE google_id=?', [profile.id], (err, row) => {
    if(row) return cb(null, row);
    db.run('INSERT INTO users (email, google_id) VALUES (?,?)', [email, profile.id], function(err){
      if(err) return cb(err);
      db.get('SELECT * FROM users WHERE id=?',[this.lastID], (err,row2)=>{
        cb(err,row2);
      });
    });
  });
}));

passport.serializeUser((user, done)=>{
  done(null, user.id);
});

passport.deserializeUser((id,done)=>{
  db.get('SELECT * FROM users WHERE id=?',[id], (err,row)=>{
    done(err,row);
  });
});

const app = express();
app.use(bodyParser.json());
app.use(cookieSession({name:'session', keys:[process.env.SESSION_SECRET], maxAge:24*60*60*1000}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google', passport.authenticate('google', { scope: ['email','profile'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req,res)=>{
  res.redirect('/dashboard');
});

const ensureAuth = (req,res,next)=>{
  if(req.isAuthenticated()) return next();
  res.status(401).json({error:'auth required'});
};

app.post('/api/save-keys', ensureAuth, (req,res)=>{
  const {apiKey, secretKey} = req.body;
  const encKey = encrypt(apiKey);
  const encSecret = encrypt(secretKey);
  db.run('UPDATE users SET alpaca_api_key=?, alpaca_secret_key=? WHERE id=?', [encKey, encSecret, req.user.id], (err)=>{
    if(err) return res.status(500).json({error:'db'});
    res.json({status:'saved'});
  });
});

app.post('/api/create-checkout-session', ensureAuth, async (req,res)=>{
  try{
    let customerId = req.user.stripe_customer_id;
    if(!customerId){
      const customer = await stripe.customers.create({email:req.user.email});
      customerId = customer.id;
      db.run('UPDATE users SET stripe_customer_id=? WHERE id=?',[customerId, req.user.id]);
    }
    const session = await stripe.checkout.sessions.create({
      mode:'subscription',
      customer: customerId,
      line_items:[{price: process.env.STRIPE_PRICE_ID, quantity:1}],
      success_url: process.env.SUCCESS_URL || 'http://localhost:3000/dashboard',
      cancel_url: process.env.CANCEL_URL || 'http://localhost:3000/'
    });
    res.json({url: session.url});
  }catch(e){
    res.status(500).json({error:'stripe'});
  }
});

app.post('/webhook/stripe', bodyParser.raw({type:'application/json'}), (req,res)=>{
  const sig = req.headers['stripe-signature'];
  let event;
  try{
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  }catch(err){
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if(event.type === 'checkout.session.completed'){
    const session = event.data.object;
    const customerId = session.customer;
    db.run('UPDATE users SET is_active=1 WHERE stripe_customer_id=?', [customerId], ()=>{});
  }
  res.json({received:true});
});

app.post('/api/bot/activate', ensureAuth, (req,res)=>{
  const {active} = req.body;
  db.run('UPDATE users SET is_active=? WHERE id=?', [active?1:0, req.user.id], (err)=>{
    if(err) return res.status(500).json({error:'db'});
    res.json({status:'updated'});
  });
});

app.get('/api/stats', ensureAuth, (req,res)=>{
  db.get('SELECT * FROM global_stats WHERE id=1', (err,stats)=>{
    if(err) return res.status(500).json({error:'db'});
    res.json(stats);
  });
});

const PORT = process.env.PORT || 3000;
if(require.main === module){
  app.listen(PORT, ()=> console.log('Server running on '+PORT));
}
module.exports = app;

