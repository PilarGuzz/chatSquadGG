require('dotenv').config()
const { extractDataFromJWT } = require('./utils');
const WebSocketServer = require('ws').Server;
const { getFriends, getMessages, saveMessage } = require('./user.service');

const wss = new WebSocketServer({ port: 8080 });

const userConnections = new Map();

// enum for actions
const actions = {
    PING: 'PING',
    USER_ONLINE: 'USER_ONLINE',
    USER_OFFLINE: 'USER_OFFLINE',
    SEND_MESSAGE: 'SEND_MESSAGE',
    USER_TYPING: 'USER_TYPING',
    USER_STOPPED_TYPING: 'USER_STOPPED_TYPING',
    FRIENDS: 'FRIENDS',
};

function broadcastToFriends(friends, username, action) {
    friends.forEach((friend) => {
        const ws = userConnections.get(friend);
        if (ws) {
            ws.send(JSON.stringify({
                action: action,
                payload: {
                    username,
                }
            }));
        }
    });
}

async function sendMessageToUser(sender, receiver, message) {
    await saveMessage(sender, receiver, message);

    const ws = userConnections.get(receiver);
    if (ws) {
        ws.send(JSON.stringify(message));
    }
}

function sendTurnTypingOnToUser(receiver) {
    const ws = userConnections.get(receiver);
    if (ws) {
        ws.send(JSON.stringify({
            action: actions.USER_TYPING,
            payload: {
                message: 'typing',
            }
        }));
    }
}

function sendTurnTypingOffToUser(receiver) {
    const ws = userConnections.get(receiver);
    if (ws) {
        ws.send(JSON.stringify({
            action: actions.USER_STOPPED_TYPING,
            payload: {
                message: '',
            }
        }));
    }
}

function getFriendsList(friends) {
    return friends.map((username) => {
        return {
            username,
            online: userConnections.has(username),
        };
    });
}

function addMessagesToFriends(friends, messages) {
    friends.forEach((friend) => {
        const friendMessages = messages.filter((message) => {
            return message.username_sender === friend.username || message.username_receiver === friend.username;
        });
        friend.messages = friendMessages;
    });
}


wss.on('connection', async function connection(ws, req) {
    const url = new URL(req.url, 'http://localhost:8080');
    const queryParams = url.searchParams;

    const jwt = queryParams.get('jwt');
    const userData = extractDataFromJWT(jwt);
    const username = userData.sub;

    console.log('connected', username);

    userConnections.set(username, ws);

    const friends = await getFriends(username);

    broadcastToFriends(friends, username, actions.USER_ONLINE);

    const friendList = getFriendsList(friends);
    const messages = await getMessages(username);
    addMessagesToFriends(friendList, messages);


    ws.send(JSON.stringify({
        action: actions.FRIENDS,
        payload: {
            friends: friendList,
        }
    }));


    ws.on('error', console.error);

    ws.on('message', async function message(data) {
        try {
            const message = JSON.parse(data);
            const action = message.action;
            const payload = message.payload;

            switch (action) {
                case actions.PING:
                    ws.send(JSON.stringify({
                        action: actions.PING,
                        payload: {
                            message: 'pong',
                        }
                    }));
                    break;
                case actions.SEND_MESSAGE:
                    await sendMessageToUser(username, payload.to, payload.message);
                    break;
                case actions.USER_TYPING:
                    sendTurnTypingOnToUser(payload.to);
                    break;
                case actions.USER_STOPPED_TYPING:
                    sendTurnTypingOffToUser(payload.to);
                    break;
                default:
                    console.error('Unknown action', action);
            }
        } catch (error) {
            console.error(error);
        }

    });

    ws.on('close', function close() {
        console.log('disconnected');
        const userId = userConnections.get(username);
        userConnections.delete(userId);

        // ToDo: broadcast to all user friends that user is offline
        broadcastToFriends(friends, username, actions.USER_OFFLINE);

    });

});