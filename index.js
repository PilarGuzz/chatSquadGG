require('dotenv').config()
const { extractDataFromJWT } = require('./utils');
const WebSocketServer = require('ws').Server;
const { getFriends, getMessages, saveMessage } = require('./user.service');

const wss = new WebSocketServer({ port: 8080 });
let friendsList = [];
//USUARIOS conectados
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
    FRIENDS_LIST: 'FRIENDS_LIST',
};

function broadcastToFriends(friends, username, action) {
    friends.forEach((friend) => {
        const ws = userConnections.get(friend.username);
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
        ws.send(JSON.stringify({
            action: actions.SEND_MESSAGE,
            payload: {
                username: sender,
                message,
                receiver
            }
        }));   
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
    return friends.map((friend) => {
        return {
            username: friend.username,
            img: friend.img,
            online: userConnections.has(friend.username),
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
    const jwt = new URLSearchParams(req.url.split('?')[1]).get('jwt');


    const userData = extractDataFromJWT(jwt);
    const username = userData.sub;

    console.log('connected', username);

    userConnections.set(username, ws);

    const friends = await getFriends(username);
    //emite a los amigos que está online al conectarse
    broadcastToFriends(friends, username, actions.USER_ONLINE);
    //asigna los amigos de la bd a la variable al conectarse
    friendsList = getFriendsList(friends);
    //recupera los mensajes de bd al conectarse
    const messages = await getMessages(username);
    //añade los chats a cada amigo segun corresponda al conectarse
    addMessagesToFriends(friendsList, messages);
    //Envia los amigos con los chats al cliente al conectarse
    ws.send(JSON.stringify({
        action: actions.FRIENDS,
        payload: {
            friends: friendsList,
        }
    }));


    ws.on('error', console.error);
    //Recibe la peticion y dependiendo del action realizará una función u otra
    ws.on('message', async function message(data) {
        try {
            const message = JSON.parse(data);
            const action = message.action;
            const payload = message.payload;
           
            switch (action) {
                //Envia los amigos con los chats
                case actions.FRIENDS_LIST:
                    ws.send(JSON.stringify({
                        action: actions.FRIENDS_LIST,
                        payload: {
                          friends: friendsList,
                        }
                    }));
                    break;
                //envia el mensaje y lo almacena en la bd
                case actions.SEND_MESSAGE:
                    await sendMessageToUser(username, payload.to, payload.message);
                    break;
                //envia un mensaje de typing para manejarlo en el cliente
                case actions.USER_TYPING:
                    sendTurnTypingOnToUser(payload.to);
                    break;
                //envia un mensaje vacio para manejarlo en el cliente
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

        broadcastToFriends(friends, username, actions.USER_OFFLINE);

    });

});