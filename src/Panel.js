import React, { useState, useEffect } from "react";
import logo from "./sprout.png";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";

function Panel({ scientificName, previewImage, familyName, genusName, id }) {
  const googleUser = window.gapi.auth2.getAuthInstance().currentUser.get();
  const [isFavorited, setIsFavorited] = useState(false);
  const icon = previewImage ? previewImage : logo;

  useEffect(() => {
    checkIfFaved(googleUser.googleId, id)
      .then((res) => {
        setIsFavorited(res);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  function handleFavs() {
    if (googleUser.isSignedIn()) {
      const token_id = googleUser.googleId;
      if (isFavorited) {
        setIsFavorited(!isFavorited);
        loggedUnfav(token_id, id);
      } else {
        setIsFavorited(!isFavorited);
        loggedFav(token_id, scientificName, id);
      }
    } else {
      setIsFavorited(!isFavorited);
      localStorage.setItem(
        `Sprout_favorited_${scientificName}`,
        String(!isFavorited)
      );
    }
  }

  function checkIfFaved(token_id, id) {
    const googleUser = window.gapi.auth2.getAuthInstance().currentUser.get();
    if (googleUser.isSignedIn()) {
      return fetch("/checkIfFaved", {
        headers: {
          "Content-type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ token_id, id }),
      })
        .then((res) => {
          return res.json();
        })
        .then((res) => {
          return !!res[0];
        })
        .catch((error) => {
          console.error("Request failed", error);
        });
    } else {
      return new Promise((resolve) => {
        resolve(
          localStorage.getItem(`Sprout_favorited_${scientificName}`) === "true"
        );
      });
    }
  }

  return (
    <div className="col-lg-3 col-md-4 col-sm-6">
      <header className="App-header">
        <img className="mx-auto" src={icon} alt="logo" id="plant" />
        <div className="row">
          <div className="col-3">
            <button onClick={handleFavs}>
              I'm {isFavorited ? "favorited" : "not favorited"}!
            </button>
          </div>
          <div className="col-9">
            <ul id="list">
              <li>Scientific name: {scientificName}</li>
              <li>Genus: {genusName}</li>
              <li>Family: {familyName}</li>
            </ul>
            <Link to={`/plant/${id}`}>See me!</Link>
          </div>
        </div>
      </header>
    </div>
  );
}

function loggedFav(token_id, scientificName, id) {
  return fetch("/fav", {
    headers: {
      "Content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({ token_id, scientificName, id }),
  }).catch((error) => {
    console.log("Request failed", error);
  });
}

function loggedUnfav(token_id, id) {
  return fetch("/unfav", {
    headers: {
      "Content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({ token_id, id }),
  }).catch((error) => {
    console.log("Request failed", error);
  });
}

export default Panel;
