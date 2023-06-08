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
            db.query('SELECT * FROM friendship WHERE (user_username = ? AND status = "ACCEPTED") OR (friend_username = ? AND status = "ACCEPTED")', [username, username], (error, results) => {
                if (error) {
                    return reject(error);
                }
                const resultFriends = results.map((result) => {
                    if (result.user_username === username) {
                        return result.friend_username;
                    } else {
                        return result.user_username;
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