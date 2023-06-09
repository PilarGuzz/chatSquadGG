const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.HOST_DB,
    user: process.env.USER_DB,
    password: process.env.PASSWORD_DB,
    database: process.env.DATABASE,
    port: process.env.PORT_DB
});


module.exports = {
    getFriends: function (username) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT f.*, u1.img AS user_img, u2.img AS friend_img 
            FROM friendship AS f 
            LEFT JOIN user AS u1 ON f.user_username = u1.username 
            LEFT JOIN user AS u2 ON f.friend_username = u2.username 
            WHERE (f.user_username = ? AND f.status = "ACCEPTED") 
            OR (f.friend_username = ? AND f.status = "ACCEPTED")`, 
            [username, username], (error, results) => {
                if (error) {
                    return reject(error);
                }
                const resultFriends = results.map((result) => {
                    if (result.user_username === username) {
                        return { username: result.friend_username, img: result.friend_img };
                    } else {
                        return { username: result.user_username, img: result.user_img };
                    }
                });
                resolve(resultFriends);
            });
        });
    },
    getMessages: function (username) {
        const sql = `SELECT * FROM chat WHERE username_sender = ? OR username_receiver = ? ORDER BY date`;

        return new Promise((resolve, reject) => {
            db.query(sql, [username, username], function (error, results) {
                if (error) {
                    return reject(error);
                }
                // Los resultados están ordenados por date
                resolve(results);
              });
        });
    },
    saveMessage: function (sender, receiver, message) {
        const sql = `INSERT INTO chat (username_sender, username_receiver, date, message) VALUES (?, ?, NOW(), ?)`;

        return new Promise((resolve, reject) => {
            db.query(sql, [sender, receiver, message], function (error, results) {
                if (error) {
                    return reject(error);
                }
                resolve(results);
              });
        });
    }

}