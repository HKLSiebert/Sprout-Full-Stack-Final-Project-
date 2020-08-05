require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { OAuth2Client } = require("google-auth-library");
const { Client } = require("pg");

var SERVPORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SECRET_ID = process.env.REACT_APP_GOOGLE_SECRET_ID;
const CONNECTION = process.env.CONNECTION_STRING;
const HOST = process.env.HOST;

const client = new OAuth2Client(CLIENT_ID);
const app = express();
const pool = new Client({
  connectionString: CONNECTION,
});

const favs = [
  "Clinopodium vulgare",
  "Clinopodium acinos",
  "Ocimum gratissimum",
  "Ocimum americanum",
  "Ocimum basilicum",
  "Ocimum campechianum",
  "Ocimum tenuiflorum",
  "Clinopodium alpinum",
];

app.use(express.static(path.join(__dirname, "../build")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

pool.connect((err) => {
  if (err) {
    console.error("connection error", err.stack);
  } else {
    console.log("connected");
  }
});

app.get("/", function (res, req) {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

app.post("/verify", function (req, res) {
  return verify(req.body.id_token)
    .then((userid) => {
      res.write(userid);
      res.end();
    })
    .catch(console.error);
});

app.post("/login", (req, res) => {
  pool.query(
    "SELECT * FROM users WHERE token_id = $1",
    [req.body.id_token],
    (err, res) => {
      if (res.rowCount === 0) {
        console.log("We're here!");
        pool.query(
          "INSERT INTO users(token_id) VALUES ($1)",
          [req.body.id_token],
          (err, res) => {
            if (err) {
              console.log("Error: ", err.stack);
            }
          }
        );
      }
    }
  );
});

app.post("/fav", (req, res, next) => {
  pool.query(
    "SELECT * FROM plants WHERE name = $1",
    [req.body.scientificName],
    (err, res) => {
      if (res.rowCount === 0) {
        pool.query(
          "INSERT INTO plants(id, name) VALUES ($1, $2)",
          [req.body.id, req.body.scientificName],
          (err, res) => {
            if (err) {
              console.log(err.stack);
            }
          }
        );
      }
      pool.query(
        "SELECT id FROM plants WHERE plants.name = $1",
        [req.body.scientificName],
        (err, res) => {
          pool.query(
            "SELECT * FROM favList WHERE pid=$1",
            [res.rows[0].id],
            (err, res) => {
              if (res.rowount === 0) {
                pool.query(
                  "INSERT INTO favList(uid, pid) VALUES ($1, $2)",
                  ["116104233565721670000", res.rows[0].id],
                  (err, res) => {
                    if (err) {
                      console.log(err.stack);
                    }
                  }
                );
              }
            }
          );
        }
      );
    }
  );
});

app.post("/unfav", (req, res, next) => {
  pool.query(
    "DELETE FROM favList f WHERE f.uid = (SELECT id FROM users WHERE user.token_id = $1) AND f.pid = (SELECT id FROM plants WHERE plant.name = $2)",
    [req.body.id_token, req.body.scientificName],
    (err, res) => {
      if (err) {
        console.log(err.stack);
      }
    }
  );
});

app.post("/getLoggedFavs", function (req, res, next) {
  console.log("Req:", req.body.id_token);
  var loggedFavs = [];
  pool
    .query(
      "SELECT p.name FROM plants p, favList f WHERE f.uid = $1 AND f.pid = p.id",
      // [req.body.id_token],
      ["116104233565721670000"]
    )
    .then((results) => {
      console.log("Res is:", results);
      if (results.rowCount !== 0) {
        res.write(
          JSON.stringify(
            results.rows.map((row) => {
              return row.name;
            })
          )
        );
      } else {
        res.write(JSON.stringify("null"));
      }
      res.end();
    })
    .catch((err) => console.log(err));
});

app.listen(SERVPORT, function (error) {
  if (error) throw error;
  console.log("Server is now running on port " + SERVPORT);
});

async function verify(token) {
  // console.log(token);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const userid = payload["sub"];
  return userid;
}
