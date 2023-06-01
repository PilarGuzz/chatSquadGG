module.exports = {
    // extract data from JWT token
    extractDataFromJWT: function (jwt) {
        const parts = jwt.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload;
    }
};