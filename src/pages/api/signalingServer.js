import { Server } from 'Socket.IO';

export default async (req, res) => {
  const initializeSocket = (res) => {
    if (res.socket.server.io) {
      console.log('Socket is already running');
      return;
    }
    console.log('Socket is initializing');
    const users = new Map();
    
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
        console.log('Socket.IO conectado');
        // receive a message from the server
        socket.on("hello", (...args) => {
            // send a message to the server
            console.log('olá estranho!');
            socket.broadcast.emit("hello", 'olá estranho!');
        });

        socket.on('disconnect', function(){
            let username = '';
            for (const [key, value] of users.entries()) {
                if(value === socket.id) {
                username = key;
                break;
                }
            }
            console.log(`${username} desconectado`);
            users.delete(username);
            console.log(`${username} removido`);
        });
            
        socket.on('subscribe', (username) => {
            users.set(username, socket.id); 
            socket.emit('subscribed');
            console.log('user', users.get(username));
        });
        
        socket.on('polite', (content) => {
            console.log('polite')
            const user = users.get(content.target);
            if(user) {
                const polite = socket.id>user;
                socket.emit('polite', {...content, polite: !polite});
        }
        });
        
        socket.on('call', (content) => {
            console.log('call')
            console.log(content);
            const user = users.get(content.target);
            if(user) {
                socket.to(user).emit('call', content);
            } else {
                socket.emit('callerror', {...content, detail: 'usuario nao exite ou nao esta online'});
            }
        });
        
        socket.on('callaccepted', (content) => {
            console.log('callaccepted')
            const user = users.get(content.target);
            if(user) {
                socket.to(user).emit('callaccepted', content);
            }
        });
        
        socket.on('callrefused', (content) => {
            console.log('callrefused')
            const user = users.get(content.target);
            if(user) {
                socket.to(user).emit('callrefused', content);
            }
        });
        
        socket.on('callcanceled', (content) => {
            console.log('callcanceled')
            const user = users.get(content.target);
            if(user) {
                socket.to(user).emit('callcanceled', content);
            }
        });
        
        socket.on('ice-candidate', (content) => {
            console.log(`Recebido ice-candidate do room`);
            const user = users.get(content.target);
            if(user) {
                socket.to(user).emit('ice-candidate', content);  
            }
        });
        
        socket.on('hangup', (content) => {
            console.log(`user "${content.name}" desligando`);
            const user = users.get(content.target);
            if(user) {
                socket.to(user).emit('hangup', content);  
            }
        });
        
        socket.on('negotiation', (content) => {
            console.log(`Recebido negociacao`);
            const user = users.get(content.target);
            console.log('user-negotiaition', user);
            console.log('target-negotiaition', content.target);
            if(user) {
                socket.to(user).emit('negotiation', {...content, polite: socket.id>user});  
            }
        });
        
        socket.on('offer', (offer) => {
            console.log(`Recebido offer do room`);
            socket.broadcast.emit('offer', offer);
        });
        

        socket.on('answer', (answer) => {
            console.log(`Recebido answer do room`);
            socket.broadcast.emit('answer', answer);
        });
    });
  }
  initializeSocket(res);
  res.end();
<<<<<<< HEAD
}
=======
}
>>>>>>> feature-file-transferer
