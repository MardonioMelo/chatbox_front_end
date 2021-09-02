(function () {
    'use strict'

    //Setup
    const my_setup = getSetup()
    //Variáveis de rotas    
    const url_token = `${my_setup.host_http}/token`
    const url_perfil = `${my_setup.host_http}/client/perfil`
    const url_ws = `${my_setup.host_ws}`
    //Outras Variáveis 
    const print_msg = document.getElementById('j_print_msg')
    const print_input_footer = document.getElementById('j_print_input_footer')
    //Variáveis de dados   
    var client = null
    var conn_ws = null
    var messages = null
    var subject = null
    //Comandos
    const cmd = {
        cmd_connection: cmdConnection,
        cmd_call_create: cmdCallCreate,
        cmd_call_check_open: cmdCallCheckOpen,
        cmd_n_waiting_line: cmdNWaitingLine,
        cmd_call_cancel: cmdCallCancel,
        cmd_call_end: formCallEvaluation,
        cmd_call_evaluation: cmdCallEnd,
        cmd_call_start: cmdCallStart,
        cmd_call_history: cmdCallHistory,
        cmd_call_msg: cmdCallMsg
    }
    //chatbox 
    const chatButton = document.querySelector('.chatbox__button');
    const chatContent = document.querySelector('.chatbox__support');
    const icons = {
        isClicked: '<i class="fa fa-times-circle-o fa-2x"></i>',
        isNotClicked: '<i class="fa fa-comments-o fa-2x"></i>'
    }
    const chatbox = new InteractiveChatbox(chatButton, chatContent, icons);


    //###############
    //  GERAL
    //###############

    //Consultar setup
    function getSetup() {
        return JSON.parse(sessionStorage.getItem("my_setup"))
    }

    //Passa UTC apara Hora e minutos local
    function formatTime(date) {
        let now
        let h

        if (date) {
            now = new Date(convertLocalDateToUTCDate(date));
            h = now.getHours() + ":" + ("0" + now.getMinutes()).slice(-2);
        } else {
            now = new Date();
            h = now.getHours() + ":" + ("0" + now.getMinutes()).slice(-2);
        }
        return h
    }

    //Adicionar mais scroll
    function addScroll() {
        print_msg.scrollTop += 500
    }

    //Botões de ação
    function actionButtons() {
        chatButton.onclick = () => chatboxContent()
    }

    //Converter UTC para data e hora local
    function convertLocalDateToUTCDate(date, toUTC) {
        date = new Date(date);
        //Hora local convertida para UTC     
        var localOffset = date.getTimezoneOffset() * 60000;
        var localTime = date.getTime();
        if (toUTC) {
            date = localTime + localOffset;
        } else {
            date = localTime - localOffset;
        }
        date = new Date(date);

        return date;
    }

    //Obter id da call
    function getCall() {
        let data_call = JSON.parse(sessionStorage.getItem("chatbox_call"))
        return data_call.call
    }

    //Obter dados da call
    function getDataCall() {
        return JSON.parse(sessionStorage.getItem("chatbox_call"))
    }


    //###############
    //  Perfil
    //###############

    //Set dados do user
    function requestPerfil(token) {
        if (token) {

            //Config request
            let config = {
                method: 'GET',
                url: url_perfil,
                headers: {
                    'Content-Type': 'none',
                    'Authorization': `Bearer ${token}`,
                    'Access-Control-Allow-Origin': '*'
                },
                mode: 'cors'
            }

            //Request
            axios(config)
                .then(function (res) {
                    if (res.data.result) {
                        setUser(res.data.error.data)
                    } else {
                        console.log(res.data.error.msg);
                    }
                })
                .catch(function (err) {
                    console.log(err)
                });
        }
    }

    //Incluir dados do user na sessão
    function setUser(data) {
        sessionStorage.setItem("user", JSON.stringify(data))
        client = data
    }

    //Obter dados do user da sessão
    function getUser(data) {
        return JSON.parse(sessionStorage.getItem("user"))
    }


    //###############
    //  TOKEN
    //###############

    //Obter token
    function createToken(callback) {

        if (checkExpToken()) {

            let data = new FormData();
            data.append('uuid', my_setup.uuid);
            data.append('type', my_setup.type);
            data.append('public', my_setup.public);
            data.append('name', my_setup.name);
            data.append('avatar', my_setup.avatar);
            data.append('lastname', my_setup.lastname);

            //Config request
            let config = {
                method: 'POST',
                url: url_token,
                headers: {
                    'Content-Type': 'form-data',
                    'Access-Control-Allow-Origin': '*'
                },
                data: data,
                mode: 'cors'
            }

            //Request
            axios(config)
                .then(function (res) {
                    if (res.data.result) {
                        saveDataToken(res.data.error)
                        requestPerfil(res.data.error.token)
                        callback(my_setup.name)
                    } else {
                        console.log(res.data.error.msg)
                    }
                })
                .catch(function (err) {
                    console.log(err)
                    console.log('Não foi possível gerar sua autentificação, erro na conexão com o servidor HTTP.')
                });
        } else {
            callback(my_setup.name)
        }
    }

    //Salvar token no session storage
    function saveDataToken(data) {
        if (data == null) {
            sessionStorage.setItem('token_chat', "");
        } else {
            sessionStorage.setItem('token_chat', data.token);
        }
    }

    //Recuperar token do session storage
    function getToken() {
        return sessionStorage.getItem('token_chat');
    }

    //verificar se o token expirou - true = vencido
    function checkExpToken() {
        let res = true

        if (getToken()) {
            let now_seg = parseInt(Date.now() / 1000)
            let [, base] = (getToken()).split(".")
            let exp = JSON.parse(atob(base)).exp
            res = now_seg > exp ? true : false
        }
        return res
    }


    //###############
    //  Chat
    //###############   

    //Formulário de solicitação
    function formCreateCall() {
        let user = getUser()
        let html = `<div class="text-center p-2 mb-3">                      
                        <span>${user.name}, por gentileza, preencha o formulário para solicitar bate-papo!</span>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Assunto:</label>
                        <select class="form-select" name="subject">
                            <option value="" selected disabled>Selecione</option>
                            <option value="Dúvidas">Dúvidas</option>
                            <option value="Problemas">Problemas</option>
                            <option value="Outros">Outros</option>
                        </select>
                        <div class="invalid-feedback">
                            Por favor, selecione um assunto.
                        </div>
                    </div>
                    <div class="mb-3">
                        <button class="btn btn-outline-success btn-block" id="j_btn_call_create">
                            <i class="fa fa-comments" aria-hidden="true"></i> Solicitar bate-papo
                        </button>
                    </div>`

        print_msg.innerHTML = html
        document.getElementById('j_btn_call_create').onclick = () => validFormCreateCall()
        clearSession()
    }

    //Validar Formulário de abertura da call
    function validFormCreateCall() {
        subject = print_msg.querySelector("select[name=subject]").value
        let invalid = print_msg.querySelector(".invalid-feedback")
        let loading = `<div class="text-center">
                            <div class="spinner-border text-info" role="status">
                            <span class="visually-hidden"></span>
                            </div>
                        </div>`

        if (subject) {
            print_msg.innerHTML = loading
            initSocket(getToken(), true)
        } else {
            invalid.style.display = "block"
            setTimeout(() => {
                invalid.style.display = "none"
            }, 4000)
        }
    }

    //Enviar dados para abertura da call
    function sendCallCreate(subject) {
        if (subject) {
            sendMessage({
                "cmd": "cmd_call_create",
                "objective": subject
            })
        }
    }

    //Comando ao criar call
    function cmdCallCreate(res) {
        let data = res.error.data
        sessionStorage.setItem("chatbox_content", "waiting_line")
        sessionStorage.setItem("chatbox_call", JSON.stringify(data))
    }

    //Comando de call aberta
    function cmdCallCheckOpen(res) {
        let data = res.error.data

        if (res.result) {
            sessionStorage.setItem("chatbox_call", JSON.stringify(data.data[0]))

            if (data.data[0].status == "1") {
                sendMessage({
                    "cmd": "cmd_n_waiting_line"
                })
            } else if (data.data[0].status == "2") {
                cmdCallStart()
            }

        } else if (subject) {
            sendCallCreate(subject)
            subject = null
        } else {
            formCreateCall()
        }
    }

    //Comando do número da fila de espera
    function cmdNWaitingLine(res) {
        let data = res.error.data
        let chatbox_content = sessionStorage.getItem("chatbox_content")
        let chatbox_row = sessionStorage.getItem("chatbox_row")
        let row

        if (!chatbox_row) {
            row = data.row
        } else if (Number(data.row) >= Number(chatbox_row)) {
            row = chatbox_row
        } else {
            row = data.row
        }

        if (Number(data.row) == 1 && chatbox_content == "waiting_line") {
            formCreateCall()
        } else {
            sessionStorage.setItem("chatbox_row", row)
            showWaitingMessage(row)
        }
    }

    //Mostrar mensagem da fila de espera
    function showWaitingMessage(n) {
        let html = `<div class="text-center p-2 mb-3">
                        <span>Por favor, aguarde até chegar sua vez.</span>
                        <span>A qualquer momento um dos nossos atendentes irá te responder por aqui.</span>
                        <span>Fila de espera: <b>${n}</b></span>                       
                    </div>
                    <div class="py-3">
                        <button class="btn btn-outline-danger btn-block" id="j_btn_call_cancel">
                            <i class="fa fa-times"></i> Cancelar Solicitação
                        </button>
                    </div>`
        print_msg.innerHTML = html
        document.getElementById('j_btn_call_cancel').onclick = () => sendCallCancel()
    }

    //Consultar número da fila
    function requestNWaitingLine() {
        initSocket(getToken())
    }

    //Cancelar solicitação de bate-papo
    function sendCallCancel() {
        sendMessage({
            "cmd": "cmd_call_cancel",
            "call": getCall()
        })
    }

    //Comando ao cancelar bate-papo
    function cmdCallCancel() {
        formCreateCall()
    }

    //Comando ao finalizar call
    function cmdCallEnd() {
        let html = `<div class="text-center p-2 mb-3">
                        <span>Obrigado!<br> Este bate-papo foi encerrado.</span>
                    </div>
                    <div class="py-3">
                        <button class="btn btn-warning btn-block" id="j_btn_new_call">
                            <i class="fa fa-bullhorn"></i> Novo Atendimento
                        </button>
                    </div>`
        print_msg.innerHTML = html
        sessionStorage.setItem("chatbox_content", "call_end")
        document.getElementById('j_btn_new_call').onclick = () => createToken(formCreateCall)
    }

    //Formulário de avaliação do atendimento
    function formCallEvaluation() {
        let html = ` <div class="text-center p-2 mb-3">
                        <span>Por favor, avalie nosso atendimento:</span>
                    </div>
                    <div class="form-check">
                        <label class="form-check-label">
                            <input class="form-check-input" type="radio" name="aval" value="5">
                            😍 Excelente
                        </label>
                    </div>
                    <div class="form-check">
                        <label class="form-check-label">
                            <input class="form-check-input" type="radio" name="aval" value="4">
                            😃 Ótimo
                        </label>
                    </div>
                    <div class="form-check">
                        <label class="form-check-label">
                            <input class="form-check-input" type="radio" name="aval" value="3" checked>
                            🙂 Bom
                        </label>
                    </div>
                    <div class="form-check">
                        <label class="form-check-label">
                            <input class="form-check-input" type="radio" name="aval" value="2">
                            😕 Ruim
                        </label>
                    </div>
                    <div class="form-check">
                        <label class="form-check-label">
                            <input class="form-check-input" type="radio" name="aval" value="1">
                            😤 Péssimo
                        </label>
                    </div>
                    <div class="py-3">
                        <button class="btn btn-outline-primary btn-block" id="j_call_evaluation">
                            ✔ Avaliar e Encerrar
                        </button>
                    </div>`
        print_msg.innerHTML = html
        sessionStorage.setItem("chatbox_content", "call_evaluation")
        document.getElementById('j_call_evaluation').onclick = () => sendCallEvaluation()
    }

    //Enviar avaliação do atendimento
    function sendCallEvaluation() {
        let evaluation = print_msg.querySelector("input[name=aval]:checked").value
        let sendData = () => {
            sendMessage({
                "cmd": "cmd_call_evaluation",
                "call": getCall(),
                "evaluation": evaluation
            })
        }

        initSocket(getToken(), false, sendData)
    }

    //Limpar sessão
    function clearSession() {
        sessionStorage.removeItem("chatbox_call")
        sessionStorage.removeItem("chatbox_row")
        sessionStorage.setItem("chatbox_content", "call_create")
        closeConn()
    }


    //###############
    // Start Chat
    //###############  

    //Comando recebido quando o atendente inicia a call
    function cmdCallStart() {
        let html_form = `<input type="text" placeholder="Mensagem..." id="j_input_send">
                        <a href="javascript:;" class="chatbox__send--footer" id="j_btn_send">
                            <i class="fa fa-paper-plane-o"></i>
                        </a>`

        print_msg.innerHTML = ''
        print_input_footer.innerHTML = html_form
        document.getElementById('j_btn_send').onclick = () => submitMsg()
        document.getElementById('j_input_send').onkeypress = (e) => {
            if (e.key == 'Enter') {
                submitMsg()
                return false
            }
        }

        initSocket(getToken(), false, requestHistory)
        sessionStorage.setItem("chatbox_content", "call_start")
    }

    //Print msg do cliente
    function printMsgClient(text, time) {
        let html = `<div class="messages__item messages__item--operator">${text} <h6>${time}</h6></div>`
        print_msg.insertAdjacentHTML('beforeend', html)
        addScroll()
    }

    //Print msg do atendente
    function printMsgAttendant(text, time) {
        let html = `<div class="messages__item messages__item--visitor">${text} <h6>${time}</h6></div>`
        print_msg.insertAdjacentHTML('beforeend', html)
        addScroll()
    }

    //Enviar mensagem
    function submitMsg() {
        let call = getCall()
        let input_send = document.getElementById('j_input_send')

        if (input_send.value.trim().length > 0) {
            sendMessage({
                "cmd": "cmd_call_msg",
                "call": call,
                "text": input_send.value
            })
            printMsgClient(input_send.value, formatTime())
            input_send.value = ""
        }
    }

    //Print das mensagens recebidas
    function cmdCallMsg(res) {
        printMsgAttendant(res.error.data.text, formatTime(res.error.data.date))
    }


    //###############
    //  HISTÓRICO
    //###############  

    function requestHistory() {
        let data_call = getDataCall()

        printMsgClient(data_call.objective, formatTime())
        sendMessage({
            "cmd": "cmd_call_history",
            "call": data_call.call,
            "limit": 500,
            "offset": 0
        })
    }

    //Listar mensagens anteriores da call
    function cmdCallHistory(res) {
        if (res.result) { printHistory(res.error.data.chat) }
    }

    //Listar histórico de mensagens
    function printHistory(msgs) {
        client = getUser()

        msgs.forEach(function (msg) {
            if (client.uuid == msg.origin) {
                printMsgClient(msg.text, formatTime(msg.date))
            } else {
                printMsgAttendant(msg.text, formatTime(msg.date))
            }
        });
    }


    //###############
    //  WEBSOCKET
    //###############

    //Abrir conexão
    function initSocket(token, check_open = true, callback) {

        conn_ws = new WebSocket(`${url_ws}/?t=${token}`);

        //Evento ao abrir conexão
        conn_ws.addEventListener('open', open => {
            if (check_open) {
                sendMessage({
                    "cmd": "cmd_call_check_open"
                })
            }
            if (callback) {
                callback()
            }
        })

        //Evento ao enviar/receber mensagens
        conn_ws.addEventListener('message', message => {
            messages = JSON.parse(message.data)
            console.log(messages)
            cmd[messages.error.data.cmd](messages)
        })

        //Evento de error
        conn_ws.addEventListener('error', error => {
            console.log(`Error na conexão com o servidor de chat!`)
        })

        //Evento ao fechar conexão
        conn_ws.addEventListener('close', close => {

            if (close.code == 1006) {
                console.log(`O servidor de chat está offline!`)
            } else if (close.code == 1000) {
                console.log(`Conexão encerrada: ${messages.error.msg}`)
            }
        })
    }

    //Enviar msg
    function sendMessage(msg) {
        conn_ws.send(JSON.stringify(msg));
    }

    //Fechar conexão
    function closeConn() {
        if (conn_ws) {
            conn_ws.close()
        }
    }

    //Cmd conectado
    function cmdConnection() {
        console.log("Conectado no Ws de chat!")
    }


    //###############
    //  INICIAR
    //###############   

    //Conteúdo do chatbox
    function chatboxContent() {
        if (chatbox.state) {
            let chatbox_content = sessionStorage.getItem("chatbox_content")

            if (chatbox_content == "call_create") {
                createToken(formCreateCall)
            } else if (chatbox_content == "waiting_line") {
                requestNWaitingLine()
            } else if (chatbox_content == "call_start") {
                cmdCallStart()
            } else if (chatbox_content == "call_evaluation") {
                formCallEvaluation()
            } else {
                sessionStorage.setItem("chatbox_content", "waiting_line")
                createToken(chatboxContent)
            }
        } else {
            closeConn()
        }
    }

    //Iniciar app
    function init() {
        chatbox.display()
        chatbox.toggleIcon(false, chatButton)
        actionButtons()
    }

    init()
})()