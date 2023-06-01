const mysql = require('mysql');

const db = mysql.createConnection({
    host: process.env.HOST_DB,
    user: process.env.USER_DB,
    password: process.env.PASSWORD_DB,
    database: process.env.DATABASE
});


module.exports = {
    getFriends: function (username) {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM friendship WHERE user_username = ? OR friend_username = ?', [username, username], (error, results) => {
                if (error) {
                    reject(error);
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
    }
}