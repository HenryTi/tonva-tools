const wsHost = process.env.REACT_APP_WSHOST;
export class WSChannel {
    constructor() {
        this.handlerSeed = 1;
        this.anyHandlers = {};
        this.msgHandlers = {};
    }
    setToken(token) {
        this.token = token;
    }
    connect() {
        let netThis = this;
        return new Promise((resolve, reject) => {
            if (netThis.ws !== undefined) {
                resolve();
                return;
            }
            let ws = new WebSocket(wsHost, this.token);
            console.log('connect webSocket %s', wsHost);
            ws.onopen = (ev) => {
                console.log('webSocket connected %s', wsHost);
                netThis.ws = ws;
                resolve();
            };
            ws.onerror = (ev) => {
                reject('webSocket can\'t open!');
            };
            ws.onmessage = (msg) => netThis.wsMessage(msg);
            ws.onclose = (ev) => {
                netThis.ws = undefined;
                console.log('webSocket closed!');
            };
        });
    }
    close() {
        if (this.ws !== undefined)
            this.ws.close();
    }
    wsMessage(event) {
        /*
        event dump:
        currentTarget:WebSocket {url: "ws://192.168.0.199:3000/tv", readyState: 1, bufferedAmount: 0, …}
        data:"{"type":"sheetAct","data":{"state":"备货"}}"
        defaultPrevented:false
        eventPhase:0
        isTrusted:true
        lastEventId:""
        origin:"ws://192.168.0.199:3000"
        path:Array(0) []
        ports:null
        returnValue:true
        source:null
        srcElement:WebSocket {url: "ws://192.168.0.199:3000/tv", readyState: 1, bufferedAmount: 0, …}
        target:WebSocket {url: "ws://192.168.0.199:3000/tv", readyState: 1, bufferedAmount: 0, …}
        timeStamp:34665.245
        type:"message"
        */
        //console.log('ws msg:', event);
        try {
            console.log('websocket message: %s', event.data);
            let json = JSON.parse(event.data);
            let t = json.type;
            for (let i in this.anyHandlers) {
                this.anyHandlers[i](json);
            }
            for (let i in this.msgHandlers) {
                let { type, handler } = this.msgHandlers[i];
                if (type !== t)
                    continue;
                handler(json);
            }
        }
        catch (err) {
            console.log('ws msg error: ', err);
        }
    }
    onWsReceiveAny(handler) {
        let seed = this.handlerSeed++;
        this.anyHandlers[seed] = handler;
        return seed;
    }
    onWsReceive(type, handler) {
        let seed = this.handlerSeed++;
        this.msgHandlers[seed] = { type: type, handler: handler };
        return seed;
    }
    endWsReceive(handlerId) {
        this.anyHandlers[handlerId] = undefined;
        this.msgHandlers[handlerId] = undefined;
    }
    sendWs(msg) {
        let netThis = this;
        this.connect().then(() => {
            netThis.ws.send(msg);
        });
    }
}
const wsChannel = new WSChannel();
export default wsChannel;
//# sourceMappingURL=wsChannel.js.map