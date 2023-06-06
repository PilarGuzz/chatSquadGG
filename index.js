require('dotenv').config()
const { extractDataFromJWT } = require('./utils');
const WebSocketServer = require('ws').Server;
const { getFriends } = require('./user.service');

const wss = new WebSocketServer({ port: 8080 });

const userConnections = new Map();

// enum for actions
const actions = {
    USER_ONLINE: 'USER_ONLINE',
    USER_OFFLINE: 'USER_OFFLINE',
    SEND_MESSAGE: 'SEND_MESSAGE',
    USER_TYPING: 'USER_TYPING',
    USER_STOPPED_TYPING: 'USER_STOPPED_TYPING',
    FRIENDS_ONLINE: 'FRIENDS_ONLINE',
};

function broadcastToFriends(username, message) {
    getFriends(username)
        .then((friends) => {
            friends.forEach((friend) => {
                sendMessageToUser(friend, message);
            });
        })
        .catch((error) => {
            console.error(error);
        });
}

function sendMessageToUser(username, message) {
    const ws = userConnections.get(username);
    if (ws) {
        ws.send(JSON.stringify(message));
    }
}

function sendTurnTypingOnToUser(username, message) {
    const ws = userConnections.get(username);
    if (ws) {
        ws.send(JSON.stringify(message));
    }
}

function sendTurnTypingOffToUser(username, message) {
    const ws = userConnections.get(username);
    if (ws) {
        ws.send(JSON.stringify(message));
    }
}

async function getFriendsOnline(username) {
    try {
        const friends = await getFriends(username);
        const friendsOnline = friends.filter(friend => userConnections.has(friend));
        return friendsOnline;
    } catch (error) {
        console.error(error);
    }
}


wss.on('connection', async function connection(ws, req) {
    const url = new URL(req.url, 'http://localhost:8080');
    const queryParams = url.searchParams;

    const jwt = queryParams.get('jwt');
    const userData = extractDataFromJWT(jwt);

    console.log('connected', userData.sub);

    userConnections.set(userData.sub, ws);

    // ToDo: broadcast to all user friends that user is online

    broadcastToFriends(userData.sub, {
        action: actions.USER_ONLINE,
        payload: {
            username: userData.sub,
        }
    });

    ws.send(JSON.stringify({
        action: actions.FRIENDS_ONLINE,
        payload: {
            friends: await getFriendsOnline(userData.sub),
        }
    }));


    ws.on('error', console.error);

    ws.on('message', function message(data) {
        const message = JSON.parse(data);
        const action = message.action;
        const payload = message.payload;

        switch (action) {
            case actions.SEND_MESSAGE:
                sendMessageToUser(payload.to, message);
                break;
            case actions.USER_TYPING:
                sendTurnTypingOnToUser(payload.to, message);
                break;
            case actions.USER_STOPPED_TYPING:
                sendTurnTypingOffToUser(payload.to, message);
                break;
            default:
                console.error('Unknown action', action);
        }

    });

    ws.on('close', function close() {
        console.log('disconnected');
        const userId = userConnections.get(userData.sub);
        userConnections.delete(userId);

        // ToDo: broadcast to all user friends that user is offline
        broadcastToFriends(userData.sub, {
            action: actions.USER_OFFLINE,
            payload: {
                username: userData.sub,
            }
        });
    });

});